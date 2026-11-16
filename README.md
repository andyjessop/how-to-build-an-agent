# How to Build an Agent (It's a Skill Issue)

An agent is a set of skills plus something that starts them. This repo has one of each, and a website for them to look after.

```
agent/     the agent: AGENTS.md and five skills, written in Markdown. No code.
worker/    a Cloudflare Worker that holds:
             the Biscuit Shop, a small website you can break on purpose
             a notifications page the agent reports to
             the code that starts the agent on a schedule
demo.sh    the demo controls, also available as npm scripts
```

## The agent

The agent is an outage detective. It checks the shop, works out what is wrong, and posts a diagnosis to the notifications page.

| Layer | Skill | What it does |
| --- | --- | --- |
| Function | `check-dns` | Does a hostname resolve? |
| Function | `check-certificate` | Is the HTTPS certificate valid, and when does it expire? |
| Function | `check-page` | Fetch one URL and report status, speed, redirects and content |
| Function | `send-notification` | Post a notification to the notifications page |
| System | `diagnose-outage` | Uses the four functions, decides what is wrong, and reports it |

The same folder works in Claude Code and in pi. Claude Code reads `CLAUDE.md`, which imports `AGENTS.md`, and finds the skills through the `.claude/skills` link. Pi reads `AGENTS.md` and `.agents/skills` directly.

## Running it

You need Node.js, Docker, and a Cloudflare account for Workers AI.

```bash
npm install
```

```bash
cp worker/.dev.vars.example worker/.dev.vars
```

Put this repo's GitHub address in `AGENT_REPO` in `worker/wrangler.jsonc`, then start everything:

```bash
npm run dev
```

The shop is at http://localhost:8787 and the notifications page at http://localhost:8787/notifications. In another terminal:

| Command | What it does |
| --- | --- |
| `npm run break` | Break the shop in a random way |
| `npm run break -- database` | Break it in a chosen way: `down`, `slow`, `database`, `assets` or `loop` |
| `npm run fix` | Put the shop right |
| `npm run claude` | Start Claude Code in `agent/`, able to post notifications |
| `npm run pi` | Start pi in `agent/`, with only this repo's skills |
| `npm run agent` | Start the Cloudflare agent by hand and print its report |

The Cloudflare agent also runs by itself every 15 minutes while `npm run dev` is running. Each run is one Workers AI conversation, charged to your Cloudflare account.
