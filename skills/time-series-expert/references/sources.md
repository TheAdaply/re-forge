# Sources for the time-series-expert skill

Public, citable sources behind each non-obvious heuristic in `SKILL.md`. URLs
listed here were checked to load (HTTP 200) or to return a bot-block status
(403/405/429) that the repo link checker treats as alive. Book citations are
given by title/author; the open-access textbook below has per-chapter URLs.

## Primary textbook (open access, free online)

- **Hyndman, R. J. & Athanasopoulos, G. — *Forecasting: Principles and Practice*
  (3rd ed.).** <https://otexts.com/fpp3/>
  The discipline backbone of this skill. Chapters cited directly:
  - Stationarity & differencing (Gate 1): <https://otexts.com/fpp3/stationarity.html>
  - Time-series decomposition / STL (Gate 2): <https://otexts.com/fpp3/decomposition.html>
  - Simple/benchmark methods incl. seasonal-naive (Gate 3): <https://otexts.com/fpp3/simple-methods.html>
  - Time-series cross-validation / rolling origin (Gate 4): <https://otexts.com/fpp3/tscv.html>
  - Prediction intervals (Gate 6): <https://otexts.com/fpp3/prediction-intervals.html>
  - Forecast accuracy metrics incl. MASE (Gate 3): <https://otexts.com/fpp3/accuracy.html>

## Methodology references

- **Mean Absolute Scaled Error (Hyndman & Koehler, 2006).** Scale-free,
  baseline-relative error: MASE < 1 beats the naive (Gate 3).
  <https://en.wikipedia.org/wiki/Mean_absolute_scaled_error>
  Original paper "Another look at measures of forecast accuracy":
  <https://robjhyndman.com/papers/mase.pdf>

- **Makridakis Competitions (M1–M5).** Empirical evidence that simple methods and
  combinations repeatedly match or beat complex ones — the "earn the right to be
  fancy" lesson behind Gate 3.
  <https://en.wikipedia.org/wiki/Makridakis_Competitions>

- **Hyndman, R. J. — "Show me the evidence" (robjhyndman.com).** Argues no method
  is credible without honest out-of-sample comparison against a benchmark (Gate 3).
  <https://robjhyndman.com/hyndsight/show-me-the-evidence/>

- **Augmented Dickey–Fuller test (Wikipedia).** Null = unit root / non-stationary;
  low power near a unit root (Gate 1).
  <https://en.wikipedia.org/wiki/Augmented_Dickey%E2%80%93Fuller_test>

- **KPSS test (Wikipedia).** Null = stationary; complementary to ADF, the
  opposite-null pairing used in Gate 1.
  <https://en.wikipedia.org/wiki/KPSS_test>

- **Structural break (Wikipedia).** A parameter change in the data-generating
  process invalidates a single global fit and misleads stationarity tests (Gate 5).
  <https://en.wikipedia.org/wiki/Structural_break>

## Library documentation referenced in the runnable snippets

- **`statsmodels.tsa.seasonal.STL`** — robust Loess-based decomposition (Gate 2).
  <https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.STL.html>
- **`statsmodels.tsa.seasonal.MSTL`** — multiple-seasonality decomposition (Gate 2).
  <https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.MSTL.html>
- **`statsmodels.tsa.stattools.adfuller`** — ADF stationarity test (Gate 1).
  <https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html>
- **`statsmodels.tsa.stattools.kpss`** — KPSS stationarity test (Gate 1).
  <https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html>
- **`sklearn.model_selection.TimeSeriesSplit`** — forward-chaining rolling-origin
  splits (Gate 4).
  <https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html>
- **`ruptures`** — offline change-point detection (PELT, binary segmentation) for
  structural-break screening (Gate 5).
  <https://centre-borelli.github.io/ruptures-docs/>
