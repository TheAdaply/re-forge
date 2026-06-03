---
name: evolution
description: Dispatch the Evolution Team — re-forge's self-evolving watch team whose sole job is to keep the workforce ahead of a fast-moving ecosystem. Use this skill when the user asks to "check what's new in Claude Code / Cursor / Codex", "scan for new agent features", "audit our workflow for gaps", "shadow this session", "what should we adopt next", "are our skills out of date", or on the scheduled cadence. The team scouts upstream releases, shadows live research/engineering sessions to find workflow + orchestration gaps, and emits a ranked, evidence-backed adoption strategy.
---

# Evolution Team dispatch

You are invoking the Evolution Team (self-evolving watch team, 8 specialists).
Its purpose is NOT to answer a product question — it is to keep re-forge itself
sharp: track upstream tooling changes, find gaps in our own workflow and agent
orchestration, and recommend what to adopt, drop, or rebuild.

## What to do

1. Read `~/.claude/agent-memory/evolution-lead/MEMORY.md` (first 200 lines) — these
   lessons are binding on what to scout and how to prioritize gaps.

2. Read `~/.claude/agents/evolution/evolution-lead.md` — adopt it as your behavioral
   contract for this session.

3. Create the session workspace at `<cwd>/.claude/teams/evolution/<slug>/` where
   `<slug>` describes the trigger (e.g. `2026q2-claude-code-watch`, or
   `shadow-<target-team>-<target-slug>` when shadowing a live session).

4. Execute the protocol in `~/.claude/teams/evolution/PROTOCOL.md`:
   - **Mode A — Scout**: scan upstream sources (Claude Code, Cursor, Codex,
     OpenCode release notes / changelogs / docs / blogs) for new features that
     change how we should build. Always runnable, even with no prompt.
   - **Mode B — Shadow**: attach to one or more live or just-closed team sessions
     (read their `EVIDENCE/`, `SYNTHESIS.md`, `LOG.md`) and detect workflow gaps.
   - **Mode C — Orchestration audit**: inspect dispatch patterns across recent
     sessions for under-used specialists, redundant dispatches, and missing gates.
   - Gate every finding through `evolution-evaluator` before it reaches the
     STRATEGY.md adoption list.
   - Close with `evolution-retrospector` + `evolution-scribe` (ACE memory).

5. Hand actionable adoption items to the Capability Forge via a drop-file at
   `~/.claude/forge/research-requests/<slug>.md` (author a skill) and surface
   workflow/orchestration fixes as PROTOCOL change proposals in STRATEGY.md.

## Hard rules
- All Opus, all max effort.
- Every specialist must produce an evidence file (full-activation enforcement).
- Every adoption recommendation must cite a STRONG-PRIMARY upstream source
  (official changelog / docs / release tag), never a rumor or a single blog.
- Never edit another team's files. You propose changes; their leads apply them.
- MEMORY.md lessons are binding, not advisory.
