# Sources for kaggle-grandmaster

Every non-obvious heuristic in `SKILL.md` traces to one of the public sources
below. URLs here were checked to load (HTTP 200, or a bot-shield 403/405/429
which the CI link checker treats as alive). General well-known practice ("build
a baseline first") is uncited by design.

## Books

- **Marcos Lopez de Prado — *Advances in Financial Machine Learning* (Wiley,
  2018), ISBN 978-1-119-48208-6.** Chapter 7 (Cross-Validation in Finance):
  purging, embargo, and Combinatorial Purged Cross-Validation (CPCV); the formal
  framework for preventing lookahead bias in time-grouped CV.
- **Abhishek Thakur — *Approaching (Almost) Any Machine Learning Problem*.**
  Practical grandmaster reference; cross-validation, feature engineering,
  stacking/blending with code.
  <https://www.amazon.com/Approaching-Almost-Machine-Learning-Problem/dp/8269211508>

## Papers

- **Bates, Hastie & Tibshirani — "Cross-Validation: What Does It Estimate and
  How Well Does It Do It?" (2023).** CV estimates the expected prediction error
  of the model-fitting *procedure*, not the specific fitted model — the basis for
  "make CV mirror the real train→test gap." <https://arxiv.org/abs/2104.00673>
- **Cawley & Talbot — "On Over-fitting in Model Selection and Subsequent
  Selection Bias in Performance Evaluation" (JMLR 2010).** Non-nested CV with
  model selection gives optimistically biased estimates.
  <https://jmlr.org/papers/v11/cawley10a.html>
- **Gorishniy et al. — "TabM: Advancing Tabular Deep Learning with Parameter-
  Efficient Ensembling" (arXiv 2024).** TabM, a batch-ensemble of MLPs, as a
  strong modern tabular neural net. <https://arxiv.org/abs/2410.24210>
- **Hyndman & Athanasopoulos — *Forecasting: Principles and Practice*, §5.10
  Time-series cross-validation.** Evaluation-on-a-rolling-origin rationale for
  time-aware CV. <https://otexts.com/fpp3/tscv.html>

## Competition winner writeups (public)

- **Ubiquant Market Prediction 2022 — 1st place.** Per-timestamp (cross-
  sectional) group-mean features on top correlated columns; Pearson correlation
  as the optimization/early-stopping metric.
  <https://www.kaggle.com/competitions/ubiquant-market-prediction/discussion/338680>
- **Ubiquant Market Prediction 2022 — 2nd place.** Reinforces Pearson-as-metric
  and cross-sectional feature construction.
  <https://www.kaggle.com/competitions/ubiquant-market-prediction/discussion/337197>
- **Jane Street Real-Time Market Data Forecasting 2024 — winning solutions
  (discussion).** GBM + NN + Ridge + TabM ensemble; standardize with frozen
  pre-computed train statistics.
  <https://www.kaggle.com/competitions/jane-street-real-time-market-data-forecasting/discussion/>
- **Optiver Realized Volatility Prediction 2021 — 1st place.** Selective ranking
  (rank only time-unstable features), KNN/nearest-window features, LGBM+MLP+
  TabNet ensemble on GroupKFold over time groups.
  <https://www.kaggle.com/c/optiver-realized-volatility-prediction/discussion/274970>
- **Optiver Trading at the Close 2023 — winners' discussion.** Cross-sectional
  book features and online learning under the streaming API.
  <https://www.kaggle.com/competitions/optiver-trading-at-the-close/discussion/487446>
- **DRW Crypto Market Prediction — winners' discussion.** Aggressive feature
  selection on noisy data (few features from many).
  <https://www.kaggle.com/competitions/drw-crypto-market-prediction/discussion/>

## Techniques, tooling, and playbooks

- **Adversarial validation (train-vs-test shift).** Train a classifier to
  separate train from test; AUC ≈ 0.5 = interchangeable, high AUC = shift.
  <https://ilias-ant.github.io/blog/adversarial-validation/>
- **Null-importance feature selection (olivier / `ogrellier`).** Select features
  by comparing real-target importance to a null distribution from shuffled
  targets. <https://www.kaggle.com/code/ogrellier/feature-selection-with-null-importances>
- **LOFO importance (Leave One Feature Out).** CV-faithful feature importance /
  selection. <https://github.com/aerdem4/lofo-importance>
- **scikit-learn permutation importance.** Model-agnostic importance computed on
  held-out folds. <https://scikit-learn.org/stable/modules/permutation_importance.html>
- **NVIDIA — "The Kaggle Grandmasters Playbook: 7 battle-tested modeling
  techniques for tabular data."** Effort allocation toward feature engineering;
  ensemble/diversity guidance.
  <https://developer.nvidia.com/blog/the-kaggle-grandmasters-playbook-7-battle-tested-modeling-techniques-for-tabular-data/>
- **NVIDIA — "Grandmaster Pro Tip: Winning first place with stacking using
  cuML."** Hill-climbing ensemble selection over OOF predictions.
  <https://developer.nvidia.com/blog/grandmaster-pro-tip-winning-first-place-in-a-kaggle-competition-with-stacking-using-cuml/>
- **`timeseriescv`.** PurgedWalkForwardCV and CombPurgedKFoldCV implementations
  of de Prado's purged/embargoed CV. <https://github.com/sam31415/timeseriescv>
- **`iterative-stratification` (MultilabelStratifiedKFold).** Stratified folds
  for multi-label targets. <https://github.com/trent-b/iterative-stratification>
- **ML Contests — State of Competitive ML 2024.** What actually wins across
  modern competitions. <https://mlcontests.com/state-of-machine-learning-competitions-2024/>
