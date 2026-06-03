---
name: git-workflow
description: Use this skill in re-forge when choosing a branching strategy, writing commit messages or PR descriptions, deciding merge vs rebase, resolving conflicts, or managing releases and tags. Covers conventional commits, code-review checklists, and collaborative development best practices.
---

# Git Workflow Patterns

Best practices for version control, branching, and collaborative development.

## When to activate

- Setting up a Git workflow for a new project
- Choosing a branching strategy
- Writing commit messages and PR descriptions
- Resolving merge conflicts
- Managing releases and version tags

## Branching strategies

| Strategy | Team size | Cadence | Best for |
|----------|-----------|---------|----------|
| **GitHub Flow** | Any | Continuous | SaaS, web apps, startups (recommended default) |
| **Trunk-Based** | 5+ experienced | Multiple/day | High-velocity teams with feature flags |
| **GitFlow** | 10+ | Scheduled | Enterprise, regulated industries |

- **GitHub Flow:** `main` always deployable; branch from `main`, open a PR, merge after approval + green CI, deploy.
- **Trunk-Based:** commit to `main` or very short-lived branches; hide incomplete work behind feature flags.
- **GitFlow:** `main` (releases) + `develop` (integration); feature branches off `develop`; release/hotfix branches merge to both.

## Conventional commits

Format: `<type>(<scope>): <subject>` with an optional body (explain *why*, not *what*) and footer.

Types: `feat` · `fix` · `docs` · `style` · `refactor` · `test` · `chore` · `perf` · `ci` · `revert`.

```
# BAD: "fixed stuff", "updates", "WIP"
# GOOD:
fix(api): retry requests on 503 Service Unavailable

The external API returns 503 during peak hours. Added exponential
backoff retry with max 3 attempts.

Closes #123
```

Subject in imperative mood, no trailing period, ≤ 50 chars.

## Merge vs rebase

- **Merge** (preserves history) — use when integrating feature branches into `main`, when multiple people worked on the branch, or when it's already been pushed and others may have based work on it.
- **Rebase** (linear history) — use to update a *local-only* feature branch onto latest `main`. Force-push only with `--force-with-lease` and only if you're the sole contributor.
- **Never rebase** branches that are pushed/shared, that others built on, or protected branches (`main`, `develop`). For public branches, undo with `git revert`, not history rewrites.

## Pull request workflow

PR title uses the conventional-commit format. Description should cover **What / Why / How**, testing performed, and screenshots for UI changes.

**Author checklist:** self-review done · CI green · PR < ~500 lines · single focused change · description explains the change.

**Reviewer checklist:** solves the stated problem? · unhandled edge cases? · readable/maintainable? · sufficient tests? · security concerns? · clean commit history?

## Conflict resolution

1. Identify conflicts (`git status`); open files and resolve the `<<<<<<< / ======= / >>>>>>>` markers.
2. Resolve manually, via a merge tool, or with `--ours`/`--theirs` when one side is clearly correct.
3. Stage resolved files and commit.

**Prevention:** keep branches small and short-lived, rebase frequently onto `main`, coordinate on shared files, and merge PRs promptly.

## Releases

Use semantic versioning (`MAJOR.MINOR.PATCH`: breaking / new feature / bug fix). Create annotated tags with release notes (`git tag -a v1.2.0 -m "..."`) and push them. Generate changelogs from `git log <prev>..<new> --oneline --no-merges`.

## Anti-patterns

- Committing directly to `main`; committing secrets or generated files (`dist/`, `node_modules/`).
- Vague commit messages ("update", "fix").
- Giant PRs (1000+ lines); long-lived feature branches (weeks).
- Rewriting public history / force-pushing to shared branches.
