---
name: data-pipeline-engineer
description: "Data-quality engineering that runs BEFORE any analysis or model — even on one CSV. Use when ingesting, joining, transforming, caching, or reconciling data, or whenever a downstream number depends on a table being correct, fresh, and reproducible. Enforces schema contracts at the boundary, freshness audits, idempotent transforms, row-count and distribution reconciliation across joins, raw/derived versioning, and a great-expectations-style validation checklist written as plain pandas asserts."
---

# Data Pipeline Engineer: make the data trustworthy before anyone models it

The most expensive bug in any analysis is a silent data bug: it does not raise,
it ships a wrong number. This skill is an ordered set of gates that run at the
data boundary, *before* feature engineering or modelling begins. A fast pipeline
over corrupt data is worse than no pipeline. Validate aggressively, fail loud at
the boundary, and refuse to hand data downstream until the self-check passes.

Work top to bottom. Each section is a gate, not a suggestion. If a gate cannot
be answered, that is the finding — say so explicitly.

## Gate 1 — Schema contract at ingestion (fail loud at the boundary)

A schema contract is a declared promise about types, ranges, nullability, and
cardinality that you check the instant data enters the system. Catching a broken
column at ingestion costs one assert; catching it three joins later costs a
debugging session and a wrong result. This is the same boundary-validation
principle behind dbt tests and Great Expectations
(<https://greatexpectations.io/expectations>).

Declare the contract as code and run it at load:

```python
import pandas as pd

EXPECTED = {"date": "datetime64[ns]", "symbol": "object",
            "close": "float64", "volume": "int64"}

def load_contracted(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["date"])
    # 1. Columns present and no surprise extras (strict schema).
    assert set(df.columns) == set(EXPECTED), \
        f"schema drift: {set(df.columns) ^ set(EXPECTED)}"
    # 2. Types match the contract — never trust inference silently.
    for col, dt in EXPECTED.items():
        assert str(df[col].dtype) == dt, f"{col}: {df[col].dtype} != {dt}"
    # 3. Nullability: declare which columns may be null; assert the rest.
    for col in ["date", "symbol", "close"]:
        assert df[col].notna().all(), f"unexpected nulls in {col}"
    # 4. Ranges / domains — a price <= 0 or a volume < 0 is corruption.
    assert (df["close"] > 0).all(), "non-positive price"
    assert (df["volume"] >= 0).all(), "negative volume"
    # 5. Cardinality / key uniqueness — duplicate keys break every join below.
    assert not df.duplicated(["date", "symbol"]).any(), "duplicate (date,symbol)"
    return df
```

Rules: strict column set (reject unknown columns, do not silently ignore them);
explicit nullability per column; an allowed range or value set for every numeric
or categorical field; an assert on the primary key's uniqueness. **Missing
disguised as zero is the classic trap** — a `0` volume that means "no data"
must be NaN before any aggregation, or your mean is wrong and never errors.

## Gate 2 — The staleness / freshness audit

Stale data from a silently-failed upstream run looks identical to fresh data —
same schema, same shape, last week's values. The only defence is an explicit
freshness check with a declared SLO, the discipline dbt formalizes as source
freshness (<https://docs.getdbt.com/docs/deploy/source-freshness>).

```python
from datetime import datetime, timedelta

def assert_fresh(df, ts_col="date", max_age=timedelta(days=3)):
    age = datetime.now() - df[ts_col].max().to_pydatetime()
    assert age <= max_age, f"STALE: newest row is {age} old (SLO {max_age})"

def assert_no_gaps(df, ts_col="date"):
    # Missing business days are a silent-failure fingerprint.
    days = pd.bdate_range(df[ts_col].min(), df[ts_col].max())
    missing = set(days) - set(pd.to_datetime(df[ts_col].unique()))
    assert not missing, f"{len(missing)} missing business days, e.g. {sorted(missing)[:3]}"
```

Audit checklist: (a) newest timestamp within the SLO; (b) no missing periods in
the expected cadence; (c) the *file* mtime is recent, not just the data inside
it; (d) row count is in the historical band — a partition arriving at 10% of its
usual size is a partial load, not a quiet market. Treat a freshness failure as a
hard stop: serving stale data silently is the failure mode.

## Gate 3 — Idempotent, re-runnable transforms (same input -> same output)

An idempotent step produces identical output no matter how many times it runs —
running it twice equals running it once
(<https://en.wikipedia.org/wiki/Idempotence>). Without it you cannot safely
retry, backfill, or reproduce — the three things pipelines do constantly.

- **Partition-overwrite, never blind append.** Appending re-run output
  duplicates rows; overwriting the whole partition for a key is idempotent by
  construction.

  ```python
  def write_partition(df, date, root="data"):
      df.to_parquet(f"{root}/date={date}/part.parquet")  # 1x == 100x
  ```

- **Upsert on the primary key** when you must merge: concat then
  `drop_duplicates(key, keep="last")`, never raw concat.
- **No hidden state.** Forbid `datetime.now()`, random sampling without a seed,
  dict/`set` ordering dependence, and mutable globals *inside* a transform. Pass
  the run date in as a parameter; pass the seed in as config. A transform that
  reads the wall clock cannot be replayed.
- **Determinism test** — make it a unit test, not a hope:

  ```python
  from pandas.testing import assert_frame_equal
  assert_frame_equal(transform(df), transform(df))          # pure
  assert_frame_equal(transform(transform_once_output), transform_once_output)  # idempotent
  ```

## Gate 4 — Row-count and distribution reconciliation across every join

A join is the single most dangerous operation in a pipeline. A non-unique key on
the right side silently **fans out** — one left row becomes many — and your
target rows multiply, double-counting every downstream sum, mean, and label.
This passes every type check while corrupting the result. Reconcile *every*
join:

```python
def safe_join(left, right, on, how="left"):
    n_before = len(left)
    # Fan-out guard: the right key MUST be unique for a left/inner 1:1 join.
    assert not right.duplicated(on).any(), \
        f"right side not unique on {on} -> fan-out will duplicate rows"
    out = left.merge(right, on=on, how=how, validate="m:1")  # pandas enforces it
    # Row-count reconciliation: a left join must not change the row count.
    assert len(out) == n_before, f"row count {n_before} -> {len(out)} (fan-out!)"
    # Match-rate reconciliation: how many left rows found a partner?
    match_rate = out[right.columns.difference([on])[0]].notna().mean()
    print(f"join match rate: {match_rate:.1%}")  # a silent 2% match is a key-format bug
    return out
```

Pass `validate="1:1"`, `"m:1"`, or `"1:m"` to `merge` so pandas raises on an
unexpected relationship instead of fanning out
(<https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.merge.html>).
After every join check three numbers: **row count** (changed unexpectedly?),
**key match rate** (a low rate means a key-format or timezone mismatch, not
missing data), and **a target distribution stat** (`mean`/`sum`) before vs after
— if the mean of an unrelated column moved, you duplicated rows. **As-of /
time-based joins** carry an extra hazard: joining on the event date instead of
the date the value was *knowable* is look-ahead leakage; join on
publication/availability time (<https://docs.pola.rs/api/python/stable/reference/dataframe/api/polars.DataFrame.join_asof.html>).

## Gate 5 — Versioned raw data, derived data rebuilt from code

Raw data is the only thing you cannot regenerate; derived data is a pure function
of raw plus code. So **version raw immutably and rebuild everything else**, the
bronze/silver/gold (medallion) discipline
(<https://www.databricks.com/glossary/medallion-architecture>).

- **Raw zone is append-only and immutable.** Land responses exactly as received,
  partitioned by ingest date. Never edit raw in place; re-collecting history is
  often impossible.
- **Derived zone is disposable** — reconstructable by re-running code against a
  pinned raw snapshot. If you cannot delete the features directory and rebuild it
  byte-identical, you have hidden state (Gate 3).
- **Pin inputs to a hash.** Stamp every derived artifact with the pipeline git
  commit and a content hash of its raw inputs, so any number traces to exact code
  + exact data. Tools: DVC for large-file versioning (<https://dvc.org/doc>);
  Parquet statistics + embedded metadata for lineage
  (<https://parquet.apache.org/docs/>).
- **Schema versioning:** additive column = no break; rename/retype/remove = bump
  a stored `schema_version` and keep a backward-compatible read path.

## The validation checklist as plain pandas asserts

Great Expectations and dbt tests are excellent, but the *content* of a good
suite is a list of boundary conditions you can write as asserts with zero
dependencies (<https://docs.greatexpectations.io/docs/reference/learn/conceptual_guides/expectation_classes/>).
Call this after every major step; raising here is the point.

```python
def validate(df: pd.DataFrame) -> None:
    assert len(df) > 0, "empty frame"                                   # shape
    for c in ["date", "symbol", "close"]:                              # not-null
        assert df[c].notna().all(), f"nulls in {c}"
    assert df["close"].gt(0).all() and df["volume"].ge(0).all()        # ranges
    if {"high", "low"} <= set(df.columns):                            # pair A>=B
        assert (df["high"] >= df["low"]).all(), "high < low"
    assert not df.duplicated(["date", "symbol"]).any(), "dup key"     # unique
    # assert df["currency"].isin({"USD", "EUR"}).all()                # in-set
    extreme = (df["close"].pct_change().abs() > 0.5).mean()           # WARN only
    if extreme > 0.001:
        print(f"WARN: {extreme:.2%} of rows move >50% one step — check splits")
```

Each comment names the matching Great Expectations expectation; the asserts are
the same checks with zero dependencies.

Severity discipline: structural violations (nulls in a key, broken type,
non-unique key, fan-out) **raise and halt**; statistical oddities (a return
spike, a distribution shift) **warn and log** so a human decides. Never let a
hard violation pass as a warning, and never let a soft warning block a run that
a person should adjudicate.

## Failure modes to name out loud when you see them

- A join with no row-count check afterward (silent fan-out duplicating the
  target).
- `0` standing in for "missing", aggregated as if it were a real value.
- A transform that reads `datetime.now()` or an unseeded RNG (un-replayable).
- Append-on-rerun with no dedup (duplicates that grow every backfill).
- A join on event date instead of knowable/publication date (look-ahead leak).
- Fresh-looking data from a silently-failed upstream run (no staleness gate).
- Derived data edited in place with no path back to raw + code.
- Type inference trusted on read (`object` dtype hiding mixed types).

## Self-check before delivering

Answer all yes, or fix it first:

1. Does a schema contract (types, nullability, ranges, key uniqueness) run at
   ingestion and **raise** — not warn — on violation?
2. Did I assert freshness against a declared SLO and check for missing periods,
   so a silently-stale upstream cannot pass as current?
3. Is every transform idempotent and free of hidden state (no wall clock, no
   unseeded RNG, partition-overwrite or keyed upsert), and did I prove it with a
   re-run equality test?
4. Did I reconcile **row count, key match rate, and a distribution stat** across
   every join, and guard the join key's uniqueness against fan-out?
5. Is raw data versioned immutably while derived data is rebuildable from pinned
   code + a raw hash — and could I delete and regenerate the derived zone?
6. Does my validation suite halt on structural violations and only warn on
   statistical ones, and have I run it after each major step?

References and citations: `references/sources.md`.
