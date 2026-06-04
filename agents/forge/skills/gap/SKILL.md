---
name: forge-gap
description: Inventory the operator's workforce (agents, skills, plugins, installed MCP servers, recent research team SYNTHESIS files) and produce a ranked capability gap list. Diffs against VoltAgent's 10-category specialist taxonomy and wshobson/agents to find missing meta-orchestration, developer-experience, language-specialist, and quality-gate capabilities. Use when forge-lead starts a session without a specific gap in mind, when a retrospective in research-lead's MEMORY.md mentions a recurring capability hole, or when the operator asks "what capability are we missing".
disable-model-invocation: true
allowed-tools: Read Glob Grep Bash(gh api *)
---

# Capability gap detector

## Inventory sources

Read these in parallel:

1. `~/.claude/agents/**/*.md` — flat agents + research/ team specialists. Extract frontmatter names, descriptions, tools.
2. `~/.claude/skills/**/SKILL.md` — personal skills. Extract frontmatter.
3. `~/.claude/plugins/installed_plugins.json` — installed plugins.
4. `~/.claude/plugins/marketplaces/*/` — available-but-not-installed marketplace content.
5. `~/.claude/teams/*/INDEX.md` + `~/.claude/teams/*/*/SYNTHESIS.md` — evidence from other teams' sessions of capability blockers.
6. `~/.claude/agent-memory/*/MEMORY.md` — distilled lessons mentioning missing capabilities.

## Gap detection algorithm

1. **Build a tool-need set**: for each agent file, extract the `allowed-tools` or inferred tools from body prose.
2. **Build a capability-coverage set**: for each skill, extract the description's primary capability (first 250 chars).
3. **Diff against taxonomy**: for each VoltAgent category (01-core, 02-language, 03-infra, 04-qa-sec, 05-data-ai, 06-dev-exp, 07-domains, 08-biz, 09-meta-orch, 10-research), count how many specialists the local install has vs how many VoltAgent has. Categories with <30% coverage are **major gaps**; categories with 30-70% are **medium**; >=70% are **covered**.
4. **Cross-reference against in-flight sessions**: read `~/.claude/teams/research/INDEX.md`. Any gap whose owning team is actively being designed is **deferred**, not assigned to the Forge.
5. **Rank remaining gaps** by: (a) count of agents that would use the new capability, (b) existence of a reference implementation in anthropics/skills or MCP Registry, (c) explicit mentions in research-lead's MEMORY.md.

## Output format

Write to `~/.claude/forge/gap-reports/<timestamp>.md`:

```markdown
# Gap report — <timestamp>

## Major gaps (>30% coverage deficit vs VoltAgent)
1. **<category>** — <N> specialists missing. Examples: <list>.
   - Reference implementation: <URL or "none found">
   - Recommended action: install / adopt / author / defer-to-research

## Medium gaps (30-70% coverage)
...

## Already covered
...

## Recommended first-batch for this session
1. <gap> — <install|adopt|author|defer>, estimated 1-3 sub-skills
2. ...
```

## Hard rules

- Never propose a gap that's being actively designed by another team (check INDEX.md first).
- Never propose building a capability that's already installed (double-check `installed_plugins.json`).
- Rank by utility to the workforce, not by how interesting the gap is.
