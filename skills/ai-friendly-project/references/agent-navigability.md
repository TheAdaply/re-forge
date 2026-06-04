<!-- Reference for the `ai-friendly-project` skill. Evidence-graded rules (strong/moderate/weak) with Why/How/Example/Sources. Worked examples cite a real FastAPI+LLM repo (OSFL); treat repo-specific line numbers as illustrations of the general rule. Citations resolve in references/sources.md. -->

# AI-agent navigability

_AGENTS.md / CLAUDE.md, llms.txt (and when NOT to), grep/retrieval-friendliness_

**Overview:** An LLM evaluator forms its rating largely from what it can cheaply discover and verify: it ranks files from the directory tree and names before reading code, walks static import/call edges to reach the right symbol, and reads any agent-context file first. A repo that is descriptively named, statically legible, and carries a lean, accurate, runnable AGENTS.md scores high because the evaluator can actually localize code, run the documented commands, and confirm they pass — genuine engineering quality that humans reward too. The decisive trap is that this category looks gameable via verbosity (fat auto-generated AGENTS.md, padded overviews, an llms.txt badge), but the controlled evidence shows those moves measurably REDUCE real agent success and raise cost, so a grader who runs the commands and checks structure separates lean truth from padded theater instantly.

## Rules

### 1. Hand-write a lean AGENTS.md (or CLAUDE.md) at the repo root containing ONLY non-inferable facts; never commit an LLM-auto-generated context file unedited.  _[strong]_
- **Why:** The ETH Zurich/LogicStar 'Evaluating AGENTS.md' study (138-task AgentBench, 12 repos, 4 agents, objective SWE-bench/AGENTbench pass rates) found LLM-generated files REDUCE task success in 5/8 settings (~-0.5% SWE-bench Lite, ~-2 to -3% AGENTbench) and raise inference cost 20-23%, while hand-written minimal files gave ~+4%. Anthropic independently warns bloated CLAUDE.md makes the agent ignore real instructions. So an auto-generated padded file is an anti-signal, not a thoroughness signal — a grader who runs its commands and sees stale/duplicated prose penalizes it.
- **How:** Run /init or draft a skeleton, then aggressively prune. Per line ask 'would removing this cause a mistake?' — if no, delete. Keep only: exact build/test/lint/typecheck commands with flags, non-standard tooling (uv not pip), code-style rules that differ from language defaults, env-var quirks, and deliberate gotchas. Target well under ~200 lines (ideally ~15-60) and <=15 hard rules. Check it into git.
- **Example:** ## Commands
- Install: `uv sync`
- Test: `uv run pytest -q tests/`
- Lint+fix: `uv run ruff check . --fix`
- Types: `uv run mypy osfl/ --strict`
## Tooling
- Use `uv`, never `pip`.
## Gotchas
- MC seed pinned at 42; the 0.3201 vs 0.3824 gap is intentional (see ROADMAP §1a) — do not 'fix' it.
- **Sources:** https://arxiv.org/abs/2602.11988, https://code.claude.com/docs/en/best-practices, https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/

### 2. Cut the prose 'Project Overview' / architecture-essay / file-by-file / directory-dump section from the always-loaded context file.  _[strong]_
- **Why:** The same ETH study found overviews do NOT help agents reach relevant files faster; they appear in 95-100% of generated files, duplicate the README, induce +2.45-3.92 extra steps/task and up to +23% cost, and rot when code changes. Removing duplicated docs is what produced a +2.7% success gain. This is the clearest 'looks thorough but is filler' tell — exactly the padding an adversarial evaluator must NOT reward. A short architecture map belongs in the README, not in the per-turn-taxing context file.
- **How:** Delete any 'About this project' / inventory / directory tree from AGENTS.md/CLAUDE.md. Put a one-paragraph 'what it does' plus key entry points in README instead. Spend the AGENTS.md budget on executable commands and boundaries.
- **Example:** DELETE from AGENTS.md: 'This project is a Monte-Carlo engine. The osfl/ folder contains... orchestrator.py handles... models.py defines...' — every word is inferable from code or already in README.md.
- **Sources:** https://arxiv.org/abs/2602.11988, https://code.claude.com/docs/en/best-practices

### 3. Name exact tools and commands the agent must run, not vague advice.  _[strong]_
- **Why:** The ETH study quantified obedience: 'uv' was used 1.6x more when explicitly named; repository-specific tools were used 2.5x more. Concrete command directives change real agent behavior on objective benchmarks and are unambiguous to human reviewers; vague 'run the tests' advice is not obeyed.
- **How:** Write imperative command lines with flags and paths, all backticked. Name the package manager, test runner, lint and type commands explicitly.
- **Example:** - Run tests: `uv run pytest -q tests/`
- Lint: `uv run ruff check osfl/`
- Build: `uv build`
- **Sources:** https://arxiv.org/abs/2602.11988

### 4. Put every code-style/library/structure constraint in the toolchain and CI, not in prose; give the agent the EXACT verification commands so it can self-check via exit codes.  _[strong]_
- **Why:** 'Instructions without verification commands are suggestions, not rules.' A repo whose context file points to real, runnable gates (ruff/mypy/pytest passing) is genuinely well-engineered and is the primary defense against a lying/padded file — a grader can actually run the commands and check exit 0. This is simultaneously strongly genuine and strongly anti-gaming. Reserve prose only for judgment boundaries a linter cannot express.
- **How:** Configure ruff/black, mypy --strict, pytest, and CI gates in pyproject.toml and a CI workflow. In AGENTS.md, list the exact self-check commands. For must-always-happen steps in Claude Code, encode a deterministic hook (.claude/settings.json PostToolUse) instead of advisory prose.
- **Example:** ## Verify
All must exit 0 before a change is done:
`uv run ruff check . --fix && uv run mypy osfl/ --strict && uv run pytest -q`

.claude/settings.json (deterministic gate):
{"hooks":{"PostToolUse":[{"matcher":"Edit|Write","hooks":[{"type":"command","command":"uv run ruff check . --fix"}]}]}}
- **Sources:** https://code.claude.com/docs/en/best-practices, https://arxiv.org/abs/2602.11988

### 5. Add an explicit three-tier boundaries section (Always do / Ask first / Never do) phrased as commands, including negative rules.  _[strong]_
- **Why:** GitHub's 2,500-repo analysis found top files use a three-tier structure and 'Never commit secrets' is the most common helpful constraint. Negatives encode real institutional risk a linter cannot express; without explicit negatives the model defaults to its most common known pattern, not yours. Security-aware ownership is independently valued by human reviewers.
- **How:** Add a Boundaries section with imperative directives. Pair 'Never commit secrets' with an actual gitignored .env and a committed .env.example.
- **Example:** ## Boundaries
- Always run `uv run pytest -q` before committing.
- Ask before adding a production dependency.
- Never commit `.env` or secrets (only `.env.example`).
- **Sources:** https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/, https://developers.openai.com/codex/guides/agents-md, https://code.claude.com/docs/en/best-practices

### 6. Give files and directories descriptive, domain-meaningful names that match issue/PR vocabulary, and keep a shallow tree.  _[strong]_
- **Why:** Agents rank files from the directory tree + names BEFORE reading any code: Agentless feeds a tree-style repo view + the issue to localize and hits 81.67% file-level containment, with names enabling 'initial screening through semantic matching.' Self-documenting structure is exactly what expert reviewers value, so agent-legibility and code quality coincide. Not gameable — you must actually improve the structure.
- **How:** Name by responsibility: osfl/engine/monte_carlo.py defining run_simulation(), not osfl/utils/helpers2.py with do_stuff(). Keep one logical responsibility per file and a shallow, predictable hierarchy whose folder names signal purpose (engine/, persona/).
- **Example:** Good (this repo): osfl/engine/{funnel,bayes,stats,strategy,priority,habit}.py and osfl/persona/{drafter,voice,loader}.py — descriptive paths that survive grep and match issue vocabulary. Avoid: a generic utils/ dump.
- **Sources:** https://arxiv.org/html/2407.01489v2

### 7. Use explicit static imports and normal class inheritance; call functions by clear direct names. Avoid dynamic import/getattr/monkey-patching/runtime metaprogramming.  _[strong]_
- **Why:** Graph-guided agents traverse contain/import/invoke/inherit edges to reach code an issue does not name directly. LocAgent (Claude-3.5: 94.16% file-level Acc@5 vs 85.77% embedding-based, gap WIDENING on multi-hop tasks; RepoGraph lifted resolve rates ~32.8% relative) shows static structure is what they walk. Dynamic dispatch is invisible to tree-sitter static parsing, forcing the agent to guess across an unconnected graph. Explicit static structure is also long-standing maintainability practice.
- **How:** Write `from osfl.engine.monte_carlo import run_simulation` then call run_simulation(...). Avoid getattr(importlib.import_module(...), 'run_'+kind). Make cross-module coupling an explicit import+call, not a runtime-discovered plugin registry. Keep one clear definition per symbol; avoid shadowing/aliasing so def/ref relationships resolve cleanly.
- **Example:** Edge-creating (indexable): `from osfl.engine.funnel import compute_funnel` then `compute_funnel(plan)`.
Invisible to static parse (avoid): `sim = getattr(importlib.import_module(f'osfl.engine.{name}'), 'run_'+kind)()`
- **Sources:** https://arxiv.org/html/2503.09089v1, https://arxiv.org/html/2410.14684v2

### 8. Maintain signature-level legibility: explicit typed function/method signatures, type hints, and concise module/class docstrings stating WHAT (purpose, params, returns, failure modes) — not a restatement of the signature.  _[strong]_
- **Why:** Agentless's skeleton format (signatures + docstrings, no bodies) reached 58.33% ground-truth containment vs 53.67% for full file contents — verbose bodies actively HURT localization, and skeletons survive the agent's compression. The natural-language docstring surface is also what dense semantic (RAG) search matches queries against, while typed identifiers feed BM25 exact-symbol matching. Both human reviewers and retrieval reward this; padding/boilerplate docstrings do not.
- **How:** Add type hints everywhere and a one-line+ docstring to every public function/class/module saying what it does and how it fails. Make identifiers intention-revealing (ShotType, effective_prior). Keep functions cohesive and reasonably sized so an AST chunker keeps them whole.
- **Example:** This repo's osfl/models.py opens with a module docstring naming it 'the single source of types' and ShotType documents its purpose ('A reusable conversion primitive...') — dense search matches the prose, BM25 matches ShotType/prior_mean.
- **Sources:** https://arxiv.org/html/2407.01489v2, https://arxiv.org/abs/2510.20609

### 9. Provide a one-command, fast, scoped test/build/lint the agent can run and read, documented where the agent looks.  _[strong]_
- **Why:** Anthropic best-practices: 'Without a check it can run, looks done is the only signal, and you become the verification loop.' A runnable green check lets the agent self-verify and iterate unattended, AND independently raises a reviewer's quality assessment — the two objectives reinforce each other and it cannot be gamed.
- **How:** Expose a single entry: `uv run pytest -q` (or a Makefile target / npm test). Keep it fast and scoped. Reference it in AGENTS.md and pyproject [tool.pytest.ini_options].
- **Example:** pyproject.toml: [tool.pytest.ini_options]\ntestpaths = ['tests'] — then AGENTS.md says 'Test: `uv run pytest -q tests/`'.
- **Sources:** https://code.claude.com/docs/en/best-practices

### 10. Use consistent, greppable naming: one canonical name per concept, files/symbols named after what they do, no string-built/dynamic identifiers.  _[strong]_
- **Why:** Claude Code has NO semantic index — it chains Glob -> Grep (ripgrep) -> Read, with no embedding fallback, so exact-string discoverability IS the retrieval substrate. It excels with disciplined naming and fails on inconsistent conventions, which force costly multi-turn lexical->structural escalation. Consistent naming is universally valued by human reviewers.
- **How:** Pick one term per concept and reuse it across file name, symbol name, and docs (auth/token_refresh.py defining refresh_token()). Never build identifiers from strings at runtime.
- **Example:** Greppable: a query for `refresh_token` lands the file immediately. Ungreppable: name = 'refresh_' + kind; fn = globals()[name] — no literal to grep.
- **Sources:** https://vadim.blog/claude-code-no-indexing, https://ceaksan.com/en/code-search-for-ai-agents-which-tool-when

### 11. Maintain a comprehensive .gitignore excluding dependency dirs, build artifacts, caches, and large data; mirror it into .cursorignore for Cursor's index.  _[strong]_
- **Why:** Cross-confirmed: Claude Code's Grep IS ripgrep and honors .gitignore automatically, so a tidy ignore file cuts context pollution and token cost on every search; Cursor docs say excluding generated/vendored files 'improves search accuracy.' It is also baseline repo hygiene every reviewer expects — the single cheapest navigability win.
- **How:** Ignore .venv/, __pycache__/, *.pyc, .pytest_cache/, dist/, build artifacts, runtime data (data/store.json), and secrets (.env, keep !.env.example). For polyglot repos add node_modules/, dist/, target/, vendor/. Use conventional file extensions so `rg -t py` filters work.
- **Example:** This repo's .gitignore is a good template: `.venv/`, `__pycache__/`, `*.pyc`, `.pytest_cache/`, `data/store.json`, `.env`, `.env.*`, `!.env.example` — the agent's ripgrep never wades through the virtualenv or cached data.
- **Sources:** https://www.codeant.ai/blogs/why-coding-agents-should-use-ripgrep, https://cursor.com/docs/context/codebase-indexing

### 12. Consolidate Python project metadata AND tool config into pyproject.toml, and enforce machine-checkable types/static analysis in CI.  _[strong]_
- **Why:** PEP 517/518/621/735 pyproject is read identically by ruff, mypy, pyright, pytest, coverage, uv, and Hatch, letting a human or LLM verify supported versions, deps, and enforced rules without executing anything. Empirically, type-constraining cut compilation errors >50% and raised functional correctness 3.5-5.5%; static-analysis feedback loops cut security issues from >40% to 13%. The 'enforce in CI' qualifier is load-bearing — an unchecked spec is theater that silently drifts into fiction.
- **How:** Put [project] (PEP 621) deps, [dependency-groups] dev deps (PEP 735), and [tool.ruff]/[tool.mypy strict]/[tool.pytest.ini_options] in pyproject.toml; delete scattered setup.cfg/.flake8/mypy.ini. Run mypy --strict and ruff in CI so the contract can't drift.
- **Example:** This repo already has [project], [tool.pytest.ini_options] testpaths=['tests'], and [dependency-groups]; the missing lever is adding [tool.mypy] strict=true and [tool.ruff.lint] plus a CI gate.
- **Sources:** https://pydevtools.com/handbook/reference/pyproject.toml/, https://docs.astral.sh/ruff/configuration/, https://arxiv.org/pdf/2504.09246

### 13. Front-load orientation in the first screen of README/AGENTS.md: a one-paragraph 'what it does', key entry points, and exact run/test commands — before badges, install matrices, or contributor lists.  _[strong]_
- **Why:** 'Lost in the Middle' (Liu et al.) shows >30% recall drop for information buried in mid-context, persisting in 100K+ token models; a buried overview is effectively unread. Anthropic docs echo that context fills fast and important rules get lost. Lede-first also matches how expert humans write good READMEs. Ordering helps comprehension but is NOT a license to add length — keep it short.
- **How:** Open README with the one-line thesis and a one-paragraph description, then the run commands, then everything else. Prefer several small focused files an agent can selectively load over one giant file it must read whole.
- **Example:** This repo's README leads with 'outcome = probability × volume' + a one-paragraph what-it-does + `uv sync` / `uv run uvicorn osfl.app:app` before anything else — textbook front-loading.
- **Sources:** https://arxiv.org/abs/2307.03172, https://code.claude.com/docs/en/best-practices

### 14. Match the agent-context artifact to the surface: for a code repo with no docs site, use AGENTS.md/CLAUDE.md — do NOT drop in an llms.txt. Only ship llms.txt for an actual documentation SITE.  _[strong]_
- **Why:** llms.txt is a docs-NAVIGATION index, not agent build instructions; putting one in a pure code repo is a textbook misapplication. Worse, it is unread theater: SE Ranking's 300k-domain study found zero correlation with AI citations (removing it IMPROVED the model), adoption was ~10%, and server-log audits (Mueller: 'no AI system currently uses llms.txt'; OtterlyAI: 84 of 62,100 AI-bot requests, 0.1%) show frontier crawlers ignore it. Mueller likened it to the dead meta-keywords tag. An evaluator crediting a code repo for an llms.txt would reward a near-zero-consumption badge.
- **How:** For this OSFL-style repo (osfl/ package, README, no docs site): write AGENTS.md with runnable commands; do not add llms.txt. If you DO have a docs site and ship llms.txt, follow the spec exactly (single required '# H1', '> one-line blockquote', H2 sections of `[name](url): description` bullets, low-priority links under an H2 named 'Optional'), keep it curated and small (~5KB), describe every link, order by user journey, and generate it deterministically from source so it never drifts. Never publish a bulk llms-full.txt dump without a curated index.
- **Example:** Code-repo move (correct): AGENTS.md with '## Build & Test\n`uv sync`\n`uv run pytest -q`\n`uv run ruff check osfl/`'. Anti-pattern to reject: a /llms.txt of bare URLs with no descriptions mirroring the file tree.
- **Sources:** https://www.searchenginejournal.com/llms-txt-shows-no-clear-effect-on-ai-citations-based-on-300k-domains/561542/, https://www.seroundtable.com/google-ai-llms-txt-39607.html, https://llmstxt.org/, https://www.deployhq.com/blog/ai-coding-config-files-guide

### 15. Phrase rules as direct imperative commands and reserve IMPORTANT/YOU MUST/ALL-CAPS emphasis for at most 1-2 genuinely load-bearing rules.  _[moderate]_
- **Why:** Vendor docs confirm targeted emphasis improves adherence — but only when sparing. Scattering IMPORTANT/ALL-CAPS everywhere is pure formatting-bias exploitation that correlates with the performance-reducing bloat above; the value is entirely in the moderation, so the cap must be explicit.
- **How:** Write 'Never use inline mocks — use src/test/factories/*', not 'we generally try to avoid mocks.' Apply emphasis to at most one or two rules whose violation is catastrophic.
- **Example:** OK (one load-bearing flag): 'IMPORTANT: never commit `.env`.' Not OK: every third line in ALL-CAPS with YOU MUST.
- **Sources:** https://code.claude.com/docs/en/best-practices

### 16. Name and place the file correctly: AGENTS.md (uppercase) at repo root (or CLAUDE.md for Claude Code); in monorepos add a focused per-package file and rely on nearest-in-tree precedence (closest file wins).  _[moderate]_
- **Why:** AGENTS.md is an open standard (donated to the Linux Foundation's Agentic AI Foundation, read by Codex, Claude Code, Cursor, Gemini CLI, Aider) so correct naming makes the repo auto-discoverable with zero discovery cost, and per-package files map to real modular architecture. Moderate, not strong: correct placement alone is a low bar — an empty but correctly-named file passes this test, so it must not be over-weighted, and adoption ('20,000+ repos have one') is popularity, not effectiveness. The benefit is conditional on the file being lean and accurate.
- **How:** Place AGENTS.md at root. In a monorepo, add packages/api/AGENTS.md and packages/web/AGENTS.md each with their own build/test commands. Codex caps combined docs at 32 KiB (project_doc_max_bytes); keep each well under that.
- **Example:** Monorepo: root AGENTS.md (shared boundaries) + packages/api/AGENTS.md (its own `pytest` invocation) — nearest file wins for an edit inside packages/api/.
- **Sources:** https://agents.md/, https://developers.openai.com/codex/guides/agents-md, https://code.claude.com/docs/en/best-practices

### 17. Export explicit, typed interface contracts and keep the import/dependency graph clean and acyclic so the agent's tree-sitter + PageRank 'repo map' is accurate.  _[moderate]_
- **Why:** Aider sends a ~1k-token repo map of declared symbols + signatures ranked by PageRank over file dependencies for repos too big to fit context; a tangled/cyclic graph with implicit untyped interfaces degrades that map so the agent can't see topology or the contract before writing a call. Acyclic graphs and typed interfaces are bedrock engineering quality. Moderate because the strongest evidence is mechanism-level (Aider docs) rather than a controlled resolve-rate delta and it overlaps the explicit-imports rule.
- **How:** Expose stable public APIs via clean __init__ exports with typed signatures and one-line docstrings. Keep the dependency direction one-way and acyclic; avoid wildcard imports that hide the call graph.
- **Example:** osfl/__init__.py re-exports typed public symbols; engine modules stay model-free (pure numpy) and the agent layer converts engine outputs into models — a clean, acyclic, one-way edge the repo map captures.
- **Sources:** https://aider.chat/docs/repomap.html, https://arxiv.org/html/2503.09089v1

### 18. Treat the context file like code: review/prune it when things go wrong, and validate that every documented command actually runs (CI check or linter).  _[moderate]_
- **Why:** The maintenance-as-code principle is vendor-backed and genuinely separates a real maintained repo (all commands pass) from a padded/lying one ('your AGENTS.md is probably lying'). Stale paths/dead scripts lead agents into expensive wrong work. Moderate because specific linter tools (e.g. agents-lint) are unverified single-source references — recommend the principle (every documented command must run, validated in CI), not a particular tool.
- **How:** Add a CI job that executes each command listed in AGENTS.md (or at least the test/lint/typecheck trio) so a dead script fails the build. Update the file in the same PR that changes a process.
- **Example:** CI step: run `uv sync && uv run pytest -q && uv run ruff check . && uv run mypy osfl/ --strict` — exactly the commands AGENTS.md tells the agent to run, so drift fails the build.
- **Sources:** https://code.claude.com/docs/en/best-practices

## Checklist
- [ ] AGENTS.md/CLAUDE.md exists at repo root, hand-written, lean (well under ~200 lines), and NOT auto-generated boilerplate
- [ ] Context file contains only non-inferable facts: exact build/test/lint/typecheck commands with flags, non-standard tooling (uv), gotchas — no Project Overview / directory dump / README restatement
- [ ] Every documented command actually runs and exits 0 (test, lint, typecheck), ideally enforced by CI
- [ ] Boundaries section present as Always / Ask first / Never, including 'Never commit secrets'
- [ ] Exact tools/commands named explicitly (uv not pip; `uv run pytest -q tests/`)
- [ ] Files and directories descriptively named to match issue/PR vocabulary; shallow tree; one responsibility per file
- [ ] Imports are explicit and static; no getattr/importlib/monkey-patch dynamic dispatch for project-internal calls
- [ ] Public functions/classes/modules have type hints and purpose-stating docstrings (not signature restatements)
- [ ] One fast, scoped, runnable test/build command documented where the agent looks
- [ ] Naming is consistent and greppable; one canonical term per concept; no string-built identifiers
- [ ] Comprehensive .gitignore excludes .venv/, caches, build artifacts, runtime data, and secrets; .cursorignore mirrors it if using Cursor
- [ ] pyproject.toml consolidates metadata + tool config; mypy --strict / ruff enforced in CI
- [ ] README front-loads thesis + what-it-does + run commands in the first screen
- [ ] No llms.txt in a code repo with no docs site; if a docs site ships one, it is spec-conformant, curated, described, and source-generated
- [ ] IMPORTANT/ALL-CAPS emphasis used on at most 1-2 load-bearing rules

## Anti-patterns
- Committing an LLM-auto-generated AGENTS.md/CLAUDE.md unedited — measurably REDUCES agent success (5/8 settings) and raises cost 20-23% (ETH study); presence/length is an anti-signal, not thoroughness
- Padding the context file with a prose 'Project Overview' / architecture essay / file-by-file tour / directory tree — duplicates README, adds +2.45-3.92 steps and up to +23% cost, helps localization zero, and rots
- Restating linter/formatter/type rules in prose instead of enforcing them in ruff/mypy/CI config — unchecked 'machine-readable contract' that silently drifts into fiction
- Scattering IMPORTANT/YOU MUST/ALL-CAPS across many rules to signal seriousness — pure formatting-bias exploitation that correlates with performance-reducing bloat
- Dropping an llms.txt (or a bloated auto-concatenated llms-full.txt) into a code repo with no docs site purely as an 'AI-friendly' badge — frontier crawlers hit it ~0.1% of the time; zero citation effect (300k-domain study); Mueller compared it to the dead meta-keywords tag
- Vague advice ('run the tests', 'we generally avoid X') instead of exact named commands — obeyed far less than 'uv run pytest -q tests/'
- Generic/cryptic names (utils/helpers2.py, do_stuff(), proc()) and deep nesting — fails the agent's stage-1 tree+name file ranking before any code is read
- Dynamic import/getattr/monkey-patching/runtime plugin registries for internal calls — invisible to static (tree-sitter) parsing, so graph-guided agents can't reach the code
- Wildcard imports (from x import *) and shadowing/aliasing — hide the call graph and break dependency-aware retrieval and repo maps
- Burying the overview/run commands below badge rows and install matrices — 'Lost in the Middle' means buried orientation is effectively unread
- Padding docstrings/README/files with filler or duplicated content to look thorough — inflates token budgets, dilutes embedding semantics, and measurably DEGRADES real retrieval (cAST optimizes density, not length); naive verbosity fools only a length-biased prose judge, never a grader who runs the commands or measures retrieval
- Mechanically adding rarely-used security/performance sections just to score above a field benchmark — checklist-completion gaming that produces stale filler unless the constraints are real and tool-enforced
- Cargo-culting an AGENTS.md merely because '20,000+ repos have one' — adoption is popularity, not effectiveness; a bloated one is net-negative
- Letting documented commands/paths go stale ('your AGENTS.md is probably lying') — leads agents into expensive wrong work; not validated in CI