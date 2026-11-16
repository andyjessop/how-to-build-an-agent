#!/usr/bin/env bash
# Controls for the demo. Each one is also an npm script: npm run break, npm run fix, and so on.
#
#   ./demo.sh break [fault]   break the shop: down, slow, database, assets or loop. Random if left out.
#   ./demo.sh fix             put the shop right
#   ./demo.sh agent           start the agent by hand and print its report
#   ./demo.sh claude          start Claude Code in agent/, able to post notifications
#   ./demo.sh pi              start pi in agent/, able to post notifications, with only this repo's skills
#
# The keys come from worker/.dev.vars. The shop must be running: npm run dev.

set -euo pipefail
cd "$(dirname "$0")"
source worker/.dev.vars

SHOP=http://localhost:8787

case "${1:-}" in
	break)
		curl -s -X POST -H "Authorization: Bearer $ADMIN_KEY" "$SHOP/break${2:+?fault=$2}"
		echo
		;;
	fix)
		curl -s -X POST -H "Authorization: Bearer $ADMIN_KEY" "$SHOP/fix"
		echo
		;;
	agent)
		echo "Running the agent. This takes a minute or two..."
		report=$(curl -s -X POST -H "Authorization: Bearer $ADMIN_KEY" "$SHOP/agents/skills-agent/main")
		if command -v jq > /dev/null; then echo "$report" | jq -r '.text // .'; else echo "$report"; fi
		;;
	claude)
		# Only the notifications key goes to the model, never the key that breaks and fixes the shop.
		cd agent && NOTIFY_URL="$SHOP/notifications" NOTIFY_KEY="$NOTIFY_KEY" exec claude
		;;
	pi)
		cd agent && NOTIFY_URL="$SHOP/notifications" NOTIFY_KEY="$NOTIFY_KEY" exec pi --no-skills --skill .agents/skills
		;;
	*)
		echo "Usage: ./demo.sh break [down|slow|database|assets|loop] | fix | agent | claude | pi"
		exit 1
		;;
esac
