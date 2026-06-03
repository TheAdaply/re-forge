# Testing/QA Team Protocol v1

The Testing/QA Team is the 4th fully-collaborative subagent team in this
setup. It is a **leader + 11 specialists** hierarchy, **all running on
Opus with `effort: max`** (hard contract, no downgrades ever), coordinating
through **files on disk** and validating code quality with full adversarial
gate coverage.

This document is the contract every team member reads before acting.

## Scope model (v1)

The Testing/QA Team separates global infrastructure from per-project sessions:

**Global (~/.claude/) — shared across all projects:**
- `~/.claude/teams/testing/PROTOCOL.md` — this document
- `~/.claude/agents/testing/*.md` — all 12 agent personas (lead + 11 specialists)
- `~/.claude/agent-memory/testing-lead/` — institutional memory (cross-project)
- `~/.claude/scripts/` — audit_evidence.py (shared with research/engineering)
- `~/.claude/hooks/` — PostToolUse evidence-write logger (shared)

**Per-project (<cwd>/.claude/) — isolated per project directory:**
- `.claude/teams/testing/INDEX.md` — session index for THIS project only
- `.claude/teams/testing/<slug>/` — all session artifacts

## What this team does

Engineering Team ships code. Testing/QA Team independently validates that
code by writing new tests, analyzing coverage gaps, running mutation testing,
detecting regressions, and ensuring test quality. The two teams connect
via cross-team handoff protocol.

**What Testing/QA owns that Engineering does NOT:**
- Writing new tests from scratch (unit, integration, E2E, property-based)
- Coverage analysis and gap detection
- Mutation testing (validating tests catch real bugs)
- Property-based / fuzz testing
- Test quality review (behavior vs implementation testing)
- Flakiness detection and remediation
- Test fixture / mock / stub generation
- Regression detection across commits

**What Engineering owns that Testing does NOT:**
- Running EXISTING tests (engineering-verifier)
- Code review for spec compliance (engineering-reviewer)
- Writing production code (engineering-executor)

The boundary is clear: **Engineering-verifier RUNS existing tests.
Testing-writer WRITES new tests.** Engineering-verifier may run tests
that testing-writer generated in a prior session.

## Roster (11 specialists + 1 lead)

| Role | Agent name | MAST ownership | Phase | Notes |
|---|---|---|---|---|
| Leader | `testing-lead` | FM-1.1, FM-1.5, FM-2.2 | all | orchestrator |
| Detector | `testing-detector` | FM-1.1 | Phase A | project-agnostic detection |
| Planner | `testing-planner` | FM-1.1 | Phase A | coverage gap analysis |
| Writer | `testing-writer` | FM-1.2, FM-2.3 | Phase B | unit/integration/E2E |
| Property | `testing-property` | FM-1.2 | Phase B | property-based tests |
| Mutator | `testing-mutator` | FM-3.2 | Phase B | mutation testing |
| Fixture | `testing-fixture` | FM-1.2 | Phase B | mocks, stubs, factories |
| Runner | `testing-runner` | FM-2.6, FM-3.2 | Phase B | 3x fresh execution |
| Skeptic | `testing-skeptic` | FM-3.3 | gate | test quality attack |
| Evaluator | `testing-evaluator` | FM-3.1, FM-3.2 | close gate | 6-dim rubric |
| Retrospector | `testing-retrospector` | cross-session | close | lessons staging |
| Scribe | `testing-scribe` | FM-1.4, FM-2.1, FM-2.4 | close | ledger + merge |

## Model contract (non-negotiable)

Every agent runs on `opus` with `effort: max`.
Enforced at the frontmatter level; not a prose aspiration.
If an agent file in `~/.claude/agents/testing/` lacks these fields, it is
a bug — report to lead and do not proceed.

## Execution model

Claude Code subagents cannot spawn other subagents. Two valid modes:

1. **Main-thread invocation** (`claude --agent testing-lead`): lead
   dispatches specialists via the `Agent` tool in parallel.
2. **Adopted persona** (default when invoked as subagent): lead reads
   each specialist's persona as a behavioral contract and executes its
   method directly, writing outputs to specialist evidence files. Gates
   remain procedural.

## Tier classification (binding)

Every task is classified before work begins. Cannot be overridden DOWNWARD.

- **Targeted**: test a specific function/module. Writer + runner only.
  No plan-gate, no skeptic, no mutation testing.
- **Coverage**: fill coverage gaps across a module/package. Full Phase A
  + Phase B. Skeptic gate mandatory. Mutation testing optional.
- **Comprehensive**: full test suite audit. Full roster with all gates.
  Mutation testing mandatory. Property testing mandatory.

Default bias: when in doubt, pick the higher tier.

## Round structure (v1)

| Round | Name | Gates | Output |
|---|---|---|---|
| Round 0 | Intake + Detection | detector (mandatory) | CHARTER.md, detector.md |
| Round 1 | Phase A — Plan | skeptic pre-flight (coverage/comprehensive) | TEST_PLAN.md |
| Round 2..N | Phase B — Generate + Validate | runner (3x) + mutator per iteration | test files + TEST_LOG.md |
| Round N+1 | Close — Evaluator | 6-dim rubric | evaluator.md PASS/FAIL |
| Close | Retrospection + scribe + handback | — | MEMORY.md updated |

## Eval-Driven Development (EDD) gate

This team follows `agents/EDD-ADDENDUM.md`. EDD layers onto the existing
coverage/property/mutation work without replacing it — tests are written
against quality criteria defined up front, and the runner proves those
criteria are met before close.

**Evals first (Phase A).** Before any test is generated, the planner authors
`EXPECTED_EVALS.md` next to `TEST_PLAN.md`. It states the measurable quality
criteria the test work must meet across the relevant dimensions —
**correctness, security, a11y/perf (as relevant), and maintainability** — with
an explicit pass condition per criterion (e.g. coverage delta target, mutation
score threshold, property invariants to hold, flakiness ceiling). Coverage gaps
become eval criteria; property invariants become eval criteria; mutation
survivors-to-kill become eval criteria. The skeptic pre-flight now also requires
`EXPECTED_EVALS.md` to exist and cover every TEST_PLAN target. No Phase B
generation begins without it.

**Verification loop (Phase B).** The generated tests are written *against* the
`EXPECTED_EVALS.md` criteria, not against implementation detail. Per iteration,
the runner executes the EDD verification-loop checklist FRESH — syntax/type
check, tests (the 3x execution), lint/style, security scan, performance baseline
(if relevant), and eval reconciliation — and records results in
`EVIDENCE/verification.md`. This file cross-references `TEST_LOG.md` (raw run
output) rather than duplicating it, and is owned solely by `testing-runner`.
Each check is `PASS`, `FAIL`, or `EXCEPTION (<reason>)`. The runner may not
report PASS for an iteration while any applicable check is unchecked and
unexcepted.

**Gate on evidence (Close).** The `testing-evaluator` may not clear its strict
dimensions until every `EXPECTED_EVALS.md` criterion is met by
`EVIDENCE/verification.md` or covered by a documented exception (which eval is
unmet, why shipping is acceptable, the risk, follow-up). An unrecorded gap is a
FAIL, not an advisory note.

### Round 0 — Intake + Detection

1. Lead runs intake-and-amplification protocol.
2. Reads `~/.claude/agent-memory/testing-lead/MEMORY.md`.
3. Reads engineering DIFF_LOG.md if cross-team.
4. **Dispatches testing-detector (MANDATORY).** No test generation
   without a project profile.
5. Classifies tier based on detector results and CHARTER.
6. Writes CHARTER.md.

### Round 1 — Phase A (Plan)

For coverage and comprehensive tiers:

1. Dispatch `testing-planner` with detector results + CHARTER.
   Writes `EVIDENCE/planner.md`.
2. **Skeptic pre-flight** (mandatory comprehensive, conditional coverage):
   Skeptic reviews the test plan for strategy errors.
   Writes `EVIDENCE/skeptic.md`.
3. Lead writes TEST_PLAN.md integrating planner and skeptic.

### Round 2..N — Phase B (Generate + Validate)

Inner loop for each target i in TEST_PLAN.md:

1. Determine test type(s) for this target.
2. Dispatch generators in parallel:
   - `testing-fixture` if mocks needed (runs first if dependencies exist)
   - `testing-writer` for unit/integration/E2E
   - `testing-property` for property-based tests
3. `testing-runner` runs 3x. Appends to TEST_LOG.md + runner.md.
4. `testing-mutator` if comprehensive tier or P0 security target.
5. Branch:
   - PASS (3/3) + mutation >= threshold: next target.
   - FAIL: writer revises. 3-failure circuit breaker.
   - FLAKY: writer fixes flakiness. Mandatory.
   - Low mutation score: writer adds tests to kill survivors.

**Termination caps**:
- Soft: `2 x target_count` iterations. Log WARNING.
- Hard: `5 x target_count` iterations. Force-halt, escalate.
- Floor (1 target): 5 soft, 10 hard.

### Close — Evaluator gate

1. Lead writes TEST_PLAN-vs-shipped delta in LOG.md.
2. `testing-evaluator` runs 6-dimension rubric:
   - **Strict** (1.0): test correctness, coverage delta, flakiness.
   - **Advisory** (0.7, override allowed): test quality, mutation score,
     readability.
3. PASS: retrospection. FAIL strict: return to Phase B (max 2 re-runs).
   FAIL advisory only: lead decides.

### Session close

1. `testing-retrospector`: 3-7 lessons to staging.
2. `testing-scribe`: normalize, INDEX.md, MEMORY.md merge, handback.

## Project detection mechanism (v1)

The testing-detector specialist auto-detects the project environment.
This is the bridge between the generic team protocol and any specific project.

### Detection matrix

| Signal | What it detects |
|---|---|
| `pyproject.toml`, `setup.py` | Python + deps |
| `Cargo.toml` | Rust + deps |
| `package.json`, `tsconfig.json` | TS/JS + deps |
| `go.mod` | Go + deps |
| `CMakeLists.txt` | C/C++ |
| `pom.xml`, `build.gradle` | Java/Kotlin |
| `.github/workflows/*.yml` | CI system + test commands |
| `pytest.ini`, `jest.config.*`, `vitest.config.*` | Test framework |
| `.coveragerc`, `.nycrc` | Coverage tool + thresholds |
| Existing test files (3-5 samples) | Conventions, style, patterns |

### Convention inheritance

The detector does NOT impose conventions. It DISCOVERS them:
- If the project uses `test_*.py`, new tests use `test_*.py`.
- If the project uses `*.spec.ts`, new tests use `*.spec.ts`.
- If the project uses `conftest.py` fixtures, new fixtures go in `conftest.py`.
- If the project has NO tests, the detector recommends conventions based
  on the language's community standard.

## Cross-team handoff protocol

### Forward path: Engineering -> Testing

```
Agent({
  subagent_type: "testing-lead",
  prompt: "Validate engineering changes <engineering-slug>. Read DIFF_LOG.md. Write tests for changed code. Report coverage and quality.",
})
```

Testing-lead's Round 0:
1. Locates `<cwd>/.claude/teams/engineering/<engineering-slug>/DIFF_LOG.md`.
2. Reads what changed — these become the test targets.
3. Dispatches testing-detector (even if project profile exists — re-detect
   in case deps changed).
4. Writes CHARTER.md citing the engineering session.

### Back path: Testing -> Engineering feedback

If testing discovers a bug or concern:

```markdown
# FEEDBACK FROM TESTING — <testing-slug> -> <engineering-slug>

## Classification
BUG | COVERAGE_GAP | QUALITY_CONCERN

## What was found
- File: <path>
- Test that caught it: <test name>
- Evidence: <test output>

## Impact
BUG: the code has a defect that tests reveal
COVERAGE_GAP: the code is untested in critical paths
QUALITY_CONCERN: the code works but has quality issues

## Proposed action
<what engineering should do>
```

### Handback path: Testing close -> Engineering workspace

At session close, scribe writes:
`<cwd>/.claude/teams/engineering/<engineering-slug>/HANDBACK_FROM_TESTING_<testing-slug>.md`

### Forward path: Testing -> Release

Testing session's HANDBACK_FROM_TESTING includes:
- List of test files ready to commit
- Coverage numbers
- Evaluator verdict
- Any open items

This is the release gate input. No release without evaluator PASS.

## Shared workspace

```
.claude/teams/testing/<slug>/
├── CHARTER.md              # owned by lead (Round 0)
├── TEST_PLAN.md            # owned by lead (Phase A close)
├── EXPECTED_EVALS.md       # testing-planner (Phase A, evals-first; see EDD-ADDENDUM.md)
├── EVIDENCE/
│   ├── detector.md         # testing-detector
│   ├── planner.md          # testing-planner
│   ├── verification.md     # testing-runner (EDD verification-loop checklist + raw checks)
│   ├── writer.md           # testing-writer
│   ├── property.md         # testing-property
│   ├── mutator.md          # testing-mutator
│   ├── fixture.md          # testing-fixture
│   ├── runner.md           # testing-runner
│   ├── skeptic.md          # testing-skeptic
│   ├── evaluator.md        # testing-evaluator
│   ├── retrospector.md     # testing-retrospector
│   └── scribe.md           # testing-scribe
├── TEST_LOG.md             # runner appends per execution
├── LOG.md                  # everyone appends
└── OPEN_QUESTIONS.md       # lead + any specialist
```

Team-wide files:

```
<cwd>/.claude/teams/testing/INDEX.md
~/.claude/agent-memory/testing-lead/MEMORY.md
~/.claude/agent-memory/testing-lead/staging/
```

## Parallel-instance memory segregation

Identical to engineering team: staging directory per session,
flock+timeout+atomic-rename merge, lockless reads.

## Ownership rules

| File | Who writes | Who reads |
|---|---|---|
| `CHARTER.md` | `testing-lead` | everyone |
| `TEST_PLAN.md` | `testing-lead` (integrates planner + skeptic) | everyone |
| `EXPECTED_EVALS.md` | `testing-planner` (Phase A, before generation) | everyone |
| `EVIDENCE/verification.md` | `testing-runner` (EDD verification loop) | evaluator + lead |
| `EVIDENCE/<name>.md` | only the named specialist | everyone |
| `TEST_LOG.md` | `testing-runner` (per execution) | everyone |
| `LOG.md` | everyone (append-only) | everyone |
| `INDEX.md` | `testing-scribe` only | everyone |
| `MEMORY.md` | `testing-retrospector` (via staging) + `testing-scribe` (merge) | `testing-lead` at start |

## Escalation

Soft cap trips: log WARNING, continue.
Hard cap trips:
1. Force-halt Phase B.
2. Dispatch evaluator on current state (likely FAIL).
3. Present user with {replan, handback with partial tests, abort}.

After 2 evaluator re-runs still FAIL on strict:
1. Deliver PROVISIONAL result with documented gaps.
2. Publish OPEN_QUESTIONS.md.
3. Dispatch retrospector.

## Prior art this protocol imports

- **Meta TestGen-LLM** (FSE 2024) — filter pipeline (build, run, coverage-increase).
- **Meta ACH** (FSE 2025) — mutation-guided test generation, LLM equivalence detection.
- **ASTER** (IBM, ICSE 2025) — multi-language test generation via static analysis + LLM.
- **OpenObserve Council of Sub-Agents** — 8-specialist E2E testing pipeline pattern.
- **Anthropic "Building Effective Agents"** — orchestrator-worker (Phase A), evaluator-optimizer (Phase B).
- **Anthropic "Demystifying Evals"** — pass@k/pass^k, end-state evaluation, grader hygiene.
- **MAST** (Cemri et al., arxiv 2503.13657) — 14 failure mode taxonomy.
- **ACE** (Zhang et al., arxiv 2510.04618) — evolving playbook via MEMORY.md.
- **Research Team PROTOCOL v2** — adversarial gates, MEMORY.md patterns, staging merge.
- **Engineering Team PROTOCOL v1** — two-phase structure, cross-team handoff, tier classification.
- **LLM-generated test flakiness** (arxiv 2601.08998) — 3x run pattern for flakiness detection.
- **LLM PBT effectiveness** (arxiv 2510.25297) — PBT + EBT hybrid for 81.25% bug detection.
- **Diffblue 2025 benchmark** — autonomous vs assisted testing distinction.
