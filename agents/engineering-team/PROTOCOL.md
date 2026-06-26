# Engineering Team Protocol v1

The Engineering Team is the second fully-collaborative subagent team in this
setup. It is a **leader + 12 specialists** hierarchy, **all running on
Opus with `effort: max`** (hard contract, no downgrades ever), coordinating
through **files on disk** and implementing research recommendations with
full adversarial gate coverage.

This document is the contract every team member reads before acting.

## Scope model (v1.1)

The Engineering Team separates global infrastructure from per-project sessions:

**Global (~/.claude/) — shared across all projects:**
- `~/.claude/teams/engineering/PROTOCOL.md` — this document
- `~/.claude/agents/engineering/*.md` — all 13 agent personas
- `~/.claude/agent-memory/engineering-lead/` — institutional memory (cross-project)
- `~/.claude/scripts/` — audit_evidence.py, team_status.sh
- `~/.claude/hooks/` — PostToolUse evidence-write logger

**Per-project (<cwd>/.claude/) — isolated per project directory:**
- `.claude/teams/engineering/INDEX.md` — session index for THIS project only
- `.claude/teams/engineering/<slug>/` — all session artifacts (CHARTER, PLAN, EVIDENCE/, DIFF_LOG, VERIFY_LOG, LOG, etc.)

This means:
- When you switch to a vLLM repo, engineering sessions about vLLM live under
  that repo's `.claude/teams/engineering/`, not mixed with other projects.
- Institutional lessons in `~/.claude/agent-memory/engineering-lead/MEMORY.md`
  transfer across projects — a lesson learned on project A helps project B.
- Protocols are shared — the v1.1 protocol applies everywhere.
- Cross-team handoffs (research SYNTHESIS → engineering CHARTER) work per-project:
  both sessions typically share the same CWD, so paths resolve naturally.
  If the research session was in a different project, cite the full path explicitly.

## What this team does

Research Team produces SYNTHESIS.md with evidence-backed recommendations.
Engineering Team takes those recommendations and ships code. The two teams
connect via the cross-team handoff protocol.

Engineering Team v1 is designed for **implementation tasks** — writing,
modifying, and verifying code — not for research or investigation. The
research team handles investigation; engineering handles execution.

## Roster (12 specialists + 1 lead)

| Role | Agent name | MAST ownership | Phase | Notes |
|---|---|---|---|---|
| Leader | `engineering-lead` | FM-1.1, FM-1.5, FM-2.2 | all | orchestrator |
| Decomposer | `engineering-planner` | FM-1.1 | Phase A | task decomposition |
| Architect | `engineering-architect` | FM-1.2 | Phase A | design commitments |
| Executor | `engineering-executor` | FM-1.2, FM-2.3 | Phase B | implementation |
| Verifier | `engineering-verifier` | FM-2.6, FM-3.2 | Phase B | fresh test output |
| Reviewer | `engineering-reviewer` | FM-2.3, FM-3.3 | Phase B | spec compliance |
| Debugger | `engineering-debugger` | FM-3.3 | Phase B conditional | root cause |
| Plan-skeptic | `engineering-skeptic` | FM-3.3 | plan-gate | attacks reasoning |
| Plan-adversary | `engineering-adversary` | FM-3.3 | plan-gate | attacks corpus |
| Moderator | `engineering-moderator` | FM-2.5 | conditional | contradiction resolution |
| Evaluator | `engineering-evaluator` | FM-3.1, FM-3.2 | close gate | 5-dim rubric |
| Retrospector | `engineering-retrospector` | cross-session | close | staging writes |
| Scribe | `engineering-scribe` | FM-1.4, FM-2.1, FM-2.4 | close | MEMORY.md merge |

## Model contract (non-negotiable)

Every agent in this team runs on `opus` with `effort: max`.
This is enforced at the frontmatter level; it is not a prose aspiration.
If you see an agent file in `~/.claude/agents/engineering/` without these
two fields, it is a bug — report it to the lead and do not proceed.

## Execution model

Claude Code subagents cannot spawn other subagents. There are two valid
ways to run this team:

1. **Main-thread invocation** (`claude --agent engineering-lead`): the lead
   is the main thread and dispatches specialists via the `Agent` tool.
2. **Adopted persona** (default when invoked via Agent from another session):
   the lead reads each specialist's persona as a behavioral contract and
   executes its method directly, writing outputs to the specialist's evidence
   files. The protocol's gates still hold; they are procedural, not
   tool-dependent.

## Build-session preflight & concurrency safety (v1.2)

Two cheap pre-build checks, added after a session where an `ENOSPC`
(disk-full) stalled a build, the stall was misread as a *dead* workflow, and a
DUPLICATE build was launched on the same tree — roughly doubling token spend
and forcing one executor to *verify rather than author* bytes the other had
already written.

### Disk preflight (before CHARTER.md)

A build streams evidence, diffs, logs, and often a test sandbox to disk. On a
full volume those writes fail *mid-iteration*, so the session looks hung rather
than erroring cleanly. The lead checks free space first and refuses to dispatch
onto a full disk:

```bash
# FAIL preflight if the cwd volume has < 1 GiB free (portable: macOS + Linux).
avail=$(df -Pk . | awk 'NR==2 {print $4}')   # KiB available
[ "${avail:-0}" -ge 1048576 ] || {
  echo "PREFLIGHT FAIL: < 1 GiB free on this volume — free space before dispatching a build"
  exit 1
}
```

Record the verdict in `LOG.md`. A clean refusal is cheaper than a half-written
session that has to be diagnosed after the fact.

### Single writer per tree (no duplicate concurrent builds)

The memory-segregation protocol below stops two scribes racing on `MEMORY.md`;
this rule stops two *builds* racing on the same source tree. Two executors
editing the same files interleave diffs, and the loser is reduced to verifying
bytes it did not author — pure waste.

- **Claim the tree at Round 0.** Before writing CHARTER.md, scan
  `<cwd>/.claude/teams/engineering/INDEX.md` and the session dirs for a session
  that is not closed. The newest session `LOG.md` mtime is the liveness signal.
- **One active build per tree.** If a live session already owns this tree, do
  not start a second one — continue it, wait, or branch a separate worktree.
  Never fork a parallel build over the same files.

### Stalled ≠ dead — probe before relaunching

A long-quiet session is not a dead session. The usual cause of apparent death
is **back-pressure, not failure** — a full disk, a blocked write, a slow test,
a rate-limit pause — and **disk pressure in particular makes a healthy build
look hung.** Before declaring a session dead and relaunching:

1. **Probe liveness.** Has `LOG.md` / `VERIFY_LOG.md` mtime advanced in the last
   few minutes? Is a child process (test, build, install) still running?
2. **Check the cheap killer first.** Re-run the disk preflight. If the disk is
   full, the fix is to *free space and let the existing session resume*, not to
   launch a second build onto the same full disk.
3. **Relaunch only on an affirmative death signal** — process gone AND no mtime
   advance AND a recorded fatal error. Relaunch-on-suspicion duplicates work
   (MAST FM-1.3, step repetition); it is the expensive default, not the safe one.

## Tier classification (binding)

Every task is classified before work begins. Classification cannot be
overridden DOWNWARD by the user — only upward.

- **Trivial**: typo, comment, rename, pure-stylistic change.
  Dispatch: executor + verifier only. No plan-gate, no reviewer, no evaluator.
- **Scoped**: single-file logic change, small feature, isolated bug fix.
  Dispatch: planner + executor + verifier + reviewer. Plan-adversary only
  if external inputs present. No evaluator unless changing a public API.
- **Complex**: multi-file, cross-module, architectural, any task citing a
  research SYNTHESIS. Full roster with all gates.

Default bias: when in doubt, pick the higher tier.

## Round structure (v1)

| Round | Name | Gates | Output |
|---|---|---|---|
| Round 0 | Intake | — | CHARTER.md, tier decision |
| Round 1 | Phase A — Plan | structural consistency check → plan-skeptic → plan-adversary | PLAN.md |
| Round 2..N | Phase B — Build | verifier-gate + reviewer-gate per iteration | executor diffs + VERIFY_LOG entries |
| Round N+1 | Close — Evaluator | 5-dim rubric | evaluator.md PASS/FAIL |
| Close | Retrospection + scribe + handback | — | MEMORY.md updated, INDEX.md entry |

## Eval-Driven Development (EDD) gate

This team follows `agents/EDD-ADDENDUM.md`. EDD layers onto the existing
round structure without replacing it — it constrains the definition of "done"
and names two evidence files the team already has room for.

**Evals first (Phase A).** Before the executor writes any code, the planner and
architect jointly author `EXPECTED_EVALS.md` next to `PLAN.md`. It states the
measurable quality criteria the work must meet across the relevant dimensions —
**correctness, security, a11y/perf (as relevant), and maintainability** — with
an explicit pass condition per criterion. The plan-gate verdict (skeptic +
adversary clear) now also requires `EXPECTED_EVALS.md` to exist and cover every
PLAN task. No Phase B build begins without it.

**Verification loop (Phase B).** Per build iteration, after the executor's diff,
the verifier runs the EDD verification-loop checklist FRESH — syntax/type check,
tests, lint/style, security scan, performance baseline, and eval reconciliation
— and records raw results in `EVIDENCE/verification.md`. This file cross-
references `VERIFY_LOG.md` (raw run output) rather than duplicating it, and is
owned solely by `engineering-verifier`. Each check is `PASS`, `FAIL`, or
`EXCEPTION (<reason>)`. The verifier may not report PASS for an iteration while
any applicable check is unchecked and unexcepted.

**Gate on evidence (Close).** The reviewer may not record PASS, and the
`engineering-evaluator` may not clear its strict dimensions, until every
`EXPECTED_EVALS.md` criterion is met by `EVIDENCE/verification.md` or covered by
a documented exception (which eval is unmet, why shipping is acceptable, the
risk, follow-up). An unrecorded gap is a FAIL, not an advisory note.

### Round 0 — Intake

1. Lead runs intake-and-amplification protocol.
2. Reads `~/.claude/agent-memory/engineering-lead/MEMORY.md` (first 200 lines).
3. Reads research SYNTHESIS.md if cross-team.
4. Classifies tier.
5. Writes CHARTER.md.

### Round 1 — Phase A (Plan)

For scoped and complex tiers:

1. Lead dispatches `engineering-planner`. Writes `EVIDENCE/planner.md`.
2. Lead dispatches `engineering-architect` (parallel or after planner).
   Writes `EVIDENCE/architect.md`.
3. **Structural consistency check** (lead, protocol step):
   - Every planner task has a corresponding architect design.
   - Every architect library commitment appears in planner blast-radius.
   - On FAIL → dispatch `engineering-moderator`.
   - On PASS → lead writes PLAN.md.
4. **Plan-skeptic gate** (mandatory complex, conditional scoped):
   Dispatches `engineering-skeptic`. Writes `EVIDENCE/skeptic.md`.
   FAIL if load-bearing flaw has no mitigation.
5. **Plan-adversary gate** (mandatory if CHARTER cites external input):
   Dispatches `engineering-adversary`. Writes `EVIDENCE/adversary.md`.
   FAIL if load-bearing claim is REPORTED-NOT-VERIFIED or REJECTED.
6. Plan-gate verdict: if skeptic AND adversary clear → Phase B begins.

### Round 2..N — Phase B (Build)

Inner ReAct loop for each task i in PLAN.md:

1. Gather context → provide executor.
2. `engineering-executor` implements → appends to DIFF_LOG.md + executor.md.
3. `engineering-verifier` runs tests FRESH → appends to VERIFY_LOG.md + verifier.md.
4. `engineering-reviewer` reads diff → writes reviewer.md.
5. Branch:
   - verifier PASS + reviewer PASS → next task.
   - verifier FAIL → dispatch debugger (3-failure circuit breaker), executor retries.
   - reviewer REQUEST_CHANGES → executor retries with feedback.
   - verifier PASS but reviewer finds spec break → Phase A back-edge.

**Termination caps**:
- Soft cap: `2 × PLAN.task_count` iterations. Log WARNING, continue.
- Hard cap: `5 × PLAN.task_count` iterations. Force-halt, escalate to user.
- Token budget: 500K tool calls. Force-halt regardless.
- Floor for 1-task sessions: 5 soft, 10 hard.

### Close — Evaluator gate

1. Lead writes PLAN-vs-shipped delta to LOG.md.
2. `engineering-evaluator` runs 5-dimension rubric:
   - **Strict** (1.0 required): functional correctness, test coverage.
   - **Advisory** (0.7, lead override allowed): diff minimality, revert-safety, style.
3. PASS → retrospection.
4. FAIL on strict → return to Phase B. Hard cap: 2 evaluator re-runs.
5. FAIL on advisory only → lead decides (accept with override OR return).

### Session close — Retrospection + scribe

1. `engineering-retrospector` extracts 3-7 lessons to
   `~/.claude/agent-memory/engineering-lead/staging/<slug>.md`.
2. `engineering-scribe` normalizes files, writes INDEX.md entry, runs
   MEMORY.md merge protocol.
3. If cross-team: scribe writes HANDBACK_FROM_ENGINEERING file.

## Parallel-instance memory segregation

Multiple engineering sessions may close simultaneously. The staging pattern
ensures no race on MEMORY.md writes.

### File layout

```
~/.claude/agent-memory/engineering-lead/
├── MEMORY.md               # canonical, read at session start
├── .lock                   # flock(1) advisory lock target
├── staging/                # per-session lesson deltas
│   ├── <slug-1>.md         # retrospector writes here
│   ├── <slug-2>.md
│   └── _merged/            # archived post-merge
│       └── <slug>.md
├── topic/                  # Hook A overflow files
└── _archive/               # staging files > 90 days old
```

### Write protocol (retrospector)

Retrospector writes to `staging/<slug>.md` — a session-unique path.
Zero contention. No lock needed.

### Merge protocol (scribe) — THE CANONICAL PATTERN

```bash
AGENT="engineering-lead"
ROOT="$HOME/.claude/agent-memory/$AGENT"
LOCK="$ROOT/.lock"
MEM="$ROOT/MEMORY.md"
STAGING_DIR="$ROOT/staging"

touch "$LOCK"

flock -w 5 -x "$LOCK" timeout --signal=KILL --kill-after=1 30 bash -c '
  set -e
  MEM="$HOME/.claude/agent-memory/engineering-lead/MEMORY.md"
  STAGING="$HOME/.claude/agent-memory/engineering-lead/staging"
  TMP="$MEM.tmp.$$"

  if [ -f "$MEM" ]; then
    cp "$MEM" "$TMP"
  else
    : > "$TMP"
  fi

  for f in "$STAGING"/*.md; do
    [ -f "$f" ] || continue
    case "$f" in *_merged*) continue;; esac
    cat "$f" >> "$TMP"
    mkdir -p "$STAGING/_merged"
    mv "$f" "$STAGING/_merged/"
  done

  mv "$TMP" "$MEM"
' || {
  echo "[scribe-curator] deferred merge on $AGENT — staging preserved" >&2
  exit 0
}
```

**Empirically validated**: 10 concurrent scribes completed in 0.07s with
zero lost writes and zero duplicates. `timeout --signal=KILL` is REQUIRED
— bare `flock -c` leaks the lock via child-process fd inheritance when
the parent is killed (validated in engineering-team-self-evolve-v1 session).

### Read protocol

Readers do NOT take the lock. `rename(2)` atomicity guarantees torn-read-free.

```bash
head -n 200 "$HOME/.claude/agent-memory/engineering-lead/MEMORY.md"
```

## Cross-team handoff protocol

### Forward path: Research → Engineering

```
Agent({
  subagent_type: "engineering-lead",
  prompt: "Implement research recommendation <research-slug>. Read SYNTHESIS.md as binding input. Consult MEMORY.md lessons. Propose a plan.",
})
```

Engineering-lead's Round 0:
1. Locates `<cwd>/.claude/teams/research/<research-slug>/SYNTHESIS.md`
   (per-project path — assumes research and engineering sessions share the same CWD).
   If the research session was in a different project, the caller must supply the full path.
2. Classifies SYNTHESIS claims: HIGH (binding) / MEDIUM (directional) /
   REPORTED-NOT-VERIFIED (require empirical pre-flight).
3. Reads `~/.claude/agent-memory/research-lead/MEMORY.md` (read-only).
4. Writes CHARTER.md citing the research SYNTHESIS path.

### Back path: Engineering → Research feedback

If engineering discovers a research claim is wrong, file
`FEEDBACK_FROM_ENGINEERING.md` in the engineering workspace:

```markdown
# FEEDBACK FROM ENGINEERING — <engineering-slug> → <research-slug>

## Classification
BLOCKER | DEGRADE | INFORMATIONAL

## Claim in research that is wrong
- SYNTHESIS.md section / line: <quote>
- What research claimed: <...>
- What engineering observed: <...>
- Evidence: <test output, repro, library behavior>

## Impact on engineering session
<BLOCKER: session pauses | DEGRADE: session continues with caveat | INFORMATIONAL: unchanged>

## Proposed correction for research
<what should be re-verified>
```

Scribe copies this to `<cwd>/.claude/teams/research/<research-slug>/FEEDBACK_FROM_ENGINEERING_<engineering-slug>.md`.

### Handback path: Engineering close → Research workspace

At session close, scribe writes:
`<cwd>/.claude/teams/research/<research-slug>/HANDBACK_FROM_ENGINEERING_<slug>.md`

The handback file is the **only** file engineering writes into a research
workspace. The distinct prefix guarantees no collision with research-owned files.

## Shared workspace

Session workspaces are created at `<cwd>/.claude/teams/engineering/<slug>/`
where `<cwd>` is the current working directory at session start (per-project).
Protocols and agent personas are read from `~/.claude/` (global).
Cross-team research SYNTHESIS path: `<cwd>/.claude/teams/research/<research-slug>/SYNTHESIS.md`
(assumes both research and engineering sessions are in the same project CWD — the common case).

```
.claude/teams/engineering/<slug>/
├── CHARTER.md              # owned by lead (Round 0)
├── PLAN.md                 # owned by lead (Phase A close)
├── EXPECTED_EVALS.md       # planner + architect (Phase A, evals-first; see EDD-ADDENDUM.md)
├── EVIDENCE/
│   ├── planner.md          # engineering-planner
│   ├── architect.md        # engineering-architect
│   ├── verification.md     # engineering-verifier (EDD verification-loop checklist + raw checks)
│   ├── skeptic.md          # engineering-skeptic
│   ├── adversary.md        # engineering-adversary
│   ├── executor.md         # engineering-executor (running log)
│   ├── verifier.md         # engineering-verifier (running log)
│   ├── reviewer.md         # engineering-reviewer (running log)
│   ├── debugger.md         # engineering-debugger (conditional)
│   ├── moderator.md        # engineering-moderator (conditional)
│   ├── evaluator.md        # engineering-evaluator
│   ├── retrospector.md     # engineering-retrospector
│   └── scribe.md           # engineering-scribe
├── DIFF_LOG.md             # executor appends per edit (schema-enforced)
├── VERIFY_LOG.md           # verifier appends per run (raw output required)
├── LOG.md                  # everyone appends
└── OPEN_QUESTIONS.md       # lead + any specialist
```

Team-wide files:

```
<cwd>/.claude/teams/engineering/INDEX.md   # scribe-owned, one line per session (per-project)
~/.claude/agent-memory/engineering-lead/MEMORY.md     # retrospector → staging → scribe merges (global)
~/.claude/agent-memory/engineering-lead/staging/      # per-session deltas (global)
```

## Ownership rules

| File | Who writes | Who reads |
|---|---|---|
| `CHARTER.md` | `engineering-lead` | everyone |
| `PLAN.md` | `engineering-lead` (integrates planner + architect) | everyone |
| `EXPECTED_EVALS.md` | `engineering-planner` + `engineering-architect` (Phase A, before build) | everyone |
| `EVIDENCE/verification.md` | `engineering-verifier` (EDD verification loop) | reviewer + evaluator |
| `EVIDENCE/<name>.md` | only the named specialist | everyone |
| `DIFF_LOG.md` | `engineering-executor` (per edit) | everyone |
| `VERIFY_LOG.md` | `engineering-verifier` (per run) | everyone |
| `LOG.md` | everyone (append-only) | everyone |
| `INDEX.md` | `engineering-scribe` only | everyone |
| `MEMORY.md` | `engineering-retrospector` (via staging) + `engineering-scribe` (merge) | `engineering-lead` at session start |

Nobody edits another specialist's evidence file. Contradictions go to
`engineering-moderator`. Schema fixes go through `engineering-scribe`.

## Escalation

If the soft termination cap trips (`2 × task_count` iterations), log WARNING
and continue.

If the hard termination cap trips (`5 × task_count` iterations):
1. Force-halt Phase B.
2. Dispatch engineering-evaluator on current state (likely FAIL).
3. Present user with options: {replan, handback with degraded acceptance, abort}.

If after 2 evaluator re-runs the evaluator still FAILs on a strict dimension:
1. Deliver PROVISIONAL result with documented gaps.
2. Publish OPEN_QUESTIONS.md with what's unresolved.
3. Dispatch engineering-retrospector to capture the failure.

## Session naming

`<slug>` chosen by engineering-lead from the task. Examples:
- `memory-layer-hook-a-v1`
- `vllm-moe-routing-fix`
- `research-scribe-staging-v2`

## Prior art this protocol imports

- **Anthropic "Building effective agents"** — orchestrator-worker pattern (Phase A),
  evaluator-optimizer pattern (Phase B), gather-act-verify-repeat inner loop.
- **Anthropic "Building agents with the Claude Agent SDK"** — adopted-persona
  pattern 2, subagent-spawn constraint.
- **SWE-agent, OpenHands, Aider** — plan-and-execute hybrid convergence,
  file-system coordination.
- **MAST** (Cemri et al., arxiv 2503.13657) — 14 failure mode taxonomy,
  specialist-MAST mapping.
- **ACE** (Zhang et al., arxiv 2510.04618) — evolving playbook, grow-and-refine
  curation, bullet-with-counters memory.
- **ReAct** (Yao et al., arxiv 2210.03629) — gather-act-verify inner loop shape.
- **Research Team PROTOCOL v2** — adversarial gates, MEMORY.md patterns, staging
  protocol, flock+timeout+atomic-rename merge.
- **engineering-team-self-evolve-v1 SYNTHESIS** — empirical validation of
  concurrency protocol, MAST coverage, tiered dispatch, 5-dim rubric.
