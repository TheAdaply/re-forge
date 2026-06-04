<!-- Reference for the `ai-friendly-project` skill. Evidence-graded rules (strong/moderate/weak) with Why/How/Example/Sources. Worked examples cite a real FastAPI+LLM repo (OSFL); treat repo-specific line numbers as illustrations of the general rule. Citations resolve in references/sources.md. -->

# Code craft

_Functions, naming, typing, error handling, complexity, comments, abstraction_

**Overview:** Code craft is the most directly LLM-rated and the most gameable category in the guide, because an evaluator trained on human-review norms over-weights cheap surface signals (verbose names, dense comments, long functions, defensive-looking try/except, markdown-heavy presentation) that are trivial to fabricate without improving the code. The verified evidence shows the trap is real and measurable: AI "readability" commits inflated lines of code in 71.5% of cases, raised cyclomatic complexity in 42.7%, and LOWERED the Maintainability Index in 56.1% (arXiv 2603.13723), while documented judge biases swing scores by +8.8 to +26.4pp for self-affirming comments and 79.67%->89.33% for padding with dummy functions (arXiv 2505.16222). The winning strategy is therefore to optimize the genuine, machine-verifiable signals that humans and a debiased judge both reward — strict type checking, formatter+linter passing in CI, flat control flow, specific exception handling, dead-code removal — and to treat every surface lever (length, comment density, name length, structural padding) as a gaming red flag to refuse. Net: earn the rating through quality that survives ruff, mypy, pytest, and an expert human; never pad to look good.

## Rules

### 1. Ship a single opinionated formatter + linter wired into CI (ruff format + ruff check) before any other code-craft work, and never hand-format.  _[strong]_
- **Why:** LLM-generated code carries measurably higher style/convention-violation rates than human code (arXiv 2510.03029, 2407.00456), and inconsistent style is a universally recognized smell that both linters and a debiased judge flag. A formatter eliminates an entire class of violations mechanically rather than relying on an LLM to police style. This repo currently has NO formatter/linter config (pyproject.toml has only hatchling + pytest), so it is directly actionable.
- **How:** In pyproject.toml add [tool.ruff] line-length=88, target-version="py312"; [tool.ruff.format] quote-style="double"; and an idiom ruleset under [tool.ruff.lint] extend-select. Run `uv run ruff format` and `uv run ruff check --fix` locally, then `ruff format --check` and `ruff check` in CI. Add a .pre-commit-config.yaml chaining ruff-format -> ruff (lint) -> mypy -> pytest; content-modifying hooks MUST run ABOVE check-only hooks, and the mypy hook needs additional_dependencies (pydantic, types-*) because pre-commit runs each hook in an isolated env.
- **Example:** [tool.ruff]
line-length = 88
target-version = "py312"
[tool.ruff.lint]
extend-select = ["E","F","W","B","I","UP","PT","PTH","ARG","T20"]
[tool.ruff.format]
quote-style = "double"
- **Sources:** https://docs.astral.sh/ruff/formatter/, https://arxiv.org/pdf/2510.03029, https://arxiv.org/pdf/2407.00456, https://learn.scientific-python.org/development/guides/style/

### 2. Add explicit type annotations on public APIs and module boundaries and ENFORCE them with a strict checker in CI; verify strictness and enforcement, never mere presence.  _[strong]_
- **Why:** A static type checker confirms types so they cannot be faked by narration — the single strongest ungameable signal in this category. But the empirical benefit (~11-15% of fixed defects, Khan et al. TSE 2021; Gao et al. ICSE 2017) is contingent on the checker actually flagging code: mypy skips unannotated functions by default, and Any/Dict[str,Any]/bare # type: ignore/skipLibCheck silently disable it. Type-constrained generation also more than halves AI compilation/type errors (Mündler et al. PLDI 2025), so real coverage improves any agent on the repo. This repo ships Pydantic 2 models (good expressive typing) but has NO [tool.mypy]/[tool.pyright] section and no checker in dev deps — a textbook 'annotations present, nothing enforces them' gap.
- **How:** Add [tool.mypy] strict=true, enable_error_code=["ignore-without-code"], warn_unused_ignores=true; scope third-party gaps with [[tool.mypy.overrides]] module=... ignore_missing_imports=true; run `mypy .` in CI. Adopt incrementally on legacy code (disallow_untyped_defs + warn_return_any first, then flip strict). Prefer expressive types (Literal, enums, NewType, Pydantic models, discriminated unions) over ': str'/Any. For TS use "strict": true plus noUncheckedIndexedAccess and exactOptionalPropertyTypes; never mask with skipLibCheck. Score Any and bare-ignore density as NEGATIVE. Types are a partial floor — never a substitute for tests.
- **Example:** [tool.mypy]
strict = true
enable_error_code = ["ignore-without-code"]
warn_unused_ignores = true
[[tool.mypy.overrides]]
module = "numpy.*"
ignore_missing_imports = true
- **Sources:** https://docs.astral.sh/ruff/settings, https://arxiv.org/abs/2310.10076, https://www.pydevtools.com/blog/a-comparison-of-mypy-and-pyright/

### 3. Use long, intention-revealing identifiers and type-rich signatures so a reader infers contract without tracing the body — but never lengthen or randomize names to chase a score.  _[strong]_
- **Why:** Descriptive naming is decades-old SE consensus and ranked the #1 readability factor (86% agreement) in the verified arXiv 2501.11264 study (state as 'in that study,' not a universal law). Expert humans and a debiased judge reward it identically and the token cost of a verbose name is negligible. CAVEAT: a naive judge exhibits a variable-change bias that rewards longer/random names even from 2-char increases (arXiv 2505.16222) — that lever is pure gaming, genuineQuality=false; the genuine residue is MEANINGFUL, conventionally-sized names verified against actual call sites.
- **How:** Audit for single-letter/generic names (data, temp, result, x, float1) and replace with domain terms answering what+why (monthlyRevenue, sendInvoice()). Rename process(data) -> process_payment_and_update_ledger(data: OrderPayload) -> ProcessingResult so the signature alone carries the contract and mypy verifies it. Draw terms from a documented domain glossary and apply them verbatim (always `refund`, never return/reversal/credit for one concept). Enforce one casing per language and prefer grep-able explicit code over metaprogramming so a name search finds its definition.
- **Example:** # before: def process(data): ...
# after  (signature is the contract, checked by mypy):
def process_payment_and_update_ledger(data: OrderPayload) -> ProcessingResult: ...
- **Sources:** https://arxiv.org/html/2501.11264v3, https://tianpan.co/blog/2026-04-13-the-ai-legible-codebase, https://arxiv.org/html/2505.16222v1

### 4. Flatten control flow with early-return guard clauses; keep the happy path at indentation depth 1 and treat 3+ nesting levels as a refactor trigger.  _[strong]_
- **Why:** Deep nesting is the single biggest documented driver of both human un-understandability and LLM control-flow reasoning failure. Cognitive Complexity (SonarSource) penalizes nesting super-linearly while applying NO penalty to guard clauses, so flattening genuinely lowers comprehension cost — validated against ~24,000 human evaluations (arXiv 2007.12520, ESEM 2020). It is hard to game because flattening is a real structural change, not padding. Note: cyclomatic complexity is UNCHANGED by guard clauses, so track nesting/cognitive complexity, not McCabe alone.
- **How:** Invert `if valid: <big body>` into `if not valid: return; <big body>`. Replace if/elif ladders that branch on a discrete key with dict/lookup dispatch (`handlers={"create":...}; handlers[key]()`). After flattening, apply Extract Method to move each coherent branch body into a well-named single-responsibility helper. Do NOT enforce single-exit/single-return dogma, which reintroduces the nesting guard clauses remove.
- **Example:** def process(user):
    if user is None: return
    if not user.active: return
    if user.banned: return
    return do_work(user)   # happy path at indent depth 1
- **Sources:** https://www.sonarsource.com/blog/5-clean-code-tips-for-reducing-cognitive-complexity, https://arxiv.org/abs/2007.12520, https://arxiv.org/html/2602.07882v1

### 5. Adopt 'Functional Core, Imperative Shell': put decision/business logic in pure functions (same input -> same output, no I/O, no hidden state) and push I/O, DB, network, clock, and randomness to a thin outer shell; pass dependencies as explicit arguments.  _[strong]_
- **Why:** Pure, self-contained functions are testable with plain assertions and NO mocks, deterministic, and understandable from the signature alone — a real artifact a grader can verify by checking that core-logic tests import no mocking library, so it is very hard to fake. CoderEval (arXiv 2302.00288, ICSE 2024) verified ALL models including ChatGPT perform substantially better on standalone functions (pass rates drop ~48% as context-dependency rises). It is simultaneously a genuine quality win and an AI-legibility win.
- **How:** Name functions for their domain effect with precise types (calculate_sales_tax(amount: Decimal) -> Decimal, not handle/process/util). Keep the crux logic visibly together (prefer 'deep' modules — simple interface hiding real functionality — over a sea of shallow wrappers). Minimize reliance on distant class/file/global state; pass dependencies via the signature. CAVEAT: >70% of real functions are legitimately non-standalone, so self-containment is a lever to maximize, not an absolute.
- **Example:** # pure core — tests need no mocks:
def total_with_tax(items: list[Item], rate: Decimal) -> Decimal:
    return sum((i.price for i in items), Decimal(0)) * (1 + rate)
# shell does the DB read, then calls the core.
- **Sources:** https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell, https://arxiv.org/abs/2302.00288

### 6. Apply Single Responsibility and decompose only on a genuine second reason-to-change; treat ~24 effective SLOC and cyclomatic complexity >10 as REFACTOR TRIGGERS, never hard caps, and never over-extract to shave a number.  _[moderate]_
- **Why:** Across ~785K Java methods, those <=24 SLOC are less change-/bug-prone and decomposition REDUCES total revisions (Chowdhury et al. MSR 2022). But complexity numbers are trivially gamed: extracting trivial helpers trades a green McCabe score for navigation/indirection cost (Ousterhout's shallow-module problem; zakirullin's 80 shallow vs 7 deep classes). The defensible rule is the cause (SRP / abstraction-level mixing); the metric is a smell that flags candidates, not the objective. Blanket sub-20-line caps are REJECTED — the 'fits in one attention layer' rationale is fabricated.
- **How:** Enable a complexity gate as a flag, not a target: in pyproject.toml [tool.ruff.lint] select=["C901"] with [tool.ruff.lint.mccabe] max-complexity=10 (C901 is OFF by default). When a function trips it, split only where a real second responsibility or abstraction-level mix exists; for legitimately branch-heavy code (state machines, parsers) document a localized `# noqa: C901` with a reason rather than fragmenting. Never loosen the threshold just to silence the warning.
- **Example:** [tool.ruff.lint]
select = ["C901"]
[tool.ruff.lint.mccabe]
max-complexity = 10
- **Sources:** https://arxiv.org/abs/2205.01842, https://docs.astral.sh/ruff/rules/complex-structure/, https://web.stanford.edu/~ouster/cgi-bin/aposd.php

### 7. Follow Rule-of-Three / AHA: do not extract a shared abstraction until a third genuinely-identical call site exists AND you can name the single domain concept; duplication is cheaper than the wrong abstraction.  _[strong]_
- **Why:** This is the rare facet where the dominant LLM-judge bias (verbosity/complexity) points OPPOSITE to quality: wrapper classes, single-implementation interfaces, and indirection layers inflate a naive score while constituting the premature-abstraction anti-pattern that harms maintainability and burns a careful reader's context (arXiv 2505.16222). Metz's diagnostic and 'duplication is far cheaper than the wrong abstraction' are verified verbatim and universally endorsed by senior reviewers. The rule actively pushes against the bias, so it cannot be gaming.
- **How:** Reject a 'shared' helper whose body is mostly if/else on a 'type'/'mode' arg — inline it back into each caller, delete dead branches, then re-derive a cleaner abstraction or keep the duplication. Prefer Extract Method over Extract Superclass (extracting superclasses deepens inheritance and hurts navigability — arXiv 2502.04073). Allow deliberate duplication where two copies encode independent knowledge (v1/v2 API paths), but annotate WHY they are not DRY-ed so no one merges them into a wrong abstraction. Reject grab-bag utils.py/helpers.py/common.py modules that bundle unrelated behavior.
- **Example:** # wrong abstraction (reject): def render(item, mode):
#     if mode=='pdf': ... elif mode=='html': ... elif mode=='email': ...
# remedy: inline into render_pdf / render_html / render_email, delete dead branches.
- **Sources:** https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction, https://kentcdodds.com/blog/aha-programming, https://arxiv.org/abs/2505.16222

### 8. Write comments that explain WHY (intent, trade-off, gotcha, ticket link), not WHAT; default to self-documenting code and reserve docstrings for public/non-trivial/non-obvious functions.  _[strong]_
- **Why:** Restating code (i += 1 # increment i) is a negative review signal and over-commenting drowns the warnings that matter (Google Python Style Guide). A docstring-everywhere policy is verbosity padding. This project already models the threshold: osfl/engine/bayes.py gives trivial posterior_mean NO docstring while non-obvious beta_from_mean carries one; osfl/engine/funnel.py has a textbook WHY module docstring explaining why MC P(>=1) sits below the closed form (a fact that looks like a bug but isn't).
- **How:** Before writing a comment, try to delete it by renaming a variable or extracting a well-named helper; keep only rationale code cannot express. Keep docstrings tight: one-line imperative summary (PEP 257), then Args/Returns/Raises describing SEMANTICS the type annotation does not already convey (do not restate types). Optionally enforce one convention via Ruff: [tool.ruff.lint] select=["D"] with [tool.ruff.lint.pydocstyle] convention="google" (plus D401, D417). Use the ShortenDoc finding (25-40% of verbose docstrings is dead weight) only to cut filler, never to strip semantic content humans rely on.
- **Example:** # bad:  counts = rng.binomial(counts, p)   # binomial sample
# good: # off-by-one: upstream API is 1-indexed, so subtract 1 here
- **Sources:** https://google.github.io/styleguide/pyguide.html, https://peps.python.org/pep-0257/, https://docs.astral.sh/ruff/settings

### 9. Never write a comment or docstring you are not willing to keep accurate; update comments in the SAME commit as the code and delete stale ones rather than leaving them out of sync.  _[strong]_
- **Why:** A wrong comment is strictly worse than none because it actively misleads humans and LLMs — and it is the single most damaging negative signal measured: misleading comments dropped GPT-4o's accuracy on CORRECT code by 22.4pp (89.5%->67.1%, arXiv 2505.16222), and random/wrong comments collapsed GPT-3.5 test-gen success to 22.1% (arXiv 2404.03114). Comment drift correlates with bug introduction at scale (Wen et al. ICPC 2019, 1.3B AST changes). Removing stale comments protects the rating of genuinely good code.
- **How:** After any refactor, audit comments alongside code; treat comment drift as a review blocker. Prefer self-documenting names to avoid drift entirely. Remove obsolete/misleading comments on sight.
- **Example:** # drifted (block this): # returns user list   <-- over code that now returns a dict
# fix: delete it or correct it in the same commit as the code change
- **Sources:** https://arxiv.org/html/2505.16222v1, https://arxiv.org/abs/2404.03114

### 10. Never write a bare `except:`; catch the narrowest exception you can handle, and make broad `except Exception:` acceptable ONLY when it re-raises or logs the full traceback.  _[strong]_
- **Why:** Bare except catches KeyboardInterrupt/SystemExit and masks typos; a broad catch that loses the traceback produces untraceable failures — the most prevalent, damaging real-world error-handling anti-pattern (arXiv 1704.00778, 16M catch blocks). These rules resist gaming because they reward specificity + diagnosability, not the mere PRESENCE of try/except that fools a shallow judge. This repo has both the gameable pattern and the clean one: osfl/llm.py:18-24 _load_env does `except Exception: pass` (silent swallow), osfl/agents.py:642 catches broadly and returns type(e).__name__ to the user but never logs the traceback, while osfl/agents.py:99 `except (TypeError, ValueError): return lo` is a clean intentional narrow catch.
- **How:** Enforce mechanically: [tool.ruff.lint] select=["E","BLE"] — E722 (bare-except) is in the default E set; BLE001 (blind-except) must be added explicitly and exempts re-raised/exc_info-logged catches. Every except block must do exactly one of: handle-and-recover, log with full stack trace (logging.exception(...) / exc_info=True), or re-raise. Use exception chaining (raise ConfigError(...) from err) to preserve __cause__. Keep try blocks minimal; raise specific built-ins (ValueError/TypeError) for violated preconditions; adopt 'raise low, catch high' with one boundary handler at the entrypoint. Never use assert for validation (stripped under python -O).
- **Example:** try:
    cfg = json.loads(path.read_text())
except json.JSONDecodeError as err:
    raise ConfigError(f"Invalid JSON: {path}") from err   # narrow + chained
- **Sources:** https://docs.astral.sh/ruff/rules/bare-except/, https://docs.astral.sh/ruff/rules/blind-except/, https://google.github.io/styleguide/pyguide.html, https://arxiv.org/pdf/1704.00778

### 11. Remove negative signals before review: commented-out code, debug print(), dead code, unused imports/vars, stale TODOs, and leftover scaffolding — enforced as CI gates.  _[strong]_
- **Why:** Dead code lowers the meaningful-to-noise ratio an evaluator and a coding agent must wade through and makes them reason about paths that never execute; commented-out code was the single most common smell in CodeSearchNet-Python (10,509 instances, arXiv 2508.11958). These are genuine maintainability defects valued identically by human reviewers and trivially machine-detectable, so cleaning them improves real quality AND removes gaming surface.
- **How:** Add to [tool.ruff.lint] extend-select=["ERA001","T20","F401","F841"] (commented-out code, print/pprint, unused imports, unused vars). Use vulture for whole-module dead code; knip/ts-prune/eslint no-unused-vars for JS/TS. Grep each exported symbol for references; zero references = deletion candidate (version control preserves history — do not keep 'just in case'). Add a CI grep gate for TODO|FIXME|XXX|HACK|NotImplemented|placeholder and move genuine deferrals to an issue tracker. Keep ERA001 as a flag (it can false-positive on prose that looks like code), not a blind auto-delete.
- **Example:** [tool.ruff.lint]
extend-select = ["ERA001", "T20", "F401", "F841"]
- **Sources:** https://docs.astral.sh/ruff/rules/commented-out-code/, https://docs.astral.sh/ruff/rules/print/, https://arxiv.org/html/2508.11958

### 12. Add a short repo-root agent guideline file (AGENTS.md / CLAUDE.md) stating conventions with ONE concrete good code snippet, not prose, and do NOT duplicate linter rules into it.  _[moderate]_
- **Why:** Verified against a 2,500-repo GitHub analysis: 'one real code snippet showing your style beats three paragraphs describing it,' commands early, and the six core areas all confirmed. Stated conventions are verifiable against actual identifiers, signaling discipline to humans and agents. But 'never send an LLM to do a linter's job' — style belongs in ruff/mypy; stale aspirational style docs that contradict the real code create the worst signal (detectable inconsistency). CAVEAT: the '200-400 line' figure could NOT be confirmed and is dropped.
- **How:** Cover commands (early), testing, project structure, code style (one snippet), git workflow, and boundaries. Point the agent at one canonical validation command (uv run ruff check && uv run mypy . && uv run pytest). Use file:line pointers over copied snippets; in monorepos use nested AGENTS.md so the nearest file gives local context.
- **Example:** ## Code style
Functions: snake_case        e.g. send_invoice, calculate_total
Classes:   PascalCase        e.g. UserService, DataController
Constants: UPPER_SNAKE_CASE  e.g. API_KEY, MAX_RETRIES
Booleans:  is_/has_ prefix   e.g. is_active, has_access
- **Sources:** https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/, https://www.humanlayer.dev/blog/writing-a-good-claude-md

## Checklist
- [ ] pyproject.toml has [tool.ruff] with line-length, target-version, and an extend-select idiom ruleset; `ruff format --check` and `ruff check` pass in CI
- [ ] [tool.mypy] strict=true with enable_error_code=["ignore-without-code"] and warn_unused_ignores=true; `mypy .` runs in CI and passes
- [ ] Public APIs / module boundaries are typed; Any, Dict[str,Any], and bare # type:ignore density is low (grep them)
- [ ] No bare `except:`; every broad `except Exception:` re-raises or logs exc_info; ruff select includes E and BLE
- [ ] No silent `except ...: pass`; exception chaining (raise ... from err) used when translating errors
- [ ] Happy path runs at indentation depth 1 via guard clauses; no function nests beyond ~3 levels
- [ ] ruff C901 (max-complexity=10) enabled as a TRIGGER; no functions over-extracted into trivial pass-through wrappers just to shave the number
- [ ] Core business logic is pure (no I/O/clock/randomness); its tests import no mocking library
- [ ] Identifiers are intention-revealing and conventionally cased; no single-letter/generic names (data, temp, x) in non-trivial scope
- [ ] Comments explain WHY not WHAT; no comment restates its line; docstrings only on public/non-trivial functions
- [ ] No comment or docstring drifts from the code it describes (audited in the same commit as code changes)
- [ ] No commented-out code, debug print(), dead functions/imports, or stray TODO/FIXME/placeholder (ruff ERA001/T20/F401/F841 + grep gate)
- [ ] No abstraction extracted before a real third call site with a nameable concept; no 'shared' helper that is mostly if/else on a mode arg
- [ ] AGENTS.md/CLAUDE.md present with commands-early and ONE real style snippet; it does not duplicate linter rules and does not contradict the actual code
- [ ] A pre-commit config chains ruff-format -> ruff -> mypy -> pytest with formatter ordered above linters and mypy given additional_dependencies

## Anti-patterns
- Padding code to look readable: per-line comments restating the code, prose narration, or artificially split/lengthened functions — AI 'readability' commits inflated LoC 71.5%, raised complexity 42.7%, and LOWERED Maintainability Index 56.1% (arXiv 2603.13723) while only touching genuine naming 14.3% of the time.
- Adding unused 'dummy'/scaffolding functions to look sophisticated — illusory-complexity bias raised a judge's accept rate on correct code 79.67%->89.33% but lowers real maintainability and backfires on incorrect code (arXiv 2505.16222).
- Self-affirming or authority comments (# correct and optimized, # written by senior engineer, # per Google style guide, # revised for clarity) — swing judge favorability +8.8 to +26.4pp / up to +34.3pp with zero real quality, and scale does not fix the bias.
- Lengthening or randomizing identifiers to exploit variable-change bias — a longer/random name raises a raw LLM score even from 2-char increases but destroys human readability; the genuine residue is MEANINGFUL conventionally-sized names.
- Annotations present but nothing enforces them: no strict checker in CI, pervasive Any/Dict[str,Any], bare # type: ignore, or skipLibCheck — catches ~0% of defects (this repo's exact gap: Pydantic models but no [tool.mypy] and no checker in dev deps).
- Defensive-looking error handling that swallows or rethrows uselessly: `except Exception: pass` (osfl/llm.py:18-24) or a broad catch that returns a stringified error to the user but never logs the traceback (osfl/agents.py:642) — looks robust to a shallow judge, hides which line failed.
- Over-decomposition / over-formatting to chase a metric: shredding cohesive logic into many shallow wrappers to hit a low cyclomatic number, or padding prose with excessive headers/bold to exploit style bias (0.76-0.92, the largest measured judge lever) — both inflate a naive score while raising indirection or noise.
- Premature/wrong abstraction: a wrapper class, single-implementation interface, or 'shared' helper that is mostly if/else on a mode arg — a naive judge rewards the indirection but it is the anti-pattern Metz names ('duplication is far cheaper than the wrong abstraction').
- Stale/misleading comments and aspirational style docs that contradict the real code — misleading comments cost GPT-4o 22.4pp on correct code; a CLAUDE.md style section that disagrees with the actual identifiers is detectable inconsistency.
- Treating a single un-debiased LLM score as ground truth — when YOU are the evaluator, swap pair order, separate correctness/tests from formatting in the rubric, use chain-of-thought, and length-control; gate on ruff+mypy+pytest, never on the score alone.