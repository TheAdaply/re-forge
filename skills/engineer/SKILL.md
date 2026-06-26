---
name: engineer
description: "Dispatch the Engineering Team to implement something. Takes a task description (or a research SYNTHESIS reference) and runs the full plan-then-build protocol with verifier + reviewer loop. Use this skill IMMEDIATELY when the user asks to implement, build, fix, refactor, add a feature, ship code, or apply a research finding. Examples: \"implement Hook A from memory research\", \"fix the auth bug\", \"refactor the routing module\", \"add dark mode\", \"apply the changes from the research session\"."
---

# Engineering Team dispatch

You are invoking the Engineering Team (v1 protocol, 12 specialists).

## What to do

1. Read `~/.claude/agent-memory/engineering-lead/MEMORY.md` — lessons from past engineering sessions.

2. Read `~/.claude/agents/engineering/engineering-lead.md` — adopt this as your behavioral contract.

3. If the user references a research session, read its SYNTHESIS.md at `<cwd>/.claude/teams/research/<slug>/SYNTHESIS.md` as binding input.

4. Create the session workspace at `<cwd>/.claude/teams/engineering/<slug>/`.

5. Classify the tier:
   - **Trivial** (typo, rename, comment): executor + verifier only
   - **Scoped** (single-file logic, small feature): planner + executor + verifier + reviewer
   - **Complex** (multi-file, cross-module, cites research): full roster, all gates

6. Execute the protocol:
   - Phase A: CHARTER.md + planner + architect + plan-skeptic + plan-adversary (if external inputs)
   - Phase B: For each task — executor + verifier + reviewer (inner loop with debugger on failure)
   - Close: Evaluator (5-dim rubric) + retrospector + scribe

7. If cross-team, write handback to research workspace at close.

## Hard rules
- All Opus, all max effort
- Tier up, never down — when uncertain, pick the higher tier
- Verifier runs fresh tests (never trust executor's claim that "it works")
- Reviewer is read-only (disallowedTools: Write, Edit)
- 3-failure circuit breaker on debugger → escalate to architect
- DIFF_LOG.md and VERIFY_LOG.md are append-only
- Preflight before dispatch: ≥ 1 GiB free disk, and no live engineering session already owns this tree. A build that looks hung under disk pressure is not necessarily dead — probe liveness and free space before relaunching; never fork a duplicate build over the same files
