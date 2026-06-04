---
name: kaggle-grandmaster
description: "Run a tabular/ML competition end to end the way a grandmaster does: metric-first scoping, leakage forensics, a validation scheme that mirrors the test split before any model, a dumb baseline, one-change-per-experiment iteration, winner-derived feature/ensemble patterns, and a self-check gate. Use when starting or improving a Kaggle/tabular leaderboard submission, designing cross-validation, hunting leakage, or deciding whether to trust CV over LB."
version: 1.0.0
author: re-forge
license: MIT
tags: [kaggle, competition, tabular, cross-validation, leakage, feature-engineering, ensembling, lightgbm, adversarial-validation]
---

# Kaggle Grandmaster: Run a Tabular Competition End to End

This is a procedure, not a pep talk. Execute the sections in order. Every
non-obvious rule cites a public source; full citation list in
`references/sources.md`.

The single most common way a strong model finishes outside the medals: the
validation scheme did not mirror how the test set was generated, so every
decision after that optimized the wrong number. Sections 1-3 exist to prevent
exactly that. Do them before you train anything.

## 1. Opening sequence (before any code)

1. **Read the evaluation metric three times.** Write down the exact formula and
   whether higher is better. If the metric is per-group correlation averaged
   over groups, your CV must compute *that*, not global RMSE/R². Optimizing the
   leaderboard metric directly (e.g. a Pearson `feval` for early stopping
   instead of RMSE) is a recurring winner pattern (Ubiquant 1st & 2nd place).
2. **Type the problem.** Tabular / vision / NLP / time-series / recommendation?
   i.i.d. rows or grouped/temporal? Regression or classification? This single
   classification dictates the CV splitter (Section 3) and the model shortlist.
3. **Scan the discussion forum and data tab.** Host clarifications, known
   leaks, public/private split ratio, and shake-up history live there. The
   public LB fraction tells you how much to trust LB later (Section 3).
4. **Note the constraints:** submission format (CSV vs streaming API), runtime
   limits, number of daily submissions, team size, deadline. Streaming-API
   competitions allow online learning; CSV ones do not.

## 2. EDA forensics checklist (a leakage hunt, not a gallery)

EDA's job here is to find things that will silently break your CV, not to make
pretty plots. Run every check; record findings.

- **Target leakage.** Any feature with implausibly high single-feature
  correlation/AUC to the target. Any feature that could only be known *after*
  the label. Drop or quarantine before modeling.
- **Temporal leakage.** Is there a time column or implicit ordering? If yes,
  features must use only past information and CV must respect time (Section 3).
  Never compute aggregates/encodings on the full dataset before splitting.
- **Group leakage.** Are rows clustered by an entity (user, instrument, date,
  session)? If the same group appears in both train and validation folds, CV is
  optimistic. Groups must not span folds.
- **Duplicate / near-duplicate rows**, constant columns, and ID-like columns
  that encode order. Remove or flag.
- **Train/test distribution shift via adversarial validation.** Label train=0,
  test=1, train a classifier to tell them apart. AUC ≈ 0.5 means train and test
  are interchangeable; AUC near 1.0 means a hard shift — use the classifier's
  feature importances to find the shifting features, and consider validating on
  the train rows most test-like (adversarial validation, widely used since the
  Kaggle "Flavours of Physics" era).

If adversarial AUC is high, fix CV before features — otherwise local gains will
not transfer to the LB.

## 3. Validation-first doctrine (state the scheme before training)

Decide and write down the CV scheme **before** building any model. CV estimates
the error of the *fitting procedure*, not one fitted model, so it must
reproduce the train→test gap you actually face (Bates, Hastie & Tibshirani 2023).

Splitter decision table:

| Data structure | Splitter | Why |
|---|---|---|
| i.i.d. tabular | StratifiedKFold (K=5-10) | Stratify on target / target bins |
| Grouped (entity repeats) | GroupKFold | Groups must not span folds |
| Time-ordered | TimeSeriesSplit / expanding window | Never train on the future |
| Time + groups + label horizon | Purged (+embargo) GroupKFold / CPCV | Removes lookahead between adjacent train/val blocks (de Prado, *Advances in Financial Machine Learning*, Ch. 7) |
| Multi-label | MultilabelStratifiedKFold (iterstrat) | Balance every label |
| Small data | RepeatedStratifiedKFold | Lower-variance estimate |

Rules:

- **Mirror the test split.** If the private test is a future time window, your
  validation fold must be a held-out future window, not random rows.
- **Purge and embargo** when labels span time (overlapping horizons leak across
  the train/val boundary): drop training samples whose label window overlaps the
  validation window, then embargo a gap after it (de Prado, Ch. 7; the
  `timeseriescv` library implements PurgedWalkForwardCV / CombPurgedKFoldCV).
- **CV-LB calibration.** Submit the baseline, record (CV, public LB). Track the
  pair for every experiment. If CV and LB move together (>~80% of experiments),
  trust CV. If they diverge by >5% relative or move in opposite directions, your
  CV is wrong or you are overfitting the public LB — stop and fix CV.
- **Trust CV over LB** when the public LB is a small fraction of test (<~30%),
  the split is time-based, or the competition has shake-up history. **Trust LB
  more** only when CV is irreducibly high-variance and the public LB covers a
  large test fraction.
- **Everyone (and every model) uses the same folds.** Identical fold splits are
  what make out-of-fold (OOF) predictions stackable later (Section 7).

## 4. Baseline discipline

- Build the **dumbest model that produces a valid submission first**: target
  mean/mode, or a single LightGBM/Ridge with defaults on raw features. Submit
  it. Record CV and LB. This is your zero point; every later change is measured
  against it.
- A baseline that submits also proves the pipeline end to end (encoding, fold
  logic, inference, submission format) before you invest in features.
- Save OOF predictions and the held-out fold indices from the baseline; reuse
  them as the substrate for all later comparison and ensembling.

## 5. Iteration loop (one change per experiment, tracked)

Run a disciplined loop, not a flurry:

1. Form one hypothesis ("group-mean features lift per-group correlation").
2. Change **one thing**. Keep folds, seed, and metric fixed.
3. Evaluate on the *same* CV; log: change, CV, LB, OOF path, notes.
4. Keep the change only if CV improves (not just LB — LB-only gains are
   public-test overfitting). Otherwise revert.

Experiment-log columns: date, description, CV (mean±std across folds), public
LB, model/seed, decision. Allocate effort roughly features > modeling >
ensembling > post-processing; features are where tabular competitions are
usually won (NVIDIA "Kaggle Grandmasters Playbook"). Do not hyper-tune before
features are solid; do not rewrite the pipeline mid-competition.

## 6. Winning patterns (distilled from public winner writeups)

Each is a tactic with a public source. Try them; keep only what improves CV.

- **Optimize the competition metric directly.** Use the leaderboard metric as
  the early-stopping `feval` (e.g. Pearson correlation rather than RMSE).
  *Ubiquant 1st & 2nd place; Jane Street 2024 top solutions.*
- **Cross-sectional group aggregates as features.** For the top features by
  |correlation| with the target, add the per-group (per-timestamp) mean/std as
  new columns — it encodes the market/regime state at that moment.
  *Ubiquant 2022 1st place.*
- **Selective ranking, not blanket ranking.** Rank-transform only features that
  are *unstable across time*; keep stable features raw (optionally z-scored).
  Ranking everything destroys magnitude signal in stable features.
  *Optiver Realized Volatility 2021 1st place.*
- **Nearest-neighbour / KNN features.** Find the training rows (or time windows)
  most similar to each row by feature profile and aggregate their targets.
  *Optiver 2021 1st place.*
- **Standardize with pre-computed train statistics.** Z-score using means/stds
  computed on train and frozen — never recomputed at inference, which leaks.
  *Jane Street 2024 winning ensembles.*
- **GBM + NN + linear ensemble.** Winning tabular solutions rarely rely on GBDT
  alone; a neural net plus a cheap linear model (Ridge) add uncorrelated errors.
  TabM (a batch-ensemble of MLPs) is a strong modern tabular NN.
  *Jane Street 2024 winning ensemble (XGB/NN + Ridge + TabM); Gorishniy et al.,
  "TabM", arXiv 2024.*
- **Aggressive feature selection on noisy data.** Tens of features chosen by
  cross-validated importance can beat thousands of raw ones; use null-importance
  or LOFO/permutation importance, computed under the real CV folds.
  *DRW Crypto, Optiver, Ubiquant winner discussions; LOFO; null-importances.*
- **Online learning** (update the model with streaming test rows during
  inference) — only when the competition exposes a streaming API.
  *Optiver Trading at the Close 2023.*

## 7. Ensembling rules of thumb

- **Diversity beats individual strength.** Combine different algorithm families
  (GBDT, NN, linear, KNN), feature sets, seeds, and preprocessing. Two strong
  but correlated models add little.
- **Start simple.** Weighted or rank average of OOF predictions, weights tuned
  on OOF. Rank averaging is robust when models differ in scale.
- **Stack on OOF, never on in-fold predictions.** Generate OOF predictions with
  the shared folds, train a *simple* meta-model (Ridge first) on them. All base
  models must share the identical fold splits or the meta-level leaks.
- **Hill-climb the ensemble.** Start from the single best model; iteratively add
  (with repetition allowed) whichever model most improves OOF; stop when none
  helps. This jointly selects members and weights.
  *NVIDIA "Grandmaster Pro Tip: stacking with cuML".*
- Keep meta-models linear. Deep stacks (3+ levels) overfit the OOF set with
  sharply diminishing returns.

## 8. Post-processing and final selection

- Optimize decision thresholds on OOF using the competition metric (never a
  fixed 0.5). For regression, clip predictions to the train target range unless
  extrapolation is expected.
- Post-processing must improve **CV**; an LB-only improvement is overfitting the
  public test.
- Final submissions: pick one **safe** (best, most stable CV) and one
  **aggressive** (best LB or experimental ensemble). If CV and LB tracked well
  all competition, let CV pick both.

## Self-check before delivering

Answer each yes/no honestly; a "no" means stop and fix.

1. Did I write down the exact evaluation metric and confirm my CV computes that
   same quantity (not a convenient proxy)?
2. Did I state and justify the CV splitter **before** training any model, and
   does it mirror how the private test set was generated?
3. If the data is grouped or time-ordered, are groups non-overlapping across
   folds and is purge/embargo applied where labels span time?
4. Did I run adversarial validation and a leakage hunt (target/temporal/group/
   duplicate) and act on what I found?
5. Did I submit a dumb baseline and record the (CV, LB) pair as my zero point?
6. Is every kept change justified by a **CV** gain (not an LB-only gain), with
   one change per logged experiment?
