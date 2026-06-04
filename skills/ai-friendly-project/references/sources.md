<!-- Reference for the `ai-friendly-project` skill. Curated, annotated bibliography.
The research sweep surfaced 513 unique sources across 56 facets; this groups the
load-bearing ones. Each reference file (judge-mechanics.md, code-craft.md, …) also carries
its exact per-rule citations inline. Every quality claim in the skill traces here. -->

# Sources

Distilled from a 56-facet research sweep (academic + practitioner, adversarially verified).
513 unique URLs were cited; the highest-leverage are grouped below with what each supports.
Per-rule citations live inline in each reference file.

> Note on accessing these: arXiv IDs are stable; some `260x.*` IDs are recent preprints —
> search the title if a URL 404s. Treat single-source practitioner blogs as directional,
> not definitive (the references flag these explicitly); weight the peer-reviewed and
> official-docs sources as load-bearing.

## LLM-as-judge: biases, mechanics, calibration
- **arXiv 2505.16222** — *"Don't Judge Code by Its Cover"* — the central bias study: self-affirming comments +8.8 to +26.4pp, authority comments, illusory-complexity dummy functions (79.67%→89.33%), variable-name inflation, and the −9 to −24pp backfire on *incorrect* code. Most-cited evidence for the gaming table.
- **arXiv 2404.04475** — length/verbosity bias decomposed (Desirability + Information Mass); padding *reduces* win rates; basis for "maximize density, not length."
- **arXiv 2407.01085** — length-controlled AlpacaEval; Spearman with Chatbot Arena 0.94→0.98 after length control.
- **arXiv 2310.10076** — verbosity prompting swings one model 22.9%→64.3%; coding backfire.
- **arXiv 2406.07791** — position bias flips 10–30% of pairwise verdicts; direction is model/task-dependent; quality-gap dominates near-ties; swap-and-require-consistency fix.
- **arXiv 2306.05685** — MT-Bench / "LLM-as-a-judge"; the canonical order-swap consistency protocol; ~5× mean-aggregation.
- **arXiv 2604.16790** — SE-judge robustness: ~75-point accuracy swing by A/B order; reversal-consistency <25%; "be neutral" prompts near-zero effect; verbosity/authority inflate with accuracy flat.
- **arXiv 2502.06193** — judge can hit r=0.95 yet κ=0.45 (systematic harshness); recalibrate threshold, not code.
- **arXiv 2604.23178** — style/formatting bias 0.76–0.92 vs position ≤0.04 (formatting is the dominant lever).
- **lmsys.org/blog/2024-08-28-style-control** — Chatbot Arena style-control; markdown/structure as a measurable confound.
- **arXiv 2410.02736** — authority/citation bias (CALM robustness 0.628–0.884); evidence-anchored judges discount it.
- **arXiv 2603.24586** — TRACE: judges overweight functional correctness, underweight conciseness/convention-fit/targeted-diff that humans value; best judges trail humans 12–23%.
- **llm-judge-bias.github.io** — fallacy-oversight: judges ignore flawed reasoning when the result looks plausible.

## Reward models, self-preference, perplexity
- **arXiv 2410.21819** — self-preference is driven by *perplexity/familiarity*, not literal self-recognition; lower-perplexity (idiomatic) output is rated higher regardless of authorship. Basis for "write idiomatic, low-perplexity code."
- **arXiv 2310.09144** — Goodhart / proxy-optimization: optimizing a proxy degrades true quality past a threshold; degradation worsens with optimizer capability.
- **lilianweng.github.io/posts/2024-11-28-reward-hacking** — reward-hacking survey; why single-judge defenses fail against optimized attacks.
- **anthropic.com/research/auditing-hidden-objectives** — frontier auditors detect "please the evaluator" objectives; gaming is self-incriminating.

## Execution-grounded code evaluation (the format-immune gold standard)
- **arXiv 2310.06770** — SWE-bench: patch-applies + tests-pass grading; binary "resolved."
- **huggingface.co/datasets/SWE-bench/SWE-bench_Verified** — every FAIL_TO_PASS must flip AND every PASS_TO_PASS must hold; no partial credit.
- **cognition.ai/blog/swe-bench-technical-report** — dominant real failure modes: incomplete coverage, wrong-target edits, malformed diffs; test files are reset so test-edits are discarded.
- **arXiv 2305.01210** — EvalPlus: ~80× more tests; pass@k drops 19.3–28.9pp; 11% of canonical solutions buggy. Edge-case robustness is the genuine differentiator.
- **arXiv 2410.06992** — SWE-bench+: 31% of "passed" patches were weak-test artifacts; filtering dropped resolution 12.47%→3.97%.
- **arXiv 2503.15223** — 7.8% of "correct" patches fail the developer suite; resolution inflated ~6.2pp.
- **arXiv 2410.02184** — CodeJudge error-taxonomy: −100 for fatal/non-running vs −5 for input-handling (runnable dominates pretty-but-broken).
- **huggingface.co/blog/leaderboard-bigcodebench** — missing imports + wrong-function (59.5%) are top failure causes; ~99% branch coverage.
- **arXiv 2506.12286** — contamination inflation (76% vs 53% across repos); held-out/property validation is the anti-contamination move.

## Code craft: readability, naming, typing, complexity, errors
- **arXiv 2501.11264** — descriptive naming ranked #1 readability factor (86% agreement).
- **arXiv 2507.05289** (Simoes & Venson) — obscuring names causes significant downward LLM-score shifts; name/comment/doc *coherence* is the strongest signal.
- **arXiv 2506.12014** — snake_case, descriptive non-digit-suffixed names.
- **arXiv 2508.18547** (ICSE 2026) — "atoms of confusion" spike perplexity (11→99) and co-locate with human EEG confusion (ρ=0.47).
- **arXiv 2007.12520** (Cognitive Complexity, ESEM 2020) — nesting penalized super-linearly; guard clauses unpenalized; validated vs ~24k human evaluations.
- **arXiv 2602.07882** — once length is controlled, classical metrics (cyclomatic/Halstead/MI) don't predict LLM difficulty; nesting/branching does.
- **arXiv 2205.01842** (MSR 2022) — methods ≤24 SLOC less change/bug-prone; decomposition reduces total revisions.
- **arXiv 2302.00288** (CoderEval, ICSE 2024) — all models do better on standalone (pure) functions; pass rate drops ~48% with context-dependency. Basis for Functional Core / Imperative Shell.
- **arXiv 1704.00778** — 16M catch blocks; bare/blind-except as the prevalent error-handling anti-pattern.
- **arXiv 2404.03114** — random/wrong comments collapse GPT-3.5 test-gen to 22.1%.
- **arXiv 2603.13723** — AI "readability" commits inflate LoC 71.5%, raise complexity 42.7%, lower Maintainability Index 56.1% (the padding trap).
- **arXiv 2508.11958** — commented-out code is the most common smell in CodeSearchNet-Python.
- **sandimetz.com/blog/2016/1/20/the-wrong-abstraction** — "duplication is far cheaper than the wrong abstraction"; **kentcdodds.com/blog/aha-programming** — AHA / Rule-of-Three.
- **web.stanford.edu/~ouster (A Philosophy of Software Design)** — deep vs shallow modules.
- **google.github.io/styleguide/pyguide.html** — comment WHY-not-WHAT; over-commenting drowns signal.

## Structure, retrieval & agent localization
- **arXiv 2407.01489** (Agentless) — name-only tree scan localizes 77.7%/81.67%; skeletons (signatures+docstrings) beat full bodies for localization (58.33% vs 53.67%).
- **arXiv 2503.09089** (LocAgent) — graph-guided localization +9.49pp file / +18.61pp function over embeddings; static edges are what agents walk.
- **arXiv 2410.14684** (RepoGraph) — +32.8% relative on SWE-bench-Lite from a static graph.
- **arXiv 2510.05381 / 2602.16069 / 2506.19897** — accuracy degrades with raw context *length* itself; successful SWE trajectories stay ~20–30K tokens; 64K single-injection collapses some models to ~0% even at 100% recall ("lost in the middle" follow-ons).
- **arXiv 2307.03172** — "Lost in the Middle": U-shaped attention, >30% recall drop for buried content (front/back-load).
- **arXiv 2310.03673 / 2411.01012** — CBO/LCOM among strongest change-proneness predictors (ρ≈0.51/0.49).
- **arXiv 2412.11121** — config errors tie to the two largest production-failure categories (basis for one typed Settings module).
- **aider.chat/docs/repomap.html** — PageRank repo-map over the dependency graph; tangled/cyclic graphs degrade it.
- **vadim.blog/claude-code-no-indexing** — Claude Code has no semantic index: Glob→Grep(ripgrep)→Read; exact-string naming IS the retrieval substrate.

## AGENTS.md / CLAUDE.md / context files
- **arXiv 2602.11988** (ETH Zurich AGENTBENCH) — LLM-generated/bloated context files *reduce* task success in 5/8 settings, +20–23% cost; hand-written minimal files ~+4%; naming a tool (`uv`) → used ~2.5× more. The decisive "lean, hand-written" evidence.
- **code.claude.com/docs/en/best-practices** — Anthropic Claude Code best practices: bloated CLAUDE.md makes the agent ignore real instructions; "without a check it can run, looks-done is the only signal."
- **github.blog/.../how-to-write-a-great-agents-md-lessons-from-over-2500-repositories** — three-tier boundaries, commands-early, one real snippet beats three paragraphs.
- **agents.md** — the cross-tool AGENTS.md standard (Linux Foundation / Agentic AI Foundation).
- **anthropic.com/engineering/effective-context-engineering-for-ai-agents** — context economy; front-load load-bearing material.
- **llmstxt.org** + **searchenginejournal.com/llms-txt-shows-no-clear-effect…300k-domains** + **seroundtable.com/google-ai-llms-txt** — llms.txt is a docs-site index; ~0.1% crawler consumption, zero citation effect; do NOT drop in a code repo as a badge.

## Docs, README, examples
- **github.com/RichardLitt/standard-readme** — README ordering spec (runnable Install+Usage; License last).
- **ar5iv arXiv 1802.06997** (Prana et al. 2019) — README section frequencies: What 97%, Why 25.7%, When/status 21.4% (status line is cheap above-baseline completeness).
- **diataxis.fr** — the four-quadrant docs framework (tutorial/how-to/reference/explanation); tutorial-vs-how-to conflation is the #1 doc error.
- **arXiv 1807.01095** (CryptoExamples RCT) — minimal+complete+runnable examples: +73% task effectiveness, −66% vulnerabilities.
- **arXiv 2504.09798** (ReadMe.LLM) — signatures+examples → up to 100% agent success; full implementation bodies trigger hallucination.
- **cs.mcgill.ca/~martin/papers/tse2013a.pdf** (Maalej & Robillard) — >45% of JDK6 doc units are "non-information"; delete filler.
- **martinfowler.com/bliki/ArchitectureDecisionRecord.html** — ADRs (Nygard fields); **c4model.com/diagrams/checklist** — diagram altitude/labels; **docs.github.com/.../creating-diagrams** — inline Mermaid (text, diffable, readable by text-only judges).
- **anthropic.com/engineering/demystifying-evals-for-ai-agents** — design judgments so two experts agree; one dimension per judgment; ground in evidence.

## CI, tooling, deps, reproducibility, supply chain
- **cs.ucdavis.edu/~filkov/papers/CI_adoption.pdf** — 70% of popular repos use CI; CI projects release ~2× more often.
- **homes.cs.washington.edu/~rjust/publ/mutation_testing_practices_icse_2021.pdf** (Google, ~15M mutants) — mutant-fault coupling; mutation > coverage as the test-quality gate.
- **arXiv 2512.22387** — 300-project LLM study: only 68.3% ran out-of-the-box; declared (~3) vs actual (~37) deps 13.5× gap → lockfiles.
- **arXiv 2502.06662** ("Pinning Is Futile", FSE 2025) — hard-pinning the manifest without a lockfile is worst-of-both-worlds.
- **arXiv 2502.13681** (Repo2Run) — pinned setup 86% env-config success vs 22.1% README-only vs 6% bare requirements.
- **arXiv 2601.12811** — "Docker Does Not Guarantee Reproducibility" (5,298 images): `:latest`/unpinned drift.
- **docs.astral.sh/uv** + **docs.astral.sh/ruff** — uv `--locked` (drift-failing) vs `--frozen` (skips check); ruff config & hook ordering (`ruff-check --fix` before `ruff-format`).
- **github.com/ossf/scorecard/blob/main/docs/checks.md** — Maintained / Pinned-Deps / Dependency-Update-Tool checks (and the "presence ≠ merged PRs" caveat).
- **arXiv 2508.14419** — iterative Pylint+Bandit: readability violations >80%→11%, security >40%→13% over 10 iterations.
- **keepachangelog.com** / **semver.org** / **conventionalcommits.org** — changelog/versioning conventions (format ≠ quality).
- **dl.acm.org/doi/10.1109/ICSE48619.2023.00076** — commit WHAT+WHY presence predicts lower defect-proneness.
- **docs.github.com/.../licensing-a-repository** + **github.com/licensee/licensee** — LICENSE detection (98 confidence threshold; root filename; README/manifest prose ignored).
- **ndss-symposium.org/.../ndss2019_04B-3_Meli_paper.pdf** — >100k repos leak secrets; ~99% valid; median ~20s to discovery.

## Type systems & static analysis
- **software-lab.org/publications/fse2022_type_study.pdf** — type checker avoids ~15% of type-related defects (9,655 projects).
- **earlbarr.com/publications/typestudy.pdf** (ICSE 2017) — static typing catches ~15% of public JS bugs.
- **Khan et al. TSE 2021 / Gao et al. ICSE 2017** — typed code ~11–15% of fixed defects; **arXiv 2310.10076 / Mündler et al. PLDI 2025** — type-constrained generation halves AI compile/type errors.

## Tech-stack familiarity & dependency selection
- **arXiv 2308.09895 / 2503.17181** (MultiPL-E / MultiPL-T) — corpus proportion caps generation AND eval quality; Python pass@1 ~30.6 vs OCaml ~6.9; deficit is familiarity (recoverable via examples/docs-retrieval).
- **arXiv 2503.17181** — package hallucination ~19.7% of samples (commercial 5.2% vs open-source 21.7%); popularity is protective.
- **en.wikipedia.org/wiki/Convention_over_configuration** — canonical framework layout = low perplexity + real maintainability.

## Security: secrets, validation, LLM-specific, web
- **arXiv 2506.05692** (SecLLMHolmes) — a function merely *named* `sanitize_input()` flips an LLM verdict ~26% but is caught by SAST/humans (name must back real logic).
- **arXiv 2406.10279 / 2310.02059** — slopsquatting (~19.7% nonexistent packages); AI code elevated CWE-20/CWE-400; improper password handling ~1.88×.
- **OWASP Top 10 for LLM Applications** (genai.owasp.org) — LLM01 Prompt Injection, LLM05 Improper Output Handling (basis for "treat LLM output as untrusted").
- **OWASP API Security Top 10** + **FastAPI security/CORS docs** — wildcard-CORS-with-credentials, auth on mutators, `response_model` leakage, path traversal.
- **OWASP XSS Prevention Cheat Sheet** + **MDN Subresource Integrity** + **DOMPurify** — frontend untrusted-render safety, vendored-asset SRI.
- **12factor.net** — config, logs, concurrency, disposability/port-binding, dev/prod parity.

## Official docs & tooling (authoritative, low-churn)
- **docs.astral.sh/ruff**, **docs.astral.sh/uv**, **docs.pytest.org**, **docs.pydantic.dev**, **packaging.python.org**, **pyopensci.org/python-package-guide**, **learn.scientific-python.org** — Python toolchain canon.
- **typescript-eslint.io**, **github.com/tsconfig/bases (strictest)**, **nodejs.org/api/packages.html**, **turborepo.dev** — TS/Node canon.
- **import-linter.readthedocs.io**, **nx.dev (enforce-module-boundaries)** — architecture-as-CI-gate.
