#!/usr/bin/env bash
# re-forge installer (v0.4)
# Copies agents, protocols, scripts, hooks, skills, and forge to ~/.claude/
# Backs up existing files before overwriting.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
BACKUP_TS="$(date +%Y%m%d-%H%M%S)"

echo "=== re-forge installer ==="
echo "Source:  $SCRIPT_DIR"
echo "Target:  $CLAUDE_DIR"
echo ""

# --- helpers ---
backup_if_exists() {
  # Backs up $target before overwrite — but only when $2 (the incoming file)
  # actually differs, so re-running setup.sh is idempotent instead of
  # spraying .bak-<timestamp> copies on every run.
  local target="$1" incoming="${2:-}"
  if [ -e "$target" ]; then
    if [ -n "$incoming" ] && [ -f "$target" ] && cmp -s "$incoming" "$target"; then
      return 0  # identical content: nothing to back up
    fi
    if [ -n "$incoming" ] && [ -d "$target" ] && [ -d "$incoming" ] && diff -rq "$incoming" "$target" >/dev/null 2>&1; then
      return 0  # identical directory tree: nothing to back up
    fi
    local backup="${target}.bak-${BACKUP_TS}"
    echo "  backup: $(basename "$target") -> $(basename "$backup")"
    cp -r "$target" "$backup"
  fi
}

copy_dir() {
  local src="$1" dst="$2"
  mkdir -p "$dst"
  if [ -d "$src" ]; then
    cp -r "$src"/. "$dst"/
    echo "  copied: $src -> $dst"
  fi
}

copy_file() {
  local src="$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  if [ -f "$src" ]; then
    backup_if_exists "$dst" "$src"
    cp "$src" "$dst"
    echo "  copied: $(basename "$src")"
  fi
}

# Map repo team dir name (e.g. "research-team") to install dir name (e.g. "research").
team_install_name() {
  local repo_team="$1"
  echo "${repo_team%-team}"
}

# True (0) when any persona file in $1 differs from its installed copy in $2,
# so the team-dir backup only fires when this run will actually change something.
team_files_differ() {
  local src_dir="$1" dst_dir="$2" f base
  [ -d "$dst_dir" ] || return 0
  for f in "$src_dir"*.md; do
    [ -f "$f" ] || continue
    base="$(basename "$f")"
    [ "$base" = "PROTOCOL.md" ] && continue
    cmp -s "$f" "$dst_dir/$base" || return 0
  done
  return 1
}

# --- agents ---
# Loop over EVERY agents/*-team/ in the repo so adding a new team in agents/
# does not require editing setup.sh. Each team installs its persona files to
# ~/.claude/agents/<team>/ and its PROTOCOL.md to ~/.claude/teams/<team>/.
echo "Installing agents..."
mkdir -p "$CLAUDE_DIR/teams"
installed_teams=()
for team_dir in "$SCRIPT_DIR"/agents/*-team/; do
  [ -d "$team_dir" ] || continue
  repo_team="$(basename "$team_dir")"
  install_team="$(team_install_name "$repo_team")"
  dst_agents="$CLAUDE_DIR/agents/$install_team"
  dst_protocol_dir="$CLAUDE_DIR/teams/$install_team"
  echo "  team: $repo_team -> $install_team"
  if team_files_differ "$team_dir" "$dst_agents"; then
    backup_if_exists "$dst_agents"
  fi
  mkdir -p "$dst_agents"
  # Persona files (everything except PROTOCOL.md)
  for f in "$team_dir"*.md; do
    [ -f "$f" ] || continue
    [ "$(basename "$f")" = "PROTOCOL.md" ] && continue
    cp "$f" "$dst_agents/$(basename "$f")"
  done
  # Protocol file
  if [ -f "$team_dir/PROTOCOL.md" ]; then
    mkdir -p "$dst_protocol_dir"
    copy_file "$team_dir/PROTOCOL.md" "$dst_protocol_dir/PROTOCOL.md"
  fi
  installed_teams+=("$install_team")
done

# Forge lead (single file, not a team subdir)
# EDD-ADDENDUM.md is cited as the binding Eval-Driven Development contract by
# ~69 personas ("This team follows agents/EDD-ADDENDUM.md") — it must reach
# the install tree or every one of those references dangles.
if [ -f "$SCRIPT_DIR/agents/EDD-ADDENDUM.md" ]; then
  copy_file "$SCRIPT_DIR/agents/EDD-ADDENDUM.md" "$CLAUDE_DIR/agents/EDD-ADDENDUM.md"
fi

if [ -f "$SCRIPT_DIR/agents/forge/forge-lead.md" ]; then
  copy_file "$SCRIPT_DIR/agents/forge/forge-lead.md" "$CLAUDE_DIR/agents/forge-lead.md"
fi

# --- scripts ---
echo "Installing scripts..."
mkdir -p "$CLAUDE_DIR/scripts"
for f in "$SCRIPT_DIR"/scripts/*; do
  [ -f "$f" ] && copy_file "$f" "$CLAUDE_DIR/scripts/$(basename "$f")"
done
chmod +x "$CLAUDE_DIR/scripts/"*.sh 2>/dev/null || true
chmod +x "$CLAUDE_DIR/scripts/"*.py 2>/dev/null || true

# --- hooks ---
echo "Installing hooks..."
mkdir -p "$CLAUDE_DIR/hooks"
for f in "$SCRIPT_DIR"/hooks/*; do
  [ -f "$f" ] && copy_file "$f" "$CLAUDE_DIR/hooks/$(basename "$f")"
done
chmod +x "$CLAUDE_DIR/hooks/"*.sh 2>/dev/null || true

# --- memory seeds ---
# Loop over EVERY memory/*.md so a new <team>-lead.md memory seed in repo
# automatically reaches ~/.claude/agent-memory/<team>-lead/MEMORY.md.
echo "Installing memory seeds..."
seeded_agents=()
for src in "$SCRIPT_DIR"/memory/*.md; do
  [ -f "$src" ] || continue
  agent="$(basename "$src" .md)"
  dst="$CLAUDE_DIR/agent-memory/$agent/MEMORY.md"
  mkdir -p "$(dirname "$dst")"
  if [ -f "$dst" ]; then
    echo "  skip (exists): $agent/MEMORY.md"
  else
    cp "$src" "$dst"
    echo "  seeded: $agent/MEMORY.md"
  fi
  seeded_agents+=("$agent")
done

# Create staging dirs for every memory-seeded lead
for agent in "${seeded_agents[@]}"; do
  mkdir -p "$CLAUDE_DIR/agent-memory/$agent/staging"
done

# --- forge ---
echo "Installing Capability Forge..."
if [ -d "$SCRIPT_DIR/agents/forge" ]; then
  mkdir -p "$CLAUDE_DIR/forge/.claude-plugin"
  [ -f "$SCRIPT_DIR/agents/forge/plugin.json" ] && \
    copy_file "$SCRIPT_DIR/agents/forge/plugin.json" "$CLAUDE_DIR/forge/.claude-plugin/plugin.json"
  for skill_dir in "$SCRIPT_DIR"/agents/forge/skills/*/; do
    skill_name=$(basename "$skill_dir")
    mkdir -p "$CLAUDE_DIR/forge/skills/$skill_name"
    [ -f "$skill_dir/SKILL.md" ] && \
      copy_file "$skill_dir/SKILL.md" "$CLAUDE_DIR/forge/skills/$skill_name/SKILL.md"
  done
fi

# Create forge working dirs
mkdir -p "$CLAUDE_DIR/forge/drafts" "$CLAUDE_DIR/forge/outputs" \
  "$CLAUDE_DIR/forge/workspaces" "$CLAUDE_DIR/forge/gap-reports" \
  "$CLAUDE_DIR/forge/scout-reports" "$CLAUDE_DIR/forge/research-requests" \
  "$CLAUDE_DIR/forge/registry-cache"

# --- skills ---
echo "Installing skills..."
if [ -d "$SCRIPT_DIR/skills" ]; then
  for skill_dir in "$SCRIPT_DIR"/skills/*/; do
    skill_name=$(basename "$skill_dir")
    mkdir -p "$CLAUDE_DIR/skills/$skill_name"
    [ -f "$skill_dir/SKILL.md" ] && \
      copy_file "$skill_dir/SKILL.md" "$CLAUDE_DIR/skills/$skill_name/SKILL.md"
  done
fi

# --- hooks registration in settings.json ---
echo "Registering hooks in settings.json..."
SETTINGS="$CLAUDE_DIR/settings.json"
if [ -f "$SETTINGS" ]; then
  # Merge hooks using Python
  python3 -c "
import json, sys

with open('$SETTINGS') as f:
    settings = json.load(f)

hooks = settings.setdefault('hooks', {})

# Add Stop hook if missing
if 'Stop' not in hooks:
    hooks['Stop'] = [{'matcher': '', 'hooks': [{'type': 'command', 'command': '\$HOME/.claude/hooks/session-capture.sh'}]}]
    print('  added: Stop hook')

# Add PostToolUse hook if missing
if 'PostToolUse' not in hooks:
    hooks['PostToolUse'] = [{'matcher': 'Write|Edit', 'hooks': [{'type': 'command', 'command': '\$HOME/.claude/hooks/log-evidence-writes.sh'}]}]
    print('  added: PostToolUse hook')

# Add SessionStart hook (Evolution Team upstream-watch beat) if missing
if 'SessionStart' not in hooks:
    hooks['SessionStart'] = [{'matcher': '', 'hooks': [{'type': 'command', 'command': '\$HOME/.claude/hooks/evolution-scout.sh'}]}]
    print('  added: SessionStart hook (evolution-scout)')

with open('$SETTINGS', 'w') as f:
    json.dump(settings, f, indent=2)
" 2>/dev/null || echo "  warning: could not merge hooks into settings.json (merge manually)"
else
  # No settings.json yet (fresh machine): create a minimal one carrying only
  # our hooks. Nothing is clobbered — the file did not exist.
  python3 -c "
import json

settings = {
    'hooks': {
        'Stop': [{'matcher': '', 'hooks': [{'type': 'command', 'command': '\$HOME/.claude/hooks/session-capture.sh'}]}],
        'PostToolUse': [{'matcher': 'Write|Edit', 'hooks': [{'type': 'command', 'command': '\$HOME/.claude/hooks/log-evidence-writes.sh'}]}],
        'SessionStart': [{'matcher': '', 'hooks': [{'type': 'command', 'command': '\$HOME/.claude/hooks/evolution-scout.sh'}]}],
    }
}

with open('$SETTINGS', 'w') as f:
    json.dump(settings, f, indent=2)
print('  created: settings.json with Stop + PostToolUse + SessionStart hooks')
" 2>/dev/null || echo "  warning: could not create settings.json (register hooks manually)"
fi

# --- verification ---
echo ""
echo "=== Verification ==="
for team in "${installed_teams[@]}"; do
  count=$(ls "$CLAUDE_DIR/agents/$team/"*.md 2>/dev/null | wc -l | tr -d ' ')
  printf "  %-22s %s agents\n" "$team:" "$count"
done
forge_skill_count=$(ls "$CLAUDE_DIR/forge/skills/"*/SKILL.md 2>/dev/null | wc -l | tr -d ' ')
script_count=$(ls "$CLAUDE_DIR/scripts/" 2>/dev/null | wc -l | tr -d ' ')
hook_count=$(ls "$CLAUDE_DIR/hooks/" 2>/dev/null | wc -l | tr -d ' ')
printf "  %-22s %s\n" "Forge skills:"  "$forge_skill_count"
printf "  %-22s %s\n" "Scripts:"       "$script_count"
printf "  %-22s %s\n" "Hooks:"         "$hook_count"

echo ""
echo "Run 'bash scripts/doctor.sh' to verify the install end-to-end."
echo ""
echo "=== Done ==="
echo "Restart Claude Code to pick up the new agents and hooks."
echo "Then try: claude  ->  'research how X works'"
