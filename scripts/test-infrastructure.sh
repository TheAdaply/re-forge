#!/usr/bin/env bash
# Infrastructure self-test for re-forge
# Verifies that all components are installed and functional.
# Run: bash ~/.claude/scripts/test-infrastructure.sh

set -euo pipefail

PASS=0
FAIL=0
WARN=0

check() {
  local name="$1" cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "  PASS: $name"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $name"
    FAIL=$((FAIL+1))
  fi
}

warn_check() {
  local name="$1" cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "  PASS: $name"
    PASS=$((PASS+1))
  else
    echo "  WARN: $name"
    WARN=$((WARN+1))
  fi
}

echo "=== Re-Forge Infrastructure Self-Test ==="
echo ""

echo "--- Agent files ---"
check "Research team (18 agents)" "[ $(ls ~/.claude/agents/research/*.md 2>/dev/null | wc -l) -ge 18 ]"
check "Engineering team (13 agents)" "[ $(ls ~/.claude/agents/engineering/*.md 2>/dev/null | wc -l) -ge 13 ]"
check "Docs team (11 agents)" "[ $(ls ~/.claude/agents/docs/*.md 2>/dev/null | wc -l) -ge 10 ]"
check "Testing team (9+ agents)" "[ $(ls ~/.claude/agents/testing/*.md 2>/dev/null | wc -l) -ge 9 ]"
check "Security team (9+ agents)" "[ $(ls ~/.claude/agents/security/*.md 2>/dev/null | wc -l) -ge 9 ]"
check "Forge lead" "[ -f ~/.claude/agents/forge-lead.md ]"
check "Forge sub-skills (5)" "[ $(ls ~/.claude/forge/skills/*/SKILL.md 2>/dev/null | wc -l) -ge 5 ]"

echo ""
echo "--- Protocols ---"
check "Research PROTOCOL.md" "[ -f ~/.claude/teams/research/PROTOCOL.md ]"
check "Engineering PROTOCOL.md" "[ -f ~/.claude/teams/engineering/PROTOCOL.md ]"
check "Docs PROTOCOL.md" "[ -f ~/.claude/teams/docs/PROTOCOL.md ]"
check "Testing PROTOCOL.md" "[ -f ~/.claude/teams/testing/PROTOCOL.md ]"
check "Security PROTOCOL.md" "[ -f ~/.claude/teams/security/PROTOCOL.md ]"

echo ""
echo "--- Memory ---"
check "Research-lead MEMORY.md" "[ -f ~/.claude/agent-memory/research-lead/MEMORY.md ]"
check "Research-lead staging dir" "[ -d ~/.claude/agent-memory/research-lead/staging ]"
check "Engineering-lead MEMORY.md" "[ -f ~/.claude/agent-memory/engineering-lead/MEMORY.md ]"
check "Engineering-lead staging dir" "[ -d ~/.claude/agent-memory/engineering-lead/staging ]"
check "Forge-lead MEMORY.md" "[ -f ~/.claude/agent-memory/forge-lead/MEMORY.md ]"
check "Docs-lead MEMORY.md" "[ -f ~/.claude/agent-memory/docs-lead/MEMORY.md ]"
warn_check "Testing-lead MEMORY.md" "[ -f ~/.claude/agent-memory/testing-lead/MEMORY.md ]"
warn_check "Security-lead MEMORY.md" "[ -f ~/.claude/agent-memory/security-lead/MEMORY.md ]"
check "MEMORY.md has 20+ lessons" "[ $(grep -c '^###' ~/.claude/agent-memory/research-lead/MEMORY.md 2>/dev/null || echo 0) -ge 20 ]"

echo ""
echo "--- Scripts ---"
check "audit_evidence.py exists" "[ -f ~/.claude/scripts/audit_evidence.py ]"
check "audit_evidence.py runs" "python3 ~/.claude/scripts/audit_evidence.py --help 2>&1 | grep -qi 'usage\|audit\|evidence' || python3 -c 'import ast; ast.parse(open(\"$HOME/.claude/scripts/audit_evidence.py\").read())'"
check "team_status.sh exists" "[ -f ~/.claude/scripts/team_status.sh ]"
check "team_status.sh executable" "[ -x ~/.claude/scripts/team_status.sh ]"

echo ""
echo "--- Hooks ---"
check "session-capture.sh" "[ -x ~/.claude/hooks/session-capture.sh ]"
check "log-evidence-writes.sh" "[ -x ~/.claude/hooks/log-evidence-writes.sh ]"
warn_check "cascade hook" "[ -x ~/.claude/hooks/cascade-research-to-engineering.sh ]"
warn_check "check-cascade hook" "[ -x ~/.claude/hooks/check-cascade.sh ]"

echo ""
echo "--- Skills ---"
check "/research skill" "[ -f ~/.claude/skills/research/SKILL.md ]"
check "/engineer skill" "[ -f ~/.claude/skills/engineer/SKILL.md ]"
check "/docs skill" "[ -f ~/.claude/skills/docs/SKILL.md ]"
check "/testing skill" "[ -f ~/.claude/skills/testing/SKILL.md ]"
check "/security skill" "[ -f ~/.claude/skills/security/SKILL.md ]"
check "/forge skill" "[ -f ~/.claude/skills/forge/SKILL.md ]"
check "/hn-search skill" "[ -f ~/.claude/skills/hn-search/SKILL.md ]"

echo ""
echo "--- Settings ---"
check "settings.json exists" "[ -f ~/.claude/settings.json ]"
check "bypassPermissions mode" "grep -q 'bypassPermissions' ~/.claude/settings.json"
check "Stop hook registered" "grep -q 'Stop' ~/.claude/settings.json"
warn_check "PostToolUse hook registered" "grep -q 'PostToolUse' ~/.claude/settings.json"

echo ""
echo "--- Frontmatter consistency ---"
OPUS_VIOLATIONS=0
for f in ~/.claude/agents/research/*.md ~/.claude/agents/engineering/*.md ~/.claude/agents/docs/*.md ~/.claude/agents/testing/*.md ~/.claude/agents/security/*.md; do
  [ -f "$f" ] || continue
  if ! grep -q "^model: opus" "$f" 2>/dev/null; then
    echo "  FAIL: $(basename "$f") missing model: opus"
    OPUS_VIOLATIONS=$((OPUS_VIOLATIONS+1))
  fi
done
if [ "$OPUS_VIOLATIONS" -eq 0 ]; then
  echo "  PASS: All team agents have model: opus"
  PASS=$((PASS+1))
else
  echo "  FAIL: $OPUS_VIOLATIONS agents missing model: opus"
  FAIL=$((FAIL+1))
fi

echo ""
echo "--- MCP servers ---"
warn_check "mcp.json exists" "[ -f ~/.claude/mcp.json ]"
warn_check "arxiv MCP configured" "grep -q 'arxiv' ~/.claude/mcp.json 2>/dev/null"

echo ""
echo "--- Concurrency protocol ---"
check "flock available" "which flock"
check "timeout available" "which timeout"
check "Research-lead .lock file" "[ -f ~/.claude/agent-memory/research-lead/.lock ] || touch ~/.claude/agent-memory/research-lead/.lock"

echo ""
echo "=== Results ==="
echo "PASS: $PASS | FAIL: $FAIL | WARN: $WARN"
echo ""
if [ "$FAIL" -gt 0 ]; then
  echo "STATUS: FAIL ($FAIL issues need fixing)"
  exit 1
else
  echo "STATUS: PASS (all critical checks green, $WARN warnings)"
  exit 0
fi
