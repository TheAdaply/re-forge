---
name: bayesian-modeler
description: "Run a Bayesian analysis as an ordered workflow, not a single fit: state and justify priors, prior-predictive-check before fitting, run the full Gelman-et-al workflow loop, gate on convergence diagnostics (R-hat, ESS, divergences), posterior-predictive-check the fit, and decide up front whether Bayes earns its cost over a frequentist interval. Use when building a probabilistic model, choosing priors, debugging MCMC divergences or non-convergence, doing uncertainty quantification, or deciding between a Bayesian and a frequentist approach."
version: 1.0.0
author: re-forge
license: MIT
tags: [bayesian, mcmc, pymc, numpyro, stan, priors, convergence-diagnostics, uncertainty-quantification, posterior-predictive-check]
---

# Bayesian Modeler: Run the Workflow, Not Just the Fit

This is a procedure, not a philosophy lecture. Execute the gates in order. A
single `sample()` call is not a Bayesian analysis; the workflow around it is.
Every non-obvious rule cites a public source; full list in
`references/sources.md`. The canonical end-to-end loop is the *Bayesian
Workflow* of Gelman et al. (arXiv 2011.01808); this skill is an operational
checklist of it. The most common failure it prevents: fitting a model, reading
off a posterior mean, and reporting it — never checking that the chains
converged or that the model can even reproduce the data.

## 0. Decision gate — does Bayes earn its cost here?

Answer before writing a model. Bayes buys a full posterior (not a point),
principled uncertainty propagation into downstream decisions, real prior
knowledge, exact small-sample inference, and clean hierarchy/partial pooling. It
costs specification effort, compute, and the obligation to run every diagnostic
below.

Use a **frequentist interval** (OLS/MLE + a bootstrap CI) when you need one
number with an error bar that no decision consumes as a full distribution; or
the model is a standard GLM with abundant data (the likelihood dominates any
reasonable prior, so posterior mean ≈ MLE and a Wald/bootstrap interval reaches
the same answer faster); or you cannot articulate a prior you would defend and
there is enough data that it would not matter anyway.

Reach for **Bayes** when data is scarce relative to parameters; you have real
prior information; the structure is hierarchical (partial pooling beats both
"one model for all" and "one per group"); you need calibrated predictive
uncertainty feeding a decision/utility calculation; or you want to
compare/average models by predictive density. Picking Bayes for prestige when a
`t`-interval answers the question is a cost with no return.

A Bayesian credible interval and a frequentist confidence interval answer
different questions ("where is the parameter, given this model and data" vs "how
often does this procedure cover"). Do not report one and interpret it as the
other.

## 1. Specify the generative model and state priors as claims

1. **Write the generative story first, in math, before code.** What random
   process produces the observed data? Draw the DAG. Name every distributional
   assumption. If you cannot simulate fake data from the model, you have not
   specified it.
2. **Every prior is a claim about the world — state it and justify it.** For
   each parameter record: the distribution, *why* (informative / weakly
   informative / reference), and the plausible range it implies. "I used a flat
   prior to be objective" is not a justification — `Uniform(-inf, inf)` asserts
   that absurd values are as likely as sensible ones and is almost never what
   you believe (Gelman et al., *Prior choice recommendations*).
3. **Default to weakly informative, not uninformative.** Put parameters on an
   interpretable scale (standardize predictors), then pick a prior that allows
   roughly 2-3x the range you expect from data and regularizes the rest. Use
   positive-support priors (HalfNormal, Exponential, HalfCauchy) for scales,
   and an LKJ prior on correlation matrices rather than priors on raw entries.
4. **For sparse / many-predictor regressions, use a shrinkage prior** (horseshoe
   or the regularized "Finnish" horseshoe) instead of a single global Normal
   when you believe most coefficients are near zero (Carvalho et al. 2010;
   Piironen & Vehtari 2017). Encode the belief, do not hand-tune it away.

## 2. Prior predictive check — BEFORE you ever touch the likelihood

Non-negotiable gate. Sample parameters from the priors, push them through the
generative model, and look at the *simulated data* (Gabry et al., *Visualization
in Bayesian workflow*).

```python
import pymc as pm
import arviz as az

with model:
    prior_pred = pm.sample_prior_predictive(samples=1000)

az.plot_ppc(prior_pred, group="prior")  # simulated data under the priors alone
```

- Do the simulated datasets cover plausible outcomes and *exclude* absurd ones?
  If the priors generate impossible data, the priors are wrong — fix and repeat;
  far cheaper than discovering it after fitting.
- Too narrow is also a failure: priors that forbid plausible surprises fight the
  data and bias the posterior.

## 3. Fit — and iterate the workflow loop, not a one-shot

The workflow is a loop, not a pipeline (Gelman et al. 2020, arXiv 2011.01808):

```
define model → prior predictive check → fit → convergence diagnostics
   → posterior predictive check → (compare models) → (sensitivity)
   → interpret → if any gate fails, revise the model and loop back
```

Operational rules for the fit itself:

1. **Iterate on a data subset first.** Convergence problems reproduce on a
   sample at a fraction of the cost; run full data only once diagnostics pass.
2. **Build complexity incrementally.** Start with a baseline that you *know*
   converges, add one component at a time, check diagnostics after each — when
   something breaks you know which addition did it.
3. **Simulate-then-fit (recovery check).** Generate data with known parameters,
   fit, confirm the posterior recovers them. If it cannot, the model is
   unidentifiable — no sampler will save it. For inference-*algorithm*
   correctness, simulation-based calibration formalizes this (Talts et al. 2018).
4. **NUTS is the default sampler** for continuous, smooth posteriors; it
   adaptively tunes trajectory length so you do not hand-tune HMC (Hoffman &
   Gelman 2014; intuition in Betancourt 2017). Run **≥ 4 chains** so R-hat is
   meaningful.

## 4. Convergence diagnostics — the gate every fit must pass

A posterior you have not diagnosed is not evidence. Check ALL of these before
trusting any number (rank-normalized R-hat and ESS per Vehtari et al. 2021):

| Diagnostic | Threshold | What a failure means |
|---|---|---|
| **R-hat (rank-normalized, split)** | < 1.01 | Chains disagree — between-chain variance exceeds within-chain. The chains have **not** converged to a common distribution; the posterior is not yet sampled. Do not read any summary. |
| **Bulk-ESS** | > 400 total | Few *effective* independent draws for the bulk; posterior means/sd are noisy. High autocorrelation. |
| **Tail-ESS** | > 400 total | Tail quantiles (the 5%/95% you quote as the interval) are unreliable even if the bulk looks fine. |
| **Divergences** | 0 | The sampler hit a region too sharply curved for its step size and *stopped exploring it*. Even a handful biases the posterior — the bias is silent, not random. |
| **Max tree depth hits** | none | Sampler hitting its computational ceiling: inefficient (slow), not necessarily biased. |
| **E-BFMI (energy)** | > 0.3 | Poor momentum exploration, often from heavy tails or strong posterior correlations; the chain is not traversing the typical set efficiently. |

```python
summary = az.summary(idata)  # r_hat, ess_bulk, ess_tail per parameter
assert (summary["r_hat"] < 1.01).all(), "non-convergence: do not interpret"
assert (summary["ess_bulk"] > 400).all(), "insufficient effective samples"
n_div = int(idata.sample_stats["diverging"].sum())
print("divergences:", n_div)            # >0 → triage, do not ignore
az.plot_rank(idata)                       # rank plots beat trace plots for mixing
az.plot_energy(idata)                     # E-BFMI / momentum exploration
az.plot_pair(idata, divergences=True)     # where do divergences cluster?
```

**Remediation when a gate fails:**

- **R-hat > 1.01:** more warmup; better/ dispersed initialization; check for
  multimodality or label-switching (add an ordering constraint on exchangeable
  components); reparameterize.
- **Low ESS:** raise `target_accept` (0.9 → 0.95 → 0.99); reparameterize to
  remove posterior correlations/ridges.
- **Divergences:** the #1 cause in hierarchical models is Neal's funnel
  (`scale` parameter near zero). The fix in ~most cases is the **non-centered
  parameterization** — sample a standard-normal offset and scale it, instead of
  sampling the group effect directly:

```python
# Centered (funnels, diverges when sigma is small):
#   theta = pm.Normal("theta", mu, sigma, dims="group")
# Non-centered (the funnel becomes a cylinder HMC can traverse):
z     = pm.Normal("z", 0, 1, dims="group")
theta = pm.Deterministic("theta", mu + sigma * z, dims="group")
```

  Also raise `target_accept` and reparameterize hard constraints (sample
  `log(sigma)` rather than constrained `sigma`). If divergences exceed ~1% of
  draws, the result is untrustworthy — do not report it.

## 5. Posterior predictive check — does the fitted model regenerate your data?

The single most important validation step. Draw replicated datasets from the
posterior predictive and compare them to the observed data (Gabry et al. 2019).
If the model cannot generate data that looks like what you fit it on, its
parameters do not mean what you think.

```python
with model:
    idata.extend(pm.sample_posterior_predictive(idata))
az.plot_ppc(idata, num_pp_samples=200)    # replicated vs observed density
```

Go beyond the density overlay with **targeted test statistics** — ones the
model was *not* directly fit to and that matter for your decision (tail
quantiles, extreme-event frequency, dispersion, autocorrelation/clustering,
group-wise summaries). For each, compute it on the observed data and on every
replicated dataset, then check where the observed value falls in the replicated
distribution. A statistic in the far tail is a precise, named symptom of
misspecification that points at the fix (too-thin-tailed likelihood → Normal to
Student-`t`; missing structure → add it). Loop back to Section 1 and revise.

## 6. Compare and average models (only with > 1 candidate)

When you have alternative models, compare by **expected log predictive
density** via PSIS-LOO-CV — the robust default — not by in-sample fit (Vehtari,
Gelman & Gabry 2017).

```python
cmp = az.compare({"baseline": idata_a, "student_t": idata_b}, ic="loo")
print(cmp)   # elpd_loo, p_loo, elpd_diff, dse, weight, warning
```

- Read `elpd_diff` against its SE `dse`: if `|elpd_diff| < ~2*dse` the models
  are practically tied — prefer the simpler one.
- **Check Pareto-`k`.** `k > 0.7` means the LOO estimate is unreliable for that
  observation (often an influential outlier / structural break) — the comparison
  is suspect there; investigate those points. `p_loo` far above the actual
  parameter count flags misspecification.
- Prefer **stacking weights** for *averaging* over picking a single model when
  several are close (better calibrated in the M-open setting). WAIC is an
  asymptotic shortcut for LOO; if they disagree, trust LOO. Bayes factors are
  extremely prior-sensitive and undefined under improper priors — not a default.

## 7. Prior sensitivity and honest reporting

- **Refit under 2-3 different reasonable priors.** If qualitative conclusions
  shift, the data is weakly informative on that parameter — *report the
  sensitivity*; do not silently keep the prior that gives the answer you wanted.
  If conclusions are stable, say so and move on with the weakly-informative
  default.
- **Propagate the whole posterior** into the decision (expected utility / risk),
  not a point estimate — wasting the posterior on a single number forfeits the
  reason you paid for Bayes.
- Report credible intervals *as* credible intervals, with the model and priors
  they are conditional on.

## Self-check before delivering

Answer each yes/no honestly; a "no" means stop and fix.

1. Did I justify **Section 0** — can I state why Bayes (not a frequentist
   interval) is the right tool for *this* problem, or did I default to it?
2. Is every prior written down with a justification, and did the **prior
   predictive check** produce plausible (not absurd, not impossibly narrow)
   data before I fit?
3. Do ALL convergence gates pass — R-hat < 1.01, bulk- and tail-ESS > 400,
   **zero divergences** (or triaged to ~0 via reparameterization), E-BFMI > 0.3
   — and did I refuse to read summaries until they did?
4. Did a **posterior predictive check** (density + at least one targeted test
   statistic the model was not fit to) confirm the fitted model regenerates
   data like the observed, and did I act on any discrepancy?
5. If I compared models, did I use PSIS-LOO with `elpd_diff`/`dse` and check
   Pareto-`k`, rather than in-sample fit or prior-sensitive Bayes factors?
6. Did I run a prior-sensitivity refit and propagate the full posterior into the
   decision, reporting credible intervals as what they are?
