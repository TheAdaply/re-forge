# Sources for the backtest-engineer skill

Public, citable sources behind each non-obvious engineering heuristic in
`SKILL.md`. URLs were checked to load (HTTP 200/301) or to return a bot-block
status (403/405/429) that the repo link checker treats as alive. Book citations
are given by title/author without a URL. The validation *statistics* (CV scheme,
multiple-testing, intervals) are owned by the sibling `quant-analyst` skill and
cited there; this skill cites only the engineering and cost references.

## Cost, market impact, and execution

- **Almgren, R. & Chriss, N. — "Optimal Execution of Portfolio Transactions."**
  Journal of Risk (2000).
  <https://www.math.nyu.edu/~almgren/papers/optliq.pdf>
  Used in Gate 3: temporary vs permanent impact decomposition and the optimal
  execution schedule; the canonical impact model behind realistic fill pricing.

- **Tóth, B., Lemperière, Y., Deremble, C., de Lataillade, J., Kockelkoren, J.,
  Bouchaud, J.-P. — "Anomalous price impact and the critical nature of liquidity
  in financial markets"** (2009) — the square-root impact law,
  `impact ~ sigma * sqrt(Q / ADV)`.
  <https://arxiv.org/abs/0903.2428>
  Used in Gate 3 and Gate 6: empirically robust, convex, size-dependent impact;
  the basis for impact-eroded capacity.

- **Implementation shortfall (Wikipedia)** — decision-price-vs-fill-price cost
  framing (Perold's concept). Used in Gate 2/Gate 3.
  <https://en.wikipedia.org/wiki/Implementation_shortfall>

- **Market impact (Wikipedia)** — overview of temporary/permanent impact and
  participation-rate effects. Used in Gate 3 and Gate 6.
  <https://en.wikipedia.org/wiki/Market_impact>

- **Bid–ask spread (Wikipedia)** — half-spread cost per side. Used in Gate 3.
  <https://en.wikipedia.org/wiki/Bid%E2%80%93ask_spread>

- **Slippage (finance) (Wikipedia)** — decision-vs-execution price drift.
  Used in Gate 3.
  <https://en.wikipedia.org/wiki/Slippage_(finance)>

## Overfitting and the trial count (engineering side)

- **Bailey, D. H. & López de Prado, M. — "The Deflated Sharpe Ratio: Correcting
  for Selection Bias, Backtest Overfitting and Non-Normality."**
  <https://www.davidhbailey.com/dhbpapers/deflated-sharpe.pdf>
  Used in Gate 5: the logged trial count `N` is the input that deflates the
  best-observed Sharpe; this skill's job is to *produce an honest N*.

- **Bailey, D. H., Borwein, J., López de Prado, M., Zhu, Q. J. — "The Probability
  of Backtest Overfitting."**
  <https://www.davidhbailey.com/dhbpapers/backtest-prob.pdf>
  Used in Gate 5: the same logged search drives PBO; logging winners *and* losers
  is what makes PBO computable.

- **Bailey & de Prado index of freely available papers.**
  <https://www.davidhbailey.com/dhbpapers/>

## Point-in-time data and survivorship

- **Survivorship bias (Wikipedia)** — deleted-failures inflation of any
  backward-looking average. Used in Gate 4.
  <https://en.wikipedia.org/wiki/Survivorship_bias>

- **López de Prado, M. — *Advances in Financial Machine Learning*** (Wiley, 2018).
  Chapter 11 ("The Dangers of Backtesting") and the data chapters. Source for
  point-in-time discipline, survivorship-free universes, and the single-backtest
  doctrine (Gates 4–5).

## Books (engineering practice)

- **Harris, L. — *Trading and Exchanges: Market Microstructure for
  Practitioners*** (Oxford, 2003). Order types, queue priority, fill mechanics,
  and execution-quality measurement behind Gate 1/Gate 3.

- **Kissell, R. — *The Science of Algorithmic Trading and Portfolio
  Management*** (Academic Press). Transaction-cost modeling, market-impact
  calibration, and implementation-shortfall decomposition behind Gate 3.

- **Chan, E. — *Quantitative Trading: How to Build Your Own Algorithmic Trading
  Business*** (Wiley). Practical transaction-cost and capacity estimation for
  smaller books behind Gate 3/Gate 6.

## Reference engines (event-driven design read before rolling your own)

- **NautilusTrader** — production-grade event-driven engine (Rust core, Python
  API); same code path backtest-to-live. Read in Gate 1.
  <https://github.com/nautechsystems/nautilus_trader>

- **zipline-reloaded** — community-maintained event-driven equities backtester.
  Read in Gate 1.
  <https://github.com/stefan-jansen/zipline-reloaded>

- **vectorbt** — fast vectorized/Numba backtester for sweeps (and the engine
  class where look-ahead silently enters). Referenced in Gate 1.
  <https://github.com/polakowo/vectorbt>
