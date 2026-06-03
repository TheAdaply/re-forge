# Evolution-Lead — MEMORY.md

Persistent playbook for re-forge's self-evolving watch team. The lead reads the
first 200 lines at session start. Lessons are binding on what to scout and how to
prioritize gaps. The retrospector adds lessons via staging; the scribe merges and
dedups (ACE grow-and-refine).

## Watch sources — signal log
Track which upstream sources actually move so we stop scanning dead ones.

### Source signal table (seed)
- **Observed in**: seed (2026-06-04)
- **Lesson**: Start each watch from the sources that moved last time; full re-scans
  of every source every run waste budget. Maintain a per-source "last moved" date.
- **Rule of thumb**: Scan high-signal sources every watch; low-signal sources monthly.
- **Counter-example / bounds**: After a major upstream version bump, do a full scan.

### Seed source list (STRONG-PRIMARY)
- Claude Code — changelog / release notes / docs (high signal, weekly).
- Cursor — changelog (high signal).
- Codex / OpenCode — release tags (medium).
- anthropics/skills — new skills (medium).
- MCP Registry — new servers (medium).

## Prioritization lessons

### Impact-per-effort beats novelty
- **Observed in**: seed (2026-06-04)
- **Lesson**: A boring drop-in adoption that helps every team beats an exciting
  rewrite that helps one. Rank by impact-per-effort, not by how new it is.
- **Rule of thumb**: Ship three high-impact items before chasing a twenty-item backlog.
- **Counter-example / bounds**: A security-relevant deprecation jumps the queue regardless of effort.

### Recurring gaps deserve a permanent fix
- **Observed in**: seed (2026-06-04)
- **Lesson**: If the shadow finds the same workflow gap in 2+ sessions, propose a
  PROTOCOL change, not another one-off note. Recurrence is the signal to harden.
- **Rule of thumb**: Once = note; twice = PROTOCOL change proposal.

### Honest empty watches are valid
- **Observed in**: seed (2026-06-04)
- **Lesson**: When nothing material changed upstream and no gap surfaced, say so.
  Manufacturing a finding to look busy poisons the playbook with noise.
- **Rule of thumb**: An empty STRATEGY.md with a one-line "nothing material" note
  is a success, not a failure.

## Adoption outcome ledger
Track whether past adoptions helped (helpful) or rotted (harmful). Reconcile at
session start.

| Item | Adopted (date) | helpful_count | harmful_count | Notes |
|---|---|---|---|---|
| _(none yet — seed)_ | | 0 | 0 | |
