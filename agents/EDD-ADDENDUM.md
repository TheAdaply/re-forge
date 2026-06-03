# Eval-Driven Development (EDD) Addendum

This is a shared addendum to every re-forge team protocol. Any persona can be
told **"follow `agents/EDD-ADDENDUM.md`"** and it becomes binding for that
session. It does not replace a team's PROTOCOL.md — it constrains *how* work is
declared done. Where this addendum and a team protocol agree, the protocol's
file schema wins; where they conflict on the definition of "done", EDD wins.

EDD comes from the hackathon-winning "Everything Claude Code" methodology.
Reported impact when applied: ~65% faster feature delivery and ~75% fewer
first-pass review issues. The mechanism is simple: **decide what "good" means
before you build, then refuse to call anything done until the evidence on disk
proves it.**

## The evals-first rule (non-negotiable)

> No production code, no test, no refactor is written until the quality
> criteria it must satisfy exist on disk in `EXPECTED_EVALS.md`.

Intuition ("this looks right") is never sufficient justification for a change.
Every change is justified by an eval score or a documented exception — not by
opinion. If you find yourself building before evals exist, stop and write the
evals first. A planner/architect who hands work to an executor without
`EXPECTED_EVALS.md` has violated the contract.

## The EDD cycle

1. **Define evals first.** Before any implementation, write `EXPECTED_EVALS.md`:
   the measurable quality criteria the work must meet, organized by dimension
   (below). Each criterion is testable and has an explicit pass condition.
2. **Implement against the evals.** Build only what the evals require. The evals
   are the spec; the code is the attempt.
3. **Run the verification loop.** Execute the checklist below and record raw
   results in `EVIDENCE/verification.md`. Every check passes, or its failure is
   recorded as a documented exception.
4. **Iterate with evidence.** If a check fails, fix and re-run the loop. Each
   iteration is justified by the eval result it moves, not by intuition. Repeat
   until every eval is met or excepted.
5. **Gate on evidence.** The reviewer/evaluator may not record PASS until
   `EXPECTED_EVALS.md` is satisfied by `EVIDENCE/verification.md`, or every gap
   is covered by a logged exception.

## Eval dimensions

`EXPECTED_EVALS.md` defines criteria across the dimensions relevant to the task.
Mark a dimension N/A explicitly rather than omitting it:

- **Correctness** — functional behavior matches the spec; edge cases enumerated;
  tests assert behavior, not implementation.
- **Security** — input validation, authz/authn, secret handling, injection and
  unsafe-deserialization surfaces considered; security scan clean or excepted.
- **Accessibility / Performance** (as relevant) — a11y criteria for UI work
  (semantics, contrast, keyboard nav); perf baselines and budgets for hot paths.
- **Maintainability** — diff minimality, revert-safety, readability, no dead
  code, consistent with surrounding conventions.

## The verification-loop checklist

The verifier/runner executes each applicable check FRESH (no cached output) and
records the raw result. A check is `PASS`, `FAIL`, or `EXCEPTION (<reason>)`:

- [ ] **Syntax / type check** — compiles / type-checks clean.
- [ ] **Tests** — the suite (and any new tests) passes; results pasted raw.
- [ ] **Lint / style** — linter and formatter clean against project config.
- [ ] **Security scan** — relevant scanner clean; flagged items triaged.
- [ ] **Performance baseline** — hot-path budgets met; regressions explained.
- [ ] **Eval reconciliation** — each `EXPECTED_EVALS.md` criterion mapped to a
      result above and marked met / excepted.

"Done" is forbidden while any applicable box is unchecked and unexcepted.

## The evidence-on-disk contract

EDD is a file contract, not a vibe. Two artifacts are mandatory:

- **`EXPECTED_EVALS.md`** — written first, by the planner/architect (engineering)
  or planner (testing). It is the authoritative definition of "good" for the
  session. It lives alongside the session's plan file.
- **`EVIDENCE/verification.md`** — written by the verifier/runner. It holds the
  verification-loop checklist with raw output for each check and the
  eval-reconciliation table. It is the authoritative record of "proven".

A **documented exception** is a deliberate, recorded decision to ship without a
green check. It must state: which eval/check is unmet, why shipping anyway is
acceptable, the risk, and any follow-up. An exception is auditable evidence — an
unrecorded gap is a defect.

## Mapping onto re-forge's evidence-file model

EDD adds no new ceremony; it names two files inside the model teams already use:

- `EXPECTED_EVALS.md` sits next to `PLAN.md` / `TEST_PLAN.md` and is written in
  Phase A, before Phase B build/generate begins.
- `EVIDENCE/verification.md` joins the per-specialist `EVIDENCE/*.md` files and
  is owned solely by the verifier (engineering) / runner (testing), consistent
  with the "only the named specialist writes its evidence file" ownership rule.
- It is fed by, and cross-references, the existing `VERIFY_LOG.md` /
  `TEST_LOG.md` raw-output logs rather than duplicating them.
- The existing evaluator rubric (5-dim engineering / 6-dim testing) consumes
  `EVIDENCE/verification.md` as its primary input: a strict-dimension PASS now
  requires the matching eval criteria to be met or excepted.

Bottom line: evals first, evidence on disk, no green-without-proof.
