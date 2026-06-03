#!/usr/bin/env bash
# log-evidence-writes.sh — PostToolUse hook for the Research Team.
#
# Purpose: observational telemetry for every Write to teams/<team>/<slug>/EVIDENCE/*.md.
# Records path, size, timestamp, and subagent context to a per-session audit log.
# Non-blocking — always exit 0, never block. The audit log is read by the retrospector
# at session close to grade enforcement compliance (did the lead call the audit script
# before writing SYNTHESIS.md? did every expected evidence file get a write event?).
#
# NOTE: As of Claude Code v2.1.101 (2026-04), PreToolUse hooks do NOT reliably fire for
# subagent tool calls (see anthropics/claude-code#43612, #43772, #40580). PostToolUse
# IS reported working in subagent context per v2.1.89+ testing (#34692 comment).
# So this hook uses PostToolUse only — observational, never blocking.
#
# Install: reference from ~/.claude/settings.json as
#   "hooks": {
#     "PostToolUse": [
#       { "matcher": "Write|Edit",
#         "hooks": [
#           { "type": "command",
#             "command": "$HOME/.claude/hooks/log-evidence-writes.sh" }
#         ]
#       }
#     ]
#   }

set -u

INPUT=$(cat 2>/dev/null || true)

# Extract file_path and agent context from hook input JSON via python3 (stdlib).
PYTHON_HELPER=$(cat <<'PY'
import json, sys, os
try:
    d = json.load(sys.stdin)
    ti = d.get("tool_input", {}) or {}
    tn = d.get("tool_name", "")
    # Write has file_path; Edit has file_path; Bash has command (skip).
    fp = ti.get("file_path", "")
    agent_id = d.get("agent_id", "")
    agent_type = d.get("agent_type", "")
    session_id = d.get("session_id", "")
    # Extract slug from file path if it's under teams/<team>/<slug>/
    slug = ""
    team = ""
    if "/teams/" in fp:
        parts = fp.split("/teams/", 1)[1].split("/")
        if len(parts) >= 2:
            team = parts[0]
            slug = parts[1]
    print("\t".join([tn, fp, agent_id, agent_type, session_id, team, slug]))
except Exception:
    pass
PY
)

OUT=$(printf '%s' "$INPUT" | python3 -c "$PYTHON_HELPER" 2>/dev/null || true)
[[ -n "$OUT" ]] || exit 0

TOOL_NAME=$(printf '%s' "$OUT" | cut -f1)
FILE_PATH=$(printf '%s' "$OUT" | cut -f2)
AGENT_ID=$(printf '%s' "$OUT" | cut -f3)
AGENT_TYPE=$(printf '%s' "$OUT" | cut -f4)
# field 5 is session_id — currently unused
TEAM=$(printf '%s' "$OUT" | cut -f6)
SLUG=$(printf '%s' "$OUT" | cut -f7)

# Only log writes under an EVIDENCE/ directory or to SYNTHESIS.md / LOG.md.
case "$FILE_PATH" in
    */EVIDENCE/*.md|*/SYNTHESIS.md|*/LOG.md|*/QUESTION.md|*/HYPOTHESES.md|*/EXPECTED_EVIDENCE.md)
        ;;
    *)
        exit 0
        ;;
esac

# Per-session audit log lives in the workspace itself, so the retrospector
# can find it without needing a shared path.
if [[ -n "$TEAM" && -n "$SLUG" ]]; then
    AUDIT_LOG="$HOME/.claude/teams/$TEAM/$SLUG/_write_audit.log"
    mkdir -p "$(dirname "$AUDIT_LOG")" 2>/dev/null || true
    TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    SIZE=$(stat -c %s "$FILE_PATH" 2>/dev/null || stat -f %z "$FILE_PATH" 2>/dev/null || echo 0)
    printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
        "$TS" "$TOOL_NAME" "$SIZE" "${AGENT_ID:-main}" "${AGENT_TYPE:-main-thread}" "$FILE_PATH" \
        >> "$AUDIT_LOG" 2>/dev/null || true
fi

exit 0
