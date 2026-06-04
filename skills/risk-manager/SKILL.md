---
name: risk-manager
description: "Risk thinking for portfolios and any decision under uncertainty. Use when sizing a bet, allocating capital, deploying a strategy, or making any irreversible call where a bad outcome can compound: ask the ruin question first (the bet size from which you cannot recover — Kelly logic, why fractional Kelly), treat the tails as the business (fat tails, why stdev understates risk, expected shortfall over VaR), respect drawdown arithmetic (a 50% loss needs a 100% gain), assume correlations break in crises, apply explicit position-sizing rules, run a pre-mortem before committing, and pass a falsifiable self-check."
version: 1.0.0
author: re-forge
license: MIT
tags: [risk, uncertainty, kelly, position-sizing, drawdown, tail-risk, expected-shortfall, correlation, pre-mortem, ruin]
---

# Risk Manager: survive first, optimize second

Return without survival is zero. A 50% drawdown erases a decade of 7% returns,
and no expected-value calculation matters once you have hit zero. This skill is
an ordered procedure for any decision where a bad outcome can compound:
position sizing, capital allocation, strategy deployment, or any irreversible
bet. Run the gates in order; do not commit until the self-check passes.

Work top to bottom. Each section is a gate, not a suggestion. The wager is the
same whether the stake is a portfolio or a single decision — only the units
change.

## Gate 1 — The ruin question (ask this before any sizing)

Before "what is the expected return?" ask **"at what bet size can I not come
back?"** Ruin is absorbing: from zero there is no recovery, so any path with
positive probability of ruin has, over enough repetitions, probability one of
reaching it. Survival is a precondition, not a preference.

- **Multiplicative, not additive.** Wealth that compounds multiplies returns;
  it does not add them. The relevant average is the **geometric** mean, which is
  dragged down by variance (`g ≈ μ − σ²/2`). A sequence averaging +50%/−40%
  arithmetically (mean +5%) loses money geometrically: `1.5 × 0.6 = 0.9` per
  pair. Size to the geometric outcome, not the arithmetic headline.
- **Kelly = the growth-optimal fraction.** Kelly (1956) derived the bet fraction
  that maximizes the long-run geometric growth rate of capital. For a bet with
  win probability `p`, loss probability `q = 1−p`, and net odds `b`:
  `f* = (p·b − q) / b`. For a continuous return stream: `f* = μ / σ²` (excess
  return over variance). Kelly maximizes growth **and** minimizes expected time
  to any wealth target (Kelly 1956; Thorp 2006).
- **Never bet full Kelly.** Full Kelly is a ceiling computed from inputs you do
  not actually know. Three reasons it is unsafe in practice:
  1. **Edge is estimated, and overbetting is asymmetric.** Betting above `f*`
     lowers growth *and* raises risk; betting below `f*` only lowers growth. With
     noisy `μ`, the penalty for guessing too high dominates — so bias low.
  2. **Full Kelly's drawdowns are brutal.** At full Kelly the probability of your
     capital halving before it doubles is on the order of 1/2; expected drawdowns
     are far larger than almost anyone will hold through.
  3. **Returns are not i.i.d. or Gaussian.** Kelly assumes independent bets with
     known distributions. Fat tails and serial correlation (Gate 2, Gate 4) make
     the full-Kelly fraction an overestimate of what is survivable.
- **Use fractional Kelly (¼ to ½).** Half-Kelly captures ~75% of the growth rate
  for ~50% of the variance; quarter-Kelly is the common default when edge is
  uncertain. The growth you give up is small; the drawdown you avoid is large
  (Thorp 2006; MacLean, Thorp & Ziemba 2010). When in doubt, bet **less**.
- **State the ruin bound explicitly.** Write down: the maximum loss you can take
  and still continue, in both percent and absolute terms, and the bet size that
  keeps the probability of hitting it acceptably low. If you cannot state it, you
  are not ready to size the bet.

## Gate 2 — Tails are the business

The rare large loss, not the typical day, determines whether you survive. Risk
*is* the tail; the body of the distribution is noise you can afford.

- **Standard deviation understates risk for fat-tailed outcomes.** Financial and
  many real-world returns have **excess kurtosis**: 5σ and 10σ events occur far
  more often than a Gaussian predicts. A volatility number computed from calm
  data assigns near-zero probability to exactly the moves that ruin you (Taleb,
  *The Black Swan*). Check kurtosis and a QQ-plot before trusting any σ.
- **VaR tells you the threshold, not the damage.** Value-at-Risk answers "what
  loss is exceeded only `α`% of the time?" It says nothing about *how bad* the
  breach is, and it is **not subadditive** — VaR of a combined book can exceed
  the sum of parts, so it can penalize diversification. It is not a coherent risk
  measure (Artzner, Delbaen, Eber & Heath 1999).
- **Expected Shortfall is the number to manage.** ES (a.k.a. CVaR) is the
  *average* loss in the worst `α`% of outcomes — it measures the size of the
  tail, is coherent (subadditive), and is what Basel's FRTB replaced VaR with.
  Report **ES, not VaR**, and compute it on a fat-tailed model (historical or
  Student-t), never a Gaussian fit (Rockafellar & Uryasev 2000).
- **Stress beyond the model.** "Beyond-model" events — the move your sample never
  contained — are where books die. Replay historical crises (a broad equity
  drawdown of −35% to −55%, credit spreads multiplying, a multi-day liquidity
  freeze) and run a **reverse stress test**: define the loss that breaks you,
  then find the scenario that produces it and judge its plausibility. If a
  plausible scenario breaks you, resize now.

## Gate 3 — Drawdown arithmetic is asymmetric

Losses and gains are not symmetric, because recovery compounds off a smaller
base. This asymmetry is *the* reason prevention beats maximization.

| Drawdown | Gain required to recover |
|---|---|
| −10% | +11.1% |
| −20% | +25.0% |
| −33% | +50.0% |
| −50% | +100.0% |
| −75% | +300.0% |

- The recovery gain is `1/(1 − d) − 1`. It explodes as the loss deepens: a 50%
  loss requires *doubling* just to break even.
- **Implication.** A strategy that earns more but occasionally takes a −50% hit
  is usually inferior to one that earns less and caps drawdown — because the
  survivor keeps compounding while the wounded one spends years clawing back.
  Optimize the *geometric* path (Gate 1), which is drawdown-aware by construction.
- **Govern drawdown with a graduated response,** not a single cliff: trim new
  risk as drawdown deepens, halt new positions past a stated level, and force a
  review/liquidation at a hard limit set *in advance*. Drawdown *velocity*
  matters too — a fast loss signals a regime change, not noise, and warrants a
  faster cut than a slow grind of equal depth.

## Gate 4 — Correlation breaks when you need it most

Diversification is priced off correlations estimated in calm markets, and those
correlations rise toward 1 in a crisis — exactly when the hedge was supposed to
pay. The diversification you measured is not the diversification you will get.

- **Calm-period correlations understate crisis co-movement.** A book that looks
  diversified at an average pairwise ρ ≈ 0.3 can behave as if ρ ≈ 0.8+ in a
  crash, because everything is sold for cash at once. Estimate **exceedance /
  tail correlation** (correlation conditional on both legs being in their worst
  decile), not just the full-sample number.
- **Stress the correlation matrix, not only the returns.** Recompute portfolio
  risk with all cross-asset correlations pushed toward ~0.9. If the stressed
  number is unsurvivable, the diversification in your base case is an illusion.
- **Watch the diversification ratio decay.** `DR = (Σ wᵢσᵢ) / σ_portfolio`
  collapses toward 1 as correlations spike. A sharp DR drop in a short window is
  an early warning that hedges are failing; cut gross exposure when it fires.
- **The dangerous moment is the transition.** Correlation jumps, widening
  spreads, liquidity thinning, and a volatility spike tend to arrive together at
  the calm→crisis boundary. Treat co-occurring stress signals as a single regime
  change and reduce risk on the cluster, not on any one indicator alone.

## Gate 5 — Position-sizing rules

Convert the gates above into a concrete size. Pick the rule that matches how much
you actually know, and bind it with hard caps.

- **Have a reliable edge estimate?** Use **fractional Kelly** (¼–½ of `f*`,
  Gate 1). Never the raw `f*`.
- **No trustworthy return estimate?** Drop return forecasts and size on risk
  alone: **inverse-volatility** (`wᵢ ∝ 1/σᵢ`) or **equal risk contribution**
  (each position contributes the same share of portfolio variance). These need
  only a covariance estimate, which is far more stable than a return forecast
  (Maillard, Roncalli & Teiletche 2010).
- **Target volatility, then let size float.** Set a target portfolio vol; scale
  positions by `target_vol / realized_vol`. When realized vol doubles, exposure
  halves automatically — the single most effective drawdown control, because it
  de-risks into turbulence without forecasting it.
- **Respect liquidity.** Cap size so you can exit within an acceptable horizon:
  `max_size ≈ participation_cap × ADV × days_to_exit`. Market impact scales
  roughly with the **square root** of order size relative to volume — your
  largest position should never also be your least liquid (Almgren & Chriss 2000).
- **Bind every size with hard limits set in advance:** max single position, max
  exposure to any one factor/sector, max gross leverage, and a max-drawdown halt.
  Hard limits are never breached; soft limits trigger a review. Express limits in
  more than one unit (notional, % of capital, % of ADV) so one mismeasurement
  cannot hide a breach.

## Gate 6 — Pre-mortem before you commit

Run a pre-mortem: assume the decision has already failed, then explain why. This
surfaces failure modes that optimism hides — and it is a documented debiasing
procedure, not a mood (Klein 2007).

1. **Imagine it is later and this blew up.** Write the obituary: what was the
   single most likely cause of death?
2. **Enumerate failure modes, ranked by severity × probability.** Cover at least:
   wrong edge estimate (overfit/regime shift), tail event beyond the model
   (Gate 2), correlation breakdown removing the hedge (Gate 4), a liquidity
   freeze that blocks the exit (Gate 5), leverage/margin amplifying a moderate
   move into ruin (Gate 1), and operational failure (data, execution, human).
3. **For each, state the trigger and the pre-committed response.** "If drawdown
   hits X% → halt." "If correlation to the book exceeds Y → cut." Decide the
   action *now*, while calm; you will not decide well mid-crisis.
4. **Find the unsurvivable branch.** If any single failure mode can cause ruin
   (Gate 1), the design is wrong regardless of expected value — resize or add a
   hedge until no single branch is fatal.
5. **Define the kill criteria.** The exact, observable conditions that stop the
   bet entirely: drawdown depth, loss velocity, a broken assumption, a data or
   execution fault. Vague kill criteria are no kill criteria.

## Failure modes to name out loud when you see them

- Sizing on expected return without first stating the ruin bound (skips Gate 1).
- Betting full Kelly — or sizing off an edge estimate as if it were known exactly.
- Quoting σ or VaR for a fat-tailed exposure and calling it the risk.
- "It will come back" — treating a −50% loss as a −50% problem (it is a +100% one).
- Claiming diversification from calm-market correlations with no crisis stress.
- The largest position also being the least liquid, with no exit-horizon cap.
- No pre-committed kill criteria, so the exit decision happens mid-panic.
- Leverage chosen for the expected path, untested against a 3σ adverse move.

## Self-check before delivering

Answer all yes, or fix it first:

1. Did I state the ruin bound — the loss I cannot come back from, in % and
   absolute terms — and size **below** full Kelly (¼–½) given uncertain edge?
2. Did I report a **tail** measure (Expected Shortfall / CVaR on a fat-tailed
   model), not just σ or VaR, and stress-test beyond the historical sample?
3. Did I check the drawdown arithmetic — confirming the recovery gain implied by
   my worst-case loss is survivable, not just the loss itself?
4. Did I assume correlations rise toward 1 in stress and re-derive portfolio risk
   under that assumption, rather than trusting calm-period diversification?
5. Is every position bound by hard caps (size, factor, leverage, drawdown halt)
   set in advance, with liquidity-aware sizing?
6. Did I run a pre-mortem with ranked failure modes and pre-committed kill
   criteria, and confirm no single failure branch is fatal?

References and citations: `references/sources.md`.
