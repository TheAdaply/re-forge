#!/usr/bin/env bash
# re-forge uninstaller — removes exactly what setup.sh installed.
#
# Removes from ~/.claude/: team agent dirs, team protocols, forge tree,
# forge-lead.md, EDD-ADDENDUM.md, re-forge scripts, re-forge hooks, and the
# skills that exist in this repo's skills/ (third-party skills are untouched).
# De-registers the three re-forge hooks from settings.json.
#
# KEPT on purpose: ~/.claude/agent-memory/ (your accumulated lessons — delete
# manually if you really want them gone) and any *.bak-* backups setup.sh made.
#
# Usage:
#   bash scripts/uninstall.sh           # show what would be removed
#   bash scripts/uninstall.sh --force   # actually remove

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"
FORCE="${1:-}"

remove() {
  local target="$1"
  [ -e "$target" ] || return 0
  if [ "$FORCE" = "--force" ]; then
    rm -rf "$target"
    echo "  removed: $target"
  else
    echo "  would remove: $target"
  fi
}

if [ "$FORCE" != "--force" ]; then
  echo "=== re-forge uninstall (DRY RUN — pass --force to apply) ==="
else
  echo "=== re-forge uninstall ==="
fi
echo "Repo:    $REPO_DIR"
echo "Target:  $CLAUDE_DIR"
echo ""

echo "Teams:"
for team_dir in "$REPO_DIR"/agents/*-team/; do
  [ -d "$team_dir" ] || continue
  team="$(basename "$team_dir")"; team="${team%-team}"
  remove "$CLAUDE_DIR/agents/$team"
  remove "$CLAUDE_DIR/teams/$team"
done

echo "Forge + addendum:"
remove "$CLAUDE_DIR/agents/forge-lead.md"
remove "$CLAUDE_DIR/agents/EDD-ADDENDUM.md"
remove "$CLAUDE_DIR/forge"

echo "Scripts:"
for f in "$REPO_DIR"/scripts/*; do
  [ -f "$f" ] && remove "$CLAUDE_DIR/scripts/$(basename "$f")"
done

echo "Hooks:"
for f in "$REPO_DIR"/hooks/*; do
  [ -f "$f" ] && remove "$CLAUDE_DIR/hooks/$(basename "$f")"
done

echo "Skills (only those shipped by this repo):"
for skill_dir in "$REPO_DIR"/skills/*/; do
  skill="$(basename "$skill_dir")"
  remove "$CLAUDE_DIR/skills/$skill"
done

echo "settings.json hook registrations:"
SETTINGS="$CLAUDE_DIR/settings.json"
if [ -f "$SETTINGS" ]; then
  if [ "$FORCE" = "--force" ]; then
    cp "$SETTINGS" "${SETTINGS}.bak-uninstall-$(date +%Y%m%d-%H%M%S)"
    python3 -c "
import json

with open('$SETTINGS') as f:
    settings = json.load(f)

ours = {
    'Stop': 'session-capture.sh',
    'PostToolUse': 'log-evidence-writes.sh',
    'SessionStart': 'evolution-scout.sh',
}
hooks = settings.get('hooks') or {}
for event, marker in ours.items():
    entries = hooks.get(event) or []
    kept = [e for e in entries
            if marker not in json.dumps(e)]
    if len(kept) != len(entries):
        print(f'  de-registered: {event} ({marker})')
    if kept:
        hooks[event] = kept
    else:
        hooks.pop(event, None)
if hooks:
    settings['hooks'] = hooks
else:
    settings.pop('hooks', None)

with open('$SETTINGS', 'w') as f:
    json.dump(settings, f, indent=2)
" || echo "  warning: could not edit settings.json (de-register manually)"
  else
    echo "  would de-register: Stop, PostToolUse, SessionStart (re-forge entries only)"
  fi
else
  echo "  no settings.json — nothing to de-register"
fi

echo ""
echo "Kept (by design): $CLAUDE_DIR/agent-memory/ (your lessons), *.bak-* backups."
if [ "$FORCE" != "--force" ]; then
  echo "Dry run complete. Re-run with --force to apply."
fi
