# Evolution Team Protocol v1

The Evolution Team is re-forge's **self-evolving watch team**. Its sole purpose
is to keep the workforce ahead of a fast-moving ecosystem (Claude Code, Cursor,
Codex, OpenCode and other coding agents ship changes weekly) and to find gaps in
our own workflow, skills, and agent orchestration before they cost us.

It does not ship product code or answer research questions. It produces one thing:
an evidence-backed **STRATEGY.md** — what to adopt, what to drop, what to rebuild,
and which PROTOCOL/skill changes to make — ranked by impact and effort.

## Scope model

- **Global infra**: `~/.claude/agents/evolution/`, `~/.claude/teams/evolution/PROTOCOL.md`,
  `~/.claude/agent-memory/evolution-lead/`.
- **Per-project sessions**: `<cwd>/.claude/teams/evolution/<slug>/`.

## Roster

| Role | Agent | Failure mode owned | Mode |
|---|---|---|---|
| Orchestrator | `evolution-lead` | FM-1.1 mis-scoped watch | all |
| Upstream scout | `evolution-scout` | FM-3.3 stale knowledge | A |
| Session shadow | `evolution-shadow` | FM-2.5 invisible workflow gaps | B |
| Orchestration analyst | `evolution-orchestration-analyst` | FM-1.2 dispatch inefficiency | C |
| Strategist | `evolution-strategist` | FM-3.2 unprioritized backlog | all |
| Evaluator (gate) | `evolution-evaluator` | FM-3.2 ungated recommendation | all |
| Retrospector | `evolution-retrospector` | no cross-session learning | close |
| Scribe (curator) | `evolution-scribe` | memory drift | close |

## Model contract

Every agent is `model: opus` + `effort: max`. No downgrades.

## The three modes (always at least one runs)

### Mode A — Scout (always available, the "always-on" beat)
The scout monitors upstream sources and reports diffs since the last watch. This
mode is what the cron schedule and the `evolution-scout` hook trigger. It needs
no user prompt — "what changed upstream since last watch?" is always answerable.

Sources (STRONG-PRIMARY only):
- Claude Code: official changelog / release notes / docs.
- Cursor: changelog / release notes.
- Codex, OpenCode, and other coding agents: release tags / changelogs.
- Anthropic skills + MCP Registry for new primitives.

The scout writes `EVIDENCE/scout.md` with a dated diff and a "relevance to
re-forge" tag on each item (changes-how-we-build | new-primitive | noise).

### Mode B — Shadow (the "shadowing the workers" beat)
Shadow agents attach to live or just-closed sessions of OTHER teams (research,
engineering, security, testing, docs). They read the target's `EVIDENCE/`,
`SYNTHESIS.md`, and `LOG.md` and ask: where did the workflow stall, repeat work,
skip a gate, or miss a primitive that exists upstream?

Shadowing is launched as a **background Agent** (`run_in_background: true`) during
long sessions so it observes without blocking the workers, then writes
`EVIDENCE/shadow-<target>.md`. It never edits the target's files.

### Mode C — Orchestration audit
The analyst inspects recent sessions across all teams (via `team_status.sh`
output + `LOG.md` dispatch lines) for: under-used specialists, redundant
dispatches, gates that were skipped, and tier mis-classification. Output:
`EVIDENCE/orchestration.md`.

## Round structure

- **Round 0**: lead reads MEMORY.md, picks mode(s), writes `WATCH.md` (what we're
  watching and why) + `EXPECTED_SIGNALS.md` (what a real finding looks like).
- **Round 1**: scout / shadow / analyst run (in parallel where independent).
- **Round 2**: strategist synthesizes findings into a ranked `STRATEGY.md`
  (impact × effort), each row citing its evidence file + a STRONG-PRIMARY source.
- **Gate**: `evolution-evaluator` scores STRATEGY.md on a 5-dim rubric
  (grounding, impact, feasibility, non-duplication, clarity). Anything < PASS is
  returned with notes, never promoted.
- **Close**: retrospector → `staging/<slug>.md`; scribe merges to MEMORY.md using
  the canonical flock+timeout+atomic-rename pattern (see engineering PROTOCOL
  § "Parallel-instance memory segregation").

## File schema (session workspace)

```
<cwd>/.claude/teams/evolution/<slug>/
├── WATCH.md                 # scope + trigger
├── EXPECTED_SIGNALS.md      # what a real finding looks like
├── EVIDENCE/
│   ├── scout.md             # upstream diffs (Mode A)
│   ├── shadow-<target>.md   # per shadowed session (Mode B)
│   ├── orchestration.md     # dispatch audit (Mode C)
│   ├── evaluator.md         # gate rubric
│   └── retrospector.md
├── STRATEGY.md              # ranked adoption/drop/rebuild list (the deliverable)
└── LOG.md
```

## Handoffs

- **To Capability Forge**: for each "AUTHOR a skill" item, write
  `~/.claude/forge/research-requests/<slug>.md` describing the gap + the
  STRONG-PRIMARY source, then let the user invoke `/forge`.
- **To other team leads**: PROTOCOL/skill change proposals live in STRATEGY.md
  under `## Proposed PROTOCOL changes`. The Evolution Team never edits another
  team's files — it proposes; the owning lead applies.

## Always-on realization (honest)

Claude Code is session-based; there is no true daemon. "Always running" is
realized as:
1. **Hook** `hooks/evolution-scout.sh` (SessionStart) — stamps a watch-due marker
   when the last scout is older than the cadence.
2. **Cron** entries documented in `scripts/setup-schedules.sh` — daily scout,
   weekly orchestration audit.
3. **Background shadow Agents** spawned during long research/engineering sessions.

## Audit gate

Run `python3 ~/.claude/scripts/audit_evidence.py <slug> --gate=synthesis -v`
against STRATEGY.md to confirm scout + (shadow|orchestration) + evaluator all
produced evidence before the strategy is trusted.
