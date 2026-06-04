---
name: time-series-expert
description: "Forecasting discipline for any time-ordered data — sensor logs, demand, prices, request rates, KPIs. Use when asked to forecast, predict the next value(s), model a series with a time index, test stationarity, decompose trend/seasonality, validate a forecast, or claim one model beats another. Enforces visual-first stationarity triage, decomposition before modeling, the seasonal-naive baseline doctrine, rolling-origin validation (never random CV), regime/structural-break awareness, and prediction intervals over point forecasts."
---

# Time-series expert: forecast a time-ordered series without fooling yourself

A forecast is a claim about the future made from the past, and almost every way
it goes wrong is a discipline failure, not a model failure: a random split that
peeks ahead, a fancy model that never beat repeating last season, a point number
with no interval, a global fit straddling a structural break. This skill is an
ordered procedure. Run the gates top to bottom; do not report a forecast until
the self-check at the bottom passes.

It applies to any series with a time order — IoT telemetry, sales, latency, web
traffic, a single column with a `date` index — not just finance. The failure
modes are universal.

## Gate 1 — Stationarity triage (look before you test)

Most models (ARIMA, many ML setups) assume a series whose statistical behaviour
does not drift. Establish this **visually first**, then confirm with tests — not
the reverse.

1. **Plot the raw series.** Eyeball trend, a changing mean, a variance that grows
   with level (fanning out), and seasonal repetition. A picture decides more than
   any p-value. See fpp3 §9.1, otexts.com/fpp3/stationarity.html.
2. **Plot the ACF.** A slowly, near-linearly decaying ACF is the signature of
   non-stationarity (a trend / unit root). A fast decay to zero suggests stationary.
3. **Only then run tests — and run two with opposite nulls.** ADF's null is
   *non-stationary* (a unit root); KPSS's null is *stationary*. Use both:
   `statsmodels.tsa.stattools.adfuller` and `...kpss`.
   - ADF rejects + KPSS does not reject → treat as stationary.
   - ADF does not reject + KPSS rejects → difference or transform.
   - They disagree → near-unit-root / ambiguous; do not over-trust either.

**Why tests mislead — read this before quoting a p-value:**
- They are **low-power near a unit root**: a series that is borderline or slowly
  mean-reverting routinely fails to reject. "Failed to reject" is not "confirmed".
- A single **structural break** (Gate 5) makes a stationary series *look*
  non-stationary to ADF, and vice versa — the test cannot see the regime.
- **Seasonality and deterministic trend** are different ailments with different
  cures (seasonal differencing vs detrending); a stationarity p-value does not
  tell you which. The plot does.

**Transform ladder (test after each step; stop when stationary):** stabilise
variance first (log / Box-Cox for positive, fanning series) → difference once for
a stochastic trend → seasonal-difference for seasonality. Rarely need more than
one regular + one seasonal difference. Over-differencing injects negative
autocorrelation — a real failure mode, so do not difference reflexively.

## Gate 2 — Decompose before you model

Split the series into **trend + seasonal + remainder** *before* choosing a model.
Decomposition tells you what a model must capture and what "good residuals" look
like (fpp3 Ch. 3, otexts.com/fpp3/decomposition.html).

- **Use STL** (Seasonal-Trend decomposition using Loess): handles any seasonal
  period, lets seasonality evolve, and is robust to outliers with `robust=True`
  (`statsmodels.tsa.seasonal.STL`). For several seasonal cycles at once (e.g. a
  daily *and* weekly pattern), use `MSTL`.
- **Read the parts:** trend-dominated → a trend model / differencing matters most;
  strong seasonal → the model must carry it (seasonal terms or seasonal-naive
  baseline); remainder dominates → the series is mostly noise, manage expectations
  and lean on intervals. Remainder with volatility clustering or visible breaks is
  a Gate-5 signal, not random scatter.
- **Inspect the remainder, not just the fit.** It should look like noise: no
  leftover trend, no leftover seasonal ridges. Structure left in the remainder is
  signal your model has not yet earned.

```python
from statsmodels.tsa.seasonal import STL
res = STL(y, period=m, robust=True).fit()   # m = obs per seasonal cycle
res.plot()                                   # trend / seasonal / remainder
```

## Gate 3 — The naive-baseline doctrine (earn the right to be fancy)

**No model gets credit until it beats the naive baseline on honest out-of-sample
data.** This is the central rule of practical forecasting, not a formality
(fpp3 §5.2 "Simple methods", otexts.com/fpp3/simple-methods.html).

- **Pick the right naive:**
  - **Seasonal-naive** — forecast = the value from one full season ago. This is
    the baseline to beat for *any* series with seasonality.
  - **Naive (random-walk)** — forecast = the last value. The right baseline for a
    near-random-walk (many price/level series).
  - **Drift** — last value plus the average historical slope, when there is a
    persistent trend.
- **Compare with a scale-free, baseline-relative metric.** **MASE** scales error
  by the in-sample one-step *seasonal-naive* error: MASE < 1 means you beat the
  naive, MASE ≥ 1 means you did not — and a sophisticated model with MASE ≥ 1 is a
  failed model regardless of how elegant it is (Hyndman & Koehler;
  en.wikipedia.org/wiki/Mean_absolute_scaled_error). RMSE/MAE alone do not reveal
  this, because they are not anchored to the baseline.
- **The historical lesson is that simple wins more than people expect.** Across the
  M-competitions, statistically simple methods and combinations repeatedly matched
  or beat complex ones (en.wikipedia.org/wiki/Makridakis_Competitions). Treat every
  fancy model as guilty until it shows a baseline-relative win. "Complex model, no
  baseline reported" is a defect to name out loud (robjhyndman.com/hyndsight/show-me-the-evidence/).

## Gate 4 — Validate on a rolling origin (NEVER random CV)

Time-ordered rows are **not exchangeable**. Random k-fold / `train_test_split(
shuffle=True)` trains on the future to predict the past and reports a fantasy
score. Forbidden on any series with a time index.

- **Use rolling-origin / expanding-window evaluation:** fit on data up to time `t`,
  forecast `t+1…t+h`, roll the origin forward, repeat; every test point lies
  strictly after its training data. fpp3 §5.10, otexts.com/fpp3/tscv.html;
  `sklearn.model_selection.TimeSeriesSplit` implements forward-chaining splits.
- **Match the test horizon to how the forecast is used.** Validating one-step-ahead
  but deploying ten-steps-ahead overstates accuracy; evaluate at the deployed `h`.
- **Embargo when labels span time.** If a target is computed over a forward window
  of length `h`, drop the `~h` observations straddling each train/test boundary so
  serial correlation cannot leak the answer across the cut.
- **Fit every transform inside the training window only.** Scalers, imputers,
  Box-Cox λ, differencing parameters, and feature stats must be learned from train
  and *applied* to test — fitting them on the full series is leakage that inflates
  every fold.
- **Report fold-level spread, not just the mean.** A good mean over wildly varying
  origins is not a stable forecaster.

## Gate 5 — Regime awareness (a structural break invalidates a global fit)

A single set of parameters fit across a structural break describes neither side of
it. Before trusting one global model, ask whether the data-generating process
changed (en.wikipedia.org/wiki/Structural_break).

- **Look for breaks:** plot rolling mean / variance / seasonal strength; a level
  shift, a volatility regime change, or a seasonality that appears/vanishes is a
  break. `ruptures` (PELT / binary segmentation) flags change points offline.
- **Consequences:** stationarity tests misread across a break (Gate 1); a
  pre-break training period teaches the model a regime that no longer holds;
  parameters estimated on pooled data are an average of incompatible regimes.
- **Responses:** fit only on the current regime, or down-weight pre-break data; let
  the model adapt (online/rolling refit, time-varying or regime-switching
  components); at minimum, *state* the break and that the forecast assumes the
  current regime persists. A forecast across an unacknowledged break is a guess.

## Gate 6 — Ship an interval, not a point

A point forecast is the midpoint of a distribution you failed to report. The
interval is the deliverable (fpp3 §5.5, otexts.com/fpp3/prediction-intervals.html).

- **Always attach a prediction interval** (e.g. 80% and 95%) to every forecast.
  Statistical models (ETS, ARIMA, structural) yield them analytically; for ML or
  custom models, use quantile forecasts, a (block) bootstrap of residuals, or
  conformal intervals.
- **Intervals widen with horizon.** A flat interval across a long horizon is a red
  flag that uncertainty is not being propagated.
- **Calibrate, do not just assert.** On held-out rolling-origin folds, a stated 90%
  interval should cover ≈90% of actuals. Report empirical coverage; an interval
  that covers 60% of the time is mislabelled, not informative.
- **Carry the interval into the decision.** If the interval spans the threshold
  that would change the action, the honest answer is "too uncertain to call", not
  the point.

## Failure modes to name out loud when you see them

- Quoting an ADF p-value with no plot, or reading "failed to reject" as proof of
  stationarity.
- Jumping to a model with no trend/seasonal/remainder decomposition first.
- A complex model reported with no seasonal-naive baseline or no MASE.
- Random k-fold / shuffled split on a series with a date index.
- A scaler / Box-Cox / imputer fit on the full series before the split.
- One global fit spanning an obvious level shift or volatility regime change.
- A bare point forecast with no interval, or an interval that never widens with
  horizon and was never coverage-checked.

## Self-check before delivering

Answer all yes, or fix it first:

1. Did I **plot** the series and its ACF and decide stationarity visually *before*
   quoting any ADF/KPSS p-value — and did I note the tests' low power near a unit
   root rather than over-trusting them?
2. Did I decompose into trend/seasonal/remainder and confirm the remainder carries
   no leftover structure before selecting a model?
3. Did I compute a **seasonal-naive (or naive/drift) baseline** and show my model
   beats it with a baseline-relative metric (MASE < 1), not just a bare RMSE?
4. Was every score produced by **rolling-origin / expanding-window** evaluation at
   the deployed horizon, with all transforms fit inside the training window only —
   and zero random/shuffled splits?
5. Did I check for structural breaks / regime change, and either restrict the fit
   to the current regime or explicitly state the forecast assumes it persists?
6. Does every forecast ship with a **prediction interval** that widens with
   horizon and whose coverage I checked on held-out folds?

References and citations: `references/sources.md`.
