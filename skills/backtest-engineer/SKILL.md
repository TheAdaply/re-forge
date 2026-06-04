---
name: backtest-engineer
description: "Build a backtest that will not lie to you — the engineering, not the statistics. Use when implementing, reviewing, or debugging a backtest/simulation of a trading or sequential-decision strategy: choosing event-driven vs vectorized, auditing signal-vs-execution timestamps for look-ahead, modeling transaction costs (spread, slippage, impact), serving point-in-time data, logging every rerun as a degree of freedom, and sanity-checking capacity. Complements quant-analyst (which owns the validation statistics)."
---

# Backtest Engineer: build a simulation that cannot silently cheat

quant-analyst owns the statistics of *whether you should believe a number*
(validation scheme, multiple-testing, intervals). This skill owns the
**engineering of the number itself**: the simulation loop, the clock, the cost
model, the data store. A backtest claims *had you run this strategy, this is what
would have happened.* Most backtests violate that claim in code, not in math —
they let the strategy see prices it could not have seen, fill at prices it could
not have got, or trade size the market could not have absorbed. Run the gates in
order; do not report a P&L curve until the self-check passes.

A strategy that dies at 5 bps of cost was never alive. A look-ahead leak is not
"optimistic", it is fiction. Treat both as build defects.

## Gate 1 — Pick the engine, and know how vectorized cheats

Two architectures, two failure modes.

- **Event-driven**: process one timestamped event at a time through a queue
  (`MARKET -> SIGNAL -> ORDER -> FILL`). The data handler exposes only bars up to
  the current clock, so future data is *physically absent from memory*. This
  structurally prevents look-ahead and lets the same code run live. Cost: 10-1000x
  slower, more code.
- **Vectorized**: compute signals, positions, and returns as whole-array
  operations (NumPy/pandas). Fast, compact, ideal for parameter sweeps — and the
  default way look-ahead enters a backtest, because *every row can see every other
  row*. The cheats are silent:
  - `signal * return` on the **same** bar — you traded on a close using that same
    close. Returns must be `position.shift(1) * return` (Gate 2).
  - any `.rolling(...).mean()`, `.ewm()`, z-score, or normalization computed over
    the **full** series, then sliced — the early rows saw the later distribution.
  - `fillna(method="bfill")`, `interpolate()`, `.resample().last()` without a
    forward-only rule — all move future values backward in time.
  - a label/target built from a forward window, joined as a feature.

Decision rule:

| Situation | Engine |
|---|---|
| Intraday / tick / queue-sensitive / complex order types | Event-driven (vectorized will misprice fills) |
| Daily+ cross-sectional rebalance, 1000s of assets, param sweep | Vectorized (event-driven is overkill) |
| Final candidate before capital | Re-run event-driven even if screened vectorized |

Hybrid is the honest default: screen vectorized, **confirm the survivor on an
event-driven engine** whose fills obey the clock. If the two disagree materially,
trust the event-driven one and find the leak in the vectorized one. Read the
event-driven design in NautilusTrader or zipline-reloaded (see
`references/sources.md`) before writing your own.

## Gate 2 — The look-ahead audit (signal clock vs execution clock)

This is the gate that separates real backtests from fiction. Two timestamps live
on every trade and they are **not** the same instant:

- `t_signal` — the last moment whose data the signal is allowed to use.
- `t_exec` — the moment the fill price is observed.

**The discipline: `t_exec > t_signal`, always.** A signal computed from the
bar-`t` close cannot execute at the bar-`t` close — that price did not exist when
you decided. The minimum honest rule for bar data is **T+1**: decide on bar `t`,
fill at bar `t+1` open (plus costs, Gate 3). For intraday, `t_exec = t_signal +
decision_latency + order_latency`, and you fill at the price *at that later time*,
not the price that triggered you.

Audit procedure (run all):

1. **Print the two clocks for ten sampled trades.** For each, show the timestamp
   of the last data feeding the signal and the timestamp of the fill price. If
   `t_exec <= t_signal` on any, stop — the curve is invalid.
2. **One-bar-shift test.** Add one extra bar of delay between signal and
   execution everywhere. If P&L collapses, the original was harvesting
   information from the execution bar itself — a leak, not alpha. (Robust edges
   degrade gracefully under one extra bar of latency; phantom edges vanish.)
3. **Future-blind the data handler.** Make `get_bars(t)` raise if asked for any
   row with index `> t`. Re-run. Anything that breaks was reaching forward.
4. **Restatement / adjustment check.** Split-adjusted or dividend-adjusted close
   series encode *future* corporate actions into past prices. Use raw prices +
   an as-of-correct adjustment factor (Gate 4), or you have leaked.

For the validation-side leak rules (purge/embargo when labels span time, no
random splits on time-ordered data), that is quant-analyst Gate 2 — do not
duplicate it here; cite it.

## Gate 3 — Transaction-cost realism (the strategy killer)

Frictionless backtests are the most common way a dead strategy looks alive.
Model cost as a price adjustment applied **at fill**, decomposed:

```
fill_price = mid +/- ( half_spread + slippage + impact )      # signed against you
total_cost = commission + fees/taxes + financing + borrow      # added per trade/day
```

- **Half-spread**: you cross the book, so you pay at least half the quoted spread
  per side. Use the actual quoted/effective spread for the instrument and time,
  not a guess. Wide-spread or illiquid names: this term alone can dominate.
- **Slippage**: drift between decision price and fill. Floor it at a few bps even
  for liquid names; never zero.
- **Market impact** — your own order moves the price. The empirically robust form
  is the **square-root law**: `impact ~ k * sigma * sqrt(Q / ADV)` (Tóth,
  Bouchaud et al.). Almgren-Chriss splits it into temporary (reverts) + permanent
  (information) components and gives the optimal schedule. Impact is convex in
  size: a backtest that ignores it scales to infinite AUM for free (Gate 6).
- **Financing / borrow**: leverage costs overnight funding; shorts pay a borrow
  rate (25-50 bps GC, up to tens of % hard-to-borrow), and hard-to-borrow names
  may be *unborrowable* — model the constraint, not just the rate.
- **Fees / taxes**: commissions, exchange/clearing fees, stamp duty / STT / FTT.

**The 5-bps test (non-negotiable):** re-run the strategy at 1x, 2x, and 5x your
estimated cost. Report the Sharpe / net P&L at each. If the edge disappears
somewhere in that range, the *result of the backtest is the cost sensitivity
curve*, not the headline number. High-turnover strategies live or die here:
`net_edge_per_trade = gross_edge_per_trade - round_trip_cost`, and gross edge
must clear cost with margin to spare.

## Gate 4 — Point-in-time data (no time travel in the inputs)

The simulation may only consume values that were *knowable and unrevised* at the
sim clock. Two distinct traps:

- **Restatement / revision.** Fundamentals get restated; macro series (GDP, CPI)
  get revised; index membership is reconstructed with hindsight. Store each value
  with the timestamp it *became known* (`as_of` / `published_at`) and serve via an
  as-of join: `value where as_of <= t`, take the latest. A join on "current"
  values stamps tomorrow's truth onto yesterday's row — a leak.
- **Survivorship.** A universe of "instruments that exist today" has had its
  failures deleted; any backward average is inflated (de Prado, *AFML*). Include
  delisted/expired/merged names with their terminal returns, and reconstruct index
  constituents *as of each rebalance*, not as of now.

Build it structurally: a data store that physically cannot answer for `as_of > t`
makes both traps unrepresentable. Forward-fill is the only safe fill direction
(`ffill`); `bfill` is a time machine.

```python
class PointInTime:
    """Serves only rows known as of the query time; bfill is impossible here."""
    def __init__(self, df, as_of="as_of"):
        self.df, self.as_of = df.sort_values(as_of), as_of
    def at(self, symbol, t, field):
        m = (self.df["symbol"] == symbol) & (self.df[self.as_of] <= t)
        rows = self.df.loc[m]
        return rows.iloc[-1][field] if len(rows) else None   # latest knowable
```

## Gate 5 — The single-backtest doctrine

**Every rerun after seeing a result spends a degree of freedom.** Changing a
threshold, feature, window, universe, or date range and re-running because the
last result looked bad is a search over strategies, and the search inflates the
best Sharpe you will eventually find even with no edge at all. The engineering
obligation is to **make the search countable** so the statistics can deflate it.

- **Log every run.** Append-only ledger: config hash, params, data window, git
  SHA, timestamp, headline metrics — one row per execution, winners and losers
  alike. If you cannot say how many backtests you ran, your reported Sharpe has no
  known significance.
- **Hand the count to the statistics.** The trial count `N` is the input to the
  **Deflated Sharpe Ratio** (does your best Sharpe beat what `N` null trials would
  produce, correcting for sample length, skew, kurtosis?) and to the **Probability
  of Backtest Overfitting**. Computing these is quant-analyst Gate 3; this gate's
  job is to *produce an honest N* for it to consume.
- **A held-out slice touched once.** Run the chosen config on a reserved final
  window exactly one time and report that number; a second run converts it into
  training data. Tune inside folds, never on the holdout.

```python
def log_run(ledger, *, config_hash, params, window, git_sha, **metrics):
    ledger.append({"config_hash": config_hash, "params": params, "window": window,
                   "git_sha": git_sha, "ts": pd.Timestamp.utcnow(), **metrics})
# len(ledger) is the N you must feed to the Deflated Sharpe Ratio — losers too.
```

## Gate 6 — Capacity sanity

A backtest fills any size at the modeled price; the market does not. Before
believing a P&L, bound the AUM at which it survives:

- **Participation cap.** Per bar, your child order should be a small fraction of
  interval volume (a common ceiling is ~10-20% of ADV in the relevant window).
  An order needing more than the market traded is unfillable, not cheap.
- **Impact-eroded capacity.** Because impact grows like `sqrt(Q/ADV)` (Gate 3),
  per-trade cost rises with size and eventually eats the gross edge. Estimate the
  AUM where `round_trip_cost(size) >= gross_edge`; that is the strategy's rough
  capacity ceiling.
- **Turnover lens.** `required_daily_volume = AUM * annual_turnover / 252`. If
  that exceeds a sane fraction of the universe's ADV, the backtest is trading
  size that did not exist.

State the capacity number. "Sharpe 2.5" at an AUM the market cannot fill is a
lab result, not a strategy.

## Failure modes to name out loud when you see them

- Returns computed as `signal * return` on the **same** bar (no `shift`).
- Fills at the **same** bar's close/VWAP that the signal was computed from.
- Split/dividend-adjusted prices used as if they were the contemporaneous quote.
- Zero or fixed-tiny transaction cost; no spread, no impact, no 5-bps test.
- A universe with no delisted/expired names; index members taken as "current".
- `bfill` / full-series normalization / global sort moving the future backward.
- A headline Sharpe with no count of how many configs were tried to find it.
- Any size assumed fillable with no participation or capacity check.

## Self-check before delivering

Answer all yes, or fix it first:

1. For sampled trades, is the execution-price timestamp strictly **after** the
   last timestamp the signal used (T+1 or later), and does the one-bar-shift test
   not collapse the edge?
2. Are transaction costs modeled as spread + slippage + impact (+ financing /
   borrow / fees), and did I report the strategy at 1x / 2x / 5x cost?
3. Is every input served point-in-time (as-of join, raw-not-restated, delisted
   names present), with forward-fill only and no `bfill`?
4. Did I log **every** backtest run (winners and losers) and report the trial
   count `N`, so the Deflated Sharpe / PBO (quant-analyst Gate 3) have an honest
   input — with a final holdout touched exactly once?
5. Did I state a capacity ceiling (participation cap and/or impact-eroded AUM)
   rather than assuming any size fills at the modeled price?
6. If I screened vectorized, did I confirm the survivor on an event-driven engine
   whose data handler physically cannot return future bars?

References and citations: `references/sources.md`.
