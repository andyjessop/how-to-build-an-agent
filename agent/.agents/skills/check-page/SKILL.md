---
name: check-page
description: Fetch one URL and report its status, speed, redirects and content. Use when asked whether a page or API is working, or when another skill needs to probe a URL.
---

# Check page

Input: a URL.

```bash
curl -s -L --max-redirs 5 -m 20 -w "\n--\nstatus: %{http_code}\ntime: %{time_total}s\nredirects: %{num_redirects}\nfinal url: %{url_effective}\ntype: %{content_type}\ncurl error: %{exitcode} %{errormsg}\n" "https://example.com/"
```

The response body is printed first, then the facts about the request below the `--` line. A `curl error` other than 0 means the request itself failed: 6 is a DNS failure, 7 a refused connection, 28 a timeout, 47 too many redirects, 60 a certificate problem.

Report the status, the time, any redirects, and one line on what the body contains. Say plainly if anything looks wrong: an error status, a response slower than a second, a redirect loop, or a body that is an error message.
