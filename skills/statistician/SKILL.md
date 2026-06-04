---
name: statistician
description: "Enforce hypothesis-testing discipline before you trust any p-value, win, or significance claim. Use when running an A/B test, comparing models or strategies, screening features, declaring a result 'significant', or deciding whether a null result means anything. Locks down H0/H1/alpha/test BEFORE outcomes, demands power and effect sizes with intervals, corrects for multiple comparisons, and names the p-hacking and forking-paths failure modes by name."
---

# Statistician: hypothesis-testing discipline before you believe a p-value

A p-value computed after you have seen the outcomes is a number, not evidence. A
"significant" result from an undeclared test, an uncounted search, or a flexible
stopping rule is selection wearing a lab coat. This skill is an ordered
procedure: run the gates in order, and refuse to report a result until the
self-check at the bottom passes. It applies to a 30-row A/B test as much as to a
model bake-off — the failure modes are identical, only the stakes differ.

Work top to bottom. Each section is a gate, not a suggestion. The first three
gates must be answered *in writing before you look at any outcome*. If a gate
cannot be answered, that is itself the finding — say so explicitly.

## Gate 1 — Pre-specify H0, H1, alpha, and the test (BEFORE outcomes)

Every degree of freedom you leave open until after seeing the data is a degree of
freedom you can exploit, consciously or not, to manufacture significance. Close
them first, in writing:

1. **State H0 and H1 precisely.** Null and alternative must be falsifiable
   statements about a parameter, not vibes. "Variant B is better" is not a
   hypothesis; "the difference in conversion rate B−A is ≤ 0" is.
2. **Pick one-sided vs two-sided up front** — and justify it. Switching to
   one-sided after seeing the direction halves your real p-value silently.
3. **Fix alpha before looking.** 0.05 is a convention, not a law; pre-commit to it
   (or to 0.01 / 0.005) *and* to whether it is per-test or family-wide (Gate 4).
4. **Name the exact test and its assumptions.** Which test, on which statistic,
   under which distributional and independence assumptions? Write the function
   call you will run (e.g. `scipy.stats.ttest_ind(..., equal_var=False)` for
   unequal-variance means; a permutation test when assumptions are shaky). The
   assumptions are part of the pre-registration — verify them, do not assume them.
5. **Fix the sample size / stopping rule** (Gate 2). "We'll keep collecting until
   it's significant" is not a stopping rule; it is optional stopping (Gate 5).

Pre-registration is the cheapest defense that exists: commit the four items above
to a timestamped note (a git commit, an OSF entry) before the data is unblinded.
Anything decided after unblinding is *exploratory* and must be labeled as such —
exploratory findings generate hypotheses, they do not confirm them.

## Gate 2 — Power and the minimum detectable effect

An underpowered study that returns p > alpha tells you almost nothing. **A null
result from an underpowered test is silence, not evidence of no effect.** Compute
power *before* collecting data, not after.

- **The four linked quantities** — effect size, sample size n, alpha, and power
  (1 − beta) — determine each other; fix any three and solve for the fourth. Use
  `statsmodels.stats.power` (e.g. `TTestIndPower().solve_power(...)`) to get the n
  needed for, say, 80% power at alpha = 0.05 to detect your **minimum detectable
  effect (MDE)** — the smallest effect that would actually change your decision.
- **State the MDE before the test.** If you cannot detect an effect smaller than X
  with your n, then "no significant effect" only rules out effects larger than X.
  Report that bound; do not imply you ruled out *any* effect.
- **Post-hoc / "observed" power is worthless.** Power computed from the observed
  effect is a deterministic function of the p-value and adds zero information — if
  p > 0.05, observed power is mechanically < 0.5. Report a confidence interval
  instead; it conveys both the estimate and its precision (Hoenig & Heisey, "The
  Abuse of Power", `references/sources.md`).
- **Underpowered + significant is also a trap.** When power is low, the few
  estimates that *do* clear significance are inflated in magnitude (the "winner's
  curse" / type-M error) and often wrong in sign (type-S). A significant result
  from an underpowered design should *lower* your confidence in the effect size,
  not raise it (Gelman & Carlin, `references/sources.md`).

## Gate 3 — Effect sizes with confidence intervals, not p-values

The p-value answers "could noise alone produce something this extreme?" — it does
**not** tell you how big the effect is or whether it matters. Report the estimate
and its interval; treat the p-value as a footnote.

- **Always report a standardized or natural effect size with a CI.** Cohen's d for
  mean differences, a correlation r, a risk/odds ratio, an absolute lift in
  conversion rate — with a 95% interval, not a bare point. The interval *is* the
  result; the point estimate is its midpoint (ASA statement on p-values,
  `references/sources.md`).
- **Statistical significance ≠ practical significance.** With large n, a trivially
  small effect becomes "significant"; with small n, an important effect can be
  "non-significant". The CI separates these cases at a glance — a tight interval
  near zero means "precisely nothing", a wide interval spanning zero means
  "we don't know".
- **Carry the interval to the decision.** If the CI crosses the threshold that
  would change the action (ship / don't ship, trade / don't trade), the honest
  answer is "underpowered / inconclusive", regardless of which side of alpha the
  p-value landed on.
- **Bootstrap when no clean formula exists** (`scipy.stats.bootstrap`, BCa method)
  — e.g. for a median, a Sharpe ratio, or a metric difference. For dependent
  (time-ordered) data use a block / stationary bootstrap; an i.i.d. bootstrap of
  autocorrelated data understates the interval.

## Gate 4 — Multiple-comparisons control: Bonferroni vs BH-FDR

Testing m hypotheses each at alpha inflates the chance of *some* false positive to
≈ 1 − (1 − alpha)^m — at m = 20 and alpha = 0.05 that is ~64%. Screening features,
sweeping thresholds, and tuning hyperparameters are all multiple testing whether
or not you call them that. **Count your trials and write the number down.**

Pick the correction by what you are protecting against:

- **Family-Wise Error Rate (FWER) — Bonferroni / Holm.** Controls the probability
  of *even one* false positive. Use it when a single false positive is costly and
  the number of tests is modest, or for confirmatory claims: a drug must work, a
  trading rule must be real. Bonferroni (test at alpha/m) is simple but
  conservative; **Holm's step-down is uniformly more powerful and dominates plain
  Bonferroni — prefer Holm whenever you would have reached for Bonferroni.**
- **False Discovery Rate (FDR) — Benjamini-Hochberg.** Controls the *expected
  proportion* of false positives among the rejections. Use it for exploratory,
  high-dimensional screening (hundreds of features/genes/signals) where you accept
  some false discoveries to keep power. BH is far less conservative than
  Bonferroni at large m (Benjamini & Hochberg 1995, `references/sources.md`).
- **Rule of thumb:** few confirmatory tests → Holm (or Bonferroni); many
  exploratory tests → BH-FDR. Under strong positive dependence BH still controls
  FDR; under arbitrary dependence use Benjamini-Yekutieli.
- **Tooling:** `statsmodels.stats.multitest.multipletests(pvals, method=...)`
  supports `bonferroni`, `holm`, `fdr_bh`, `fdr_by`; `scipy.stats`
  `false_discovery_control` gives BH directly.
- **Selected-best metrics need their own deflation.** When you report the single
  best Sharpe / accuracy / AUC out of N configurations, the expected maximum under
  a pure-noise null is already positive and grows like `sqrt(2 ln N)`. Deflate or
  hold out a final test set touched exactly once; never quote the search winner as
  if it were a single pre-specified test.

## Gate 5 — Name the p-hacking taxonomy out loud

P-hacking ("data dredging", "specification search") is exploiting analytic
flexibility until p < alpha. It usually is not fraud — it is undisclosed choices.
Name each one when you see it:

- **Optional stopping.** Peeking at the data and stopping collection when it
  crosses significance. Under continuous peeking the false-positive rate
  approaches 1; even a few interim looks roughly doubles it. Fix: pre-set n, or
  use a sequential design with alpha-spending / group-sequential boundaries.
- **Outcome switching.** Swapping the primary metric, the horizon, or the
  transform for whichever one "worked". Fix: declare the single primary outcome in
  Gate 1; everything else is secondary and exploratory.
- **Subgroup fishing.** Slicing into subgroups (region, device, segment) until one
  is significant, then reporting it as the headline. Fix: pre-register subgroups,
  correct for them (Gate 4), and treat post-hoc slices as hypothesis-generating.
- **Covariate / specification fiddling.** Adding, dropping, or transforming
  controls; trying outlier rules; switching tests — until significance appears.
  Fix: pre-specify the model and the outlier rule; report every specification you
  ran, not just the surviving one.

These are catalogued and quantified in Simmons, Nelson & Simonsohn, "False-Positive
Psychology" (2011), which demonstrates how a handful of undisclosed researcher
degrees of freedom can push the false-positive rate above 60% (see
`references/sources.md`).

## Gate 6 — The garden of forking paths

You do **not** have to run multiple tests to have a multiple-comparisons problem.
Even with a *single* test on a *single* dataset, if the specific analysis you ran
was contingent on the data you saw — a choice you would have made differently
under a different dataset — then your reported p-value is computed against the
wrong reference set. The relevant null distribution must include *all the analyses
you would have run* in counterfactual datasets, not just the one path you walked.

This is Gelman & Loken's "garden of forking paths" (`references/sources.md`): a
researcher can p-hack *without ever trying multiple tests*, simply by letting
data-dependent decisions (which subgroup looked interesting, which covariate to
include, how to bin) be made after seeing the data. The defense is the same as
Gate 1: decide the path before the data, or, if the analysis is genuinely
exploratory, label it exploratory and confirm on fresh data. A p-value is only
interpretable relative to a pre-specified procedure.

## Failure modes to name out loud when you see them

- A one-sided test chosen after the direction of the effect was known.
- "We ran it until it hit significance" — optional stopping with no fixed n.
- A null result reported as "no effect" from a study with no power analysis.
- The single best config out of dozens quoted as if it were one pre-planned test.
- A bare p-value with no effect size and no confidence interval.
- Bonferroni used where Holm or BH would be both valid and more powerful — or no
  correction at all on a swept set of features/thresholds.
- The primary metric quietly swapped for the one that crossed 0.05.
- A subgroup "finding" that was discovered by slicing, not pre-registered.

## Self-check before delivering

Answer all yes, or fix it first:

1. Did I write down H0, H1, alpha, one-vs-two-sided, and the exact test (with its
   assumptions verified) **before** looking at any outcome?
2. Did I do a pre-data power analysis and state the minimum detectable effect — and
   if the result is null, did I report it as "underpowered above X", not "no
   effect"?
3. Does every headline number ship with an effect size and a confidence interval,
   and does my conclusion still hold at the unfavorable end of that interval?
4. Did I count how many hypotheses / features / thresholds / configs I tested, and
   apply the right correction (Holm/Bonferroni for confirmatory FWER, BH for
   exploratory FDR)?
5. Did I check for optional stopping, outcome switching, subgroup fishing, and
   specification fiddling — and disclose every specification I ran, not just the
   surviving one?
6. If any analytic choice was made after seeing the data (a forking path), did I
   label that result exploratory and reserve confirmation for fresh data?

References and citations: `references/sources.md`.
