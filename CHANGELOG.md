# Changelog

All notable changes to re-forge are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added — 2026-06-04 quality pass
- `LICENSE` (MIT, verbatim SPDX text). The repo invited curl-and-run installs while legally all-rights-reserved.
- Validation harness (`tests/`, uv-managed): frontmatter contract for all skill/agent definitions (YAML parses, name matches install surface, non-generic description, unique names), internal + external dead-link checks, shellcheck + strict-mode gates, generated-catalog drift check, fresh-HOME install smoke test, memory-mcp JSON-RPC protocol smoke test. 633 checks.
- `.github/workflows/ci.yml`: harness + markdownlint + showcase `npm ci`/lint/build on every push/PR; actions pinned to full commit SHAs; `contents: read` token.
- `docs/CATALOG.md` generated from frontmatter by `scripts/build_catalog.py`; CI fails on drift, so the published inventory cannot lie.
- `AGENTS.md` (command-first) + `CLAUDE.md` stub.

### Fixed — 2026-06-04 quality pass
- `setup.sh`: creates a minimal `settings.json` (hooks registered) on machines that lack one — a fresh install previously failed doctor; backups fire only when content differs (re-runs created 145 stray `.bak-*` files before); installs `agents/EDD-ADDENDUM.md`, cited by ~69 personas but never copied.
- `memory-mcp/server.py`: boots with its bundled `schema.sql` when the installed copy is absent (a bare `python3 server.py` previously failed every call with "no such table: memories").
- ~200 links across 61 skills pointed at `references/`/`templates/` files that never shipped — pruned. 12 dead external doc URLs replaced with fetch-verified live equivalents.
- 10 skill/agent files had unquoted YAML descriptions that fail spec-compliant parsers — quoted. 45 skills carried a frontmatter `name` different from their directory (the installed, user-visible invocation name) — aligned.
- 4 runtime-fatal example snippets (constitutional-ai, rwkv, model-pruning, model-merging); `pip install faiss-gpu` (conda-only) and deprecated `pinecone-client` install commands.
- README/QUICKSTART: placeholder asciinema badge (404) removed; invented "expected output" relabeled illustrative; team/skill counts corrected against the tree (6 teams, 114 skills, 7 slash commands incl. `/evolution`); stale `claude-forge` clone URLs renamed; contradictory plan-requirement claims reconciled; embedded install tree replaced by the drift-checked catalog.
- `sync.sh` silently skipped the evolution team; `research-lead.md` dispatched its synthesist before the audit gate specified to precede it; misattributed memory-lesson citations re-cited; never-shipped `~/.claude/lib/git-identity.sh` mandates downgraded to guarded optionals.

### Added
- `scripts/doctor.sh` — install verifier. Diffs every `agents/*-team/` and every `memory/*.md` in the repo against `~/.claude/`, checks `~/.claude/teams/<team>/PROTOCOL.md`, and confirms `Stop` + `PostToolUse` hooks are wired in `settings.json`. Exits 0 on a clean install, 1 on drift. `--fix` flag re-runs `setup.sh` to repair drift in place. (D3)
- README troubleshooting section pointing at `bash scripts/doctor.sh`.
- `CHANGELOG.md` (this file).

### Fixed
- `setup.sh` no longer silently drops the Security, Testing, and Docs teams. The hard-coded `for team in research-team engineering-team` loop is replaced with `for team_dir in agents/*-team/`, so every team in the repo reaches `~/.claude/agents/<team>/` and `~/.claude/teams/<team>/PROTOCOL.md`. Closes PC-6 (internal dogfood audit; evidence not committed). (D1)
- `setup.sh` memory-seed loop no longer hard-codes four lead names. The new `for f in memory/*.md` loop seeds every `<agent>.md` in `memory/` to `~/.claude/agent-memory/<agent>/MEMORY.md`, picking up `security-lead`, `testing-lead`, and `docs-lead` automatically. Closes PC-7. (D1)
- README install snippet now reflects the v0.2 reality: `bash setup.sh` installs all five teams plus forge in one shot (no manual `for team in security testing docs` loop required). Closes PC-1.
- README install snippet adds a `bash scripts/doctor.sh` verify step so install success is observable before the user spends session tokens.

### Changed
- `setup.sh` verification block now prints one line per discovered team with expected-vs-actual counts, instead of two hard-coded lines for research+engineering only.

## [v0.2-rc] — 2026-05-01

See [`RELEASE_NOTES_v0.2.md`](RELEASE_NOTES_v0.2.md) for the full v0.2 changelog (Security/Testing/Docs teams activated, three forge-promoted skills, gpucheck v1.0.0rc1 multi-team validation session).

## [v0.1] — initial release

Research Team v2.1 (17 specialists), Engineering Team v1 (12 specialists), Capability Forge H1 (5 sub-skills). See git history for details.
