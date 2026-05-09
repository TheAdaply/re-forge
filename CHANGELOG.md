# Changelog

All notable changes to claude-forge are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `scripts/doctor.sh` — install verifier. Diffs every `agents/*-team/` and every `memory/*.md` in the repo against `~/.claude/`, checks `~/.claude/teams/<team>/PROTOCOL.md`, and confirms `Stop` + `PostToolUse` hooks are wired in `settings.json`. Exits 0 on a clean install, 1 on drift. `--fix` flag re-runs `setup.sh` to repair drift in place. (D3)
- README troubleshooting section pointing at `bash scripts/doctor.sh`.
- `CHANGELOG.md` (this file).

### Fixed
- `setup.sh` no longer silently drops the Security, Testing, and Docs teams. The hard-coded `for team in research-team engineering-team` loop is replaced with `for team_dir in agents/*-team/`, so every team in the repo reaches `~/.claude/agents/<team>/` and `~/.claude/teams/<team>/PROTOCOL.md`. Closes [PC-6](EVIDENCE/empiricist-dogfood.md). (D1)
- `setup.sh` memory-seed loop no longer hard-codes four lead names. The new `for f in memory/*.md` loop seeds every `<agent>.md` in `memory/` to `~/.claude/agent-memory/<agent>/MEMORY.md`, picking up `security-lead`, `testing-lead`, and `docs-lead` automatically. Closes [PC-7](EVIDENCE/empiricist-dogfood.md). (D1)
- README install snippet now reflects the v0.2 reality: `bash setup.sh` installs all five teams plus forge in one shot (no manual `for team in security testing docs` loop required). Closes [PC-1](EVIDENCE/empiricist-dogfood.md).
- README install snippet adds a `bash scripts/doctor.sh` verify step so install success is observable before the user spends session tokens.

### Changed
- `setup.sh` verification block now prints one line per discovered team with expected-vs-actual counts, instead of two hard-coded lines for research+engineering only.

## [v0.2-rc] — 2026-05-01

See [`RELEASE_NOTES_v0.2.md`](RELEASE_NOTES_v0.2.md) for the full v0.2 changelog (Security/Testing/Docs teams activated, three forge-promoted skills, gpucheck v1.0.0rc1 multi-team validation session).

## [v0.1] — initial release

Research Team v2.1 (17 specialists), Engineering Team v1 (12 specialists), Capability Forge H1 (5 sub-skills). See git history for details.
