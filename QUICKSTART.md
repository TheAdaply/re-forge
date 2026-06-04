# re-forge — 5-minute quickstart

You'll: install re-forge, dispatch the Research Team on a toy question,
and see a SYNTHESIS file land in your project directory.

## Prereqs (30 seconds to verify)

- Claude Code installed: `claude --version` prints a version.
- `gh` CLI authenticated: `gh auth status` says "Logged in".
- A directory you don't mind cluttering: `mkdir -p /tmp/rf-demo && cd /tmp/rf-demo`.

You do NOT need: Claude Max (any plan works for the toy run; Opus dispatches
downgrade to your plan's strongest model), Python deps, or `uv` (those unlock
advanced features later).

## Install (60 seconds)

Run the canonical install block from the [README](./README.md#installation):
clone `Akasxh/re-forge`, then `bash setup.sh`, then `bash scripts/doctor.sh`.

The installer copies 6 teams + 127 skills + hooks to `~/.claude/`; doctor
exits 0 only when the install is complete. **Restart Claude Code now**
(quit and relaunch) so the harness reloads agents and skills.

## Verify install (15 seconds)

```bash
bash scripts/doctor.sh                 # from your re-forge clone: must print 0 fail
bash ~/.claude/scripts/team_status.sh  # prints an empty dashboard before first dispatch
```

## Hello-world: dispatch /research on a toy question (3 minutes)

```bash
cd /tmp/rf-demo
claude
```

In Claude Code, type:

```
/research is the Anthropic claude-skills repo public, and what's in it?
```

This is intentionally narrow — one source, fast SYNTHESIS, low token cost.
You should see (typically within 2–3 minutes):

1. research-lead reading `~/.claude/agent-memory/research-lead/MEMORY.md`.
2. A workspace appear at `/tmp/rf-demo/.claude/teams/research/<slug>/`.
3. 2–4 specialists dispatched (web-miner, github-miner, librarian, evaluator).
4. A `SYNTHESIS.md` file written to the workspace.
5. The lead prints a summary with confidence score.

### Illustrative output (shape only — your numbers and findings will differ)

```
Reading agent-memory/research-lead/MEMORY.md (N lessons loaded)
Slug: anthropic-claude-skills-public
Dispatching: research-web-miner, research-github-miner (parallel)
[research-github-miner] Found anthropics/skills (public)
[research-evaluator] Score: <x>/5
SYNTHESIS written: .claude/teams/research/anthropic-claude-skills-public/SYNTHESIS.md
```

## Inspect what happened (30 seconds)

```bash
cat /tmp/rf-demo/.claude/teams/research/*/SYNTHESIS.md | head -40
python3 ~/.claude/scripts/audit_evidence.py anthropic-claude-skills-public --gate=synthesis -v
```

The audit script confirms every required specialist actually ran (no shortcuts).

## What's next

- `/engineer <task>` — implement something (reads a SYNTHESIS as spec if you have one).
- `/security` — audit your repo for CVEs, secrets, threats.
- `/forge` — ask "what capability are we missing?" — get a ranked gap list.
- `bash ~/.claude/scripts/team_status.sh` — see all team sessions across all projects.

Full docs: [README.md](./README.md). Something broken? See the README's
[Troubleshooting](./README.md#troubleshooting) section (`scripts/doctor.sh --fix`
repairs install drift).
