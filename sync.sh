#!/usr/bin/env bash
# sync.sh — Pull latest ~/.claude/ infrastructure into the repo for pushing.
# Copies ONLY the generic framework (agents, protocols, skills, scripts, hooks, forge).
# NEVER copies project-specific content (session workspaces, project memory, caches).
#
# Usage:
#   bash sync.sh          # sync + show diff
#   bash sync.sh --push   # sync + commit + push

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

echo "=== re-forge sync ==="
echo "From: $CLAUDE_DIR"
echo "To:   $REPO_DIR"
echo ""

# --- Research Team ---
echo "Syncing research team..."
mkdir -p "$REPO_DIR/agents/research-team"
cp "$CLAUDE_DIR/agents/research/"*.md "$REPO_DIR/agents/research-team/"
cp "$CLAUDE_DIR/teams/research/PROTOCOL.md" "$REPO_DIR/agents/research-team/PROTOCOL.md"

# --- Engineering Team ---
echo "Syncing engineering team..."
mkdir -p "$REPO_DIR/agents/engineering-team"
cp "$CLAUDE_DIR/agents/engineering/"*.md "$REPO_DIR/agents/engineering-team/"
cp "$CLAUDE_DIR/teams/engineering/PROTOCOL.md" "$REPO_DIR/agents/engineering-team/PROTOCOL.md"

# --- Docs Team ---
echo "Syncing docs team..."
mkdir -p "$REPO_DIR/agents/docs-team"
cp "$CLAUDE_DIR/agents/docs/"*.md "$REPO_DIR/agents/docs-team/" 2>/dev/null || true
cp "$CLAUDE_DIR/teams/docs/PROTOCOL.md" "$REPO_DIR/agents/docs-team/PROTOCOL.md" 2>/dev/null || true

# --- Testing Team ---
echo "Syncing testing team..."
mkdir -p "$REPO_DIR/agents/testing-team"
cp "$CLAUDE_DIR/agents/testing/"*.md "$REPO_DIR/agents/testing-team/" 2>/dev/null || true
cp "$CLAUDE_DIR/teams/testing/PROTOCOL.md" "$REPO_DIR/agents/testing-team/PROTOCOL.md" 2>/dev/null || true

# --- Security Team ---
echo "Syncing security team..."
mkdir -p "$REPO_DIR/agents/security-team"
cp "$CLAUDE_DIR/agents/security/"*.md "$REPO_DIR/agents/security-team/" 2>/dev/null || true
cp "$CLAUDE_DIR/teams/security/PROTOCOL.md" "$REPO_DIR/agents/security-team/PROTOCOL.md" 2>/dev/null || true

# --- Evolution Team ---
echo "Syncing evolution team..."
mkdir -p "$REPO_DIR/agents/evolution-team"
cp "$CLAUDE_DIR/agents/evolution/"*.md "$REPO_DIR/agents/evolution-team/" 2>/dev/null || true
cp "$CLAUDE_DIR/teams/evolution/PROTOCOL.md" "$REPO_DIR/agents/evolution-team/PROTOCOL.md" 2>/dev/null || true

# --- Forge ---
echo "Syncing forge..."
mkdir -p "$REPO_DIR/agents/forge"
cp "$CLAUDE_DIR/agents/forge-lead.md" "$REPO_DIR/agents/forge/forge-lead.md" 2>/dev/null || true
cp "$CLAUDE_DIR/forge/.claude-plugin/plugin.json" "$REPO_DIR/agents/forge/plugin.json" 2>/dev/null || true
for skill in gap scout draft test promote; do
  mkdir -p "$REPO_DIR/agents/forge/skills/$skill"
  cp "$CLAUDE_DIR/forge/skills/$skill/SKILL.md" "$REPO_DIR/agents/forge/skills/$skill/SKILL.md" 2>/dev/null || true
done

# --- Scripts ---
echo "Syncing scripts..."
mkdir -p "$REPO_DIR/scripts"
cp "$CLAUDE_DIR/scripts/audit_evidence.py" "$REPO_DIR/scripts/" 2>/dev/null || true
cp "$CLAUDE_DIR/scripts/team_status.sh" "$REPO_DIR/scripts/" 2>/dev/null || true

# --- Hooks ---
echo "Syncing hooks..."
mkdir -p "$REPO_DIR/hooks"
cp "$CLAUDE_DIR/hooks/"*.sh "$REPO_DIR/hooks/" 2>/dev/null || true

# --- Skills (authored, not marketplace) ---
# Only skills that already exist in the repo are pulled back. Anything else in
# ~/.claude/skills/ (marketplace installs, personal one-offs) stays out, so a
# `--push` can never leak third-party or private skills into the public repo.
# New first-party skills are added by committing them to skills/ first.
echo "Syncing skills..."
for skill_dir in "$CLAUDE_DIR/skills/"*/; do
  skill_name=$(basename "$skill_dir")
  if [ -f "$skill_dir/SKILL.md" ] && [ -d "$REPO_DIR/skills/$skill_name" ]; then
    cp "$skill_dir/SKILL.md" "$REPO_DIR/skills/$skill_name/SKILL.md"
  fi
done

# --- Memory seeds (sanitized — no project-specific content) ---
echo "Syncing memory seeds..."
mkdir -p "$REPO_DIR/memory"
for agent in research-lead engineering-lead forge-lead research-retrospector docs-lead testing-lead security-lead evolution-lead; do
  src="$CLAUDE_DIR/agent-memory/$agent/MEMORY.md"
  dst="$REPO_DIR/memory/$agent.md"
  if [ -f "$src" ]; then
    cp "$src" "$dst"
  fi
done

# --- Verification ---
echo ""
echo "=== Verification ==="
echo -n "Research agents:    "; ls "$REPO_DIR/agents/research-team/"*.md 2>/dev/null | wc -l
echo -n "Engineering agents: "; ls "$REPO_DIR/agents/engineering-team/"*.md 2>/dev/null | wc -l
echo -n "Docs agents:        "; ls "$REPO_DIR/agents/docs-team/"*.md 2>/dev/null | wc -l
echo -n "Testing agents:     "; ls "$REPO_DIR/agents/testing-team/"*.md 2>/dev/null | wc -l
echo -n "Security agents:    "; ls "$REPO_DIR/agents/security-team/"*.md 2>/dev/null | wc -l
echo -n "Evolution agents:   "; ls "$REPO_DIR/agents/evolution-team/"*.md 2>/dev/null | wc -l
echo -n "Forge skills:       "; ls "$REPO_DIR/agents/forge/skills/"*/SKILL.md 2>/dev/null | wc -l
echo -n "User skills:        "; ls "$REPO_DIR/skills/"*/SKILL.md 2>/dev/null | wc -l
echo -n "Scripts:            "; ls "$REPO_DIR/scripts/" 2>/dev/null | wc -l
echo -n "Hooks:              "; ls "$REPO_DIR/hooks/" 2>/dev/null | wc -l
echo -n "Memory seeds:       "; ls "$REPO_DIR/memory/"*.md 2>/dev/null | wc -l

# --- NEVER sync these (project-specific) ---
# ~/.claude/teams/*/INDEX.md          (per-project session index)
# ~/.claude/teams/*/<slug>/           (per-project session workspaces)
# ~/.claude/agent-memory/*/staging/   (per-session lesson deltas)
# ~/.claude/agent-memory/*/topic/     (per-project topic files)
# ~/.claude/plugins/                  (user's installed plugins, not portable)
# ~/.claude/settings.json             (user's personal settings)
# ~/.claude/settings.local.json       (user's local overrides)
# ~/.claude/projects/                 (Claude Code internal state)
# ~/.claude/mcp.json                  (user's MCP config, may have local paths)

echo ""
echo "=== What was NOT synced (project-specific, intentionally excluded) ==="
echo "  - Session workspaces (~/.claude/teams/*/<slug>/)"
echo "  - Session indexes (~/.claude/teams/*/INDEX.md)"
echo "  - Staging files (~/.claude/agent-memory/*/staging/)"
echo "  - Topic files (~/.claude/agent-memory/*/topic/)"
echo "  - Installed plugins (~/.claude/plugins/)"
echo "  - Settings (~/.claude/settings.json)"
echo "  - MCP config (~/.claude/mcp.json)"
echo "  - Claude Code internal state (~/.claude/projects/)"

# --- Optional: commit + push ---
if [ "${1:-}" = "--push" ]; then
  echo ""
  echo "=== Committing + pushing ==="
  cd "$REPO_DIR"

  # Set git identity
  bash "$CLAUDE_DIR/lib/git-identity.sh" 2>/dev/null || true
  gh auth switch --user Akasxh 2>/dev/null || true
  git config user.name "Akasxh"
  git config user.email "Akasxh@users.noreply.github.com"

  git add -A

  CHANGES=$(git diff --cached --stat | tail -1)
  if [ -z "$CHANGES" ]; then
    echo "No changes to push."
    exit 0
  fi

  echo "Changes: $CHANGES"
  git commit -m "sync: update re-forge from ~/.claude/ $(date -I)

Synced agents, protocols, skills, scripts, hooks, and memory seeds.
No project-specific content included.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"

  git push origin main
  echo "Pushed to github.com/Akasxh/re-forge"
fi

echo ""
echo "=== Done ==="
echo "To commit + push: bash sync.sh --push"
