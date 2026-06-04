---
name: ultracode-teams
description: "Run re-forge teams as deterministic ultracode Workflow scripts in Claude Code: fan out one auditor per file/batch with adversarial refuters, gate behind a strict-schema synthesis agent. Use when the work is enumerable (audit N files, refute M claims) rather than open-ended — for open investigation keep /research."
---

# ultracode-teams: re-forge fan-out as Workflow scripts

`ultracode` is a Claude Code opt-in keyword. When a prompt contains `ultracode`
(or the session has it on), Claude Code switches to the **Workflow tool**: a
deterministic JavaScript orchestration script instead of free-form dispatch. The
script composes these primitives:

- `agent(opts)` — one subagent invocation (prompt + output schema)
- `pipeline(items, stageFn)` — run a multi-stage chain, optionally per item
- `parallel(tasks)` — run tasks concurrently (the harness caps concurrency)
- `phase(name, fn)` — a named ordered stage boundary
- `log(...)` — emit a structured event into the journal

Plus three execution features used below: **structured-output schemas** (each
`agent` declares the JSON shape it must return), an optional **worktree**
isolation mode (agents edit in a separate git worktree), and **resume** (a run
re-entered from its journal skips completed steps). Do not assume any API
surface beyond these — that is the full vocabulary this skill relies on.

## When to write a Workflow instead of dispatching /research

| Situation | Use |
|---|---|
| Open-ended question, unknown shape, "what's going on with X" | `/research` (skeptic+adversary+moderator+evaluator team) |
| Enumerable units of work, one agent per unit, identical method | **Workflow** (`pipeline`/`parallel`) |
| You need deterministic resume after a credit-cap interrupt | **Workflow** (journal resume) |
| You need agents to edit files in isolation, then gate | **Workflow** + worktree |

Rule of thumb: if you can write the loop bound (`for each of these N files/claims`),
it is a Workflow. If you cannot enumerate the units yet, it is `/research`.

This repo's own quality overhaul ran exactly the Workflow shape, before it was a
Workflow: in the self-evolution rounds the research-lead audited every specialist
against MAST + Anthropic patterns, **found 12 defects, and expanded 12 → 17
specialists** (README "How it was built", item 1). That is fan-out (one audit per
specialist) + adversarial gate (defects must survive a refuter) + synthesis (the
roster change). Encode it as a Workflow and it resumes and parallelizes for free.

## Mapping: re-forge roles → Workflow primitives

| re-forge role | Workflow primitive |
|---|---|
| Team lead (research-lead, engineering-lead) | the orchestrator `phase()` sequence |
| Specialist (finder, auditor, executor) | an `agent()` call inside `parallel`/`pipeline` |
| Skeptic / adversary gate | a refuter `agent()` chained after each finder |
| Evaluator (5-dim rubric, PASS/FAIL) | a final synthesis `agent()` with a strict schema |

The contract that makes re-forge re-forge — *every finding is re-audited by an
adversary before it counts* — becomes a per-item pipeline stage. The evaluator's
"high confidence" gate becomes the synthesis agent's schema: if a finding lacks a
`refuter_verdict`, it is structurally invalid and the run fails closed.

## Worked example: audit N files, one finder + one refuter each

Fan one auditor over each batch of files, chain an adversarial refuter that tries
to kill every finding, then gate the survivors through one strict-schema
evaluator. This mirrors `/security` and `/research` adversarial gating in
deterministic form.

```js
// workflow: audit-batches.js  (run under `ultracode`)
// FINDINGS schema — every agent below must return this exact shape.
const FINDING = {
  file: "string",
  claim: "string",            // what the finder asserts is wrong
  severity: "low|med|high",
  evidence: "string",         // file:line or quoted snippet — no invented refs
  refuter_verdict: "upheld|refuted|uncertain", // set by the refuter, not the finder
};

export default async function ({ agent, pipeline, parallel, phase, log }) {
  const batches = chunk(FILES, 8);            // enumerable units → one finder each

  // Phase 1: per-batch finder → refuter. pipeline runs the two stages in order
  // for each batch; parallel fans the batches out under the harness cap.
  const audited = await phase("audit", () =>
    parallel(batches.map((batch) =>
      pipeline([batch], async (b) => {
        const found = await agent({
          role: "finder",
          schema: { findings: [FINDING] },
          prompt: `Audit these files for defects. One FINDING per defect, with
                   file:line evidence. Do not set refuter_verdict.\n${b.join("\n")}`,
        });
        log("found", { batch: b.length, n: found.findings.length });

        // Adversarial gate: the refuter attacks every finding and must stamp a verdict.
        return agent({
          role: "refuter",
          schema: { findings: [FINDING] },
          prompt: `For each finding, try to refute it from the same evidence.
                   Set refuter_verdict. Mark "refuted" if the evidence does not
                   support the claim.\n${JSON.stringify(found.findings)}`,
        });
      })
    ))
  );

  // Phase 2: single synthesis agent = the evaluator gate. Strict schema: it may
  // only emit upheld findings; anything uncertain is reported separately.
  return phase("synthesize", () =>
    agent({
      role: "evaluator",
      schema: {
        confidence: "high|low",
        upheld: [FINDING],         // refuter_verdict === "upheld" only
        dropped: [{ file: "string", reason: "string" }],
      },
      prompt: `Keep only findings with refuter_verdict "upheld". Set confidence
               "high" only if every kept finding has file:line evidence.
               \n${JSON.stringify(audited.flat())}`,
    })
  );
}
```

Notes that match measured re-forge behavior:

- **File existence is the source of truth, not return text.** A credit cap can
  truncate an agent's summary while its file writes complete (BENCHMARKS_v0.2
  observation 4). Have finders write evidence to disk and have the evaluator read
  files, then **resume** the run rather than re-dispatching.
- **Bound your fan-out; budget is the real ceiling.** `chunk(FILES, 8)` keeps
  batch count bounded; v0.2 measured 92 concurrent claude processes unmanaged and
  found the bottleneck was the user's API budget, not coordination overhead
  (BENCHMARKS_v0.2, v0.1-comparison note). Let the harness concurrency cap throttle and
  size batches so a credit cap interrupts few in-flight agents.
- **Use worktree mode when finders edit, not just read** — it isolates each
  agent's writes so a refuter or the evaluator can diff them before they land.

## Boundaries (honest)

- Workflows are for **deterministic fan-out** over enumerable units. They do not
  replace `/research`-style team dispatch for open-ended investigation, where the
  specialist set and the question shape are discovered during the run.
- The primitives this skill assumes are exactly `agent`, `pipeline`, `parallel`,
  `phase`, `log`, schemas, worktree, and resume. If you need behavior outside
  that set, drop back to a team skill (`/research`, `/engineer`, `/security`) and
  let the lead orchestrate it.
- Keep the adversary in the loop. A Workflow without a refuter stage is just a
  fan-out, not re-forge — the gate is the point (README: "adversarial gating is
  contractual").

## Quick checklist

1. Can you enumerate the units? If no → `/research`, stop.
2. One finder `agent()` per unit, identical method, strict FINDINGS schema.
3. One refuter stage per finder; it stamps `refuter_verdict`, finders never do.
4. One evaluator `agent()` with a fail-closed schema (no verdict → invalid).
5. Finders write evidence to disk; the evaluator reads files; rely on resume.
6. Bound batch count so concurrency stays under the harness cap and budget.
