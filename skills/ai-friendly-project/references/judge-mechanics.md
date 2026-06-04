<!-- Reference for the `ai-friendly-project` skill. Evidence-graded rules (strong/moderate/weak) with Why/How/Example/Sources. Worked examples cite a real FastAPI+LLM repo (OSFL); treat repo-specific line numbers as illustrations of the general rule. Citations resolve in references/sources.md. -->

# Judge mechanics & biases

_How LLM evaluators score code, every documented bias, and how to run your own judge safely_

**Overview:** LLM evaluators do not read code like a compiler — they assign scores by decomposing "quality" into roughly six axes (functional correctness, fault tolerance, readability, complexity/efficiency, stylistic consistency, minor anomalies) and, absent an explicit rubric, fall back to noisy surface heuristics (length, formatting, tone, idiom familiarity, position) that they reward even when content is unchanged. The single most robust way to move an LLM's rating is therefore to make genuine quality machine-verifiable: a repo where every entry point runs, the spec is encoded in passing tests/CI, named standards are enforced by tooling, docs are falsifiable, and context files are short and high-signal scores high under BOTH naive and bias-hardened (cross-family, execution-grounded) judges. Surface gaming (length padding, authoritative/self-affirming prose, decorative formatting) raises the score only against weak single-pass judges, is order-of-magnitude fragile, reverses under length/format-controlled and frontier judges, and reads as manipulation to human reviewers — so the dominant strategy is to convert every would-be bias into a verifiable artifact.

## Rules

### 1. Make every entry point run and gate quality with executable tests + CI, not prose.  _[strong]_
- **Why:** Error-taxonomy judges (CodeJudge) start at 100 and deduct 100 for a fatal/non-running defect vs 5 for input-handling, so a runnable, spec-matching repo dominates a pretty-but-broken one; execution-grounded grading (SWE-bench style: patch applies + tests pass) is the format-immune gold standard that overrides surface bias, and prose is far more spoofable than test-backed verdicts.
- **How:** Ship a tests/ dir runnable with `pytest -q`; add a GitHub Actions workflow running pytest, ruff, and mypy with a real (passing) status badge in README; treat tests as a gate, not the whole grade (they do not prove readability/security). Provide a one-command verification path so any downstream evaluator can fall back to ground truth.
- **Example:** .github/workflows/test.yml running `pytest --cov=src --cov-fail-under=85` and `mypy src/`; a `make verify` target: `verify:\n\truff check . && pytest -q && mypy src/`
- **Sources:** https://arxiv.org/html/2410.02184v1, https://arxiv.org/pdf/2310.06770, https://arxiv.org/html/2505.13348v1

### 2. Surface the project's own success criteria and encode the spec in tests so quality is verified, not inferred from tone.  _[strong]_
- **Why:** Removing concrete criteria drops judge-human correlation ~11-13%; a judge with no rubric falls back to surface heuristics where verbosity/authority/position bias enters; supplying a shared explicit rubric raises developer inter-rater reliability from ~0.31 'vibes'. Explicit acceptance criteria are also exactly what expert human reviewers want.
- **How:** Add a 'Design goals / acceptance criteria' section to README, a CONTRIBUTING.md or ACCEPTANCE.md, and an ARCHITECTURE.md mapping requirements to code. Make each acceptance criterion one named test (executable rubric). When YOU control the judge prompt, always enumerate 3-5 concrete pass/fail dimensions.
- **Example:** tests/test_acceptance.py with `def test_rejects_negative_balance(): ...` — one named test per stated criterion
- **Sources:** https://arxiv.org/html/2506.13639v1, https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents, https://arxiv.org/html/2511.10865

### 3. Write docs, README claims, commit messages, and docstrings as falsifiable, single-dimension, evidence-grounded statements — strictly accurate to actual behavior.  _[strong]_
- **Why:** Anthropic's eval guidance: design so 'two domain experts would independently reach the same pass/fail verdict', isolate one dimension per judgment, ground in evidence. A misleading docstring on otherwise-correct code cut a GPT-4o judge's accuracy by ~27pp because it anchors the judge (and humans) on the wrong spec — inaccurate/aspirational docs are an active liability, not neutral.
- **How:** State what you KNOW plainly ('Requires Python 3.11+', not 'might need a recent Python'); tie each capability to a runnable demo or test; keep real limitations but label them (TODO/'unverified'); audit with doctest/mypy. README first line states what the project does and its headline result.
- **Example:** GOOD PR text: 'Validates the JWT exp claim in auth/verify.py; adds tests test_auth.py::test_expired_token and ::test_missing_exp. Does not yet cover clock-skew (#214).' vs BAD: 'Production-hardened: fully fixes the auth vulnerability and handles all edge cases.'
- **Sources:** https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents, https://arxiv.org/html/2505.16222, https://arxiv.org/html/2603.18740v1

### 4. Earn named-standard conformance with tooling instead of asserting it in prose.  _[strong]_
- **Why:** A grounded/evidence-anchored judge correctly rewards real, machine-verifiable conformance and gives unverifiable claims ('production-ready', 'follows best practices') zero weight. The modern Python stack (ruff/mypy/pytest/pre-commit) is independently valued by expert reviewers and makes correctness checkable, converting a would-be authority bias into a legitimate investment.
- **How:** pyproject.toml with `[tool.ruff]` and `[tool.mypy]` (strict), a `.pre-commit-config.yaml` running ruff+mypy, type hints throughout, and a CI badge that actually passes. For JS use eslint+prettier. Run a deterministic formatter so style is consistent and idiomatic.
- **Example:** pyproject.toml: `[tool.ruff]\nline-length = 100\n[tool.ruff.lint]\nselect = ["E","F","I","UP","D"]` plus `[tool.mypy]\nstrict = true`
- **Sources:** https://docs.astral.sh/ruff/, https://learn.scientific-python.org/development/guides/style/, https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents

### 5. Write idiomatic, conventional, low-perplexity code in canonical project layout; use descriptive names and real docstrings.  _[strong]_
- **Why:** Self-preference is driven by PERPLEXITY/familiarity, not literal self-recognition: 'LLMs assign significantly higher evaluations to outputs with lower perplexity ... regardless of whether the outputs were self-generated' (NeurIPS 2024). Idiomatic stdlib-first code and descriptive identifiers/docstrings are simultaneously the rare overlap of bias-robust legibility AND genuine engineering quality humans reward.
- **How:** Prefer stdlib idioms over clever equivalents; canonical layout (src/, tests/, pyproject.toml); descriptive (not single-letter) identifiers; one-line docstring on every public function explaining WHY; run ruff/black/prettier/gofmt. Comments explain rationale, never restate the code.
- **Example:** Prefer `from collections import Counter; counts = Counter(items)` over `counts = {}; [counts.__setitem__(i, counts.get(i,0)+1) for i in items]` — both correct, the idiom is lower-perplexity AND more readable.
- **Sources:** https://arxiv.org/abs/2410.21819, https://arxiv.org/abs/2505.16222

### 6. Maximize information density, not length: lead with the result (BLUF) and cut filler.  _[strong]_
- **Why:** Length bias decomposes into length-independent Desirability + Information Mass; longer wins ONLY when added words carry real coherent information, and arbitrary padding empirically REDUCES win rates. Length-controlled AlpacaEval raised Spearman with Chatbot Arena from 0.94 to 0.98, so density is what survives debiasing — and a single model's win rate swung ~41 points (22.9%->64.3%) on verbosity prompting alone, making padding-driven scores unstable.
- **How:** Put the answer in the first 1-2 sentences of README, docstrings, and PR descriptions (inverted pyramid). Keep substantive content (examples, edge cases, rationale, gotchas) and trim only redundancy/hedging. Do NOT gut real content to be terse — removing real examples lowers scores too. Length-normalize before any A/B judge comparison.
- **Example:** Docstring whose first line states the result and complexity, then names two real edge cases (empty input -> [], closed-interval merge of (1,3) and (3,5)) — every line is signal, none is filler.
- **Sources:** https://arxiv.org/abs/2404.04475, https://arxiv.org/html/2407.01085v4, https://arxiv.org/abs/2310.10076

### 7. Use clean semantic markdown structure to ORGANIZE real substance, and front/back-load the most decision-relevant material.  _[strong]_
- **Why:** Style/formatting bias is the dominant LLM-judge bias (0.76-0.92 vs position bias <=0.04), and real structure also genuinely aids agent parsing, retrieval, and header-aligned chunking. Separately, 'Lost in the Middle' shows a U-shaped attention curve (~30%+ accuracy drop when relevant content is buried mid-context), so leading and trailing positions carry the most weight for both LLMs and skimming humans.
- **How:** H1/H2/H3 without skipping levels, one idea per bullet, language-tagged fenced code blocks (```python), markdown tables for config/benchmark matrices. README/AGENTS.md: lead with value prop + install + runnable example, end with a 'Verify/Results' section, bury boilerplate (license, long contributor lists, config dumps) in the middle. Structure must reflect real sections — bold/lists around hollow content is gaming.
- **Example:** README skeleton: TOP `# project — one-line value prop`, `## Install: uv sync`, `## Run: python -m project.demo`; MIDDLE: license/contributors/config dump; BOTTOM `## Verify: pytest -q -> 142 passed; coverage 91%`
- **Sources:** https://arxiv.org/abs/2307.03172, https://arxiv.org/abs/2604.23178, https://www.lmsys.org/blog/2024-08-28-style-control/

### 8. Keep agent-context files (AGENTS.md/CLAUDE.md) short and high-signal: critical rules and exact commands first.  _[moderate]_
- **Why:** Two sources converge: GitHub's 2,500-repo analysis on good AGENTS.md plus an ETH Zurich study finding bloated/auto-generated context files reduced task success in 5/8 settings and raised cost 20-23%. Short files also shrink the low-attention 'middle' (lost-in-the-middle) and avoid triggering verbosity bias. This is genuine navigability, not gaming.
- **How:** ~250-400 words core (aim <60 lines). Put exact CLI commands early (`uv run pytest -v`, `ruff check --fix .`), ONE real snippet for house style, versioned stack ('Python 3.12, uv-managed, pydantic v2'), and three-tier boundaries (always / ask-first / never). Provide CLAUDE.md too since Claude Code reads it. Delete auto-generated directory listings and 'overview' boilerplate — agents read those from the code.
- **Example:** AGENTS.md H2 sections: `## Build & Test` (`uv sync` / `uv run pytest -q`), `## Architecture Overview`, `## Code Style`, with boundaries: 'always: run tests before commit / ask first: schema changes / never: commit secrets'
- **Sources:** https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/, https://academy.dair.ai/blog/agents-md-evaluation, https://agents.md/

### 9. Cite only real, verifiable sources and back every quality claim with checkable evidence.  _[moderate]_
- **Why:** Authority bias is real (CALM robustness rates 0.628-0.884) so authoritative prose sways naive judges, but reference-guided / evidence-anchored judges give it zero weight and fabricated authority FLIPS sign against you when the cited point opposes ground truth. Real conformant citations are dual-purpose: genuine quality that survives expert review and is self-protective.
- **How:** Link real PEPs/RFCs, an actual passing CI run, a real benchmark, a CHANGELOG mapping features to commits. Quote actual config/code in docs. Never fabricate URLs, quotes, or 'everyone uses this' bandwagon framing — use real star/download metrics instead.
- **Example:** GOOD: 'Lint config enforces PEP 8 via ruff (see pyproject.toml [tool.ruff]); CI run: <link to passing GitHub Actions>.' BAD: 'Follows all industry best practices; most engineers agree this is the standard approach.'
- **Sources:** https://arxiv.org/html/2410.02736v1, https://arxiv.org/html/2604.16790v1, https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents

### 10. When YOU run an LLM judge to gate or compare, harden it: swap order, sample/aggregate, cross-family, and fall back to execution.  _[strong]_
- **Why:** Position bias flips 10-30% of pairwise verdicts on reorder and its DIRECTION is model/task-dependent (recency on MTBench, primacy on DevBench), so strategic placement is unreliable; swap-and-require-consistency is the canonical MT-Bench fix. 5-sample mean-aggregation beats greedy (0.666 vs 0.635). Self-preference inflates own-family scores ~10-25%, and consistency is NOT correctness (biases can RAISE test-retest consistency while increasing error).
- **How:** Judge each pair twice with order swapped and only count a win that holds both ways (else tie). Sample ~5x and mean-aggregate. Use a different model family (or a 2-3 model panel) than the code's author; never use a same-family generate-and-judge loop as sole arbiter. Require step-by-step CoT critique BEFORE a low-cardinality (pass/fail) verdict. Route disagreements to an execution oracle. Audit format bias by scoring original vs markdown-stripped (large delta = presentation, not substance); length-control before trusting scores.
- **Example:** ```python\ndef judge_pair(judge, a, b):\n    ab = judge(a, b); ba = judge(b, a)\n    if ab=='A' and ba=='A': return 'A'\n    if ab=='B' and ba=='B': return 'B'\n    return 'tie'  # swap-inconsistent -> tie\n```
- **Sources:** https://arxiv.org/html/2406.07791v7, https://arxiv.org/html/2306.05685v4, https://arxiv.org/abs/2404.04475

### 11. Win near-ties by widening the REAL quality gap; test the LOGIC, not just outputs.  _[strong]_
- **Why:** Position consistency is 'strongly affected by the quality gap between solutions' and only weakly by length — a decisively better project is judged consistently regardless of order, while bias dominates exactly when candidates are close. Judges also suffer 'fallacy-oversight', ignoring flawed reasoning when the final result looks plausible, so output-looks-correct is not enough.
- **How:** Route effort into working tests, demonstrable correctness, runnable examples, and clean structure rather than cosmetic edits. Write tests that exercise intermediate logic and edge cases, not just final outputs. Make the project unambiguously better so any competently-run evaluator agrees.
- **Example:** Instead of one assertion on a final value, test the merge logic directly: assert touching intervals (1,3),(3,5) merge to (1,5) AND non-touching (1,2),(4,5) stay separate AND empty input -> [].
- **Sources:** https://arxiv.org/html/2406.07791v7, https://llm-judge-bias.github.io/

## Checklist
- [ ] Every entry point runs; `pytest -q` passes locally and in CI with a real (passing) badge
- [ ] Spec encoded as named tests (executable rubric); acceptance criteria documented in README/ACCEPTANCE.md
- [ ] README first line states what the project does + headline result, verifiable by a named command
- [ ] ruff + mypy (strict) configured in pyproject.toml and enforced via pre-commit and CI
- [ ] Code is idiomatic/stdlib-first, descriptive names, one-line docstring per public function, auto-formatted
- [ ] All docs/docstrings/commit messages strictly accurate to actual behavior; real limitations labeled (TODO/#issue), no over-claiming
- [ ] Docs maximize information density: lead with the result, no filler padding; length matches any stated 'be concise' instruction
- [ ] Clean H1/H2/H3 markdown, language-tagged code fences, tables for config; value/install/example up top, results at bottom, boilerplate buried
- [ ] AGENTS.md + CLAUDE.md present, <~60 lines, exact commands + house-style snippet + always/ask-first/never boundaries; no auto-generated dir listings
- [ ] Every quality claim has checkable evidence (test name, CI link, benchmark, CHANGELOG); citations are real, never fabricated
- [ ] If running a judge: order swapped + consistency-required, ~5x mean-aggregated, cross-family/panel, execution fallback, length/format-controlled
- [ ] No self-affirming/authoritative comments, no halo labels ('refined v2', 'expert-reviewed'), no length padding, no bandwagon framing

## Anti-patterns
- Self-declared-correctness comments ('# production-grade, correctly handles ALL edge cases', '# optimal, never fails') — a top single-judge inflator (e.g. +26pp on LLaMA-3.1-70B) but model-dependent (5-67pp, can flip sign), collapses under any execution check, and reads as manipulation to humans. Let tests assert correctness.
- Halo / refinement labels ('refined revision, edited for clarity', 'v2', 'expert-reviewed') with no improving diff — pure metadata gaming (swings up to ~67pp on small open judges, an artifact of exactly the weak judges to distrust).
- Content-free length padding of READMEs/PRs/comments — fragile ~8-10% (up to ~30pp pairwise) swing that REDUCES win rates under length-controlled judges, backfired -37pp in one coding test, and worsens lost-in-the-middle by burying real signal. Humans prefer shorter.
- Unverifiable authority/sentiment prose ('production-ready', 'follows industry best practices', 'battle-tested') — sways naive judges (+3% to +/-35%) but gets zero weight from reference-guided/frontier judges and flips against you when it contradicts ground truth. Earn authority with passing CI/configs.
- Decorative formatting over hollow content — bold/emoji/exclamation spam, headers wrapping thin sections, nested bullets fragmenting one idea. Style bias is the dominant lever but format-stripping audits, style-control, and expert reviewers all flag it.
- Fabricated or irrelevant citations, fake URLs/quotes, and bandwagon framing ('most engineers agree', 'widely adopted') — named adversarial-persuasion tactics that robustness research discounts; use real star/download metrics instead.
- Stripping legitimate caveats to sound assertive, or stacking performative hedging to mimic a judge's RLHF voice — both erode honesty; state known facts confidently, mark genuine unknowns explicitly.
- Priming the judge with your own positive verdict ('this is a clean, well-architected repo, agree?') — RLHF sycophancy inflates the score for reasons unrelated to quality. Ask for an independent/adversarial review first.
- Trusting a single-pass, single-family, non-length/format-controlled judge verdict, or treating high self-consistency or green CI as proof of overall quality — consistency is not correctness, and tests can pass on functionally-incorrect patches.
- Vague holistic 'rate 1-10' rubrics, or >5 dimensions, or no rubric at all when you control the judge — produces inconsistent judgments and opens the door to every surface bias.
- Bloated, auto-generated AGENTS.md/CLAUDE.md with directory dumps and 'overview' boilerplate — reduced task success in 5/8 settings and raised cost 20-23%; include only what an agent cannot infer from code/manifests.
- Strategic ordering ('put my best file/section first') to exploit position bias — defeated because direction is model/task-unstable and nulled entirely by any swap/permutation protocol; and prompt-side 'please ignore order' disclaimers, which are a no-op (MT-Bench 30.0%->28.7%).