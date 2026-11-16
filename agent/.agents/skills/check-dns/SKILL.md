---
name: check-dns
description: Check whether a hostname resolves in DNS. Use when a site can't be reached, or when another skill needs to rule DNS in or out.
---

# Check DNS

Input: a hostname, such as `example.com`. If it is `localhost`, an IP address or `host.docker.internal`, there is nothing to look up: say so and stop.

```bash
curl -s -m 10 -H "accept: application/dns-json" "https://cloudflare-dns.com/dns-query?type=A&name=example.com"
```

`"Status":0` with an `Answer` list means the name resolves. `"Status":3` means the name does not exist.

Report one line: whether the name resolves, and to which addresses.
