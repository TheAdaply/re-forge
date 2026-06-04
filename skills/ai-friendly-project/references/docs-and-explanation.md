<!-- Reference for the `ai-friendly-project` skill. Evidence-graded rules (strong/moderate/weak) with Why/How/Example/Sources. Worked examples cite a real FastAPI+LLM repo (OSFL); treat repo-specific line numbers as illustrations of the general rule. Citations resolve in references/sources.md. -->

# Docs & explanation

_README, Diataxis, examples, ADRs, diagrams, and where to put which explanation_

**Overview:** Documentation is the artifact an LLM evaluator (and an agentic coding harness) reads FIRST and weights heavily, because it is where a project asserts — and, when done right, demonstrates — its quality. Two forces move the rating: genuine navigability/correctness (a runnable quick-start either runs or it doesn't; a self-contained doc chunk survives retrieval; an accurate ADR stops a deliberate design choice from being flagged as a bug) AND documented LLM-judge biases (clean markdown scores ~0.76–0.92 higher than identical prose; verbose/authoritative text inflates naive scores). The robust strategy is to win on genuine quality first — minimal+complete examples, single-source-of-truth, audience-split docs, neutral structure-mirroring reference — which incidentally satisfies the format heuristics, so you never need to pad. The exploitable surface (length-padding, badge walls, stub sections, auto-generated context files, self-congratulatory comments) actively LOWERS real quality and is penalized once an evaluator executes the code or strips the formatting.

## Rules

### 1. Order the README highest-signal-first and put ONE runnable quick-start above the fold.  _[strong]_
- **Why:** Top-down readers (human and LLM) expect purpose/install/usage in predictable places; the standard-readme spec mandates this order and a runnable Install+Usage code block. 'How' is the most frequent README section (58.4% in Prana et al. 2019), confirming practitioners treat runnable usage as core, and a quick-start is falsifiable — it runs or it doesn't, which is what reviewers test first. Burying What/Why under badge walls or a giant ToC inverts the signal.
- **How:** Sequence: (1) Title = repo name, (2) one-line What (<120 chars, own line), (3) optional small badge row, (4) Why/motivation + differentiation, (5) ToC only if >100 lines, (6) Install (fenced block), (7) Usage quick-start (fenced block, language tag), (8) API/extras, (9) Maintainers, (10) Contributing, (11) License LAST. Quick-start = exact install command + 3-10 line snippet producing visible output; no '$' prompts, no unsubstituted placeholders, no missing imports.
- **Example:** This repo's README.md already does this well (lines 1-19): title, '> outcome = probability × volume' tagline, two sentences of motivation, then a single ```bash block: `uv sync` then `uv run uvicorn osfl.app:app --reload --port 8000` + the URL to open.
- **Sources:** https://github.com/RichardLitt/standard-readme/blob/main/spec.md, https://ar5iv.labs.arxiv.org/html/1802.06997

### 2. Open with a crisp What (value + problem solved) and an explicit Why (motivation + how it differs); add a one-line When/status.  _[strong]_
- **Why:** 'What' appears in 97.0% of READMEs but 'Why' in only 25.7% and 'When/status' in 21.4% (Prana et al. 2019, Table 3), so a real differentiation + maturity line is cheap above-baseline completeness AND it is exactly what an evaluator uses to categorize and trust a project. Status prevents a stale-README impression and tells a reviewer whether to depend on it.
- **How:** Write 1-2 sentences stating what it does and the problem it solves, then a short Why naming the alternative you improve on. Add a one-liner like 'Status: MVP / not production-ready'. Keep content SUBSTANTIVE — an empty stub Why/When added only to look complete is an anti-pattern.
- **Example:** This repo opens with a strong What/Why but has NO status line and NO License section — add `Status: MVP, not production` near the top and a License section last with a real LICENSE file.
- **Sources:** https://ar5iv.labs.arxiv.org/html/1802.06997, https://github.com/RichardLitt/standard-readme/blob/main/spec.md

### 3. Ship a root-level AGENTS.md as the machine-facing README: exact setup/test/lint commands and project-specific conventions, written BY HAND and kept lean.  _[strong]_
- **Why:** agents.md is a Linux-Foundation-stewarded convention read by Codex/Cursor/Copilot/Claude Code; giving an agent exact runnable commands is genuine instrumentation. Critically, the ETH-Zurich AGENTBENCH study (Gloaguen et al., 138 Python tasks, 4 agents) found human-written minimal context files give ~+4% task success while LLM-generated/bloated ones REDUCE success ~3% and raise cost >20%. Accuracy and brevity beat volume.
- **How:** Create AGENTS.md at repo root with: one-line mission, exact commands (install/run/all-tests/single-test/lint), and only NON-guessable conventions + deliberate-decision gotchas. Exclude anything a linter enforces, anything inferable from code, README value-prop, or file-by-file maps. Make CLAUDE.md a one-line stub (`See @AGENTS.md`) or a symlink — never duplicate a command in two files. In monorepos, nest per package (nearest file wins).
- **Example:** AGENTS.md for this repo: `## Commands` — Install: `uv sync`; Run: `uv run uvicorn osfl.app:app --port 8000`; All tests: `uv run --extra dev pytest -q`; Single: `uv run --extra dev pytest tests/test_engine.py -q`. `## Conventions` — `osfl/engine/` is pure numpy, NO I/O, deterministic given a seed; MC value 0.3201 < closed-form 0.3824 is INTENTIONAL, do not 'fix' it.
- **Sources:** https://agents.md/, https://arxiv.org/abs/2602.11988

### 4. Make every headline/docstring example MINIMAL and COMPLETE (imports + setup + call + expected output) and run examples in CI so they cannot rot.  _[strong]_
- **Why:** A controlled RCT (CryptoExamples, n=58) found minimal+complete+runnable examples raised task effectiveness +73% and cut vulnerabilities -66%. Self-containment (SSCCE) is what makes a snippet executable by a fresh user, CI, OR a code-running agent. Running examples as tests (doctest/pytest --doctest-modules) prevents silent documentation drift — the dominant real-world failure mode — and a green CI run is verifiable proof, not assertion.
- **How:** No '...' elision or pseudo-code in headline examples; replace external resources with inline dummy data. In Python use `>>>` doctest blocks in Google/NumPy 'Examples:' sections and enable in pyproject: `[tool.pytest.ini_options]` with `addopts=["--doctest-modules"]` and `doctest_optionflags=["NORMALIZE_WHITESPACE","ELLIPSIS"]`. Tame non-determinism with `+ELLIPSIS`/`+NUMBER`/`sorted()`; reserve `+SKIP` for genuinely non-runnable cases. Prefer one canonical example (or 2-5 covering happy-path + a key edge) over many near-duplicates — retrieved SIMILAR snippets can degrade LLM accuracy up to 15%.
- **Example:** `def outcome(probability: float, volume: int) -> float:` with docstring `Examples:\n    >>> outcome(0.25, 8)\n    2.0`. This repo's pyproject currently has only `testpaths=["tests"]` and no `>>>` blocks — adding `--doctest-modules` is net-new and high-leverage.
- **Sources:** https://arxiv.org/abs/1807.01095, https://docs.python.org/3/library/doctest.html, https://arxiv.org/abs/2503.20589

### 5. Guarantee install + green tests from a clean environment in documented one-liners, with pinned dependencies.  _[strong]_
- **Why:** Reproducible install + passing tests is the gate for any code-executing evaluator (SWE-bench-style harnesses) and every serious human reviewer (CI, onboarding). It is unfakeable — the command works from clean or it doesn't — and a non-runnable repo is invisible to agentic scoring regardless of prose quality.
- **How:** State exact install and test commands in README AND AGENTS.md. Pin deps (uv.lock / locked requirements). Add a CI job that runs them verbatim and surfaces a live badge. After each quick-start command, state the expected output ('Output should look something like…') so it is diff-checkable.
- **Example:** This repo already nails this: `uv sync`; `uv run uvicorn osfl.app:app --port 8000`; `uv run --extra dev pytest -q`, with uv.lock committed. Add a GitHub Actions step: `- run: uv sync --extra dev` then `- run: uv run --extra dev pytest -q`.
- **Sources:** https://www.swebench.com/SWE-bench/faq/, https://huggingface.co/blog/huggingface/runnable-examples

### 6. Split docs by the four Diataxis quadrants (tutorial / how-to / reference / explanation) and keep each page in exactly one; link out instead of cramming everything into the README.  _[strong]_
- **Why:** Boundary-blurring is 'at the heart of a vast number of problems in documentation'; single-purpose pages are valued by expert reviewers and give an LLM a retrieved chunk with unambiguous intent. The tutorial-vs-how-to conflation is the single most common doc error. Keeping the README task-oriented (get to first success) and linking exhaustive reference/explanation out prevents the unstructured-wall failure mode.
- **How:** For non-trivial projects create docs/tutorials/, docs/how-to/, docs/reference/, docs/explanation/; run the compass test (study vs work × action vs cognition) before writing a page. Tutorials: linear, beginner-safe, cannot-fail. How-to: goal-titled ('How to X with Y'), assumes competence. Reference: neutral, mirrors code structure, complete types/errors, no rationale. Explanation: the 'why'/tradeoffs. For a small single-package repo, a lean README + AGENTS.md + ARCHITECTURE.md + ADRs is sufficient — don't force a heavyweight docs/ tree prematurely.
- **Example:** This repo has NO docs/ dir — only a monolithic README + ROADMAP. The nonlinear-funnel insight (38% / 201 applications) buried in the README belongs in docs/explanation/why-funnels-are-nonlinear.md; per-module facts belong in docs/reference/engine.md.
- **Sources:** https://diataxis.fr/start-here/, https://www.diataxis.fr/tutorials-how-to/

### 7. Keep reference docs neutral, complete, and structure-mirroring; ship signatures + concrete examples (with full type/error schemas) and OMIT implementation bodies; delete 'non-information'.  _[strong]_
- **Why:** Agents treat reference as ground truth for generating calls, so neutrality + completeness raises real task success. ReadMe.LLM reports up to 100% success when signatures+examples are attached, while including full implementation bodies triggers hallucination. Maalej & Robillard (IEEE TSE 2013) found >45% of JDK 6 doc units are 'non-information' (restating the symbol name), negatively correlated with real functionality info — deleting filler raises signal density (the OPPOSITE of verbosity-gaming).
- **How:** One reference section per module/class/function; auto-generate from docstrings/OpenAPI where possible. For each public symbol ensure signature + behavior + directives (preconditions/constraints) + at least one usage example. Delete lines like 'update_posterior() updates the posterior'; replace with behavior+precondition+example. Move all rationale/tradeoffs to explanation/.
- **Example:** Replace 'update_posterior() updates the posterior' with: `update_posterior(prior: Beta, successes: int, trials: int) -> Beta. Precondition: 0 <= successes <= trials. Conjugate Beta update; Beta(2,23) + (5/30) -> Beta(7,48), shifting cold-email rate 8% -> 12.7%.'
- **Sources:** https://arxiv.org/abs/2504.09798, https://www.cs.mcgill.ca/~martin/papers/tse2013a.pdf

### 8. Write every heading and section to stand alone when retrieved out of context: restate the concept name, keep a consistent hierarchy, and make cross-references explicit.  _[strong]_
- **Why:** RAG/agent context windows retrieve chunks, not whole sites; a self-contained section survives chunking and prevents incomplete/hallucinated agent output. Self-containment is also a long-standing human technical-writing virtue (no dangling references). The Diataxis type-separation is what makes self-containment achievable.
- **How:** Write H2/H3 like 'OAuth 2.0 token refresh', not 'the auth method mentioned earlier'. Never require reading a prior page first; spell out explicit links to related pages. Keep docs in Markdown (not HTML) so chunks are clean and ~90% more token-efficient.
- **Example:** In reference, head a section 'forecast() — Beta-Binomial funnel Monte Carlo' and inline its one runnable example, rather than 'This function (see above) runs the simulation described earlier.'
- **Sources:** https://buildwithfern.com/post/how-to-write-llm-friendly-documentation, https://diataxis.fr/start-here/

### 9. Put WHY in comments (rationale, tradeoffs, links to issue/ADR); let names/structure carry WHAT/HOW; record cross-cutting rationale as immutable, numbered ADRs.  _[strong]_
- **Why:** Convergent across academic sources (arXiv:1806.04616 redundant-comment detection; arXiv:2401.07704 'information-less' header metric, n=367 devs) and decades of style consensus: signature-echoing comments add nothing and are detectably information-less. Wen 2019 (1.3B AST changes, 1,500 systems) shows inline comments rot fastest, so durable rationale belongs in versioned ADRs. Explicit ADRs also stop an evaluator from flagging a deliberate design choice as a bug, and modestly help LLMs detect decision violations.
- **How:** Delete any comment inferable from the signature ('// increment i'). Store ADRs one-decision-per-file in docs/adr/ as NNNN-lowercase-dashed-slug.md using Nygard fields (Status/Context/Decision/Consequences); never edit an accepted ADR — supersede and link back. Reference an ADR by number from a one-line code comment instead of re-explaining inline.
- **Example:** This repo's ROADMAP states a durable 'why' (MC value 0.3201 below the 0.3824 closed form is intentional — per-run Beta sampling captures parameter uncertainty). That belongs in docs/adr/0001-deterministic-beats-vs-mc-sampling.md, referenced from a one-line comment in osfl/engine/funnel.py.
- **Sources:** https://arxiv.org/abs/2401.07704, https://martinfowler.com/bliki/ArchitectureDecisionRecord.html, https://arxiv.org/abs/2602.07609

### 10. Embed architecture diagrams as inline Mermaid (```mermaid) and make them self-describing; keep the overview at C4 context/container altitude.  _[strong]_
- **Why:** A text-only evaluator literally cannot read a binary PNG/draw.io XML, while Mermaid is plain text it parses natively, GitHub renders inline, and it stays diffable in git. Mermaid is also far more token-efficient than XML/JSON (directionally well-supported). The C4 checklist standard: a self-describing, correctly-scoped diagram lets a reviewer verify structure without reading the whole codebase; unlabelled boxes-and-arrows read as low-effort.
- **How:** Commit diagrams as ```mermaid blocks in ARCHITECTURE.md. Give each a title + scope, label EVERY arrow with intent AND protocol ('Reads from via JSON/HTTPS', not 'Uses'), state technology on each box, spell out acronyms. Keep top-level to System Context + Container (~3-5 boxes); do not diagram every class. Repository-level docs measurably raise an LLM agent's task-success (SWD-Bench: ~20% relative gain for SWE-Agent).
- **Example:** ```mermaid\nflowchart LR\n  user([User]) -->|submits profile via HTTPS/JSON| api[FastAPI service]\n  api -->|runs forecast| engine[MC engine: numpy Beta/Binomial]\n  engine -->|point_estimate_p, find_bottleneck| runner[Scenario runner]\n```
- **Sources:** https://c4model.com/diagrams/checklist, https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams, https://arxiv.org/abs/2604.06793

### 11. Maintain ONE canonical source of truth per fact; reference/import/symlink rather than duplicate, and replace embedded directory trees with pointers to real paths.  _[strong]_
- **Why:** Single-source-of-truth (DRY for docs) is what prevents the contradictions an LLM judge can flag, and stale structural prose 'actively misleads' on the next refactor — a real path cannot drift the way prose does. Folder hierarchy and naming already carry the structural signal. Duplicated build commands across README + AGENTS.md + CLAUDE.md are a top source of doc rot.
- **How:** Keep each command/rationale/description in exactly one file; make CLAUDE.md `See @AGENTS.md` (Claude Code @-imports, up to 5 hops) or symlink. Delete 'directory X contains Y' prose; replace with 'entry point: osfl/app.py; pure-math core: osfl/engine/' and let naming do the rest.
- **Example:** This repo's README lines 76-98 embed a full osfl/ module tree with per-file descriptions — the exact stale-structure anti-pattern. Replace with a short pointer + a labelled Mermaid container diagram in ARCHITECTURE.md.
- **Sources:** https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents, https://code.claude.com/docs/en/best-practices

### 12. Use clean markdown structure (## headers, bullet lists, language-tagged fenced blocks, tables for tabular data) — but keep every section load-bearing.  _[moderate]_
- **Why:** Dual-benefit and robust: structure aids genuine human comprehension and matches popular READMEs, AND it is a documented LLM-judge format bias (markdown scores ~0.76-0.92 higher than identical prose). Because the benefit holds on BOTH the genuine and the bias axis it is high-leverage and low-risk — PROVIDED structure tracks substance. Empty formatted sections added purely to exploit the bias are filler a careful judge penalizes.
- **How:** Make the README skimmable in ~10 seconds. Use the format bias only to justify clean structure over a prose wall, NEVER to justify padding length, stub sections, or stacking 8+ vanity badges. Cap badges at 3-6 LIVE/linked ones (CI, coverage, version, license).
- **Example:** A static hand-made 'build passing' badge is gameable; a green CI badge backed by real passing tests is a genuine health signal. pyOpenSci warns: 'Beware of the overuse of badges.'
- **Sources:** https://github.com/RichardLitt/standard-readme/blob/main/spec.md, https://www.pyopensci.org/python-package-guide/documentation/repository-files/readme-file-best-practices.html

### 13. Use descriptive, intention-revealing names that stay COHERENT with comments/docstrings/behavior, and treat stale or misleading docs as defects, not just missing ones.  _[moderate]_
- **Why:** LLM quality ratings are causally sensitive to naming and to coherence among names/comments/docs/behavior (Simoes & Venson, arXiv:2507.05289). Misleading task comments caused the LARGEST measured quality drop (up to 26.7 points, 'Don't Judge Code by Its Cover') — so an inaccurate comment is doubly dangerous: it games naive judges AND is the biggest penalty once detected. The operative property is ACCURACY, which helps human maintainers regardless of the judge.
- **How:** In CI/code review, flag docstrings/comments that contradict current behavior. Sanity-check naming by having another dev (or an LLM) guess usage from the name alone. Keep names descriptive but NOT artificially long (length inflation is a known gaming exploit, not quality). Note LLM-score run-to-run variance is ~9-15%, so prefer rules with type-system/human grounding over single-score gains.
- **Example:** Rename `connect(timeout)` to `connect(connect_timeout_ms)` so the name dictates correct usage; if a docstring says a function returns sorted results but it doesn't, fix one of them — don't ship the contradiction.
- **Sources:** https://arxiv.org/abs/2507.05289, https://arxiv.org/abs/2505.16222

## Checklist
- [ ] README order is highest-signal-first: Title, one-line What (<120 chars), badges, Why, (ToC if >100 lines), Install, Usage, extras, Maintainers, Contributing, License LAST
- [ ] A copy-paste-clean runnable quick-start sits above the fold: exact install command + a 3-10 line snippet with language tag, no '...', no '$' prompts, no missing imports
- [ ] Explicit Why (differentiation) and a one-line When/status (alpha/beta/MVP/not-production) are present and substantive, not empty stubs
- [ ] A LICENSE file exists and a License section is last in the README
- [ ] Root AGENTS.md exists, hand-written, lean: exact install/run/test/single-test/lint commands + only non-guessable conventions and deliberate-decision gotchas
- [ ] CLAUDE.md is a one-line `See @AGENTS.md` stub or symlink; no build command is duplicated across files
- [ ] Headline and docstring examples are minimal AND complete (import + setup + call + expected output); no pseudo-code
- [ ] Examples run in CI: pyproject has `--doctest-modules`, or a runnable-markdown/doctest job is green
- [ ] `uv sync` + `uv run --extra dev pytest -q` (or equivalent) pass from a clean environment; deps are pinned (uv.lock committed)
- [ ] Reference docs are neutral, mirror code structure, give signatures + types + error schemas + an example, and omit implementation bodies
- [ ] No 'non-information' lines that merely restate a symbol name; each public symbol has behavior + precondition + example
- [ ] Headings/sections are self-contained: concept names restated, cross-references explicit, no 'see above' dependencies
- [ ] Cross-cutting rationale lives in numbered, immutable ADRs (docs/adr/NNNN-*.md, Nygard fields), referenced by number from code
- [ ] Architecture diagrams are inline Mermaid (not binary), self-describing (titles, labelled arrows with protocol), at C4 context/container altitude
- [ ] No embedded directory tree / file-by-file map in instruction files — replaced by pointers to real exemplar paths
- [ ] Markdown is clean and skimmable; every section is load-bearing; badges are 3-6, live, and linked
- [ ] Names are intention-revealing and coherent with comments/docstrings/behavior; no comment contradicts current code

## Anti-patterns
- Padding the README/docs/comments for length or 'thoroughness' to exploit verbosity bias — fragile and increasingly backfiring as judges trend to conciseness (AlpacaEval added length-controlled win rates precisely because length inflated scores); Gloaguen shows verbose context cuts agent success and raises cost >20%
- Stuffing empty placeholder sections (Why/When/Roadmap/FAQ) purely to look complete — a careful judge penalizes empty formatted structure as filler
- Stacking 8+ decorative/vanity badges or hand-edited static 'build passing' images; badge walls push the description below the fold and the static badge is gameable, not a real health signal
- Templating a docstring onto every function — signature-echoing 'information-less' headers add nothing and are detectable (arXiv:2401.07704)
- Auto-generating a giant ARCHITECTURE.md / AGENTS.md / CLAUDE.md to look thorough — LLM-generated context files REDUCE agent task-success ~3% and raise cost >20% (ETH-Zurich AGENTBENCH)
- Embedding directory trees / file-by-file maps / per-class top-level diagrams in docs — they rot on the next refactor and stale structural references actively mislead (present in this repo's README lines 76-98)
- Headline examples with '...' elision or pseudo-code that look polished but cannot execute — they fail the instant anyone (or an agent) runs them
- Many near-duplicate lookalike examples to farm length bias — retrieved SIMILAR snippets can degrade LLM task accuracy up to 15%
- Inflating identifier length or adding dead/dummy functions to lift a judge score — measured gaming exploits (longer names bias from 2 chars on; 8 dummies raised accuracy 79.67% -> 89.33%) that degrade real maintainability
- Adding self-declared-correctness/authority comments ('# correct implementation', '# written by an expert', '# per PEP 8' on unrelated code) — shifts naive scores up to ~+26% on identical code without improving it
- Inaccurate or stale comments/docstrings that contradict the code — doubly bad: they game naive judges AND cause the largest measured quality penalty (up to -26.7 points) once detected
- Binary diagram assets (PNG/JPG/draw.io XML) as the only architecture artifact — a text-only evaluator cannot read them and XML burns far more tokens with noisy diffs
- Announcing 'we follow Diataxis' or similar authority labels as a substitute for actually separating the four doc types — an unearned authority cue, not real structure
- Cramming a 300-line API dump or design essay into the README instead of linking out to reference/explanation — produces the unstructured-wall failure mode
- Editing an already-accepted ADR in place instead of superseding it with a new numbered record — destroys the rationale trail
- Overusing `# doctest: +SKIP`, which silently converts a 'tested example' back into unverified prose and defeats the CI guarantee