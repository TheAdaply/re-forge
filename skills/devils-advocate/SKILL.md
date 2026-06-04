---
name: devils-advocate
description: "Structured red-teaming for any analysis, plan, or conclusion before it ships. Use when about to commit to a decision, recommend an approach, accept a result, or write a conclusion that others will act on — especially when the room agrees, the number looks good, or you feel confident. Runs ordered gates: steelman-first, alternative hypotheses, a pre-mortem, an incentive audit, base-rate interrogation, and a written kill-criteria contract."
---

# Devil's Advocate: red-team a conclusion before it ships

Confidence is not evidence and agreement is not validation. A conclusion that
nobody attacked before shipping was tested by exactly zero adversaries. This
skill is the adversary: an ordered procedure you run against your own
analysis/plan/conclusion. Run the gates in order; do not let a conclusion leave
the room until the self-check at the bottom passes.

In re-forge multi-agent teams a skeptic and an adversary agent run these gates
for you automatically. This skill is the **portable, single-session** version:
run it on yourself when no second agent is watching.

Work top to bottom. Each gate is a gate, not a suggestion. A gate you cannot
answer is itself a finding — write it down as an open risk.

## Gate 1 — Steelman first (attacking a weak version is cheating)

Before any criticism, state the **strongest** version of the claim you are about
to attack. Knocking down a sloppy paraphrase proves nothing and breeds false
confidence. This is the standing obligation: improve the argument, *then* break
the improved one (Wikipedia: "Steelmanning").

1. Write the claim in one sentence, in its proponent's strongest form. Repair any
   obvious weakness in the phrasing before you touch it.
2. State the single best piece of evidence *for* it. If you cannot, you do not
   understand it well enough to dismiss it.
3. Only now attack. If the steelmanned version survives every gate below, the
   conclusion has earned its place — say so, and stop manufacturing objections.

Rule: if your strongest summary of the other side is one the proponent would
*endorse*, you have steelmanned. If they would wince, you are strawmanning.

## Gate 2 — Alternative-hypothesis generation (minimum three)

A single explanation that fits the data is not evidence the explanation is right
— it is evidence you stopped looking. Generate **at least three** hypotheses that
would produce the same observation, then say what would distinguish them.

For each alternative, fill the row:

| Hypothesis | Predicts the data? | Distinguishing test | What result would favor it |
|---|---|---|---|
| H0: the claim is true | yes | — | — |
| H1: ___ | ___ | ___ | ___ |
| H2: ___ | ___ | ___ | ___ |
| H3: ___ | ___ | ___ | ___ |

Mandatory candidates to consider as H1–H3 (drop any that genuinely cannot apply,
and say why):

- **Noise / luck.** The effect is a draw from a wide sampling distribution and
  would not replicate. Could you get this by chance? (permutation test, interval.)
- **Selection / survivorship.** You are seeing only the cases that survived to be
  observed; the failures were deleted before you looked (Wikipedia: "Survivorship
  bias").
- **A confound or a simpler cause.** Something correlated with your explanation
  did the work. Prefer the explanation with fewer moving parts that fits equally.
- **Selection-after-the-fact.** The pattern was found *because* you searched many
  candidates and kept the best — the target was drawn around the cluster
  (Wikipedia: "Texas sharpshooter fallacy"; "Multiple comparisons problem").
- **Measurement / leakage artifact.** The signal is an artifact of how the data
  was built, not of the world.

A hypothesis with **no distinguishing test** is not a hypothesis; it is a
preference. The deliverable of this gate is the experiment that would tell H0
apart from its rivals — not a winner declared by vote.

## Gate 3 — Pre-mortem (write the post-mortem before you start)

Assume it is 12 months from now and this conclusion **failed badly**. It already
happened. Write the post-mortem now, in past tense.

This is *prospective hindsight* — imagining an outcome as certain and explaining
it surfaces ~30% more, and more concrete, reasons than asking "what might go
wrong?" Gary Klein, "Performing a Project Premortem," *Harvard Business Review*
(2007): <https://hbr.org/2007/09/performing-a-project-premortem>.

Procedure:

1. **Declare the failure.** "It is `<date+12mo>`. We acted on this conclusion and
   it was wrong / the plan failed. Here is what went wrong." Fix the failure as a
   premise — do not hedge it into "if."
2. **Generate causes independently.** Each contributor lists plausible causes
   *before* discussion, to defeat anchoring and groupthink (Wikipedia:
   "Groupthink"). Solo: write the list cold before you rationalize it away.
3. **Rank by likelihood × early-detectability.** The dangerous failures are the
   likely ones you would *not* notice early.
4. **Convert each top cause into a monitor or a kill-criterion** (Gate 6). A
   pre-mortem that produces no observable trigger was theater.

The pre-mortem is the legitimized end-run around the social cost of dissent: you
are not the person who doubts the team, you are the person doing the exercise.

## Gate 4 — Incentive audit (who benefits if this is believed)

"Never ask a barber if you need a haircut." Map who is rewarded when this
conclusion is *accepted*, independent of whether it is true. Incentives shape
conclusions far below conscious dishonesty (Farnam Street, "Bias from Incentives
and Reinforcement": <https://fs.blog/bias-incentives-reinforcement/>; Munger's
checklist of misjudgment: <https://fs.blog/munger-operating-system/>).

Ask, in writing:

- **Who profits if this is believed?** Status, budget, headcount, a shipped
  deadline, a thesis confirmed, not having to redo work. Are you on that list?
- **Sunk cost.** Are we continuing because of past investment rather than future
  expected value? (Wikipedia: "Sunk cost.") The question that resets it: *if we
  were starting fresh today, would we choose this?*
- **Authority laundering.** Is this accepted because of *who* proposed it rather
  than the evidence? Re-evaluate the claim with the name removed (Wikipedia:
  "Argument from authority").
- **Publication / reporting filter.** Are we seeing this because it is the
  positive result that got surfaced, while the silent failures were never
  reported?

A conclusion that happens to reward its author is not thereby false — but it has
not been audited until you have named the reward and checked the evidence stands
without it.

## Gate 5 — Base-rate interrogation (take the outside view)

Before trusting the details of *this* case, ask how often things of this *class*
succeed. Forecasts built bottom-up from the specifics of a plan are
systematically overconfident; the **outside view** anchors on the reference class
first (Wikipedia: "Reference class forecasting"; "Base rate fallacy").

1. **Name the reference class.** "Projects like this," "features like this,"
   "signals that looked this good in backtest." Be specific enough to count.
2. **State the base rate.** What fraction of that class actually succeeded? If you
   do not know it, that ignorance *is* the headline finding — your inside-view
   confidence is uncalibrated.
3. **Adjust from the base rate, not from zero.** Start at the base rate and move
   only as far as genuinely distinguishing evidence justifies. "This one is
   different" is the most expensive sentence in forecasting; require the evidence
   that it is different.
4. **Calibrate the interval, not the point.** State an 80–90% range and ask
   whether it is wide enough to have caught your last few surprises. Forecasting
   accuracy is a trainable skill, and overconfident narrow intervals are its most
   common failure (Tetlock, *Superforecasting*; Wikipedia: "Superforecasting").

## Gate 6 — The kill-criteria contract (commit it in writing, before)

State **now**, in advance, the observable result that would make you abandon this
conclusion. A belief with no falsifying observation is not a finding; it is a
faith (Wikipedia: "Falsifiability").

Write the contract before you see the outcome — it is worthless written
afterward, because hindsight rewrites what you "expected" (Wikipedia: "Hindsight
bias"). Each line must be **observable, thresholded, and dated**:

```
KILL-CRITERIA CONTRACT  (fill before acting; do not edit after)
- Success looks like:   <metric> <comparison> <threshold>  by <date>
- We ABANDON this if:   <observable> crosses <threshold>   by <date>
- We REVISIT this if:   <leading indicator> moves <direction> by <amount>
- Single observation that would most change my mind:  <state it>
- Pre-registered before looking at the outcome data?  YES / NO
```

If you cannot complete the "abandon if" line, you have not specified a testable
claim — return to Gate 1 and sharpen it until you can. The matching question:
*what evidence would change my mind?* If the honest answer is "none," the
conclusion is held for reasons other than evidence, and you should say so out
loud.

## Failure modes to name out loud when you see them

- Attacking a paraphrase nobody actually proposed (strawman; skipped Gate 1).
- One explanation offered with no rival considered (skipped Gate 2).
- "What could go wrong?" answered with a shrug, never a dated monitor (weak
  Gate 3).
- A conclusion that happens to fund/promote/vindicate its author, un-audited.
- Confidence quoted with no reference class and no interval (skipped Gate 5).
- "I'll know it when I see it" instead of a pre-registered kill threshold.
- Moving the goalposts: redefining success *after* seeing the result.
- Manufacturing objections to a claim that already survived every gate — dissent
  for its own sake is as much a bias as agreement.

## Self-check before delivering

Answer all yes, or fix it first:

1. Did I state the **strongest** version of the claim — one its proponent would
   endorse — before attacking it?
2. Did I generate **three or more** alternative hypotheses, each with a concrete
   test that would distinguish it from the main claim?
3. Did I run the pre-mortem in past tense and convert its top causes into
   observable monitors, not vague worries?
4. Did I name who benefits if this is believed, and confirm the evidence holds
   with the author's name and the sunk cost removed?
5. Did I anchor on a named reference class and base rate before the inside-view
   details, and report an interval wide enough to be honest?
6. Did I write a dated, observable **kill-criteria contract** *before* seeing the
   outcome, including the single observation that would most change my mind?

References and citations: `references/sources.md`.
