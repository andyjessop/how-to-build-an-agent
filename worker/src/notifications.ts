import { DurableObject } from "cloudflare:workers";

// The page the agent reports to. It lives outside the shop, so it stays up when the shop goes down.
//
//   GET  /notifications   the list, newest first, refreshing every few seconds
//   POST /notifications   add one: a "Title" header and the message as the body
//
// Posting needs the header "Authorization: Bearer <NOTIFY_KEY>".

type Notification = { title: string; message: string; time: string };

const KEEP = 50;

export class Notifications extends DurableObject<Env> {
	async fetch(request: Request): Promise<Response> {
		if (request.method === "POST") {
			if (request.headers.get("Authorization") !== `Bearer ${this.env.NOTIFY_KEY}`) {
				return new Response("Forbidden", { status: 403 });
			}
			const notification = {
				title: request.headers.get("Title") ?? "Notification",
				message: (await request.text()).trim(),
				time: new Date().toISOString(),
			};
			const list = this.ctx.storage.kv.get<Notification[]>("list") ?? [];
			this.ctx.storage.kv.put("list", [notification, ...list].slice(0, KEEP));
			return Response.json({ status: "sent" });
		}

		const list = this.ctx.storage.kv.get<Notification[]>("list") ?? [];
		return new Response(page(list), {
			headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
		});
	}
}

function page(list: Notification[]): string {
	const items = list.length
		? list
				.map(
					(item) => `<article>
	<header><h2>${escape(item.title)}</h2><time datetime="${item.time}">${item.time.slice(11, 19)} UTC</time></header>
	<p>${escape(item.message)}</p>
</article>`,
				)
				.join("\n")
		: "<p class=\"empty\">Nothing to report.</p>";

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="3">
<title>Agent notifications</title>
<style>
	body { font: 18px/1.5 system-ui, sans-serif; max-width: 42rem; margin: 3rem auto; padding: 0 1rem; color: #e8eaed; background: #16181d; }
	h1 { font-size: 1.6rem; }
	article { background: #22262e; border-left: 4px solid #f28b54; border-radius: 6px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
	header { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
	h2 { font-size: 1.15rem; margin: 0; }
	time { color: #9aa0a6; font-size: 0.9rem; white-space: nowrap; }
	p { white-space: pre-wrap; margin: 0.5rem 0 0; }
	.empty { color: #9aa0a6; }
</style>
</head>
<body>
<h1>Agent notifications</h1>
${items}
</body>
</html>
`;
}

// The title and message are written by the model, from what it read on the site, so never trust them as HTML.
function escape(text: string): string {
	return text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}
