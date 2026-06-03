---
name: strategic-compact
description: Use this skill to decide WHEN to manually compact context during long re-forge sessions, instead of letting arbitrary auto-compaction interrupt work mid-task. Activate on long multi-phase sessions (research → plan → implement → test), when switching between unrelated tasks, after a milestone, after a failed approach, or when responses slow down under context pressure. Triggers include "should I compact", "context is getting full", or "running low on context".
---

# Strategic Compact

Compact context at logical task boundaries rather than relying on arbitrary auto-compaction, which often triggers mid-task and discards important state.

## When to activate
- Long sessions approaching context limits (200K+ tokens)
- Multi-phase tasks (research → plan → implement → test)
- Switching between unrelated tasks in one session
- After completing a milestone, before starting new work
- When responses slow down or lose coherence (context pressure)

## Why strategic, not automatic
Auto-compaction has no awareness of logical boundaries — it can fire mid-implementation and lose variable names, file paths, and partial state. Compacting deliberately at boundaries preserves the distilled output (the plan, the milestone) while shedding the bulky exploration context.

## What to do
1. Recognize the phase transition you're at (see the decision guide below).
2. Before compacting, **write important state to disk or memory** — save the plan to a file or TodoWrite, note key file paths, and persist decisions so they survive.
3. Compact with a focusing summary, e.g. "Focus on implementing the auth middleware next."
4. After compacting, restate the active goal in one sentence and continue.

## Compaction decision guide
| Phase transition | Compact? | Why |
|---|---|---|
| Research → Planning | Yes | Research context is bulky; the plan is the distilled output |
| Planning → Implementation | Yes | Plan lives in TodoWrite/a file; free context for code |
| Implementation → Testing | Maybe | Keep if tests reference recent code; compact if switching focus |
| Debugging → Next feature | Yes | Debug traces pollute context for unrelated work |
| Mid-implementation | No | Losing variable names, paths, and partial state is costly |
| After a failed approach | Yes | Clear dead-end reasoning before a new approach |

## What survives compaction
| Persists | Lost |
|---|---|
| `CLAUDE.md` / project instructions | Intermediate reasoning and analysis |
| TodoWrite task list | File contents previously read |
| Memory files (`~/.claude/memory/`) | Multi-step conversation context |
| Git state (commits, branches) | Tool-call history and counts |
| Files on disk | Preferences only stated verbally |

## Token optimization patterns
- **Lazy skill loading:** map trigger keywords to skills and load a skill only when triggered, rather than loading all skill bodies at session start.
- **Context composition awareness:** watch what consumes the window — `CLAUDE.md` (always loaded, keep lean), each loaded skill (1–5K tokens), conversation history, and bulky tool results.
- **De-duplicate instructions:** the same rule in both `~/.claude/rules/` and a project `.claude/rules/`, skills repeating `CLAUDE.md`, or multiple skills covering one domain all waste context.

## Hard rules
- Never compact mid-implementation — preserve context for related changes.
- Always persist important context to a file or memory before compacting.
- The trigger tells you *when*; you still decide *if*.
- Pair with a continuous-learning step to extract reusable patterns before a session ends.
