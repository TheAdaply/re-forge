<!-- Reference for the `ai-friendly-project` skill. Evidence-graded rules (strong/moderate/weak) with Why/How/Example/Sources. Worked examples cite a real FastAPI+LLM repo (OSFL); treat repo-specific line numbers as illustrations of the general rule. Citations resolve in references/sources.md. -->

# Engineering hygiene & CI

_Tests/mutation, CI, lint/format, deps/lockfiles, secrets, commits, changelog, license, logging_

**Overview:** LLM evaluators (and the human reviewers they imitate) rate a project on signals of disciplined, reproducible engineering: a runnable test suite, a live CI pipeline, clean lint/type passes, a pinned dependency graph, a real LICENSE, structured logs, and an honest changelog. These signals move the rating because the strongest of them are execution-verifiable — an evaluator that actually runs the repo (SWE-bench/SWE-CI style) rewards substance and punishes fakes — while the weakest are pure surface cues that shallow judges over-credit. The central asymmetry of this whole category: PRESENCE is cheap and gameable; DISCERNMENT (does a test kill a mutant? does the badge resolve to a green workflow? does `uv sync --locked` pass? does the LICENSE pass `licensee` detection?) is not. Build for the discerning evaluator — every rule below is genuine quality first, legibility second, and each gaming variant is called out so it can be avoided rather than exploited.

## Rules

### 1. Ship a discoverable tests/ directory in the language's conventional layout (pytest test_*.py, Jest *.test.ts) where every test asserts a specific expected VALUE on edge cases — never merely that code ran or 'no exception was thrown'.  _[strong]_
- **Why:** LLM judges exhibit a measured 'test-case presence bias' that inflates scores merely for HAVING test files, and the bias persists even when the judge is told to focus on correctness. The robust counter-signal — assertions on concrete values at boundaries — is genuine quality every expert reviewer also rewards, so making presence cheap and assertions the real work defeats the exploit honestly.
- **How:** Name tests behaviorally as test_<unit>_<condition>_<expected> (e.g. test_withdraw_insufficient_funds_raises); structure each as Arrange-Act-Assert with one behavioral concern; assert exact values with a behavior-describing message (assert result == EXPECTED, f'expected {EXPECTED}, got {result}'); replace magic-number literals with named constants; use @pytest.mark.parametrize with descriptive ids= for boundaries instead of duplicating functions.
- **Example:** SECONDS_PER_DAY = 86_400  # named constant kills Magic Number Test

def test_to_seconds_one_full_day_returns_86400():
    duration = Duration(days=1)          # Arrange
    result = duration.to_seconds()       # Act
    assert result == SECONDS_PER_DAY, f'expected {SECONDS_PER_DAY}, got {result}'  # Assert
- **Sources:** https://arxiv.org/pdf/2505.16222, https://automationpanda.com/2020/07/07/arrange-act-assert-a-pattern-for-writing-good-tests/, https://arxiv.org/html/2410.10628v1

### 2. Treat mutation score, not line/branch coverage, as the real test-quality gate; run a mutation tester in CI and drive surviving mutants toward zero by adding assertions on outputs and exception paths.  _[strong]_
- **Why:** Coverage measures execution, not validation — documented cases show 100% coverage with ~4% mutation score, and a Google ICSE 2021 study of ~15M mutants established mutant-fault coupling and that developers exposed to mutants write stronger tests. A surviving mutant is a falsifiable, tool-backed proof that a test asserts too little; it is the textbook expert counter to coverage theater and is hard to fake.
- **How:** Use mutmut or cosmic-ray (Python), PIT/pitest (Java/Kotlin), or Stryker (JS/TS/.NET). Configure paths_to_mutate to src only (never mutate test files), run in CI, and gate the PR on surviving-mutant count. Add assertions until each survivor dies.
- **Example:** [tool.mutmut]
paths_to_mutate = "osfl/"
tests_dir = "tests/"
runner = "python -m pytest -q"
# CI: `mutmut run` then `mutmut results`; gate on surviving-mutant count, not a coverage badge.
- **Sources:** https://homes.cs.washington.edu/~rjust/publ/mutation_testing_practices_icse_2021.pdf, https://deployed.pl/blog/mutation-testing-in-python, https://www.sonarsource.com/resources/library/code-coverage-unit-tests/

### 3. For every bug fix, add at least one regression test that FAILS on the old code and PASSES on the new, and say so explicitly; never ship a test that passes on both buggy and fixed versions.  _[strong]_
- **Why:** SWE-Bench+ found 31.08% of 'passed' patches were suspicious due to weak tests; filtering them dropped one agent's resolution rate from 12.47% to 3.97%. Fails-before/passes-after is the canonical definition of a useful regression test (the fault-coupling principle) and directly defeats the 'green = correct' judge exploit, which a passes-on-both test silently feeds.
- **How:** Write the test against the pre-fix code first and confirm it is RED; apply the fix; confirm it is GREEN. Assert the corrected behavior AND any invariant the bug violated (e.g. state unchanged on a rejected operation). State 'was RED before fix' in a comment or the PR.
- **Example:** def test_withdraw_rejects_overdraft_after_fix():
    acct = Account(balance=100)
    with pytest.raises(InsufficientFunds):
        acct.withdraw(150)   # buggy version silently allowed this -> RED before fix
    assert acct.balance == 100, 'balance must be unchanged on rejected withdrawal'
- **Sources:** https://arxiv.org/pdf/2410.06992

### 4. Do not advertise a coverage percentage as the headline proof of quality; target meaningful coverage of complex/high-risk logic, exclude trivial getters and generated code, and pair any coverage number with a mutation score.  _[strong]_
- **Why:** Coverage is not a quality metric and rigid 95-100% targets incentivize assertion-free, try/catch-wrapped gaming. Framing coverage around critical paths and openly admitting what is untested is genuine engineering credibility that reads as honest to both expert humans and discerning LLMs.
- **How:** If you gate coverage in CI (e.g. pytest --cov --cov-fail-under=80) treat it as necessary-not-sufficient; never inflate it with smoke tests or hard-module exclusions. Keep mutation score as the primary test-quality signal and coverage as a coarse floor.
- **Example:** # pyproject.toml — coverage as a floor, not a trophy
[tool.pytest.ini_options]
addopts = "--cov=osfl --cov-report=term-missing --cov-fail-under=80"
# README: state which modules are intentionally untested and why; show mutation score alongside.
- **Sources:** https://www.sonarsource.com/resources/library/code-coverage-unit-tests/, https://homes.cs.washington.edu/~rjust/publ/mutation_testing_practices_icse_2021.pdf

### 5. Make tests deterministic: use explicit waits or mocks instead of time.sleep, isolate shared state and test order, and run with pytest-randomly to surface order dependence — quarantine and fix flaky tests rather than re-running until green.  _[moderate]_
- **Why:** Determinism is genuine engineering rigor and is directly checkable (do tests pass under reordering and parallelism?). Assertion Roulette and order/async-wait smells are measured top predictors of flaky tests; flaky suites erode an evaluator's trust in the green check.
- **How:** Install pytest-randomly; replace time.sleep with explicit conditions/mocks; ensure no test depends on another's side effects; mock external I/O and clocks. (The exact root-cause percentages cited in some blogs are single-source — treat the direction as solid, not the precise splits.)
- **Example:** # Bad: brittle real sleep
# time.sleep(2); assert job.done
# Good: deterministic poll/mock
with freeze_time('2026-06-03'):
    result = scheduler.run_due()
assert result.ran == ['daily-report']
- **Sources:** https://arxiv.org/pdf/2108.11781, https://www.r-bloggers.com/2026/06/11-test-smells-that-make-your-tests-lie-to-you/

### 6. Set up a real CI pipeline (.github/workflows/*.yml) that runs tests, linter, and type-checker on every push and pull_request, and wire it into branch protection as a required status check.  _[strong]_
- **Why:** In a 500-project study, 70% of popular GitHub repos use CI and CI projects release ~2x more often; CI gates catch issues human review misses. Branch protection converts the green check from cosmetic to load-bearing ('broken code cannot reach main'), which is what makes the badge on merged PRs trustworthy. Modern evaluators literally use 'tests/CI pass' as ground truth.
- **How:** Create .github/workflows/ci.yml with named jobs (lint -> test -> build/security) on push and pull_request; in Settings -> Rulesets require status checks to pass before merge with strict 'up to date' mode and >=1 review; document required checks in CONTRIBUTING.md. Ensure required job names are unique across workflows.
- **Example:** # .github/workflows/ci.yml (uv-managed Python)
on: [push, pull_request]
permissions: { contents: read }
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<40-char-sha>  # v4
      - run: uv sync --locked
      - run: uv run ruff check . && uv run mypy osfl && uv run pytest --cov=osfl --cov-fail-under=80
- **Sources:** https://www.cs.ucdavis.edu/~filkov/papers/CI_adoption.pdf, https://www.swebench.com/original.html, https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches

### 7. Use dynamic, pipeline-backed status badges in the first screenful of README.md — the live GitHub Actions endpoint, NOT a static shields.io 'build-passing-brightgreen' image.  _[strong]_
- **Why:** Non-trivial assessment badges (build/coverage/dependency) correlate with more tests, better PRs, and fresher dependencies — but ONLY when wired to a real pipeline. A dynamic badge renders live state and is falsifiable by clicking through; a static label renders 'passing' regardless of build state and is the README equivalent of fabricated test output, which flips into the gaming category.
- **How:** Use `![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)` so the URL resolves to an actual workflow file a reviewer can verify is green. Limit badges to a few real ones (build, coverage from Codecov/Coveralls, dependency freshness from Dependabot); avoid decorative/vanity badge walls.
- **Example:** ![CI](https://github.com/Akasxh/OSFL/actions/workflows/ci.yml/badge.svg)
# NOT: ![build](https://img.shields.io/badge/build-passing-brightgreen)  <- renders 'passing' regardless of state
- **Sources:** https://cmustrudel.github.io/projects/badges/, https://github.com/dwyl/repo-badges

### 8. Add a real linter + static-analyzer (Python: ruff for lint/format + bandit-style S rules; or pylint) and make it pass CLEANLY — ruff check, type check, and security rules must exit 0 on the current tree. The signal is the clean pass, not the file's existence.  _[strong]_
- **Why:** Iterative Pylint+Bandit fixing on LLM-generated code cut readability violations from >80% to 11%, security from >40% to 13%, and reliability from >50% to 11% over 10 iterations — gains orthogonal to functional correctness, on dimensions expert reviewers also weight. A genuine lint pass also mechanically deletes the dead-code and bad-naming artifacts that LLM-judge biases (illusory complexity, variable renaming) feed on, so it is simultaneously a quality gain and a de-gaming step.
- **How:** Use a curated ruff select rather than defaults: ['E','W','F','I','B','UP','S','SIM','RUF'] (bugbear, security, simplify, pyupgrade, isort). Use per-file-ignores for tests (S101 asserts) rather than disabling rules globally. Run ruff check and bandit in CI on every PR.
- **Example:** [tool.ruff.lint]
select = ["E","W","F","I","B","UP","S","SIM","RUF"]
[tool.ruff.lint.per-file-ignores]
"tests/**" = ["S101"]  # asserts are fine in tests
- **Sources:** https://arxiv.org/abs/2508.14419, https://github.com/PyCQA/bandit

### 9. Commit a root .pre-commit-config.yaml (ruff-check with --fix BEFORE ruff-format, rev pinned) and mirror it in CI with pre-commit run --all-files so the gate cannot be bypassed locally; consolidate all tool config into a single pyproject.toml.  _[strong]_
- **Why:** Hook ordering is a correctness requirement: ruff's docs state the lint hook with --fix must run before the formatter (because --fix can emit code needing reformatting); the wrong order produces reformatting churn a competent reviewer flags. A committed-but-unenforced config is a cheap, gameable signal — a passing required check is the costly-to-fake one. One pyproject.toml means fewer files an evaluator/agent must fetch to reconstruct the setup.
- **How:** Pin rev: to a specific version. Put [tool.ruff], [tool.ruff.lint], [tool.ruff.format], [tool.mypy], [tool.pytest.ini_options] in pyproject.toml instead of scattering setup.cfg/.flake8/mypy.ini. Set explicit line-length and target-version. Add a [tool.mypy] block (strict for new code, graduated per-module overrides for untyped deps).
- **Example:** repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.15.15
    hooks:
      - id: ruff-check
        args: [--fix]
      - id: ruff-format
- **Sources:** https://github.com/astral-sh/ruff-pre-commit, https://github.com/dwyl/repo-badges

### 10. Add an AGENTS.md (and/or CLAUDE.md) at repo root with an early 'Build & Test' section listing the EXACT copy-pasteable verification sequence, and instruct that it be run before marking work ready.  _[strong]_
- **Why:** Exact runnable commands let an evaluator agent reproduce setup and verification with zero guesswork — config that exists but is undiscoverable does not help. This is the de-facto convention at leading labs (openai-agents-python mandates a make format/lint/typecheck/tests sequence before completion), and a GitHub analysis of 2,500+ repos found precise commands like 'pytest -v' correlate with agent success vs vague instructions. Keep it tight and non-redundant with the README — do not auto-generate a wall of prose.
- **How:** List literal commands with flags and how to run a single test; name the package manager (uv); state directory responsibilities and do-not-touch boundaries; place a nested AGENTS.md in each subproject (agents read the nearest file).
- **Example:** ## Build & Test
Run before marking work ready:
    uv sync
    uv run ruff check . && uv run ruff format --check .
    uv run mypy osfl
    uv run pytest -v
Single test: uv run pytest tests/test_engine.py::test_name -v
- **Sources:** https://github.com/openai/openai-agents-python/blob/main/AGENTS.md, https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/

### 11. Commit a lockfile that pins the COMPLETE transitive closure with exact versions (uv.lock, package-lock.json, pnpm-lock.yaml, Cargo.lock, go.sum); keep flexible ranges in the manifest and let the lockfile capture the frozen state. Never gitignore the lockfile for an application repo, and never hand-edit a tool-managed lock.  _[strong]_
- **Why:** In a 300-project LLM-agent study only 68.3% of generated projects ran out-of-the-box, with declared deps (~3) vs actual (~37) a 13.5x gap; lockfiles are the recommended fix and yield reproducible clean-env installs. Counterintuitively, hard-pinning direct deps in the manifest while omitting a lockfile is the worst-of-both-worlds: 'Pinning Is Futile' (FSE 2025) shows it raises maintenance cost and, in large npm graphs (498+ deps), can increase malicious-update exposure.
- **How:** Keep compatible ranges in pyproject.toml/package.json; commit the lockfile; regenerate it via the tool, never by hand; avoid mixing package managers or stale duplicate lockfiles. Prefer lockfiles carrying per-package integrity hashes (sha512 / sha256); for pip use pip-compile --generate-hashes and pip install --require-hashes.
- **Example:** # Repo root: pyproject.toml (ranges) + committed uv.lock (exact transitive closure, ~199KB).
# Node equivalent: package.json (ranges) + committed package-lock.json (exact + sha512 integrity).
- **Sources:** https://arxiv.org/abs/2512.22387, https://arxiv.org/abs/2502.06662, https://docs.astral.sh/uv/concepts/projects/layout/

### 12. Install with a frozen/locked command in CI and Docker that FAILS on lockfile-manifest drift, not the permissive default: uv sync --locked (or uv lock --check), npm ci, pnpm install --frozen-lockfile, yarn install --immutable.  _[strong]_
- **Why:** This proves the lock is authoritative and yields deterministic environments. uv's --locked raises an error if the lockfile is stale (the drift-detection flag); npm ci installs exactly package-lock.json and errors on mismatch. The wrong command (npm install / silent re-resolution) is a recognized red flag. NOTE: uv's --frozen uses the lock WITHOUT checking and will NOT catch drift — use --locked for the gate.
- **How:** In every CI and Docker install step, use the verification-enforcing variant. Pair with an automated update mechanism (Dependabot/renovate or scheduled uv lock --upgrade) gated by CI tests, ideally with a maturity cooldown so brand-new possibly-compromised releases aren't pulled instantly.
- **Example:** # CI step that fails loudly on a stale lock
- run: uv sync --locked   # NOT --frozen, which skips the up-to-date check
# Node: - run: npm ci
- **Sources:** https://docs.astral.sh/uv/concepts/projects/sync/, https://www.baeldung.com/ops/npm-install-vs-npm-ci

### 13. Provide ONE canonical, copy-pasteable install/run path with pinned versions, identical on laptop, CI, and Docker — and make sure the documented command actually works clean (document any required env vars/keys). Do not treat a bare Dockerfile as proof of reproducibility.  _[strong]_
- **Why:** With a clear pinned setup, automated env-config success was 86.0% vs 22.1% for README-only and 6.0% for a bare requirements.txt (Repo2Run) — an evaluator that can one-command install/run can actually verify the repo works. But 'Docker Does Not Guarantee Reproducibility' rebuilt 5,298 images and found frequent divergence from :latest tags and unpinned deps; and an agent that runs a claimed 'one-command setup' and hits a missing-key failure rates the repo LOWER. (Repo2Run's exact percentages are single-study — treat as directional.)
- **How:** Document uv sync then uv run <cmd>. Pin the interpreter with a committed .python-version. For Docker, pin the base image by SHA-256 digest (not :latest), pin the uv binary, use the two-stage build (uv sync --locked --no-install-project for a cached deps layer, then COPY source + uv sync --locked), set UV_COMPILE_BYTECODE=1 and UV_LINK_MODE=copy, and add .venv to .dockerignore.
- **Example:** FROM python:3.12-slim@sha256:<digest>
COPY --from=ghcr.io/astral-sh/uv:0.11.18 /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project   # cached deps layer
COPY . .
RUN uv sync --locked
- **Sources:** https://arxiv.org/html/2502.13681v1, https://arxiv.org/abs/2601.12811, https://docs.astral.sh/uv/guides/integration/docker/

### 14. Keep zero secrets in the tree: read config from os.environ / pydantic-settings, gitignore .env (and .env.*) while allowlisting .env.example with placeholders only. A single committed key is a deterministic, binary defect that caps perceived security.  _[strong]_
- **Why:** >100k repos leak secrets, ~99% of detected keys are valid, with a median ~20s to discovery. Expert reviewers and SAST agree this is a real defect, not a judge artifact. This repo already does it right (osfl/llm.py reads OPENAI_API_KEY via os.environ; .gitignore excludes .env/.env.* but allowlists .env.example).
- **How:** Ship .env.example with OPENAI_API_KEY= placeholders. Optionally add a commit-time + CI secret scanner (gitleaks or detect-secrets in .pre-commit-config.yaml plus GitHub push-protection) as defense-in-depth.
- **Example:** # .gitignore
.env
.env.*
!.env.example
# code: os.environ.get("OPENAI_API_KEY")  — never a literal key in source
- **Sources:** https://www.ndss-symposium.org/wp-content/uploads/2019/02/ndss2019_04B-3_Meli_paper.pdf, https://github.com/gitleaks/gitleaks

### 15. Validate every external input at the boundary with allow-lists and back security-suggestive names with real logic: Pydantic models with extra='forbid' and Field constraints, parameterized SQL (never f-strings), subprocess.run([...], shell=False), and a CVE scanner in CI.  _[strong]_
- **Why:** These are exactly the patterns SAST (ruff S-rules, Bandit, Semgrep) and expert reviewers grep for; they defend the most-failed CWEs and are genuinely safer. The honesty caveat is load-bearing: SecLLMHolmes showed a function merely NAMED sanitize_input() with no sanitizer behind it flips an LLM verdict ~26% of the time but is instantly caught by SAST or a human — so the name must sit one line above a real call.
- **How:** Use model_config = ConfigDict(extra='forbid') + Field(max_length=..., pattern=...) and FastAPI response_model= so internal fields can't leak. Add pip-audit / uv-secure / osv-scanner to CI failing on known-vulnerable deps, plus a Dependabot/renovate config. Pair any validate_*/sanitize_* name with the real bleach.clean/shlex.quote/parameterized-query call.
- **Example:** class CreateGoal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(max_length=50, pattern=r'^[a-zA-Z0-9_]+$')
# CI: uvx pip-audit --fail-on medium  (or uv-secure reading uv.lock)
- **Sources:** https://arxiv.org/abs/2506.05692, https://arxiv.org/html/2511.20313v2

### 16. Write commit messages that encode both WHAT changed (imperative subject) and WHY it was needed (body: problem, constraint, rationale). A message that only paraphrases the diff ('update auth.py') carries zero Why and is low quality.  _[strong]_
- **Why:** WHY-presence is the discriminator academic work uses for message quality, and it independently predicts lower defect-proneness: in an ICSE 2023 study, What/Why-poor commits were significantly more likely to be defect-introducing across all history-window sizes. The diff already shows the 'how', so the body must carry intent no diff can reconstruct.
- **How:** Subject ~50 chars, imperative, no trailing period, blank line, body wrapped ~72. Commit one logical change at a time (atomic — the repo should build if rolled back to that commit); split unrelated changes with git add -p / git rebase -i. A linked issue is NOT a substitute (~15% of links carry no Why). This repo's own commit 6473117 is a model: it states the invalid-negative-β-Beta bug and its '>100%' symptom — information no diff conveys — without any Conventional-Commits prefix, proving format != quality.
- **Example:** fix(persona): correct rare-event double count

Tokens were counted in both the seed pass and the resample pass,
inflating low-probability outcomes ~2x and producing >100% conversions.
- **Sources:** https://dl.acm.org/doi/abs/10.1109/ICSE48619.2023.00076, https://cbea.ms/git-commit/

### 17. Adopt Conventional Commits (feat/fix/...! with BREAKING CHANGE:) for a machine-parseable history that drives changelogs and SemVer — but treat the prefix as type/What only, never as the Why or as a quality substitute.  _[moderate]_
- **Why:** It creates a deterministic, auditable link from commit -> version bump -> changelog entry (fix->PATCH, feat->MINOR, BREAKING CHANGE->MAJOR) that an evaluator can verify against the diff. It's moderate not strong because it's a convention, not an outcome-validated predictor, and is cosmetically gameable (tagging everything 'chore:' or mislabeling a feat as fix breaks the grammar's value).
- **How:** Enforce format mechanically with a committed hook (compilerla/conventional-pre-commit at commit-msg stage for Python, or commitlint + Husky for Node) so it installs on clone — but remember the hook enforces FORMAT, not the WHY content. Prefer a clean linear history (rebase, squash WIP/fixup before review) while keeping logically distinct changes separate.
- **Example:** # .pre-commit-config.yaml
- repo: https://github.com/compilerla/conventional-pre-commit
  rev: v3.4.0
  hooks:
    - id: conventional-pre-commit
      stages: [commit-msg]
- **Sources:** https://www.conventionalcommits.org/en/v1.0.0/, https://github.com/compilerla/conventional-pre-commit

### 18. Maintain a CHANGELOG.md at repo root following Keep a Changelog 1.1.0 and version releases per SemVer 2.0.0; automate the release so tag, changelog, and published artifact never drift.  _[strong]_
- **Why:** Keep a Changelog is the de-facto convention reviewers and tooling pattern-match against (six canonical sections, [Unreleased] at top, ISO dates, newest-first, linkable versions, YANKED marker). Correct SemVer bumping is a verifiable correctness property checkable against the API diff (MAJOR for any breaking change), and automation eliminates the human drift that produces mismatched releases. Curate to user-visible changes (real notes document only ~6-26% of issues) — padding to look active CUTS quality.
- **How:** Keep '## [Unreleased]' at top; date each release ISO 8601; state 'This project adheres to Semantic Versioning.' Drive bumps from Conventional Commits via semantic-release or googleapis/release-please in CI on merge to main. Optionally configure .github/release.yml PR-label categories with a 'Breaking Changes' section. Lead each entry with a one-line summary; never ship a breaking change in a minor/patch.
- **Example:** ## [Unreleased]

## [1.2.0] - 2026-06-03
### Added
- Monte-Carlo life-planning engine: outcome = probability x volume.
### Fixed
- Persona seeding no longer double-counts rare events.
- **Sources:** https://keepachangelog.com/en/1.1.0/, https://semver.org/, https://github.com/googleapis/release-please

### 19. Put a single LICENSE file in the repo ROOT, named exactly LICENSE (or LICENSE.txt/COPYING), containing the COMPLETE, UNMODIFIED canonical text of an OSI/SPDX-approved license, and declare the matching SPDX identifier WITH version in the manifest.  _[strong]_
- **Why:** GitHub detection (the Licensee gem) compares the file to known licenses with a CONFIDENCE_THRESHOLD of 98, so wrapper prose or edits drop it below threshold to NOASSERTION; without a license the repo legally reads as all-rights-reserved/unusable. The detector scans root filenames and explicitly IGNORES README 'MIT licensed' prose and manifest license= strings for project detection, so a nested docs/LICENSE or a README mention alone is missed. This repo currently has NO LICENSE — a real legal defect.
- **How:** Copy verbatim from spdx.org/licenses/<id>.txt or choosealicense.com; do not prepend description paragraphs or merge multiple licenses. Set pyproject.toml [project].license to the exact versioned SPDX id ('MIT', 'Apache-2.0', 'GPL-3.0-or-later' — never bare 'GPL'/'Apache'). For deliberate dual-licensing use an explicit SPDX expression ('MIT OR Apache-2.0') and the LICENSES/ layout, never two un-disambiguated root files.
- **Example:** # pyproject.toml
[project]
license = "MIT"
# LICENSE contains the full ~1000-byte canonical MIT text from spdx.org/licenses/MIT.txt
- **Sources:** https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository, https://github.com/licensee/licensee/blob/master/docs/what-we-look-at.md, https://spdx.dev/learn/handling-license-info/

### 20. Use a real logging framework emitting structured (JSON/key-value) logs with semantically-correct severity levels instead of print()/console.log for diagnostics; capture stack traces on errors with logger.exception/exc_info=True; never log secrets/PII.  _[strong]_
- **Why:** Scattered prints read as throwaway code to expert reviewers regardless of any LLM judge, and a logger.error('failed') with no traceback is an undiagnosable defect. The OSFL FastAPI app currently has ZERO logging — errors surface only as HTTPException with no server-side record. Optimize for signal-to-noise, NOT count: a study found agents over-log and humans then repair 72.5% of agent-introduced logs as 'silent janitors', so padding trivial log lines to look 'observable' backfires.
- **How:** Use logging.getLogger(__name__) or structlog; ban raw prints with ruff T20 (flake8-print). Match levels (ERROR=broken, WARN=recoverable, INFO=business event, DEBUG=fine state); keep default INFO, runtime-configurable via LOG_LEVEL; avoid all-INFO/all-ERROR distributions. Attach a request_id/correlation_id; add a redaction processor for password/token/api_key. Write to stdout/stderr and let the platform route (12-factor) for services.
- **Example:** # In an error path that previously raised silently:
except KeyError:
    logger.warning('goal not found', goal_id=goal_id)
    raise HTTPException(404, 'goal not found')
except Exception:
    logger.exception('shot update failed', goal_id=goal_id)  # captures traceback at ERROR
    raise
- **Sources:** https://betterstack.com/community/guides/logging/log-levels-explained/, https://arxiv.org/abs/2604.09409, https://12factor.net/logs

### 21. Avoid obvious algorithmic inefficiency — build a set/dict once for repeated membership checks instead of `x in some_list` inside a loop, and pick the container for the access pattern (sort-then-scan, Counter/deque/heapq) — but do not micro-optimize cold paths.  _[strong]_
- **Why:** Set lookup is ~106,000x faster than list lookup for a missing element; break-even is ~2 lookups. Passing tests is not sufficient — Mercury shows leading code LLMs hit ~65% Pass but <50% on runtime-percentile-weighted scoring, so correctness and efficiency are separate axes, and the documented LLM failure modes are brute-force, wrong data structure, and redundant recomputation. Reserve optimization for measured hot spots (Knuth: forget small efficiencies ~97% of the time); over-optimized unreadable code lowers both human and LLM scores.
- **How:** Use the built-in `in` operator (never a hand-rolled loop); convert lists to sets before repeated lookups; hoist/memoize redundant computation. Enable ruff PERF (perflint) + C4 (comprehensions) + F (dead-code) rules and run vulture for dead code. When you DO optimize a hot path, justify with a benchmark, name the structure for purpose, and add a truthful one-line complexity comment — never an unbacked 'optimized'/'fast' claim.
- **Example:** banned_ids = set(banned_ids_list)        # build once
for u in users:
    if u.id in banned_ids:               # O(1) membership instead of O(n) list scan
        drop(u)
- **Sources:** https://switowski.com/blog/membership-testing/, https://arxiv.org/abs/2402.07844, https://openreview.net/forum?id=suz4utPr9Y

### 22. Pin every GitHub Action to a full 40-char commit SHA with a version comment, and set least-privilege GITHUB_TOKEN permissions (contents: read at workflow level, escalating per-job only where needed).  _[moderate]_
- **Why:** Mutable tags (@v4, @latest, @main) can be repointed to malicious code; a SHA pin is a falsifiable, grep-able supply-chain marker, and as of Aug 2025 GitHub supports org policy to fail workflows using unpinned actions. Least-privilege tokens shrink the blast radius of a compromised step. Both are moderate (secondary hardening, lower-leverage than tests/CI/branch-protection) but valued by security-conscious reviewers.
- **How:** uses: actions/checkout@<sha> # v4.3.1 — never @v4. Set permissions: { contents: read } at the top, adding pull-requests/checks/packages: write per-job only where the job needs it; never contents: write unless the job pushes to the repo. Prefer OIDC Trusted Publishing over long-lived PyPI tokens.
- **Example:** permissions:
  contents: read
jobs:
  test:
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1
- **Sources:** https://github.com/github/awesome-copilot, https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions

## Checklist
- [ ] tests/ uses the conventional layout (test_*.py) and every test asserts a specific expected VALUE, not just 'ran without exception'
- [ ] Test names are behavioral (test_<unit>_<condition>_<expected>), AAA-structured, one concern each, with assert messages and named constants (no magic numbers)
- [ ] A mutation tester (mutmut/Stryker/PIT) runs in CI; surviving-mutant count — not a coverage badge — is the headline test-quality gate
- [ ] Every bug fix ships a regression test verified RED on the old code and GREEN on the new
- [ ] Tests are deterministic: no time.sleep, no shared state; pytest-randomly passes under reordering
- [ ] CI workflow (.github/workflows/ci.yml) runs lint + type-check + tests on push and pull_request
- [ ] CI is a REQUIRED status check in branch protection/rulesets with strict 'up to date' mode and >=1 review
- [ ] README's build badge is the dynamic actions/.../badge.svg endpoint, not a static shields.io label
- [ ] ruff check (with curated select incl. B/S/SIM/UP), type check, and security rules exit 0 on the current tree
- [ ] Committed .pre-commit-config.yaml (ruff-check --fix before ruff-format, rev pinned) mirrored by pre-commit run --all-files in CI
- [ ] All tool config consolidated in pyproject.toml ([tool.ruff], [tool.mypy], [tool.pytest.ini_options])
- [ ] AGENTS.md has a Build & Test section with exact copy-pasteable commands (uv sync; uv run ruff check .; uv run mypy osfl; uv run pytest)
- [ ] Lockfile (uv.lock/package-lock.json) committed, pins the full transitive closure, and is never hand-edited
- [ ] CI/Docker install uses the drift-failing command (uv sync --locked / npm ci), NOT --frozen or npm install
- [ ] The documented one-command setup actually works clean; any required env vars/keys are stated
- [ ] No secrets in the tree; .env/.env.* gitignored, .env.example allowlisted with placeholders
- [ ] External inputs validated at the boundary (Pydantic extra='forbid' + Field constraints); any sanitize_*/validate_* name sits above a real call
- [ ] A CVE scanner (pip-audit/uv-secure/osv-scanner) runs in CI and a Dependabot/renovate config is committed
- [ ] Commit messages encode WHAT + WHY; commits are atomic; bug-fix commits explain the defect the diff can't show
- [ ] CHANGELOG.md follows Keep a Changelog with [Unreleased] + ISO dates; SemVer bumps are correct and releases automated
- [ ] A verbatim LICENSE sits in repo root and passes detection; the manifest carries the matching versioned SPDX id
- [ ] Diagnostics use a logging framework (not print), correct levels, stack traces on errors, redaction of secrets, and no log padding
- [ ] GitHub Actions pinned to full SHAs; GITHUB_TOKEN scoped least-privilege (contents: read at workflow level)

## Anti-patterns
- Padding tests/ with assertion-free or magic-number-only tests that catch zero bugs to exploit the LLM 'test-presence bias' — count discernment (mutants killed, values asserted), not test files
- A 95-100% coverage badge as the headline proof of quality, with coverage inflated by smoke tests, try/catch wrappers, or hard-module exclusions
- Bug-fix tests that pass on BOTH the buggy and fixed code — they add green checks but prove nothing (violate fault coupling)
- A static hardcoded badge (img.shields.io/badge/build-passing-brightgreen or '100% coverage') with no live pipeline behind it — renders 'passing' regardless of state and is the README equivalent of fabricated test output
- Self-declared-correctness comments ('# correct, optimized, handles every edge case') and authority/name-dropping cues in code or commit/PR prose — measured to swing LLM-judge verdicts up to ~26-34pp on functionally identical code
- Illusory complexity: unused dummy/helper functions, dead branches, or scaffolding added to look 'substantial' — more padding = stronger judge bias, and a real ruff F-rule/vulture pass deletes exactly this
- Length/verbosity padding: long near-duplicate or over-parametrized tests, verbose docstrings on trivial code, badge walls, self-justifying PR prose, or trivial log lines at one level — exploits length bias, adds zero fault-detection power, and backfires under length-controlled/mutation-aware review
- A committed lint/pre-commit/coverage config that is NOT enforced (not a required CI check) — presence is cheap; only a clean enforced pass is costly-to-fake
- Hard-pinning every direct dependency to == in the manifest while omitting a lockfile, or using npm install / uv sync --frozen in CI (neither catches drift)
- Aspirational 'one-command setup' prose where the command actually needs undocumented env vars/keys — an agent that runs it and fails rates the repo LOWER
- A bare Dockerfile using :latest with unpinned apt/pip that looks reproducible but rebuilds differently
- Security-suggestive function/variable names (sanitize_input, validate, secure) with no real logic behind them — flips a shallow judge ~26% of the time but is caught instantly by SAST or a human
- A hollow boilerplate SECURITY.md with a dead contact (games keyword-driven Scorecard checks), or any compliance/REUSE badge with no enforcing CI behind it
- Wrapper prose prepended to the LICENSE, a license claimed only in README/manifest with no root LICENSE file, or two un-disambiguated root license files — all yield NOASSERTION
- Commit messages that only paraphrase the diff ('update X'), Conventional-Commits prefixes treated as a quality substitute, or a changelog padded with trivial/marketing entries to look active
- Over-logging / all-INFO or all-ERROR log distributions, logging secrets/PII, and unguarded hot-path log spam
- Micro-optimizing cold paths into bit-twiddling/unrolled code that obscures intent, and unbacked 'optimized'/'fast' efficiency claims asserted from code-reading without a benchmark
- Decorative GitHub profile/vanity badges (Pull Shark, YOLO) presented as quality signals — YOLO actively rewards merging without review