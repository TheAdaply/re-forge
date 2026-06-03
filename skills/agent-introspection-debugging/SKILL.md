---
name: agent-introspection-debugging
description: Use this skill when an agent run is failing repeatedly, burning tokens without progress, looping on the same tools, or drifting from the task. It is a structured self-debugging workflow — capture the failure, diagnose the root cause, apply contained recovery, and emit an introspection report — to use before escalating to a human. Activate on max-tool-call/loop-limit failures, retry storms, context drift, or environment/state mismatches.
---

# Agent Introspection Debugging

A systematic self-debugging workflow for AI agent failures. This is a workflow skill, not a hidden runtime — it teaches you to debug yourself before retrying blindly or escalating.

## When to activate
- Maximum tool-call / loop-limit failures
- Repeated retries with no forward progress
- Context growth or prompt drift degrading output quality
- Filesystem/environment state mismatch vs. expectation
- Recoverable tool failures that need diagnosis before a smaller corrective action

## Scope boundaries
Use this for: capturing failure state before retrying, diagnosing agent-specific failure patterns, applying contained recovery, and producing a readable debug report. Do NOT use it as the primary tool for feature verification after code changes (use `verification-loop`), or for claiming runtime actions the harness can't actually perform.

## Four-phase loop

### Phase 1: Failure capture
Record the failure precisely before recovering:
```markdown
## Failure Capture
- Session / task:
- Goal in progress:
- Error (type, message, stack):
- Last successful step:
- Last failed tool / command:
- Repeated pattern seen:
- Environment assumptions to verify (cwd, branch, service state, expected files):
```

### Phase 2: Root-cause diagnosis
Match the failure to a known pattern before changing anything:
| Pattern | Likely cause | Check |
|---|---|---|
| Max tool calls / repeated same command | loop or no-exit path | inspect last N tool calls for repetition |
| Context overflow / degraded reasoning | unbounded notes, repeated plans, huge logs | inspect recent context for duplication/low-signal bulk |
| `ECONNREFUSED` / timeout | service down or wrong port | verify service health, URL, port |
| `429` / quota exhaustion | retry storm or no backoff | count repeated calls, inspect retry spacing |
| File missing after write / stale diff | race, wrong cwd, branch drift | re-check path, cwd, `git status`, actual file existence |
| Tests still failing after "fix" | wrong hypothesis | isolate the exact failing test and re-derive the bug |

Ask: is this a logic, state, environment, or policy failure? Did I lose the real objective and start optimizing the wrong subtask? Is it deterministic or transient? What is the smallest reversible action that validates the diagnosis?

### Phase 3: Contained recovery
Recover with the smallest action that changes the diagnosis surface:
- Stop repeated retries and restate the hypothesis.
- Trim low-signal context; keep only the active goal, blockers, and evidence.
- Re-check actual filesystem / branch / process state instead of trusting memory.
- Narrow the task to one failing command, file, or test.
- Switch from speculative reasoning to direct observation.
- Escalate to a human when the failure is high-risk or externally blocked.

Do not claim unsupported auto-healing ("reset agent state", "update harness config") unless you are actually doing it through real tools.
```markdown
## Recovery Action
- Diagnosis chosen:
- Smallest action taken:
- Why this is safe:
- What evidence would prove the fix worked:
```

### Phase 4: Introspection report
```markdown
## Agent Self-Debug Report
- Session / task:
- Failure:
- Root cause:
- Recovery action:
- Result: success | partial | blocked
- Token / time burn risk:
- Follow-up needed:
- Preventive change to encode later:
```

## Recovery heuristics (in order)
1. Restate the real objective in one sentence.
2. Verify world state instead of trusting memory.
3. Shrink the failing scope.
4. Run one discriminating check.
5. Only then retry.

Bad pattern: retrying the same action three times with slightly different wording. Good pattern: capture → classify → run one direct check → change the plan only if the check supports it.

## Hard rules
- Never end with "I fixed it" alone — always provide the failure pattern, root-cause hypothesis, recovery action, and the evidence it is now better or still blocked.
- After recovery that changed code, run `verification-loop`.
- When a failure pattern is worth keeping, capture it as a lesson/skill for next time.
