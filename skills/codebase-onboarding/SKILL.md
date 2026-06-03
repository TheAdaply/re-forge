---
name: codebase-onboarding
description: Use this skill when joining a new project or opening an unfamiliar repo in re-forge for the first time. Analyzes the codebase and produces a structured onboarding guide (architecture map, entry points, conventions) plus a starter project instructions file. Triggers on "onboard me", "help me understand this codebase", or "generate a CLAUDE.md/AGENTS.md".
---

# Codebase Onboarding

Systematically analyze an unfamiliar codebase and produce a structured onboarding guide plus project-specific agent instructions.

## When to use

- First time opening a project with re-forge
- Joining a new team or repository
- User asks "help me understand this codebase" / "onboard me" / "walk me through this repo"
- User asks to generate project instructions (CLAUDE.md / AGENTS.md)

## Phase 1 — Reconnaissance

Gather signals without reading every file. Use Glob/Grep, not Read-everything. Detect in parallel:

1. **Package manifests** — `package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `pom.xml`, `build.gradle`, `Gemfile`, `composer.json`, `pubspec.yaml`.
2. **Framework fingerprints** — `next.config.*`, `vite.config.*`, `angular.json`, Django settings, FastAPI/Flask app entry, Rails config.
3. **Entry points** — `main.*`, `index.*`, `app.*`, `server.*`, `cmd/`, `src/main/`.
4. **Directory structure** — top 2 levels, ignoring `node_modules`, `vendor`, `.git`, `dist`, `build`, `__pycache__`, `.next`.
5. **Config & tooling** — linters, `tsconfig.json`, `Makefile`, `Dockerfile`, `docker-compose*`, CI workflows, `.env.example`.
6. **Test structure** — `tests/`, `__tests__/`, `*_test.go`, `*.spec.ts`, `pytest.ini`, `jest.config.*`, `vitest.config.*`.

## Phase 2 — Architecture mapping

From the recon data, identify: **tech stack** (languages/versions, frameworks, DB/ORM, build tools, CI); **architecture pattern** (monolith / monorepo / microservices / serverless, API style: REST/GraphQL/gRPC/tRPC); **key directories → purpose**; and the **data flow** by tracing one request from entry → validation → business logic → database.

## Phase 3 — Convention detection

- **Naming** — file casing (kebab/camel/Pascal/snake), component/class patterns, test-file convention.
- **Code patterns** — error handling style, dependency injection vs direct imports, state management, async patterns.
- **Git conventions** — branch naming and commit style from recent history. If history is absent or shallow (`--depth 1`), note "Git history unavailable or too shallow to detect conventions".

## Phase 4 — Generate artifacts

**Output 1 — Onboarding Guide** (scannable in ~2 min): Overview · Tech Stack table · Architecture · Key Entry Points · Directory Map · Request Lifecycle · Conventions · Common Tasks (dev/test/lint/build commands) · a "Where to look" table mapping intents to paths.

**Output 2 — Starter project instructions** (CLAUDE.md / AGENTS.md): Tech Stack · Code Style (detected naming + patterns) · Testing (commands + conventions) · Build & Run commands · Project Structure · Conventions. If one already exists, read it first and *enhance* it — preserve existing instructions and clearly mark what's new.

## Best practices

1. **Don't read everything** — recon via Glob/Grep; Read selectively for ambiguous signals.
2. **Verify, don't guess** — if config and code disagree, trust the code.
3. **Respect existing instructions** — enhance, don't replace; call out additions.
4. **Stay concise** — keep generated instructions under ~100 lines; details belong in code.
5. **Flag unknowns** — "Could not determine test runner" beats a wrong guess.

## Anti-patterns

- Instructions longer than ~100 lines; listing every dependency; explaining obvious directory names; copying the README instead of adding structural insight.
