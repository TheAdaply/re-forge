# AGENTS.md

re-forge distributes Claude Code agents/skills as markdown plus shell installers.
There is no application code to build — the validation harness is the test suite.

## Validate (run before marking any change done; all must exit 0)

```bash
uv sync --locked --group dev
uv run --group dev pytest -m "not external"   # frontmatter, links, shell, catalog, smoke
npx -y markdownlint-cli2@0.22.1 "**/*.md"
```

Single test: `uv run --group dev pytest tests/test_frontmatter.py -q`
External-link job (network, slower): `uv run --group dev pytest -m external`

## Add or edit a skill / agent

1. Skill: `skills/<dir>/SKILL.md`; frontmatter `name:` MUST equal `<dir>`.
   Agent: `agents/<team>-team/<name>.md`; frontmatter `name:` MUST equal filename stem.
2. Quote any `description:` containing a colon (plain YAML scalars break on `: `).
3. Regenerate the catalog: `uv run --group dev python scripts/build_catalog.py`
   (CI fails on drift; never edit docs/CATALOG.md by hand).
4. Run the Validate block above.

## Conventions and gotchas

- `uv`, never `pip`. The repo is not a Python package (`[tool.uv] package = false`).
- Hooks (`hooks/*.sh`) deliberately avoid `set -e` — an aborting hook can break the
  host Claude Code session. User-invoked scripts require strict mode (test-enforced).
- Forge sub-skills are namespaced on purpose: dir `agents/forge/skills/gap/` has
  name `forge-gap`, invoked as `/forge:gap`. Do not "fix" the mismatch.
- `agents/*-team/PROTOCOL.md` are team docs, not agent defs — no frontmatter.
- Install paths under `~/.claude/` are created by `setup.sh`; verify with
  `bash scripts/doctor.sh` (exit 1 on drift, `--fix` repairs).

## Boundaries

- Always run the Validate block before claiming work complete.
- Ask first before: adding a dependency, renaming a skill dir (it is the user-facing
  invocation name), or changing setup.sh/doctor.sh install semantics.
- Never commit secrets, `~/.claude` state, `.vercel/`, or hand edits to generated files.
