#!/usr/bin/env bash
# Stop hook: lightweight lesson capture from non-team sessions.
# Fires after every session. Skips if a team retrospector already ran
# (checks for EVIDENCE/retrospector.md in the workspace).
# Writes to research-lead staging if the session produced substantive work.
#
# No `set -e` on purpose: an aborting hook can break the host Claude Code
# session, so every step degrades to a silent skip instead (see AGENTS.md).

set -uo pipefail

# Read hook payload from stdin
PAYLOAD=$(cat)
SESSION_ID=$(echo "$PAYLOAD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('session_id','unknown'))" 2>/dev/null || echo "unknown")
CWD=$(echo "$PAYLOAD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cwd',''))" 2>/dev/null || echo "")

# Skip if a team session already ran retrospector (they handle their own memory)
if [ -n "$CWD" ]; then
  for team_dir in "$CWD/.claude/teams"/*/; do
    for slug_dir in "$team_dir"*/; do
      if [ -f "$slug_dir/EVIDENCE/retrospector.md" ]; then
        # A team retrospector already captured lessons for this session
        exit 0
      fi
    done
  done
fi

# Check if the session was substantive (≥10 tool calls is the heuristic).
# Proxy: the most recently modified session transcript and its size.
# (A previous version gated on `-newer /tmp/.claude-session-start`, but no
# hook ever created that marker, so capture silently never ran.)
SESSION_DIR="$HOME/.claude/projects"
JSONL_FILE=""
if [ -d "$SESSION_DIR" ]; then
  JSONL_FILE=$(find "$SESSION_DIR" -name "*.jsonl" -type f 2>/dev/null \
    | while IFS= read -r f; do
        mtime=$(stat -c%Y "$f" 2>/dev/null || stat -f%m "$f" 2>/dev/null || echo 0)
        printf '%s\t%s\n' "$mtime" "$f"
      done | sort -rn | head -1 | cut -f2- || true)
fi

# If we can't find a session file, skip
if [ -z "$JSONL_FILE" ] || [ ! -f "$JSONL_FILE" ]; then
  exit 0
fi

# Only capture transcripts touched in the last 10 minutes — the Stop hook
# fires at session end, so the live session's transcript is always fresh.
NOW=$(date +%s)
MTIME=$(stat -c%Y "$JSONL_FILE" 2>/dev/null || stat -f%m "$JSONL_FILE" 2>/dev/null || echo 0)
if [ $((NOW - MTIME)) -gt 600 ]; then
  exit 0
fi

FILE_SIZE=$(stat -c%s "$JSONL_FILE" 2>/dev/null || stat -f%z "$JSONL_FILE" 2>/dev/null || echo 0)
# Skip sessions smaller than 50KB (roughly <10 substantive tool calls)
if [ "$FILE_SIZE" -lt 51200 ]; then
  exit 0
fi

# Write a minimal capture note to staging
STAGING_DIR="$HOME/.claude/agent-memory/research-lead/staging"
mkdir -p "$STAGING_DIR"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
CAPTURE_FILE="$STAGING_DIR/adhoc-$(date +%Y%m%d-%H%M%S).md"

cat > "$CAPTURE_FILE" << EOF
### Ad-hoc session capture ($TIMESTAMP)
- **Observed in**: adhoc session $SESSION_ID ($(date -I))
- **Failure mode addressed**: none / session capture
- **Lesson**: Ad-hoc session in ${CWD:-unknown} produced ${FILE_SIZE} bytes of transcript. Review this staging file and either promote to a real lesson or delete.
- **Rule of thumb**: Review adhoc staging files during the next team session's scribe pass.
- **Counter-example / bounds**: If this was a trivial session, delete this file.
EOF

echo "[session-capture] wrote $CAPTURE_FILE (${FILE_SIZE}B session)" >&2
exit 0
