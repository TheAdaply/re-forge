# Sources for bayesian-modeler

Every non-obvious heuristic in `SKILL.md` traces to one of the public sources
below. URLs here were checked to load (HTTP 200, or a bot-shield 403/405/429
which the CI link checker treats as alive). General well-known practice
("standardize predictors", "build a baseline first") is uncited by design.

## The workflow (the spine of this skill)

- **Gelman, Vehtari, Simpson, Margossian, Carpenter, Yao, Kennedy, Gabry,
  Bürkner & Modrák — "Bayesian Workflow" (2020).** The canonical end-to-end
  loop: model building, prior/posterior predictive checking, computation
  diagnostics, model comparison and the iterate-and-revise structure. This
  skill is an operational checklist of it. <https://arxiv.org/abs/2011.01808>
- **Gabry, Simpson, Vehtari, Betancourt & Gelman — "Visualization in Bayesian
  workflow" (J. R. Stat. Soc. A, 2019).** Defines the visual pipeline: prior
  predictive check → fit → posterior predictive check, with the test-statistic
  PPC approach. <https://arxiv.org/abs/1709.01449>

## Convergence diagnostics

- **Vehtari, Gelman, Simpson, Carpenter & Bürkner — "Rank-normalization,
  folding, and localization: An improved R-hat for assessing convergence of
  MCMC" (Bayesian Analysis, 2021).** The modern rank-normalized split-R-hat and
  bulk/tail-ESS that ArviZ implements; thresholds (R-hat < 1.01) come from here.
  <https://arxiv.org/abs/1903.08008>
- **Hoffman & Gelman — "The No-U-Turn Sampler: Adaptively Setting Path Lengths
  in Hamiltonian Monte Carlo" (JMLR, 2014).** NUTS — the default adaptive HMC
  engine in Stan/PyMC/NumPyro; why you do not hand-tune trajectory length.
  <https://jmlr.org/papers/v15/hoffman14a.html>
- **Betancourt — "A Conceptual Introduction to Hamiltonian Monte Carlo"
  (2017).** Intuition for HMC, divergences, the energy/E-BFMI diagnostic, and
  why funnel geometry breaks the sampler. <https://arxiv.org/abs/1701.02434>

## Priors and reparameterization

- **Stan Development Team — "Prior Choice Recommendations" (Stan wiki).** Why
  flat priors are not "uninformative", weakly-informative defaults, and
  scale/correlation (LKJ) prior guidance.
  <https://github.com/stan-dev/stan/wiki/Prior-Choice-Recommendations>
- **Carvalho, Polson & Scott — "Handling Sparsity via the Horseshoe" (AISTATS /
  PMLR vol. 5, 2009; the journal version is *Biometrika* 2010).** The horseshoe
  shrinkage prior for sparse regression: heavy tails preserve signal, the spike
  at zero kills noise. <https://proceedings.mlr.press/v5/carvalho09a.html>
- **Piironen & Vehtari — "Sparsity information and regularization in the
  horseshoe and other shrinkage priors" (Electron. J. Stat., 2017).** The
  regularized ("Finnish") horseshoe with bounded tails and principled choice of
  the global scale. <https://arxiv.org/abs/1707.01694>

## Model comparison and inference validation

- **Vehtari, Gelman & Gabry — "Practical Bayesian model evaluation using
  leave-one-out cross-validation and WAIC" (Statistics and Computing, 2017).**
  PSIS-LOO-CV, the Pareto-k diagnostic, and why LOO is preferred over WAIC;
  basis for `az.compare(..., ic="loo")`. <https://arxiv.org/abs/1507.04544>
- **Talts, Betancourt, Simpson, Vehtari & Gelman — "Validating Bayesian
  Inference Algorithms with Simulation-Based Calibration" (2018).** SBC: the
  formal simulate-then-fit recovery check for verifying the *correctness* of a
  Bayesian computation. <https://arxiv.org/abs/1804.06788>

## Textbooks (background, well-known practice)

- **Gelman, Carlin, Stern, Dunson, Vehtari & Rubin — *Bayesian Data Analysis*,
  3rd ed.** The standard reference for the whole pipeline above.
  <http://www.stat.columbia.edu/~gelman/book/>
- **McElreath — *Statistical Rethinking*, 2nd ed.** Best pedagogical
  introduction to generative modeling, priors, and the workflow mindset.
  <https://xcelab.net/rm/>

## Tooling

- **ArviZ — exploratory analysis of Bayesian models.** `summary`, `plot_ppc`,
  `plot_rank`, `plot_energy`, `plot_pair`, `loo`, `compare`.
  <https://python.arviz.org/>
- **PyMC** (probabilistic programming). <https://www.pymc.io/>
- **NumPyro** (JAX-backed NUTS/SVI). <https://num.pyro.ai/>
