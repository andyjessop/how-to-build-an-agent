import { DurableObject } from "cloudflare:workers";

// The Biscuit Shop: a small site that exists to be broken.
//
//   POST /break              break it in a random way, without saying how
//   POST /break?fault=slow   break it in a chosen way
//   POST /fix                put it right
//
// Both switches need the header "Authorization: Bearer <ADMIN_KEY>".

const FAULTS = ["down", "slow", "database", "assets", "loop"] as const;
type Fault = (typeof FAULTS)[number];

const BISCUITS = [
	{ name: "Custard cream", price: 0.4 },
	{ name: "Chocolate digestive", price: 0.55 },
	{ name: "Ginger nut", price: 0.35 },
];

export class Site extends DurableObject<Env> {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "POST" && (url.pathname === "/break" || url.pathname === "/fix")) {
			return this.flipSwitch(request, url);
		}

		const fault = this.ctx.storage.kv.get<Fault>("fault");

		// The whole site is down.
		if (fault === "down") {
			return respond("503 Service Unavailable", "text/plain", 503);
		}
		// The whole site is slow.
		if (fault === "slow") {
			await new Promise((resolve) => setTimeout(resolve, 6000));
		}
		// The home page and the login page send visitors to each other for ever.
		if (fault === "loop" && url.pathname === "/") {
			return Response.redirect(`${url.origin}/login`, 302);
		}
		if (fault === "loop" && url.pathname === "/login") {
			return Response.redirect(`${url.origin}/`, 302);
		}

		switch (url.pathname) {
			case "/":
				return respond(HOME_PAGE, "text/html; charset=utf-8");
			case "/app.js":
				// A bad deploy: the page is there but its script is missing.
				if (fault === "assets") {
					return respond("Not found", "text/plain", 404);
				}
				return respond(APP_SCRIPT, "text/javascript; charset=utf-8");
			case "/api/biscuits":
				// The database has gone away.
				if (fault === "database") {
					const error = "could not connect to database: connection refused (db.internal:5432)";
					return respond(JSON.stringify({ error }), "application/json", 500);
				}
				return respond(JSON.stringify(BISCUITS), "application/json");
			default:
				return respond("Not found", "text/plain", 404);
		}
	}

	private flipSwitch(request: Request, url: URL): Response {
		if (request.headers.get("Authorization") !== `Bearer ${this.env.ADMIN_KEY}`) {
			return respond("Forbidden", "text/plain", 403);
		}
		if (url.pathname === "/fix") {
			this.ctx.storage.kv.delete("fault");
			return respond(JSON.stringify({ status: "Fixed." }), "application/json");
		}

		const asked = url.searchParams.get("fault");
		if (asked !== null) {
			const fault = FAULTS.find((candidate) => candidate === asked);
			if (!fault) {
				return respond(JSON.stringify({ error: `Unknown fault. Choose one of: ${FAULTS.join(", ")}` }), "application/json", 400);
			}
			this.ctx.storage.kv.put("fault", fault);
			return respond(JSON.stringify({ fault }), "application/json");
		}

		// Pick a fault at random, but never the one already in place.
		const current = this.ctx.storage.kv.get<Fault>("fault");
		const others = FAULTS.filter((candidate) => candidate !== current);
		this.ctx.storage.kv.put("fault", others[Math.floor(Math.random() * others.length)]);
		return respond(JSON.stringify({ status: "Something is now broken. Good luck." }), "application/json");
	}
}

function respond(body: string, contentType: string, status = 200): Response {
	return new Response(body, {
		status,
		headers: { "content-type": contentType, "cache-control": "no-store" },
	});
}

const HOME_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Biscuit Shop</title>
<style>
	body { font: 18px/1.5 system-ui, sans-serif; max-width: 30rem; margin: 4rem auto; padding: 0 1rem; color: #2b2118; background: #fbf6ee; }
	h1 { font-size: 2.2rem; margin-bottom: 0; }
	ul { list-style: none; padding: 0; }
	li { display: flex; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px dashed #c9b79c; }
	.error { color: #a4161a; }
</style>
</head>
<body>
<h1>The Biscuit Shop</h1>
<p>Three biscuits. No nonsense.</p>
<ul id="biscuits"><li>Loading the biscuits...</li></ul>
<script src="/app.js"></script>
</body>
</html>
`;

const APP_SCRIPT = `const list = document.getElementById("biscuits");

fetch("/api/biscuits")
	.then((response) => {
		if (!response.ok) throw new Error("HTTP " + response.status);
		return response.json();
	})
	.then((biscuits) => {
		list.innerHTML = biscuits
			.map((biscuit) => "<li><span>" + biscuit.name + "</span><span>£" + biscuit.price.toFixed(2) + "</span></li>")
			.join("");
	})
	.catch(() => {
		list.innerHTML = '<li class="error">Sorry, we could not load the biscuits.</li>';
	});
`;
