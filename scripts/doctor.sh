#!/usr/bin/env bash
# re-forge doctor — verify that bash setup.sh produced a complete install.
# Compares the repo (source-of-truth) against ~/.claude/ (install target) and
# reports drift. Exit 0 if all checks pass; exit 1 if any fail.
#
# Usage:
#   bash scripts/doctor.sh         # check only
#   bash scripts/doctor.sh --fix   # run setup.sh to repair drift, then re-check

set -uo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"

# Colour codes (auto-disabled when not a tty)
if [ -t 1 ]; then
  GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; YELLOW=$'\033[0;33m'; RESET=$'\033[0m'
else
  GREEN=""; RED=""; YELLOW=""; RESET=""
fi

PASS=0; FAIL=0
pass() { printf "  %s✓%s %s\n" "$GREEN" "$RESET" "$1"; PASS=$((PASS+1)); }
fail() { printf "  %s✗%s %s\n" "$RED"   "$RESET" "$1"; FAIL=$((FAIL+1)); }
note() { printf "  %s•%s %s\n" "$YELLOW" "$RESET" "$1"; }

# --- --fix flag ---
if [ "${1:-}" = "--fix" ]; then
  echo "=== re-forge doctor (--fix) ==="
  echo "Running setup.sh to repair drift..."
  bash "$REPO_DIR/setup.sh"
  echo ""
  echo "=== Re-running checks ==="
fi

echo "=== re-forge doctor ==="
echo "Repo:    $REPO_DIR"
echo "Install: $CLAUDE_DIR"
echo ""

# --- check 1: every agents/<team>-team/ in repo has a populated install dir ---
echo "Teams (agents + protocol):"
for team_dir in "$REPO_DIR"/agents/*-team/; do
  [ -d "$team_dir" ] || continue
  repo_team="$(basename "$team_dir")"
  install_team="${repo_team%-team}"
  dst_agents="$CLAUDE_DIR/agents/$install_team"
  expected=$(ls "$team_dir"/*.md 2>/dev/null | grep -v '/PROTOCOL\.md$' | wc -l | tr -d ' ')
  if [ ! -d "$dst_agents" ]; then
    fail "$install_team: $dst_agents missing (expected $expected agents)"
    continue
  fi
  actual=$(ls "$dst_agents"/*.md 2>/dev/null | wc -l | tr -d ' ')
  if [ "$actual" -lt "$expected" ]; then
    fail "$install_team: only $actual / $expected agent files installed"
  else
    pass "$install_team: $actual / $expected agent files installed"
  fi
  # PROTOCOL.md present in repo team dir -> must exist in ~/.claude/teams/<team>/
  if [ -f "$team_dir/PROTOCOL.md" ]; then
    if [ -f "$CLAUDE_DIR/teams/$install_team/PROTOCOL.md" ]; then
      pass "$install_team: PROTOCOL.md installed"
    else
      fail "$install_team: PROTOCOL.md missing from $CLAUDE_DIR/teams/$install_team/"
    fi
  fi
done

# --- check 2: every memory/*.md has a corresponding agent-memory dir ---
echo ""
echo "Memory seeds:"
for src in "$REPO_DIR"/memory/*.md; do
  [ -f "$src" ] || continue
  agent="$(basename "$src" .md)"
  dst="$CLAUDE_DIR/agent-memory/$agent/MEMORY.md"
  if [ -f "$dst" ]; then
    pass "$agent: MEMORY.md present"
  else
    fail "$agent: MEMORY.md missing at $dst"
  fi
done

# --- check 3: settings.json hooks ---
echo ""
echo "settings.json hooks:"
SETTINGS="$CLAUDE_DIR/settings.json"
if [ ! -f "$SETTINGS" ]; then
  fail "$SETTINGS missing — hooks unregistered"
else
  hooks_present=$(python3 -c "
import json
try:
    with open('$SETTINGS') as f:
        s = json.load(f)
    print(','.join(sorted((s.get('hooks') or {}).keys())))
except Exception as e:
    print('ERROR:' + str(e))
" 2>/dev/null)
  case "$hooks_present" in
    ERROR:*) fail "settings.json parse error: ${hooks_present#ERROR:}" ;;
    *)
      for required in Stop PostToolUse; do
        if printf '%s' "$hooks_present" | grep -qw "$required"; then
          pass "$required hook registered"
        else
          fail "$required hook NOT registered in settings.json"
        fi
      done
      if printf '%s' "$hooks_present" | grep -qw SessionStart; then
        pass "SessionStart hook registered (optional)"
      else
        note "SessionStart hook not registered (optional)"
      fi
      ;;
  esac
fi

# --- summary ---
echo ""
echo "=== Summary: ${GREEN}${PASS} pass${RESET} / ${RED}${FAIL} fail${RESET} ==="
if [ "$FAIL" -gt 0 ]; then
  echo "Run 'bash scripts/doctor.sh --fix' to repair drift via setup.sh."
  exit 1
fi
exit 0
