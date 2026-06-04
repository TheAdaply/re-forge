# Sources for the risk-manager skill

Public, citable sources behind each non-obvious heuristic in `SKILL.md`. URLs
listed here were checked to load (HTTP 200) or to return a bot-block status
(403/405/429/503) that the repo link checker treats as alive. Book citations are
given by title/author without a URL.

## Kelly criterion and position sizing (Gate 1, Gate 5)

- **Kelly, J. L. — "A New Interpretation of Information Rate."** Bell System
  Technical Journal (1956). The original Kelly criterion: the bet fraction that
  maximizes the long-run geometric growth rate of capital, `f* = (p·b − q)/b`.
  <https://www.princeton.edu/~wbialek/rome/refs/kelly_56.pdf>
  Background: <https://en.wikipedia.org/wiki/Kelly_criterion>

- **Thorp, E. O. — "The Kelly Criterion in Blackjack, Sports Betting, and the
  Stock Market."** (2006). Practical Kelly for markets; why full Kelly is too
  aggressive for real (non-ergodic, fat-tailed) processes and why fractional
  Kelly dominates. Used in Gate 1.
  <https://www.eecs.harvard.edu/cs286r/courses/fall12/papers/Thorpe_KellyCriterion2007.pdf>

- **MacLean, L. C., Thorp, E. O., Ziemba, W. T. — *The Kelly Capital Growth
  Investment Criterion: Theory and Practice*** (World Scientific, 2011).
  Surveys full vs. fractional Kelly, drawdown behaviour, and the asymmetry of
  overbetting vs. underbetting. Used in Gate 1.

## Tail risk and coherent risk measures (Gate 2)

- **Artzner, P., Delbaen, F., Eber, J.-M., Heath, D. — "Coherent Measures of
  Risk."** Mathematical Finance (1999). Proves VaR is not subadditive (not
  coherent) and defines the axioms a coherent measure (such as Expected
  Shortfall) satisfies. Used in Gate 2.
  <https://people.math.ethz.ch/~delbaen/ftp/preprints/CoherentMF.pdf>

- **Rockafellar, R. T. & Uryasev, S. — "Optimization of Conditional
  Value-at-Risk."** Journal of Risk (2000). CVaR / Expected Shortfall as the
  average loss beyond VaR, and its linear-programming formulation. Used in
  Gate 2.
  <https://sites.math.washington.edu/~rtr/papers/rtr179-CVaR1.pdf>

- **Expected Shortfall (overview).** Coherence, ES-vs-VaR, FRTB adoption.
  <https://en.wikipedia.org/wiki/Expected_shortfall>

- **Value at Risk (overview).** Definition and the non-subadditivity limitation.
  <https://en.wikipedia.org/wiki/Value_at_risk>

- **Taleb, N. N. — *The Black Swan: The Impact of the Highly Improbable*** (Random
  House, 2007). Fat tails, the limits of variance-based risk, and why models
  built on calm-period data fail in the tails. Used in Gate 2.
  Background: <https://en.wikipedia.org/wiki/Black_swan_theory>

## Drawdown arithmetic (Gate 3)

- **Drawdown (overview).** Definition of peak-to-trough decline and the
  asymmetric recovery requirement `gain = 1/(1−d) − 1`. Used in Gate 3.
  <https://en.wikipedia.org/wiki/Drawdown_(economics)>

## Correlation, diversification, and risk-based sizing (Gate 4, Gate 5)

- **Modern Portfolio Theory (overview).** Diversification depends on the
  correlation structure; the benefit degrades as correlations rise. Context for
  Gate 4.
  <https://en.wikipedia.org/wiki/Modern_portfolio_theory>

- **Maillard, S., Roncalli, T., Teiletche, J. — "The Properties of Equally
  Weighted Risk Contribution Portfolios."** Journal of Portfolio Management
  (2010). Equal Risk Contribution (risk parity): size on the covariance matrix
  alone, no return forecast required. Used in Gate 5.
  Overview: <https://en.wikipedia.org/wiki/Risk_parity>

- **Almgren, R. & Chriss, N. — "Optimal Execution of Portfolio Transactions."**
  Journal of Risk (2000). Square-root market-impact law; basis for
  liquidity-aware position caps. Used in Gate 5.
  <https://www.smallake.kr/wp-content/uploads/2016/03/optliq.pdf>
  Overview: <https://en.wikipedia.org/wiki/Almgren%E2%80%93Chriss_model>

## Pre-mortem (Gate 6)

- **Klein, G. — "Performing a Project Premortem."** Harvard Business Review
  (2007). The prospective-hindsight technique: assume the plan has already
  failed, then enumerate causes. A documented debiasing procedure. Used in
  Gate 6.
  <https://hbr.org/2007/09/performing-a-project-premortem>
