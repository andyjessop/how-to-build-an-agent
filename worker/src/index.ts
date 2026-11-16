import { Agent, routeAgentRequest } from "agents";
import { PiHarness } from "agents/harness/pi";
import { createAI } from "agents/models/pi-ai";
import { createModels } from "@earendil-works/pi-ai/models";
import { createRegistry, Harness, type ToolRegistration } from "@earendil-works/pi-durable";
import { obj, str } from "@earendil-works/pi-schema";

// The site this agent watches, and the page it reports to, live in the same Worker.
export { Site } from "./site";
export { Notifications } from "./notifications";

// Everything this agent is: which skill to start, when, and with which model.
const SKILL = "diagnose-outage";
const SCHEDULE = "*/15 * * * *"; // every 15 minutes
const MODEL = "@cf/moonshotai/kimi-k2.7-code";

// Where the agent's folder goes inside the container.
const DIR = "/agent";

const PREAMBLE = `You are an agent running unattended in a Linux container. Your working directory, ${DIR}, holds your skills. Use the bash tool for everything, including reading files with cat. Start by reading AGENTS.md: it says where the skills are and how to run one.`;

const BashInput = obj({ command: str() });

export class SkillsAgent extends Agent<Env> {
	ai = createAI({ binding: this.env.AI });
	registry = createRegistry();

	// The only tool the model gets: run a command in the container.
	bash: ToolRegistration<typeof BashInput> = {
		name: "bash",
		description: `Run a bash command in ${DIR} and return its output.`,
		parameters: BashInput,
		execute: async ({ command }) => {
			const { exitCode, output } = await this.sh(command);
			const text = exitCode === 0 ? output : `${output}\n[exit code ${exitCode}]`;
			return { output: [{ type: "text", text }] };
		},
	};

	// The Pi agent loop. It keeps its transcript in this object's database.
	harness = new PiHarness({
		harness: ({ storage, context, onWake }) => {
			this.registry.install({
				name: "skills-repo",
				sections: [{ key: "preamble", render: () => PREAMBLE, tag: false }],
				tools: [this.bash],
			});
			const models = createModels();
			models.setProvider(this.ai.provider);
			return Harness.open(storage, { models, registry: this.registry, onWake }, context);
		},
		defaults: { model: this.ai(MODEL) },
	});

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.lifecycle.use(this.harness);
	}

	// The trigger: run on a schedule.
	async onStart() {
		await this.schedule(SCHEDULE, "run");
	}

	// A second trigger, so a request can start a run and wait for the answer.
	async onRequest(request: Request) {
		if (request.headers.get("Authorization") !== `Bearer ${this.env.ADMIN_KEY}`) {
			return new Response("Forbidden", { status: 403 });
		}
		const { session, operationId } = await this.run();
		const { status, text } = await this.harness.session(session).wait(operationId);
		return Response.json({ status, text });
	}

	// Fetch the latest skills, then ask the model to run one. Pi works in the background.
	async run() {
		// Keep only the agent/ folder, so the model can't read the shop's code.
		const clone = await this.sh(
			`rm -rf ${DIR} /tmp/repo && git clone --depth 1 ${this.env.AGENT_REPO} /tmp/repo && mv /tmp/repo/agent ${DIR} && rm -rf /tmp/repo`,
			"/",
		);
		if (clone.exitCode !== 0) {
			throw new Error(`Could not fetch the agent from ${this.env.AGENT_REPO}: ${clone.output}`);
		}
		const session = await this.harness.sessions.create();
		return session.submit(`Run the ${SKILL} skill on ${this.env.SITE_URL}.`);
	}

	// Run one command in the container, starting the container first if it is not running.
	async sh(command: string, cwd = DIR) {
		const container = this.ctx.container;
		if (!container) {
			throw new Error("No container is attached to this agent");
		}
		if (!container.running) {
			container.start({
				image: container.images.app,
				entrypoint: ["sleep", "infinity"],
				enableInternet: true,
			});
		}
		// Commands in the container see only the variables passed here.
		const process = await container.exec(["timeout", "120", "bash", "-lc", command], {
			cwd,
			env: {
				HOME: "/root",
				NOTIFY_URL: new URL("/notifications", this.env.SITE_URL).href,
				NOTIFY_KEY: this.env.NOTIFY_KEY,
			},
			stderr: "combined",
		});
		const { exitCode, stdout } = await process.output();
		return { exitCode, output: new TextDecoder().decode(stdout).slice(-10_000) };
	}
}

export default {
	// /agents/... goes to the agent, /notifications to its page, and everything else to the site.
	async fetch(request, env): Promise<Response> {
		if (new URL(request.url).pathname === "/notifications") {
			return env.Notifications.getByName("main").fetch(request);
		}
		return (await routeAgentRequest(request, env)) ?? env.Site.getByName("main").fetch(request);
	},
} satisfies ExportedHandler<Env>;
