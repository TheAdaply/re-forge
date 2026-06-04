# Sources for the quant-analyst skill

Public, citable sources behind each non-obvious heuristic in `SKILL.md`. URLs
listed here were checked to load (HTTP 200/202/302) or to return a bot-block
status (403/429) that the repo link checker treats as alive. Book citations are
given by title/author without a URL.

## Primary papers

- **Bates, S., Hastie, T., Tibshirani, R. — "Cross-Validation: What Does It
  Estimate and How Well Does It Do It?"** (2023).
  <https://arxiv.org/abs/2104.00673>
  Used in Gate 5: CV estimates the error of the fitting *procedure*, not the one
  fitted model, and its variance is commonly underestimated — report fold-level
  dispersion.

- **López de Prado, M. — "The 10 Reasons Most Machine Learning Funds Fail."**
  GARP whitepaper.
  <https://www.garp.org/hubfs/Whitepapers/a1Z1W0000054x6lUAA.pdf>
  Used in Gate 1 and the framing: the dominant failures are provenance and
  validation failures (look-ahead, improper CV, multiple testing), not model
  choice.

- **Bailey, D. H. & López de Prado, M. — "The Deflated Sharpe Ratio: Correcting
  for Selection Bias, Backtest Overfitting and Non-Normality."**
  <https://www.davidhbailey.com/dhbpapers/deflated-sharpe.pdf>
  Used in Gate 3: expected max Sharpe under N null trials grows with N; deflate
  the selected-best metric for trial count, sample length, skew, kurtosis.

- **Bailey, D. H., Borwein, J., López de Prado, M., Zhu, Q. J. — "The Probability
  of Backtest Overfitting."**
  <https://www.davidhbailey.com/dhbpapers/backtest-prob.pdf>
  Used in Gate 3: PBO via combinatorial splits = fraction of paths where the
  in-sample-best config underperforms the median config out-of-sample.

- **Cawley, G. C. & Talbot, N. L. C. — "On Over-fitting in Model Selection and
  Subsequent Selection Bias in Performance Evaluation."** JMLR (2010).
  <https://jmlr.org/papers/v11/cawley10a.html>
  Used in Gate 3: non-nested CV reused for both tuning and reporting is
  optimistically biased; nest it.

- **Bailey & de Prado index of freely available papers.**
  <https://www.davidhbailey.com/dhbpapers/>

## Books

- **López de Prado, M. — *Advances in Financial Machine Learning*** (Wiley, 2018).
  Chapters on Cross-Validation in Finance and Backtesting via CV. Source for
  purging, embargo, and combinatorial purged cross-validation (Gate 2).

- **Hyndman, R. J. & Athanasopoulos, G. — *Forecasting: Principles and
  Practice*** (3rd ed.), §5.10 "Time series cross-validation."
  <https://otexts.com/fpp3/tscv.html>
  Used in Gate 2: evaluation on a rolling/forward forecasting origin.

## Reference explainers and tooling (verified to load)

- **Purged cross-validation (Wikipedia).**
  <https://en.wikipedia.org/wiki/Purged_cross-validation>
- **Cross Validation in Finance: Purging, Embargoing, Combinatorial
  (QuantInsti).**
  <https://blog.quantinsti.com/cross-validation-embargo-purging-combinatorial/>
- **Combinatorial Purged Cross Validation, with code (QuantBeckman).**
  <https://www.quantbeckman.com/p/with-code-combinatorial-purged-cross>
- **Sharpe ratio (Wikipedia)** — sampling-distribution framing for Gate 5.
  <https://en.wikipedia.org/wiki/Sharpe_ratio>
- **`timeseriescv`** — purged walk-forward and combinatorial purged splitters,
  sklearn-compatible. <https://github.com/sam31415/timeseriescv>

## Library documentation referenced in the runnable sequence

- **`sklearn.model_selection.TimeSeriesSplit`** — forward-chaining splits.
  <https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html>
- **`statsmodels.tsa.stattools.adfuller`** — ADF stationarity test.
  <https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html>
- **`statsmodels.tsa.stattools.kpss`** — KPSS stationarity test.
  <https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html>
- **`scipy.stats.bootstrap`** — bootstrap confidence intervals.
  <https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html>
