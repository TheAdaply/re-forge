---
name: causal-inference
description: "Correlation-to-causation discipline for any \"does X cause Y\", \"what is the effect of X\", or \"should we do X\" question. Use when a decision rests on a causal claim drawn from observational data, an A/B test, an event study, or a regression with controls — before reporting any effect as causal. Enforces draw-the-DAG-first, identification-before-estimation, the design hierarchy (RCT > natural experiment > diff-in-diff > IV > controls), A/B-test pitfalls, and unmeasured-confounder sensitivity analysis."
---

# Causal Inference: how to earn the word "cause"

A regression coefficient is an association. It becomes a causal effect only under
assumptions you must state and defend — never because the model was fancy or the
p-value small. This skill is an ordered procedure. Run the gates in order and
refuse to call a number an "effect", "impact", "driver", or "lift" until the
self-check at the bottom passes. The failure modes are identical whether the data
is a 200-row experiment log or a years-long panel; only the stakes differ.

Work top to bottom. Each section is a gate, not a suggestion. If a gate cannot be
answered, *that is the finding* — say so explicitly instead of estimating anyway.

## Gate 1 — Draw the DAG first (before any regression)

You cannot choose controls correctly without a picture of how the variables
relate. Sketch a directed acyclic graph — nodes are variables, arrows are "directly
causes" — *before* you fit anything. Pearl's central lesson: the graph, not the
data, tells you what to adjust for (Pearl & Mackenzie, *The Book of Why*).

Classify every variable on a path between treatment `X` and outcome `Y`:

- **Confounder** — causes both `X` and `Y` (`X ← Z → Y`). Leaving it out biases the
  effect. **You must condition on it** (or otherwise block the path).
- **Mediator** — sits on the causal chain (`X → M → Y`). Conditioning on it removes
  part of the very effect you want; it answers a *different* question (direct vs
  total effect). Do not control for it when you want the total effect.
- **Collider** — receives arrows from two paths (`X → C ← Y`, or `A → C ← B`).
  **Conditioning on a collider CREATES bias that was not there** — it opens a
  spurious path and induces correlation between independent causes. This is the
  most counterintuitive rule in the field: adding a "control" can make things
  worse. Selecting your sample on a collider (e.g. only analysing units that
  survived, got funded, or clicked) is silently conditioning on it.
  (Wikipedia: "Collider (statistics)"; the survivorship and selection version is
  the same mechanism.)
- **Descendant of treatment / post-treatment variable** — never control for it
  unless you are deliberately doing mediation analysis with the right method.

The fork/chain/collider trichotomy is what **d-separation** formalises: a path is
blocked if it contains a chain or fork whose middle node you conditioned on, or a
collider you did *not* condition on (and none of whose descendants you conditioned
on). Simpson's paradox is the visible symptom of choosing the wrong adjustment set
— the same data shows opposite signs depending on what you condition on
(Wikipedia: "Simpson's paradox").

Anti-pattern to name out loud: "I threw in every available variable as a control."
Kitchen-sink adjustment opens collider paths and conditions on mediators. Controls
are chosen by the graph, not by availability.

## Gate 2 — Identification before estimation

State the **estimand** and the **identifying assumptions** before writing
estimation code. No estimator manufactures identification a flawed design lacks.

1. **Name the target.** ATE (average over everyone), ATT (effect on the treated),
   CATE (effect as a function of covariates), or LATE (effect on compliers, the
   only thing an instrument gives you). These are different numbers; "the effect"
   is ambiguous until you pick one.
2. **Backdoor criterion, in plain language.** A set of variables `Z` lets you read
   the causal effect of `X` on `Y` off the data if `Z` (a) **blocks every
   spurious "backdoor" path** — every path from `X` to `Y` that starts with an
   arrow *into* `X` (these carry confounding) — and (b) **contains no descendant
   of `X`** (no mediators or colliders downstream of treatment). If such a `Z`
   exists and you observe it, the effect is identified by adjusting for `Z`; if no
   observed set satisfies this, *the effect is not identified from this data by
   adjustment alone* — stop and find a different design (Gate 3). See Hernán &
   Robins, *Causal Inference: What If*, Part I (free PDF below); Wikipedia:
   "Backdoor criterion".
3. **When backdoor fails, look for a front door or an instrument.** A fully
   mediated path with an unconfounded mediator can identify via the front-door
   criterion; an exogenous variable that moves `X` but touches `Y` only through
   `X` identifies via instrumental variables (Gate 3).
4. **State the untestable assumptions as assumptions.** Unconfoundedness (no open
   backdoor you forgot), positivity/overlap (every covariate stratum has both
   treated and untreated units — check the propensity-score support), SUTVA
   (Gate 4). These are defended with argument, not proven from data.

If you cannot write the estimand and the assumption set in three sentences, you
are not ready to estimate.

## Gate 3 — The hierarchy of designs (know what each one buys and assumes)

Climb to the strongest design the problem allows. Each rung trades a weaker
assumption for a stronger one; the bottom rung assumes the most and is believed
the least.

| Design | Identifying assumption (what must hold) | Fails when |
|---|---|---|
| **Randomised experiment (RCT / A/B)** | Randomisation makes `X` independent of all confounders, observed or not. The gold standard. | Randomisation is broken, leaks, or violates SUTVA (Gate 4). |
| **Natural experiment / RDD** | An external rule assigns treatment as-if randomly (a cutoff, lottery, policy date). Near the cutoff, treated ≈ control. | Units can manipulate which side of the cutoff they land on (run a McCrary density test); covariates jump at the cutoff. |
| **Difference-in-differences** | **Parallel trends**: absent treatment, treated and control would have moved together. | Pre-trends diverge; with staggered adoption, two-way fixed effects mis-weights — use Callaway–Sant'Anna or an imputation estimator instead. |
| **Instrumental variables (2SLS)** | Instrument is (a) **relevant** (first-stage F ≳ 10), (b) **excludable** (affects `Y` only through `X` — untestable), (c) **independent** of confounders. Gives the LATE, not the ATE. | Weak instrument (use Anderson–Rubin / weak-IV-robust inference); exclusion restriction is just asserted. See Angrist & Pischke, *Mostly Harmless Econometrics*. |
| **Regression / matching / propensity / DML with controls** | **Selection on observables**: you measured and adjusted for *every* confounder. Untestable and usually optimistic. | An unmeasured confounder exists — which is almost always. Quantify how bad it could be in Gate 5. |

Two rules: (1) prefer the design, not the estimator — a better estimator on a
broken design is still broken; (2) the bottom rung is the default everyone
reaches for and the one that most often fails, because "selection on observables"
is an act of faith. Treat machine-learning feature importance (SHAP, gain) as
purely associational — it is *never* a causal effect.

## Gate 4 — A/B test pitfalls (a real RCT still breaks in these ways)

Randomisation buys unconfoundedness; it does not buy correct conclusions.

- **Peeking / optional stopping.** Repeatedly checking a fixed-horizon test and
  stopping when `p < 0.05` inflates the false-positive rate far above 5% — the
  more often you peek, the worse. Fix the sample size by a power calculation up
  front, *or* use a method valid under continuous monitoring (sequential tests,
  always-valid p-values / e-values, Bayesian designs). (Evan Miller, "How Not To
  Run an A/B Test"; Statsig, "The dangers of peeking".)
- **SUTVA violations (interference).** SUTVA assumes one unit's treatment does not
  affect another's outcome. It breaks under network effects, marketplace
  two-sidedness, shared inventory, or when treatment and control compete for the
  same scarce resource — randomising at the user level then leaks treatment across
  the cut. Randomise at the interference boundary (cluster/market/time-slice
  randomisation) instead (Wikipedia: "Network effect"; Kohavi et al., "Online
  Controlled Experiments... Pitfalls").
- **Novelty and primacy effects.** A short-run lift can be users reacting to
  *change* rather than to the *thing*; it decays. Run long enough to see the
  effect stabilise, and inspect the time series, not just the pooled mean.
- **Other classics:** sample-ratio mismatch (a split that is not 50/50 signals a
  broken assignment — investigate before trusting anything); twyman's-law
  surprises ("too good to be true" usually is instrumentation); multiple metrics /
  multiple variants without correction (the multiple-testing trap); a
  short-horizon proxy metric that moves opposite to the long-horizon goal.

## Gate 5 — Sensitivity analysis (how strong must an unmeasured confounder be?)

Every observational effect rests on "no unmeasured confounding", which you cannot
prove. So quantify the *minimum* confounding that would overturn your conclusion,
and ask whether something that strong is plausible.

- **E-value.** The minimum strength of association (on the risk-ratio scale) that
  an unmeasured confounder would need with *both* treatment and outcome to explain
  away the entire estimate (and, separately, to push the confidence interval to
  the null). A large E-value means only an implausibly strong hidden confounder
  could overturn the result; an E-value near 1 means a weak one suffices
  (VanderWeele & Ding, 2017).
- **Partial-R² / omitted-variable-bias bounds** for regression: express robustness
  as "an unobserved confounder would have to explain at least X% of the residual
  variation in both treatment and outcome to bring the effect to zero",
  benchmarked against the strength of an observed covariate you trust
  (Cinelli & Hazlett, 2020 — "Making Sense of Sensitivity").
- **Placebo / refutation checks** that should *fail* if the design is sound:
  permute the treatment (effect should vanish); add a random "confounder" (effect
  should not move); a negative-control outcome that treatment cannot affect (a
  non-zero estimate exposes residual confounding); for DiD, a pre-period placebo
  date (an "effect" before treatment kills parallel trends).

Report the sensitivity number next to the estimate. "Effect = 0.04, and a
confounder ~1.5× stronger than our strongest measured covariate would erase it" is
an honest result; a bare 0.04 is not.

## Failure modes to name out loud when you see them

- Causal language ("drives", "lifts", "impact", "because of") on a regression that
  only adjusted for whatever was in the dataframe.
- A "control" added with no DAG — possibly a collider or mediator making bias worse.
- Sample filtered on an outcome of treatment (survivors, converters) — collider
  selection.
- An A/B result reported after peeking, with no pre-set horizon or sequential method.
- User-level randomisation in a marketplace / social / shared-resource setting (SUTVA).
- IV with first-stage F < 10, or an exclusion restriction merely asserted.
- DiD with visibly diverging pre-trends, or staggered TWFE with no modern correction.
- An observational effect shipped with no sensitivity / E-value analysis.
- SHAP / feature importance presented as "what causes the target".

## Self-check before delivering

Answer all yes, or fix it first:

1. Did I draw the DAG and classify every adjusted variable as confounder,
   mediator, or collider — and confirm I am not conditioning on a collider or a
   mediator (including via sample selection)?
2. Did I write the estimand (ATE/ATT/CATE/LATE) and the identifying assumptions
   *before* estimating, and confirm an observed adjustment set satisfies the
   backdoor criterion (or name the alternative design that does)?
3. Did I climb to the strongest design the data allows, and state the specific
   assumption that design requires and how I checked it?
4. If this is an experiment, did I rule out peeking (fixed horizon or sequential
   method), SUTVA/interference, and novelty effects?
5. Did I report a sensitivity number (E-value or partial-R² bound) saying how
   strong an unmeasured confounder must be to overturn the conclusion?
6. Does my conclusion still hold at the unfavourable end of the interval, and have
   I avoided every causal verb the design cannot support?

References and citations: `references/sources.md`.
