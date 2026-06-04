# Sources for the statistician skill

Public, citable sources behind each non-obvious heuristic in `SKILL.md`. URLs
listed here were checked to load (HTTP 200/302) or to return a bot-block status
(403/405/429) that the repo link checker treats as alive. Book and journal
citations without a stable open URL are given by title/author/year.

## P-hacking, forking paths, and researcher degrees of freedom

- **Simmons, J. P., Nelson, L. D., Simonsohn, U. — "False-Positive Psychology:
  Undisclosed Flexibility in Data Collection and Analysis Allows Presenting
  Anything as Significant."** *Psychological Science* 22(11), 2011.
  <https://journals.sagepub.com/doi/10.1177/0956797611417632>
  Used in Gate 5: catalogues the researcher degrees of freedom (optional stopping,
  outcome switching, covariate fiddling, dropping conditions) and shows in
  simulation that exploiting a few of them pushes the false-positive rate above
  60%. The authors' Data Colada blog expands the practical guidance:
  <https://datacolada.org/>

- **Gelman, A. & Loken, E. — "The Garden of Forking Paths: Why Multiple
  Comparisons Can Be a Problem, Even When There Is No 'Fishing Expedition' or
  'P-Hacking' and the Research Hypothesis Was Posited Ahead of Time."** (2013).
  <https://stat.columbia.edu/~gelman/research/published/ForkingPaths.pdf>
  Used in Gate 6: a single data-contingent analysis on a single dataset already
  has a multiple-comparisons problem, because the reference null must include all
  analyses one *would* have run on other datasets. The popular-audience version is
  Gelman & Loken, "The Statistical Crisis in Science," *American Scientist* 102(6),
  2014.

## Power, minimum detectable effect, and the abuse of post-hoc power

- **Hoenig, J. M. & Heisey, D. M. — "The Abuse of Power: The Pervasive Fallacy of
  Power Calculations for Data Analysis."** *The American Statistician* 55(1), 2001.
  Used in Gate 2: observed/post-hoc power is a one-to-one function of the p-value
  and carries no information beyond it; report confidence intervals instead. (Open
  copies are widely mirrored; cited by title/author/year.)

- **Gelman, A. & Carlin, J. — "Beyond Power Calculations: Assessing Type S (Sign)
  and Type M (Magnitude) Errors."** *Perspectives on Psychological Science* 9(6),
  2014.
  Used in Gate 2: under low power, the estimates that do reach significance are
  inflated in magnitude (type M) and can be wrong in sign (type S), so a
  significant underpowered result should lower confidence in the effect size.

- **Statistical power (Wikipedia)** — definition of power, beta, and the four
  linked quantities. <https://en.wikipedia.org/wiki/Power_(statistics)>

## Multiple-comparisons control

- **Benjamini, Y. & Hochberg, Y. — "Controlling the False Discovery Rate: A
  Practical and Powerful Approach to Multiple Testing."** *JRSS-B* 57(1), 1995.
  <https://www.jstor.org/stable/2346101>
  Used in Gate 4: the BH procedure controls the expected proportion of false
  discoveries and is far less conservative than FWER methods at large m — the
  default for exploratory, high-dimensional screening.

- **Multiple comparisons problem (Wikipedia)** — FWER vs FDR, the inflation of
  family-wise error, and where Bonferroni, Holm, and BH each apply.
  <https://en.wikipedia.org/wiki/Multiple_comparisons_problem>

- **Bonferroni correction (Wikipedia)** — including why Holm's step-down procedure
  uniformly dominates plain Bonferroni.
  <https://en.wikipedia.org/wiki/Bonferroni_correction>

- **False discovery rate (Wikipedia)** — BH, Benjamini-Yekutieli under arbitrary
  dependence, and q-values. <https://en.wikipedia.org/wiki/False_discovery_rate>

## Effect sizes, intervals, and p-value interpretation

- **Wasserstein, R. L. & Lazar, N. A. — "The ASA Statement on p-Values: Context,
  Process, and Purpose."** *The American Statistician* 70(2), 2016.
  <https://www.tandfonline.com/doi/full/10.1080/00031305.2016.1154108>
  Used in Gate 3: a p-value does not measure effect size or importance; report
  estimates with intervals and do not treat 0.05 as a bright line.

- **Effect size (Wikipedia)** — Cohen's d, correlation r, odds/risk ratios and
  their conventional small/medium/large anchors.
  <https://en.wikipedia.org/wiki/Effect_size>

- **Confidence interval (Wikipedia)** — the interval as the result, the point as
  its midpoint. <https://en.wikipedia.org/wiki/Confidence_interval>

- **Data dredging / p-hacking (Wikipedia)** — the taxonomy of optional stopping,
  outcome switching, and subgroup fishing. <https://en.wikipedia.org/wiki/Data_dredging>

## Tooling referenced in the gates

- **`statsmodels.stats.power` (TTestIndPower, solve_power)** — solve for n, power,
  effect size, or alpha given the other three.
  <https://www.statsmodels.org/stable/generated/statsmodels.stats.power.TTestIndPower.html>
- **`statsmodels.stats.multitest.multipletests`** — `bonferroni`, `holm`,
  `fdr_bh`, `fdr_by` corrections from a vector of p-values.
  <https://www.statsmodels.org/stable/generated/statsmodels.stats.multitest.multipletests.html>
- **`scipy.stats.false_discovery_control`** — Benjamini-Hochberg / Benjamini-
  Yekutieli FDR adjustment.
  <https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.false_discovery_control.html>
- **`scipy.stats.bootstrap`** — bootstrap (BCa) confidence intervals for
  statistics without a clean closed form.
  <https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html>
- **NIST/SEMATECH e-Handbook, "What are the steps of a hypothesis test?"** —
  reference framing for pre-specifying H0/H1/alpha/test.
  <https://www.itl.nist.gov/div898/handbook/prc/section1/prc14.htm>
