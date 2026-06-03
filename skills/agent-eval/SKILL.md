---
name: agent-eval
description: Use this skill to compare coding agents (re-forge agents, Claude Code, Aider, Codex, etc.) head-to-head on reproducible tasks, measuring pass rate, cost, time, and consistency instead of relying on vibes. Activate when choosing between agents/models, validating an agent after a model or tooling update, or producing a data-backed agent-selection decision. Triggers include "which agent is best", "compare agents", or "benchmark these models on my codebase".
---

# Agent Eval

Compare coding agents head-to-head on reproducible tasks from your own codebase. Every "which coding agent is best?" comparison runs on vibes — this skill systematizes it with reproducible task definitions and measured metrics. This is a methodology, not a bundled binary; run the loop with the tools already available to you.

## When to activate
- Comparing coding agents on your own codebase
- Measuring agent performance before adopting a new tool or model
- Running a regression check when an agent updates its model or tooling
- Producing a data-backed agent-selection decision for the team

## Core concepts
- **Declarative task definitions.** Each task states what to do, which files it may touch, the pinned commit (for reproducibility), and how success is judged.
- **Isolation.** Run each agent attempt in its own git worktree (`git worktree add`) created from the pinned commit, so agents cannot interfere with each other or corrupt the base repo. No Docker required.
- **Metrics.** Pass rate (did output pass the judge?), cost (API spend, when available), time (wall-clock seconds), and consistency (pass rate across repeated runs, e.g. 3/3 = 100%).

## Task definition (template)
```yaml
name: add-retry-logic
description: Add exponential backoff retry to the HTTP client
repo: ./my-project
commit: abc1234            # pin for reproducibility
files:
  - src/http_client.py
prompt: |
  Add retry logic with exponential backoff to all HTTP requests.
  Max 3 retries, initial delay 1s, max delay 30s.
judge:
  - type: test       # deterministic: run the relevant tests
    command: pytest tests/test_http_client.py -v
  - type: grep       # pattern: required symbol exists
    pattern: "exponential_backoff|retry"
    files: src/http_client.py
```

## What to do
1. **Define 3–5 tasks** that represent your real workload (not toy examples). Store them as YAML under a `tasks/` directory and treat them as test fixtures (version them).
2. **For each agent × task**, repeat at least 3 trials:
   - Create a fresh worktree from the pinned commit.
   - Hand the task `prompt` to the agent.
   - Run every `judge` and record pass/fail.
   - Capture cost (if exposed) and wall-clock time.
   - Remove the worktree.
3. **Aggregate** results into a comparison table.
4. **Decide** based on the data, weighing pass rate against cost and time.

## Judge types
- **Code-based (deterministic):** run tests or the build; exit code is the verdict. Always include at least one per task.
- **Pattern-based:** grep for a required class/function/symbol in the changed files.
- **Model-based (LLM-as-judge):** ask whether the implementation meets a rubric. Use sparingly — it adds noise.

## Reporting
Produce a table per task, one row per agent:

```
Task: add-retry-logic (3 runs each)
Agent        | Pass Rate | Cost  | Time | Consistency
claude-code  | 3/3       | $0.12 | 45s  | 100%
aider        | 2/3       | $0.08 | 38s  |  67%
```

## Hard rules
- Run at least 3 trials per agent — agents are non-deterministic and single runs lie.
- Always pin the commit so results are reproducible days/weeks later.
- Include at least one deterministic judge per task; never rely on an LLM judge alone.
- Track cost alongside pass rate — a 95% agent at 10× the cost may be the wrong choice.
- Version task definitions in source control; they are fixtures, treat them as code.
