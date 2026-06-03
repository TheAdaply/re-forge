#!/usr/bin/env bash
# Trigger a Forge gap analysis refresh
# Usage: bash ~/.claude/scripts/forge-gap-refresh.sh [project-dir]
#
# If project-dir is given, runs in that context.
# Otherwise runs against the global ~/.claude/ inventory.
set -uo pipefail


echo "=== Forge Gap Analysis Refresh ==="
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""
echo "To run this as a team session, paste in Claude Code:"
echo ""
echo '  /forge run a full gap analysis of the current workforce'
echo ""
echo "Or for a specific project:"
echo "  cd <project-dir> && claude"
echo '  /forge what capabilities are we missing for this project?'
echo ""

# Quick stats
echo "--- Current workforce ---"
echo -n "Research agents:    "; ls ~/.claude/agents/research/*.md 2>/dev/null | wc -l
echo -n "Engineering agents: "; ls ~/.claude/agents/engineering/*.md 2>/dev/null | wc -l
echo -n "Docs agents:        "; ls ~/.claude/agents/docs/*.md 2>/dev/null | wc -l
echo -n "Testing agents:     "; ls ~/.claude/agents/testing/*.md 2>/dev/null | wc -l
echo -n "Security agents:    "; ls ~/.claude/agents/security/*.md 2>/dev/null | wc -l
echo -n "Forge skills:       "; ls ~/.claude/forge/skills/*/SKILL.md 2>/dev/null | wc -l
echo -n "User skills:        "; ls ~/.claude/skills/*/SKILL.md 2>/dev/null | wc -l
echo -n "MEMORY lessons:     "; grep -c '^###' ~/.claude/agent-memory/research-lead/MEMORY.md 2>/dev/null || echo 0

echo ""
echo "--- Last gap report ---"
LATEST=$(ls -t ~/.claude/forge/gap-reports/*.md 2>/dev/null | head -1 || true)
if [ -n "$LATEST" ]; then
  echo "File: $LATEST"
  echo "Date: $(stat -c%y "$LATEST" 2>/dev/null || stat -f%Sm "$LATEST" 2>/dev/null)"
  head -5 "$LATEST"
else
  echo "No gap reports found. Run the Forge first."
fi
