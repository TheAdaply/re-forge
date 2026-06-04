---
name: quant-analyst
description: "Interrogate any dataset the way a quantitative analyst does before trusting a single number from it — even a basic CSV. Use when asked to analyze, explore, model, backtest, or draw conclusions from data with a time dimension, a predictive target, many candidate features, or a performance metric (Sharpe, accuracy, R-squared). Enforces provenance checks, temporal-leakage discipline, multiple-testing correction, distribution skepticism, and interval-not-point reporting."
---

# Quant Analyst: how to interrogate a dataset before you believe it

A point estimate with no provenance, no validation scheme, and no interval is a
guess wearing a lab coat. This skill is an ordered procedure: run the gates in
order, and refuse to report a result until the self-check at the bottom passes.
It applies to a 200-row CSV as much as to a market dataset — the failure modes
are identical, only the stakes differ.

Work top to bottom. Each section is a gate, not a suggestion. If a gate cannot
be answered, that is itself the finding — say so explicitly.

## Gate 1 — Provenance interrogation (do this BEFORE looking at correlations)

You cannot model what you cannot trace. Answer these in writing before any plot:

1. **How was each row collected, and by whom?** Instrument, survey, scrape, join
   of two systems? A join is a leak surface; an instrument has a calibration date.
2. **What population does a row represent, and what is excluded?** The sample
   frame defines the only population you may generalize to. State it.
3. **What is missing, and is the missingness informative?** Distinguish MCAR /
   MAR / MNAR. Run `df.isna().mean()`; then test whether missingness *predicts*
   the target (`df['y'].groupby(df['x'].isna()).mean()`). If it does, "drop NaN"
   silently deletes signal and biases every downstream estimate.
4. **Survivorship / selection bias.** Are failed, delisted, churned, or rejected
   units absent? A dataset of "funds that exist today" or "customers still
   subscribed" has had its losers deleted; any backward-looking average is
   inflated. This is the single most common way a clean-looking CSV lies.
5. **As-of correctness.** For every column ask: *was this value knowable at the
   timestamp on its row?* Restatements, back-filled IDs, and "current" status
   columns joined onto historical rows are look-ahead leaks (Gate 2).

If you cannot establish provenance, the correct deliverable is a provenance
question list, not a model. See de Prado's "10 Reasons Most ML Funds Fail"
(garp.org) — most listed failures are provenance and validation failures, not
model failures.

## Gate 2 — Temporal-structure discipline

**First question: is there a time order?** Any timestamp, sequence index, or
"created_at" column means the rows are *not* exchangeable.

- **If time-ordered, random k-fold and `train_test_split(shuffle=True)` are
  invalid.** They let the model peek at the future. Use forward-chaining
  (`sklearn.model_selection.TimeSeriesSplit`) so every test fold lies strictly
  after its training data. See Hyndman & Athanasopoulos, *Forecasting:
  Principles and Practice*, §5.10 (otexts.com/fpp3/tscv.html).
- **Purge and embargo when labels span time.** If a row's target is computed
  over a forward window of length `h` (e.g. an `h`-step-ahead return, a rolling
  label), then training rows whose label window *overlaps* the test period must
  be removed (**purge**), and a gap of `~h` observations after each test fold
  must be dropped (**embargo**) to kill serial-correlation leakage. This is
  de Prado's purged / combinatorial-purged CV (Wikipedia: "Purged
  cross-validation"; QuantInsti walkthrough at
  blog.quantinsti.com/cross-validation-embargo-purging-combinatorial/).
- **Look-ahead checklist** (run every item):
  - Any `.shift()`, rolling, or `groupby().transform()` that could pull a future
    value into a current row?
  - Any normalization / scaling / imputation / target-encoding fit on the *whole*
    dataset before the split? Fit transforms inside the training fold only.
  - Any feature whose value is a restatement or is only finalized after the
    decision timestamp?
  - Any global sort, dedup, or `fillna(method='bfill')` that moves later
    information backward?
- **Panel / grouped data** (many entities over time): group by entity so the same
  entity never appears in both train and test of a fold, *and* keep the time
  split. `timeseriescv` (github.com/sam31415/timeseriescv) implements purged
  walk-forward and combinatorial purged splitters.

State the chosen validation scheme in one sentence before fitting anything.

## Gate 3 — The multiple-testing trap

The 50th hypothesis you test at p < 0.05 is, in expectation, a false positive
even if every hypothesis is null. Searching over features, lags, thresholds, and
hyperparameters is multiple testing whether or not you call it that.

- **Count your trials.** Every feature screened, every threshold swept, every
  config in a grid search is a trial. Write the number down. If you did not count,
  your reported significance is unknown, not "fine".
- **Backtest overfitting.** The best-looking strategy/model from a large search is
  selected *because* it caught noise. The more configs tried, the higher the
  in-sample peak you will find under a pure-noise null.
- **Deflated Sharpe intuition.** Under `N` independent null trials, the expected
  maximum Sharpe is strictly positive and grows with `N` (≈ proportional to
  `sqrt(2 ln N)`). The **Deflated Sharpe Ratio** asks: is my best Sharpe larger
  than what `N` coin-flips would have produced, also correcting for short samples,
  skew, and fat tails? (Bailey & de Prado, deflated-Sharpe paper,
  davidhbailey.com/dhbpapers/deflated-sharpe.pdf; the same logic generalizes to
  any selected-max metric — accuracy, AUC, IC.)
- **Probability of Backtest Overfitting (PBO).** Fraction of combinatorial splits
  on which the in-sample-best config underperforms the *median* config
  out-of-sample. High PBO means your selection process manufactures winners from
  noise (Bailey, Borwein, de Prado, Zhu;
  davidhbailey.com/dhbpapers/backtest-prob.pdf).
- **Cheap defenses:** pre-register the hypothesis before looking; hold out a final
  test set touched exactly once; apply a multiple-testing correction
  (Bonferroni / Benjamini-Hochberg) to screened features; report how many things
  you tried alongside the winner. Non-nested CV used for both tuning and reporting
  is itself optimistically biased — nest it (Cawley & Talbot,
  jmlr.org/papers/v11/cawley10a.html).

## Gate 4 — Distribution skepticism

Summary statistics assume a stability the data rarely has.

- **Stationarity.** Means, variances, and correlations drift. Test before trusting
  any pooled statistic: ADF (`statsmodels.tsa.stattools.adfuller`) and KPSS
  (`...kpss`) are complementary — ADF's null is non-stationary, KPSS's null is
  stationary; agreement is informative, disagreement flags a near-unit-root.
- **Regime breaks.** A correlation of 0.6 over ten years can be +0.9 then −0.3
  across a structural break. Plot rolling means / vols / correlations; a single
  full-sample number hides the breaks that matter most.
- **Outliers vs fat tails.** Before deleting a 6-sigma point, ask whether the
  distribution is simply heavy-tailed (financial returns routinely are). Deleting
  genuine tail observations destroys exactly the risk you were hired to measure.
  Check kurtosis, a QQ-plot against normal, and whether "outliers" cluster in time
  (a regime, not an error). Winsorize with a stated rule; never silently drop.
- **Normality is an assumption, not a default.** Sharpe ratios, z-score VaR,
  and OLS standard errors all assume it. State the assumption and test it.

## Gate 5 — Uncertainty quantification

**Never report a point estimate without an interval.** A Sharpe of 1.4, an
accuracy of 0.92, a coefficient of 0.03 — each is a single draw from a sampling
distribution. The interval is the result; the point is its midpoint.

- **Bootstrap** when a formula is unavailable or assumptions are shaky: resample
  rows with replacement many times, recompute the statistic, take the 2.5/97.5
  percentiles (`scipy.stats.bootstrap`). For time-ordered data use a **block /
  stationary bootstrap** so serial dependence is preserved — i.i.d. bootstrap of
  autocorrelated data understates uncertainty.
- **What CV actually estimates.** Cross-validation estimates the expected error
  of the *fitting procedure*, not of your one fitted model, and its own variance
  is large and often underestimated. Report fold-level dispersion, not just the
  mean; a tight mean over wildly varying folds is not a stable result (Bates,
  Hastie & Tibshirani, arxiv.org/abs/2104.00673).
- **Carry the interval through to the decision.** If the interval crosses the
  threshold that would change the action, the honest answer is "underpowered",
  not the point estimate.

## The first 10 commands on a fresh CSV

A runnable pandas sequence that embodies Gates 1–5. Adapt column names; keep the
order.

```python
import pandas as pd, numpy as np
df = pd.read_csv("data.csv")

# 1. Shape, dtypes, memory — know what you loaded before interpreting it.
df.info()

# 2. Provenance/missingness map (Gate 1): fraction missing per column.
df.isna().mean().sort_values(ascending=False)

# 3. Is missingness informative? Does it predict the target? (Gate 1)
#    Replace 'target' and a suspect column 'feat'.
df.groupby(df["feat"].isna())["target"].agg(["mean", "count"])

# 4. Duplicate rows / IDs — silent joins and survivorship traps (Gate 1).
df.duplicated().sum(), df["id"].duplicated().sum()

# 5. Is there time order? If a date/seq column exists, NO random splits (Gate 2).
df["date"] = pd.to_datetime(df["date"]); df = df.sort_values("date")
df["date"].is_monotonic_increasing, df["date"].min(), df["date"].max()

# 6. Distribution shape, not just mean: tails and skew (Gate 4).
df["target"].describe(percentiles=[.01, .05, .5, .95, .99])
df["target"].skew(), df["target"].kurt()

# 7. Stationarity check on the target (Gate 4).
from statsmodels.tsa.stattools import adfuller, kpss
adfuller(df["target"].dropna())[1], kpss(df["target"].dropna())[1]  # p-values

# 8. Regime view: rolling mean/std reveal breaks a single number hides (Gate 4).
df.set_index("date")["target"].rolling(63).agg(["mean", "std"]).plot()

# 9. Time-aware split — every test fold strictly after its training data (Gate 2).
from sklearn.model_selection import TimeSeriesSplit
splits = list(TimeSeriesSplit(n_splits=5).split(df))

# 10. Bootstrap interval on the headline statistic — never a bare point (Gate 5).
from scipy.stats import bootstrap
x = (df["target"].dropna().values,)
ci = bootstrap(x, np.mean, n_resamples=10_000, method="BCa").confidence_interval
print(f"mean target: {df['target'].mean():.4f}  95% CI [{ci.low:.4f}, {ci.high:.4f}]")
```

## Failure modes to name out loud when you see them

- "I dropped the NaNs" with no test of whether missingness was informative.
- A random/shuffled split on data that has a date column.
- Scaler/encoder/imputer fit before the split (leakage into every fold).
- One reported metric after an uncounted search over features or thresholds.
- A bare point estimate (Sharpe, accuracy, coefficient) with no interval.
- "Outliers removed" where the outliers were genuine fat tails.
- Full-sample correlation quoted over a period containing a regime break.

## Self-check before delivering

Answer all yes, or fix it first:

1. Did I state, in writing, how the data was collected and what population a row
   generalizes to — including who/what is *missing* from it?
2. Did I declare the validation scheme (and any purge/embargo) **before** fitting,
   and is it free of random splits on time-ordered data?
3. Did I count and report how many features / thresholds / configs I tried, and
   apply or at least name a multiple-testing correction for the winner?
4. Did I test stationarity / regime stability rather than trusting one pooled
   number, and justify any outlier handling as fat-tail-aware?
5. Does every headline number ship with an interval (bootstrap or analytic), and
   does my conclusion still hold at the unfavorable end of that interval?
6. Have I checked every transform for look-ahead, and confirmed no preprocessing
   was fit on the test data?

References and citations: `references/sources.md`.
