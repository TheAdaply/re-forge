#!/usr/bin/env bash
# SessionStart hook: the "always-on" beat of the Evolution Team.
# Claude Code has no true daemon, so we approximate "always watching" by
# stamping a watch-due marker whenever the last upstream scout is older than the
# cadence. A due marker nudges the next session (and the cron schedule) to run
# /evolution in Scout mode. This hook is cheap and idempotent — it never blocks.

set -euo pipefail

CADENCE_HOURS="${REFORGE_WATCH_CADENCE_HOURS:-24}"
STATE_DIR="$HOME/.claude/agent-memory/evolution-lead"
LAST_WATCH="$STATE_DIR/.last-watch"
DUE_MARKER="$STATE_DIR/.watch-due"
mkdir -p "$STATE_DIR"

now=$(date -u +%s)

if [ -f "$LAST_WATCH" ]; then
  last=$(cat "$LAST_WATCH" 2>/dev/null || echo 0)
else
  last=0
fi

age_hours=$(( (now - last) / 3600 ))

if [ "$age_hours" -ge "$CADENCE_HOURS" ]; then
  date -u +%Y-%m-%dT%H:%M:%SZ > "$DUE_MARKER"
  echo "[evolution-scout] watch due (last scout ${age_hours}h ago ≥ ${CADENCE_HOURS}h). Run /evolution to scan upstream changes." >&2
fi

exit 0
