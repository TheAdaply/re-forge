---
name: forge-scout
description: Query external sources (MCP Registry, anthropics/skills, installed marketplaces) for candidate implementations of a specified capability. Applies the 6-rule trust heuristic to each candidate and returns ranked recommendations. Use when forge-gap has identified a gap and forge-lead needs to decide whether to install an existing implementation or author a new one. Only use for single-query bounded lookups — for competitive cross-roster analysis, forge-lead must delegate to research-github-miner instead.
disable-model-invocation: true
allowed-tools: Bash(gh api *) Bash(gh search *) Read Glob WebFetch
---

# Forge scout

## Primary data sources

1. **MCP Registry** (STRONG-PRIMARY): `https://registry.modelcontextprotocol.io/v0/servers`
   - Endpoint: `GET /v0/servers?search=<keyword>&limit=100`
   - Cursor pagination: `metadata.nextCursor` opaque string
   - Recent-updates: `?updated_since=<RFC3339>`
   - Public read, no auth.

2. **anthropics/skills** (STRONG-PRIMARY): `gh api repos/anthropics/skills/contents/skills`
   - Returns the official Anthropic skill directories.
   - For each match: `gh api repos/anthropics/skills/contents/skills/<name>/SKILL.md` to pull the frontmatter.

3. **Installed marketplaces** (STRONG-PRIMARY, on disk): `~/.claude/plugins/marketplaces/*/`
   - `huggingface-skills/skills/<name>/SKILL.md`
   - `ai-research-skills/NN-<topic>/<name>/SKILL.md`
   - `claude-code-skills/engineering-team/<name>/SKILL.md`
   - `claude-plugins-official/<plugin>/` via `installed_plugins.json`

4. **Installed plugins** (`~/.claude/plugins/installed_plugins.json`).

## The 6-rule trust heuristic for MCP Registry entries

Before recommending any MCP server, apply these checks (ALL must pass for HIGH trust):

1. **Package registry preference**: `packages[].registryType` must be `npm` | `pypi` | `oci` | `nuget`. Reject smithery-only remote unless the Forge has a smithery API key.
2. **Github repository**: `server.repository.url` must be populated with a `github.com` URL. Reject opaque entries.
3. **Version maturity**: `server.version >= 1.0.0` OR multiple iterations in the version history. Reject single one-shot 0.1.x unless no alternative exists.
4. **Description stability**: if multiple versions exist, descriptions must be consistent across versions. Flag description churn.
5. **Transport availability**: `packages[].transport.type` must include `stdio` for local runnability. Accept `streamable-http` only if stdio is also available.
6. **Auth profile**: prefer `authorization: none` for read-only tools. Accept auth-required only if the server is load-bearing.

Servers passing >=5 rules: HIGH trust. >=3: MEDIUM. <3: REJECTED.

## Query protocol

Input: capability description (e.g., "Semantic Scholar paper search") from `forge-gap` or `forge-lead`.

Steps:

1. **MCP Registry**: `gh api "https://registry.modelcontextprotocol.io/v0/servers?search=<keyword>&limit=50"`. If nothing found, broaden to synonyms.
2. **anthropics/skills**: check if one of the official skills already covers the capability (use the name + description match).
3. **Installed marketplaces**: Glob for `SKILL.md` matching keywords in their description.
4. **Apply trust heuristic** to each candidate.
5. **Cross-validate high-value candidates** by fetching the candidate's README or SKILL.md (via WebFetch or on-disk Read).

## Output format

Write to `~/.claude/forge/scout-reports/<timestamp>-<capability>.md`:

```markdown
# Scout report — <capability>

## HIGH-trust candidates
1. <name> (<registry>/<identifier> v<version>, <stars>*)
   - URL: <repo_url>
   - Trust rules passed: 1,2,3,4,5,6
   - Install command: <exact command>
   - Why adopt: <1-sentence>

## MEDIUM-trust candidates
...

## REJECTED
...

## Recommendation for forge-lead
<INSTALL|ADOPT|AUTHOR|DEFER> — <rationale>
```

## Hard rules

- Never recommend INSTALL without verifying the trust heuristic passes >=5 rules.
- Never rank by stars alone — the 6-rule heuristic is binding.
- If no HIGH-trust candidate exists, recommend AUTHOR or DEFER, not a MEDIUM adoption.
- If the capability needs cross-roster competitive analysis, recommend forge-lead delegate to research-github-miner via a research-request drop-file.
