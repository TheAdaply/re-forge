# Sources for the data-pipeline-engineer skill

Public, citable sources behind each non-obvious heuristic in `SKILL.md`. URLs
listed here were checked to load (HTTP 200) or to return a bot-block status
(403/405/429/503) that the repo link checker treats as alive. Book citations are
given by title/author without a URL.

## Boundary validation & validation checklists (Gates 1, 6)

- **Great Expectations — Expectations gallery.**
  <https://greatexpectations.io/expectations>
  Gate 1 / checklist: the catalogue of declarative data expectations
  (not-null, between, in-set, pair-A-greater-than-B, compound-unique) that the
  plain-pandas asserts in this skill reproduce dependency-free.

- **Great Expectations — Expectation classes (conceptual guide).**
  <https://docs.greatexpectations.io/docs/reference/learn/conceptual_guides/expectation_classes/>
  Checklist section: maps each assert to its named expectation class.

- **dbt — Add data tests to your DAG.**
  <https://docs.getdbt.com/docs/build/data-tests>
  Gate 1: testing types/constraints at the boundary as part of the pipeline,
  not after the fact.

## Freshness / staleness (Gate 2)

- **dbt — Configure source freshness.**
  <https://docs.getdbt.com/docs/deploy/source-freshness>
  Gate 2: declaring a freshness SLO (`warn_after` / `error_after`) on a source
  and failing the run when newest data exceeds it.

- **dbt — Add sources to your DAG.**
  <https://docs.getdbt.com/docs/build/sources>
  Gate 2: source declaration as the place freshness and loaded-ness are checked.

## Idempotency & reproducibility (Gate 3)

- **Idempotence (Wikipedia).**
  <https://en.wikipedia.org/wiki/Idempotence>
  Gate 3: running an operation twice equals running it once — the formal basis
  for partition-overwrite and keyed-upsert pipeline steps.

## Joins, fan-out, and as-of correctness (Gate 4)

- **pandas — `DataFrame.merge` (`validate=` argument).**
  <https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.merge.html>
  Gate 4: `validate="1:1"|"m:1"|"1:m"` makes pandas raise on an unexpected join
  cardinality instead of silently fanning out.

- **Polars — `DataFrame.join_asof`.**
  <https://docs.pola.rs/api/python/stable/reference/dataframe/api/polars.DataFrame.join_asof.html>
  Gate 4: time-based joins must match on the date a value was *knowable*
  (publication/availability time), not the event date, to avoid look-ahead.

- **Survivorship bias (Wikipedia).**
  <https://en.wikipedia.org/wiki/Survivorship_bias>
  Gate 4 / failure modes: joining onto a "current" universe deletes failed units
  and inflates any backward-looking statistic.

## Versioning raw vs derived data (Gate 5)

- **Databricks — Medallion architecture (bronze/silver/gold).**
  <https://www.databricks.com/glossary/medallion-architecture>
  Gate 5: immutable raw (bronze) and rebuildable refined layers (silver/gold).

- **DVC — Documentation.**
  <https://dvc.org/doc>
  Gate 5: version large raw datasets alongside git so derived artifacts pin to an
  exact raw snapshot.

- **Apache Parquet — Documentation.**
  <https://parquet.apache.org/docs/>
  Gate 5: columnar format with embedded schema, statistics, and metadata used to
  stamp lineage (commit, row count, schema version) onto derived files.

## Supporting concepts

- **Data validation (Wikipedia).**
  <https://en.wikipedia.org/wiki/Data_validation>
  Framing: type, range, and consistency checks at the point of entry.

- **Extract, transform, load (Wikipedia).**
  <https://en.wikipedia.org/wiki/Extract,_transform,_load>
  Framing: the boundary where ingestion-time contracts belong.

## Books

- **Reis, J. & Housley, M. — *Fundamentals of Data Engineering*** (O'Reilly,
  2022). The data-engineering lifecycle, staging zones, and data-quality
  dimensions behind Gates 1, 2, and 5.

- **Kleppmann, M. — *Designing Data-Intensive Applications*** (O'Reilly, 2017).
  <https://martin.kleppmann.com/2017/03/27/designing-data-intensive-applications.html>
  Reliability, reproducibility, and derived-data-from-source-of-truth reasoning
  behind Gates 3 and 5.

- **López de Prado, M. — *Advances in Financial Machine Learning*** (Wiley,
  2018). Look-ahead bias and point-in-time correctness behind the as-of-join
  hazard in Gate 4.
