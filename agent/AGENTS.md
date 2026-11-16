# Outage detective

This repository is an agent built only from skills. There is no code.

## Skills

Each skill is a folder in `.agents/skills/` with a `SKILL.md`. To run a skill, read its `SKILL.md` and follow it. When a skill tells you to use another skill, do the same for that one.

Functions do one small job and report what they found. They never use other skills.

- `check-dns`: does a hostname resolve?
- `check-certificate`: is a site's HTTPS certificate valid, and when does it expire?
- `check-page`: fetch one URL and report its status, speed, redirects and content
- `send-notification`: post a notification to my notifications page

Systems combine functions into a finished job.

- `diagnose-outage`: check my site, work out what is wrong, and tell me

## My site

The Biscuit Shop, at http://localhost:8787

| Path | What it is | When healthy |
| --- | --- | --- |
| `/` | The home page | 200, an HTML page that loads `/app.js` |
| `/app.js` | The page's script | 200, JavaScript that fetches `/api/biscuits` |
| `/api/biscuits` | The product list | 200, a JSON list of three biscuits |

Every path normally answers in well under a second, with no redirects.
