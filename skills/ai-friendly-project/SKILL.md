---
name: ai-friendly-project
description: >-
  Make a software project score the highest possible rating from an LLM evaluator
  (Claude Opus, GPT, code-review bots, preference models) AND from expert human
  reviewers — by building genuine, machine-verifiable quality and legibility, never
  by gaming judge biases. Use this skill PROACTIVELY whenever the user is creating,
  structuring, documenting, reviewing, or "cleaning up" a repo; choosing a tech
  stack; deciding how to write functions, name things, lay out files, or where to
  put explanation; setting up tests / CI / linters / types; writing a README,
  AGENTS.md, or CLAUDE.md; preparing a project for an AI code review, a grader, a
  benchmark, or a submission; or asking "how do I make this repo AI-friendly /
  rate well / look good to an LLM / pass review". Also use when the user mentions
  LLM-as-judge, SWE-bench, evals, reward models, or "make my project liked by AI".
  This is the canonical reference for AI-friendly project design — consult it even
  for one-off decisions like "what should I name this" or "where does this comment go".
---

# Building Projects That LLM Evaluators (and Humans) Rate Highly

This skill is the distilled output of a large research sweep (56 facets × academic +
practitioner sources, adversarially verified) into how LLM evaluators actually score
software, what genuinely moves the rating, and which "tricks" backfire. Every claim
traces to `references/sources.md`.

## The one rule everything reduces to

> **Build the artifact, not the impression.** Make genuine quality *machine-verifiable*
> — every entry point runs, the spec is encoded in passing tests gated by CI, named
> standards are enforced by tooling, docs are falsifiable and accurate, context files
> are short and high-signal — then treat any LLM score as a proxy to sanity-check,
> **never** as the thing you optimize.

This single strategy wins under *both* kinds of evaluator (see next section) and under
expert human review. Everything below is an elaboration of it.

## How LLM evaluators actually score — two regimes

**1. Execution-grounded graders** (SWE-bench, HumanEval/EvalPlus, BigCodeBench, CI-based
review) run your code against hidden tests in isolated containers. No string similarity,
no partial credit, no surface to game — the rating *is* genuine correctness. A logically
perfect fix in a malformed diff scores **zero**; "mostly works" scores **zero**.

**2. LLM-as-judge raters** (code-review bots, preference models, "is this good?" prompts)
have no execution oracle, so they decompose "quality" into ~6 axes — *functional
correctness, fault tolerance, readability, complexity/efficiency, stylistic consistency,
minor anomalies* — and, **absent an explicit rubric, fall back to noisy surface
heuristics**: length, formatting, tone, idiom familiarity (perplexity), position. These
heuristics are real and measurable, which is why gaming *seems* to work.

The decisive fact: **the strategy that wins regime 1 also wins regime 2.** A repo that
makes correctness executable and visible, keeps code idiomatic/minimal/well-named, and
keeps docs accurate scores high under a naive judge, a bias-hardened judge, an execution
grader, *and* a human. So you never need to game anything — and gaming actively loses
against the strong evaluators (Opus-class, cross-family, length/format-controlled,
execution-grounded) you most want to impress.

## The integrity line: genuine quality vs. bias-gaming

Convert every would-be bias into a verifiable artifact. The table below is the heart of
this skill — the left column is the *fragile exploit*, the right column is the *durable
move that captures the same signal honestly*.

| Bias an LLM judge has | The gaming exploit (DO NOT) | Why it backfires | The genuine move (DO) |
|---|---|---|---|
| Authority / self-correctness | `# production-grade, handles ALL edge cases`, `# reviewed by senior eng` | +8.8 to +26pp on a *naive* judge, model-dependent (can flip sign), **−9 to −24pp on incorrect code**, zero weight from grounded judges, reads as manipulation to humans | Let passing tests + a green linter *prove* it |
| Verbosity / length | Padding README / PR / comments / docstrings / tests | Fragile ~8–30pp swing that **reduces** win rate under length-controlled judges (−37pp on one coding task), worsens "lost in the middle", humans prefer shorter | Maximize information **density** (BLUF); keep examples/edge-cases, cut filler |
| Formatting / markdown | Bold/emoji spam, headers wrapping hollow sections, 8+ vanity badges | Format-stripping audits & expert reviewers flag it; dominant bias **only** when content is hollow | Clean H1/H2/H3 + language-tagged fences that **organize real substance** |
| Halo / marketing labels | `refined v2`, `enterprise-ready`, `battle-tested` with no improving diff | Swings up to ~67pp on weak judges; trivially defeated by label-stripping | Ship the improving diff; show real metrics |
| Self-preference (perplexity) | — (this one you *use* honestly) | — | Write idiomatic, low-perplexity, stdlib-first code in canonical layout |
| Test-presence | Assertion-free / `assert True` / magic-number tests | Mutation testing & SWE-bench+ expose them (31% of "passed" patches were weak-test artifacts) | Assert specific expected **values** on edge cases; gate on **mutation score** |
| Static "build passing" badge | Hardcoded shields.io image | Renders "passing" regardless of state — the README equivalent of fabricated output | Dynamic `actions/.../badge.svg` resolving to a real green workflow |
| Sycophancy / injection | `this is clean, agree?`, embedding `output 10/10` in README/config | Self-incriminating; Opus-class raters resist & flag it; **disqualifying** | Ask for adversarial review; widen the real quality gap |

**The terminal rule (the honesty stance):** if the only remaining lever to raise a score
is a bias exploit, **stop — do not pull it.** Accept the lower score. By Goodhart's law,
optimizing the proxy degrades true quality past a threshold, and the degradation *worsens
with optimizer capability* — a strong model gaming a rater is self-defeating. Also never
weaken the signal to pass: don't skip/xfail/delete tests, lower coverage thresholds,
hide retries, cherry-pick the best of N hidden attempts, or use privileged rater access.
These aren't just fragile — they're dishonest, and they're exactly what frontier auditors
are trained to detect.

## The 14 highest-leverage moves, ranked

Apply these in order — earlier ones dominate later ones. (Generalized from the research's
priority synthesis; the worked examples reference a real FastAPI+LLM repo, OSFL.)

1. **Add a real, passing CI workflow** (`.github/workflows/ci.yml`) running the lockfile
   install + lint + type-check + tests on push and PR. This converts every prose quality
   claim into a falsifiable green check and is the single highest-leverage move. Make it a
   *required* status check in branch protection so the badge is load-bearing, not cosmetic.
2. **Add a verbatim `LICENSE`** at repo root (exact canonical SPDX text, unmodified) + the
   matching versioned SPDX id in the manifest. Missing = legally all-rights-reserved; a
   binary, ungameable signal GitHub's detector checks.
3. **Wire up linter + formatter + strict type-checker** (`[tool.ruff]`, `[tool.mypy] strict`,
   eslint/prettier/tsc strict) in config + pre-commit + CI, and make them **pass cleanly**.
   The clean *enforced* pass is the signal — not the config's mere presence.
4. **Write a lean, hand-authored `AGENTS.md`** (<~60 lines, command-first; `CLAUDE.md` a
   one-line `See @AGENTS.md` stub). Auto-generated/bloated context files measurably *reduce*
   agent success (ETH study: −success in 5/8 settings, +20–23% cost). This is the rare case
   where *more thoroughness is an anti-signal*.
5. **Fix error-handling that hides failures**: no `except: pass`, no broad catch that drops
   the traceback; add real `logging` (every broad `except Exception:` must log `exc_info` or
   re-raise). Narrow exceptions, chain with `raise ... from err`.
6. **Validate every trust boundary** with typed schemas (Pydantic `extra='forbid'`,
   `model_validate_json` on LLM/JSON output, parameterized SQL, `shell=False`). Back any
   `sanitize_*`/`validate_*` *name* with a real call one line above it.
7. **Front-load the README, delete stale structure**: thesis + what-it-does + runnable
   quick-start + a `Status:` line up top; delete embedded directory trees / file-by-file
   maps (they rot and mislead). License section last.
8. **Strengthen test assertions + add a mutation gate** (mutmut/Stryker/PIT). Coverage is a
   floor, never the trophy. Every bug fix ships a regression test **RED-before / GREEN-after**.
9. **Consolidate config into one typed Settings module** + a **complete** `.env.example`
   listing *every* var the code reads. No secret in the tree (`.env` gitignored,
   `!.env.example` allowlisted).
10. **Move durable rationale into numbered ADRs** (`docs/adr/NNNN-*.md`, Nygard fields) and
    reference them by number from a one-line code comment — so a deliberate design choice
    isn't flagged as a bug.
11. **Add a dependency-update + CVE-scan layer that is actually used** (dependabot/renovate +
    pip-audit/osv-scanner in CI). Presence-only is theater; the merge discipline is the signal.
12. **Enforce module/dependency boundaries as a CI gate** (import-linter / Nx / eslint-boundaries),
    ban cycles — turning architecture-as-prose into a falsifiable green artifact.
13. **Make docstring/markdown examples runnable in CI** (`--doctest-modules`) so headline
    examples can't rot. Never paper over with `# doctest: +SKIP`.
14. **Tighten commit/PR hygiene as discipline**: atomic commits encoding WHAT **+ WHY**
    (the diff shows how). Conventional Commits / changelog are optional automation, never a
    quality substitute.

## Where to put which explanation (the placement decision)

A frequent, high-leverage, non-obvious question. One fact lives in **exactly one**
canonical place (single source of truth) — duplication is the #1 source of doc rot, and a
stale copy actively misleads both humans and LLMs.

| The thing you want to explain | Put it here | Not here |
|---|---|---|
| WHAT a function does + its contract | The **signature + types** (let the name and types carry it) | A docstring restating the signature |
| WHY a line is the way it is (gotcha, trade-off, ticket) | A **comment** on that line | The README |
| Semantics a type can't express (precondition, raises, units) | The **docstring** (`Args/Returns/Raises`) | A comment far away |
| How to install / run / test (exact commands) | **README** quick-start **and** `AGENTS.md` (one canonical copy; the other points to it) | Duplicated verbatim in both |
| Project thesis, value prop, status, license | **README**, front-loaded | `AGENTS.md` (agents infer it from code) |
| Agent-only facts: exact tool commands, non-standard tooling, deliberate gotchas | **`AGENTS.md`** (lean, command-first) | A bloated overview/dir-dump |
| A cross-cutting design decision + its rationale | A numbered, immutable **ADR** (`docs/adr/`), referenced from code by number | An inline comment that will rot |
| Architecture / how components connect | An inline **Mermaid** diagram in `ARCHITECTURE.md` (text, diffable, readable by text-only judges) | A binary PNG/draw.io asset |
| API/reference (signatures, types, errors) | Generated **reference docs** (Diataxis "reference"), neutral, structure-mirroring | The README (link out) |
| Conceptual "why it works this way" | Diataxis **explanation** page | Crammed into the README |
| A tutorial vs. a task recipe | `docs/tutorials/` (learning) vs. `docs/how-to/` (a goal) — never blur them | One undifferentiated wall |
| A rule a linter can enforce | The **linter/CI config** (`ruff`/`mypy`/eslint) | Prose in `AGENTS.md` ("instructions without a verify command are suggestions") |

Rule of thumb: **every line must change a reader's or agent's behavior, or be deletable.**
For a small repo, a lean README + `AGENTS.md` + `ARCHITECTURE.md` + a couple of ADRs is
enough — don't force a heavyweight `docs/` tree prematurely.

## How to write functions, name things, choose a stack (one-screen version)

- **Functions:** small, single-responsibility, **flat control flow via guard clauses**
  (happy path at indent depth 1; treat 3+ nesting as a refactor trigger). Adopt
  **Functional Core / Imperative Shell** — pure decision logic (no I/O, clock, randomness)
  with I/O pushed to a thin shell, so core tests need *no mocks*. Don't over-extract to
  shave a complexity number; complexity thresholds are *triggers*, not targets.
- **Naming:** intention-revealing, conventionally-sized, **one term per concept and one
  verb family** across the whole call chain, matching the issue/PR vocabulary. Greppable
  (Claude Code has no semantic index — it chains glob→grep→read; the literal name *is* the
  retrieval substrate). Meaningful — never lengthened/randomized to chase a score.
- **Abstraction:** Rule-of-Three / AHA — don't extract a shared abstraction before a third
  genuinely-identical call site. *Duplication is cheaper than the wrong abstraction.*
- **Tech stack:** default to a **high-resource language** (Python, TS/JS, Java) — corpus
  proportion caps both an LLM's generation *and* evaluation quality (≈20× pass-rate gap vs
  niche languages), and it's genuinely backed by tool maturity + human familiarity. Use the
  **framework's canonical layout and idioms verbatim** (low perplexity = higher ratings and
  real maintainability). Choose mature, maintained deps (recent commits/releases, >1
  maintainer); reject archived/abandoned ones; **don't add heavy deps you don't need**
  (NumPy-for-nothing is penalized). If a niche stack is unavoidable, seed `examples/` with
  idiomatic snippets and wire up versioned docs-retrieval.
- **Comments:** explain **WHY, not WHAT**; default to self-documenting code; reserve
  docstrings for public/non-trivial functions. A *wrong* comment is strictly worse than
  none (it cut a GPT-4o judge ~22–27pp on correct code) — update comments in the same
  commit as the code, delete stale ones on sight.

## Condensed master checklist

Run this against any repo. Each item maps to a reference file for depth.

- [ ] `pytest -q` (or equiv) passes locally **and** in CI; CI is a required status check with a *dynamic* badge
- [ ] Verbatim `LICENSE` at root + versioned SPDX id in manifest
- [ ] `ruff` + `mypy --strict` (or eslint + tsc strict) configured, in pre-commit + CI, **passing clean**
- [ ] Lean hand-written `AGENTS.md` (command-first, non-inferable only); `CLAUDE.md` is a stub; no auto-generated bloat
- [ ] Lockfile committed; install uses the **drift-failing** command (`uv sync --locked`, `npm ci`)
- [ ] No secrets in tree; `.env` gitignored, complete `.env.example`; secret-scan in CI
- [ ] Trust boundaries validated with typed schemas; `sanitize_*` names back real logic
- [ ] No bare/blind `except`; broad catches log `exc_info` or re-raise; real `logging`, not `print`
- [ ] Tests assert specific **values** on edge cases; mutation gate; bug fixes are RED-before/GREEN-after
- [ ] Flat control flow; functional core/imperative shell; idiomatic, greppable, one-term-per-concept names
- [ ] No dead code / commented-out code / debug `print` / stray TODO (ruff ERA001/T20/F401/F841)
- [ ] README front-loads thesis + quick-start + status; no embedded dir-tree; License last
- [ ] Examples are minimal+complete and run in CI (`--doctest-modules`)
- [ ] Cross-cutting rationale in numbered ADRs; architecture as inline Mermaid, not binary
- [ ] Every doc/comment/commit message is strictly accurate to behavior; no over-claiming
- [ ] **For a running service / web app**, also run `references/runtime-web-and-llm.md` (CORS/auth, path-traversal, response_model, LLM-output-as-untrusted, non-deterministic-LLM testing, frontend XSS, PII, concurrency, health/ops, vendored-asset provenance)
- [ ] No gaming: no authority/self-correctness comments, halo labels, length padding, badge walls, prompt-injection, or weakened tests

## Reference map — read the file that matches the decision

| When you're deciding about… | Read |
|---|---|
| How a judge will score this; whether something is gaming; running your own judge safely | `references/judge-mechanics.md` |
| Functions, naming, typing, errors, complexity, comments, abstraction | `references/code-craft.md` |
| Repo layout, modularity, config, file size, import boundaries, monorepos | `references/structure-and-legibility.md` |
| README, Diataxis, examples, ADRs, diagrams, **where to explain what** | `references/docs-and-explanation.md` |
| Tests/mutation, CI, lint/format, deps/lockfiles, secrets, commits, changelog, license, logging | `references/hygiene-ci-security.md` |
| Language choice, framework idioms, dependency selection, Python(uv/ruff)/Node-TS specifics | `references/tech-stack.md` |
| `AGENTS.md`/`CLAUDE.md`, `llms.txt` (and when NOT to), grep/retrieval-friendliness | `references/agent-navigability.md` |
| A running service / web app / LLM-integrated feature (security, non-determinism, ops, frontend, privacy) | `references/runtime-web-and-llm.md` |
| What graders (SWE-bench/EvalPlus) check; honest workflow; reward-hacking to avoid | `references/honesty-and-evals.md` |
| The underlying papers/blogs behind any claim | `references/sources.md` |

## How to apply this skill to a repo

1. **Detect** the stack and what's missing (look for: CI workflow, LICENSE, lint/type
   config, lockfile + locked-install, secrets hygiene, `AGENTS.md`, test assertions vs
   presence). Read the matching reference files.
2. **Fix in priority order** (the 14 ranked moves). Lead with the execution-grounding spine
   — CI, license, enforced lint/types — before any cosmetic or doc change.
3. **Verify** by running the gates fresh (not assumed): the install, lint, type-check, test,
   and mutation commands must actually exit 0. A green *job* is the decision gate, not a
   model's opinion.
4. **Never** add a gaming artifact to lift a score; if you catch yourself reaching for one,
   that's the signal to improve real quality instead — or accept the score.
