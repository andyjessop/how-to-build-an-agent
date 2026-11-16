---
name: send-notification
description: Post a notification to my notifications page. Use when asked to notify, alert or message me, or when another skill has a result to deliver.
---

# Send notification

Input: a title and a message.

```bash
curl -s -X POST -H "Authorization: Bearer $NOTIFY_KEY" -H "Title: <title>" --data-binary @- "$NOTIFY_URL" <<'EOF'
<message>
EOF
```

`NOTIFY_URL` and `NOTIFY_KEY` come from the environment. Run the command exactly as written and let the shell fill them in. If curl says no URL was given, or the reply is "Forbidden", stop and say so. Never make up an address or a key.

Report whether it was sent. A reply of `{"status":"sent"}` means it was.
