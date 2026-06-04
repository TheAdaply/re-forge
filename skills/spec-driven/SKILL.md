---
name: spec-driven
description: "Use this skill for long-horizon agentic coding where a feature spans many turns and the agent drifts: it freezes a re-readable contract before code. Writes EARS-style requirements -> design -> task breakdown -> verification evidence, one feature directory per feature, with status gates and grep-able traceability IDs. Triggers on 'spec this out', 'write a spec', 'spec-driven', 'requirements then design', or planning a multi-session build."
---

# Spec-Driven Development

Freeze a contract the agent can re-read, before writing code, so long-horizon
work cannot quietly drift away from what was asked.

## When to use

- A feature will span many turns / sessions and the agent keeps "forgetting"
  earlier decisions.
- The ask is fuzzy and needs to be pinned down before anyone writes code.
- User says "spec this out", "write the requirements first", "spec-driven", or
  "plan this multi-session build".
- Skip for one-line fixes — the ceremony costs more than it saves.

## Why spec-first for agents

A conversation is lossy: turns scroll out of context, summaries blur detail,
and the agent ends up optimizing a half-remembered ask. A **spec is a contract
on disk** the agent re-reads at the start of every turn. The conversation can
be forgotten; the contract cannot. Long-horizon coding fails from *drift*, and
a re-readable contract is the cheapest anti-drift mechanism there is.

This is the contract half of a pair. re-forge's `agents/EDD-ADDENDUM.md` is the
evidence half: Eval-Driven Development says *no code until the quality criteria
exist on disk*. Spec-driven says *no code until the behavioral contract exists
on disk*. Specs define **what** to build; EDD evals define **how you know it is
good**. Run both — the spec's requirement IDs are exactly what EDD evals score.

## The artifact chain

One **feature directory** per feature, e.g. `specs/F-001-password-reset/`. Four
artifacts, produced and frozen in order:

1. `requirements.md` — EARS-style behavioral requirements (below). The contract.
2. `design.md` — how it will be built: components, data flow, interfaces, and
   ADR-style rationale (the *why*, per Nygard) for each significant choice.
3. `tasks.md` — an ordered task breakdown; each task cites the requirement IDs
   it satisfies.
4. `verification.md` — evidence that each task is done, each entry citing the
   task (and through it, the requirement) it proves.

**Status gates** (record a `Status:` line at the top of each artifact):
`requirements: approved` is required before `design.md` is written;
`design: approved` is required before any task work begins. No task may be
implemented while the design it depends on is still `draft`. The gate is the
point — it forces disagreement to surface on paper, cheaply, before code.

## Writing requirements (EARS)

Use the Easy Approach to Requirements Syntax. The workhorse pattern:

> **WHEN** `<trigger>` **THE SYSTEM SHALL** `<observable response>`.

Other EARS patterns as needed: ubiquitous (`THE SYSTEM SHALL ...`), state-driven
(`WHILE <state> THE SYSTEM SHALL ...`), and unwanted-behavior
(`IF <condition> THEN THE SYSTEM SHALL ...`). Each requirement is one testable
sentence with a stable ID. Vague verbs ("handle", "support", "manage") are
defects — they cannot be verified.

## Traceability

A single grep-able ID scheme makes orphans visible:

- `F-001` — the feature.
- `R-001`, `R-002`, ... — requirements within that feature.
- `T-001`, `T-002`, ... — tasks.

The rules, all checkable with `grep`:

- Every **task** cites at least one requirement ID. A task citing none is doing
  unrequested work — a defect.
- Every **verification** entry cites a task ID. Evidence proving nothing is a
  defect.
- Every **requirement** is cited by at least one task. An uncovered requirement
  was silently dropped — a defect.

`grep -rL 'R-[0-9]' tasks.md` and friends turn "did we miss anything?" into a
command instead of a vibe.

## How it composes with re-forge teams

The spec is the handoff contract between teams; each team reads and writes it:

1. **`/research`** investigates the problem space and unknowns.
2. **Spec** freezes that investigation into `requirements.md` + `design.md`
   (the freeze step — this skill).
3. **`/engineer`** implements `tasks.md` against the approved design, not
   against the chat.
4. **`/testing`** verifies behavior against **requirement IDs**, writing
   `verification.md` (and EDD's `EXPECTED_EVALS.md` keyed to the same IDs).
5. **`/docs`** keeps the spec and the shipped code in sync — a spec that no
   longer matches the code is itself a defect to be reconciled.

## Worked micro-example (abbreviated)

`specs/F-007-rate-limit/requirements.md` — `Status: approved`

- **R-001** — WHEN a client exceeds 100 requests in 60 seconds THE SYSTEM SHALL
  respond with HTTP 429.
- **R-002** — WHEN the system returns a 429 THE SYSTEM SHALL include a
  `Retry-After` header in seconds.
- **R-003** — IF the client IP is on the allowlist THEN THE SYSTEM SHALL NOT
  apply the rate limit.

`tasks.md` — `Status: in-progress` (design approved)

- **T-001** — Add a sliding-window counter middleware. *(satisfies R-001)*
- **T-002** — Emit `Retry-After` from the counter's reset time. *(satisfies R-002)*
- **T-003** — Short-circuit the middleware for allowlisted IPs. *(satisfies R-003)*

`verification.md`

- T-001 — load test at 101 req/60s returns 429. *PASS* (proves R-001).
- T-002 — 429 response includes `Retry-After: 37`. *PASS* (proves R-002).
- T-003 — allowlisted IP at 500 req/60s returns 200. *PASS* (proves R-003).

Every R is cited by a T; every T by a verification entry. No orphans.

## Self-check gate

Do not declare a spec ready — or a feature done — while any answer is "no":

1. Does **every** task cite at least one requirement ID?
2. Is **every** requirement cited by at least one task (no silent drops)?
3. Does **every** verification entry cite a task ID it proves?
4. Is each requirement a single **testable** EARS sentence (no "handle"/"support")?
5. Are the **status gates** honored — design approved before task work began?
6. Does the spec still **match the shipped code**, or is the mismatch logged?

A "no" is a defect with a name, not a matter of taste. Fix it or log it.

## References

Prior art and the in-repo EDD companion: `references/sources.md`.
