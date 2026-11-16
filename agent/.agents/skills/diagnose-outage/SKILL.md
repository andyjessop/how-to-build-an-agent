---
name: diagnose-outage
description: Check whether my site is healthy and, if it is not, work out what is wrong and notify me. Use when asked to check, watch or diagnose the site, or when the site seems to be down.
---

# Diagnose outage

Input: the site's address. If none is given, use my site in `AGENTS.md`. The paths to check, and what healthy looks like, are listed there too.

This skill does no work of its own. It combines four other skills.

1. Use the `check-dns` skill on the site's hostname.
2. Use the `check-certificate` skill on the site.
3. Use the `check-page` skill on every path listed for the site.
4. Compare what you found with what healthy looks like. Follow up anything odd with more `check-page` calls until you can name the most likely cause.
5. If everything is healthy, say "All clear" and stop. Do not send a notification.
6. Otherwise write the diagnosis as plain text, under 600 characters:
   - what is broken, in one line
   - the evidence
   - the most likely cause
   - what still works
7. Use the `send-notification` skill to send it. For the title, name the problem in six words or fewer. End the message with a one-line biscuit pun.

Finish by showing what you found.
