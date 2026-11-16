---
name: check-certificate
description: Check whether a site's HTTPS certificate is valid and when it expires. Use when a site can't be reached securely, or when another skill needs to rule the certificate in or out.
---

# Check certificate

Input: a site's address. If it starts with `http://`, the site has no certificate: say so and stop.

```bash
curl -sv -m 10 -o /dev/null "https://example.com" 2>&1 | grep -iE "subject:|issuer:|expire date:|SSL certificate|certificate verify|< date:"
```

The `< date:` line is the server's clock, so you can tell how far away the expiry is.

Report one line: whether the certificate is valid, who issued it, and the date it expires. Warn if it expires within 14 days.
