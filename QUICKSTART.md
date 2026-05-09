# claude-forge — 5-minute quickstart

You'll: install claude-forge, dispatch the Research Team on a toy question,
and see a SYNTHESIS file land in your project directory.

## Prereqs (30 seconds to verify)

- Claude Code installed: `claude --version` should print `0.x` or higher.
- `gh` CLI authenticated: `gh auth status` should say "Logged in".
- A directory you don't mind cluttering: `mkdir -p /tmp/cf-demo && cd /tmp/cf-demo`.

You do NOT need: Claude Max (any plan works for the toy run; Opus dispatches
will downgrade gracefully on lower tiers), Python deps, or `uv` (those unlock
advanced features later).

## Install (60 seconds)

```bash
git clone https://github.com/Akasxh/claude-forge.git ~/src/claude-forge
cd ~/src/claude-forge
bash setup.sh
```

The installer copies 6 teams + ~96 reference skills + hooks to `~/.claude/`.
Existing files are backed up to `*.bak-<timestamp>`. **Restart Claude Code now**
(quit and relaunch) so the harness reloads agents and skills.

## Verify install (15 seconds)

```bash
ls ~/.claude/skills/research/SKILL.md         # should exist
ls ~/.claude/agents/research/research-lead.md # should exist
bash ~/.claude/scripts/team_status.sh         # prints empty dashboard
```

## Hello-world: dispatch /research on a toy question (3 minutes)

```bash
cd /tmp/cf-demo
claude
```

In Claude Code, type:

```
/research is the Anthropic claude-skills repo public, and what's in it?
```

This is intentionally narrow — one source, fast SYNTHESIS, low token cost.
You should see (within 2-3 minutes):

1. research-lead reading `~/.claude/agent-memory/research-lead/MEMORY.md`.
2. A workspace appear at `/tmp/cf-demo/.claude/teams/research/<slug>/`.
3. 2-4 specialists dispatched (web-miner, github-miner, librarian, evaluator).
4. A `SYNTHESIS.md` file written to the workspace.
5. The lead prints a summary with confidence score.

### Expected stdout (truncated)

```
Reading agent-memory/research-lead/MEMORY.md (47 lessons loaded)
Slug: anthropic-claude-skills-public
Dispatching: research-web-miner, research-github-miner (parallel)
[research-github-miner] Found anthropics/skills (public, 2.1K stars)
[research-evaluator] Score: 4.5/5 (high confidence)
SYNTHESIS written: .claude/teams/research/anthropic-claude-skills-public/SYNTHESIS.md
```

[SCREENSHOT PLACEHOLDER: terminal showing parallel specialist dispatch + SYNTHESIS path]

## Inspect what happened (30 seconds)

```bash
cat /tmp/cf-demo/.claude/teams/research/*/SYNTHESIS.md | head -40
python3 ~/.claude/scripts/audit_evidence.py anthropic-claude-skills-public --gate=synthesis -v
```

The audit script confirms every required specialist actually ran (no shortcuts).

## What's next

- `/engineer <task>` — implement something (reads a SYNTHESIS as spec if you have one).
- `/security` — audit your repo for CVEs, secrets, threats.
- `/forge` — ask "what capability are we missing?" — get a ranked gap list.
- `bash ~/.claude/scripts/team_status.sh` — see all team sessions across all projects.

Full docs: [README.md](./README.md). Common issues: TROUBLESHOOTING.md (TODO).
