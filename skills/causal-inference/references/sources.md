# Sources for the causal-inference skill

Public, citable sources behind each non-obvious heuristic in `SKILL.md`. URLs
listed here were checked to load (HTTP 200) or to return a bot-block status
(403/405/429) that the repo link checker treats as alive. Book citations are
given by title/author without a URL where no free copy exists.

## Foundational books

- **Pearl, J. & Mackenzie, D. — *The Book of Why: The New Science of Cause and
  Effect*** (Basic Books, 2018). <https://bookofwhy.com/>
  Used in the framing and Gate 1: the DAG (not the data) determines the
  adjustment set; confounder / mediator / collider distinctions; "conditioning on
  a collider creates bias".

- **Hernán, M. A. & Robins, J. M. — *Causal Inference: What If*** (Chapman &
  Hall/CRC, 2020). Free official PDF (Harvard, verified to load):
  <https://www.hsph.harvard.edu/miguel-hernan/wp-content/uploads/sites/1268/2024/01/hernanrobins_WhatIf_2jan24.pdf>
  Book home page: <https://miguelhernan.org/whatifbook>
  Used in Gate 2: estimands (ATE/ATT/CATE/LATE), backdoor criterion, positivity,
  and the assumption-first discipline (Part I — causal inference without models).

- **Angrist, J. D. & Pischke, J.-S. — *Mostly Harmless Econometrics: An
  Empiricist's Companion*** (Princeton University Press, 2009).
  <https://www.mostlyharmlesseconometrics.com/>
  Used in Gate 3: the design hierarchy — instrumental variables / 2SLS, the LATE,
  difference-in-differences, and regression-discontinuity as quasi-experiments.

## Methodology papers

- **VanderWeele, T. J. & Ding, P. — "Sensitivity Analysis in Observational
  Research: Introducing the E-Value."** *Annals of Internal Medicine* (2017).
  <https://www.acpjournals.org/doi/10.7326/M16-2607>
  Used in Gate 5: the E-value — minimum confounder–treatment and confounder–outcome
  association needed to explain away an observed effect.

- **Cinelli, C. & Hazlett, C. — "Making Sense of Sensitivity: Extending Omitted
  Variable Bias."** *JRSS-B* (2020). Author PDF:
  <https://carloscinelli.com/files/Cinelli%20and%20Hazlett%20(2020)%20-%20Making%20Sense%20of%20Sensitivity.pdf>
  Used in Gate 5: partial-R² / robustness-value bounds benchmarked against an
  observed covariate (`sensemakr`).

- **Kohavi, R., Deng, A., Frasca, B., Walker, T., Xu, Y., Pohlmann, N. — "Online
  Controlled Experiments at Large Scale" / "Seven Pitfalls to Avoid."**
  Experimentation-platform paper archive:
  <https://exp-platform.com/Documents/2017-08%20KDDMetricInterpretationPitfalls.pdf>
  Used in Gate 4: SUTVA/interference, sample-ratio mismatch, Twyman's law,
  short-vs-long-horizon metric conflicts in A/B testing.

## Reference explainers (verified to load)

- **Collider (statistics) — Wikipedia.**
  <https://en.wikipedia.org/wiki/Collider_(statistics)>
  Gate 1: conditioning on / selecting on a collider induces spurious association.

- **Backdoor criterion — Wikipedia.**
  <https://en.wikipedia.org/wiki/Backdoor_criterion>
  Gate 2: plain-language statement of which paths an adjustment set must block.

- **Simpson's paradox — Wikipedia.**
  <https://en.wikipedia.org/wiki/Simpson%27s_paradox>
  Gate 1: the visible symptom of an incorrect adjustment set.

- **Difference in differences — Wikipedia.**
  <https://en.wikipedia.org/wiki/Difference_in_differences>
  Gate 3: parallel-trends assumption.

- **Instrumental variables estimation — Wikipedia.**
  <https://en.wikipedia.org/wiki/Instrumental_variables_estimation>
  Gate 3: relevance, exclusion, independence; LATE; weak-instrument inference.

- **Network effect — Wikipedia.**
  <https://en.wikipedia.org/wiki/Network_effect>
  Gate 4: a common source of interference / SUTVA violations in experiments.

## A/B testing pitfalls — practitioner explainers (verified to load)

- **Evan Miller — "How Not To Run an A/B Test."**
  <https://www.evanmiller.org/how-not-to-run-an-ab-test.html>
  Gate 4: peeking / optional stopping inflates the false-positive rate; fix the
  sample size or use a sequential design.

- **Statsig — "The dangers of peeking at experiment results."**
  <https://www.statsig.com/blog/the-dangers-of-peeking-at-experiment-results>
  Gate 4: continuous-monitoring error inflation and valid remedies.

## Tooling (for the named methods)

- **DoWhy (PyWhy)** — model / identify / estimate / refute workflow, including the
  placebo and random-common-cause refuters used in Gate 5.
  <https://www.pywhy.org/dowhy/>

## Free courses / open textbooks (for deeper study)

- **Brady Neal — Introduction to Causal Inference.**
  <https://www.bradyneal.com/causal-inference-course>
- **Scott Cunningham — *Causal Inference: The Mixtape*** (free online).
  <https://mixtape.scunning.com/>
- **Nick Huntington-Klein — *The Effect*** (free online).
  <https://theeffectbook.net/>
