# Template: resilient orchestrator (drop-in)

A reusable skeleton for a workflow that dispatches subagents and **loses zero
work when an agent dies mid-response**. It codifies the five defaults from
[`../AGENT-RESILIENCE.md`](../AGENT-RESILIENCE.md). Copy it, replace the
`<PLACEHOLDERS>`, and translate the pseudocode to your orchestration language.

The whole design rests on one idea: **agents produce durable traces; the
orchestrator integrates them.** An agent is never trusted to finish — only to
leave something on disk the orchestrator can find and salvage.

## Part 1 — Agent-side contract (prepend to every dispatched agent)

```text
RESILIENCE CONTRACT (your run may be killed by an API disconnect at any instant):
1. Work in your assigned worktree/branch ONLY: <WORKTREE_PATH> on branch <BRANCH>.
2. WIP-checkpoint: the moment your change validates (tests/lint green), run
   `git add -A && git commit -m "wip: <TASK> (validated)"`. Re-validate, amend or
   stack more checkpoints. NEVER leave validated work uncommitted.
3. File-first deliverable: write your real output to <ARTIFACT_PATH> BEFORE you
   return anything. Your structured return is a POINTER, not the deliverable.
4. Return the minimal payload: {"status", "artifact_path": "<ARTIFACT_PATH>",
   "branch": "<BRANCH>"}. If a structured-return schema keeps rejecting you,
   return ONLY {status, artifact_path} — your work is already on disk.
```

## Part 2 — Orchestrator loop (pseudocode)

```text
for task in tasks:
    key        = stable_key(task)              # deterministic; identical across retries
    worktree   = "<WORKTREES>/" + key          # one isolated checkout per task key
    branch     = "wf/" + key
    artifact   = worktree + "/<ARTIFACT_RELPATH>"   # deterministic, by convention
    ensure_worktree(worktree, branch, base="origin/main")

    attempt, rejections = 0, 0
    while attempt < MAX_ATTEMPTS:               # MAX_ATTEMPTS = 3
        attempt += 1
        nudge = schema_repair_nudge() if rejections >= N_REJECT else ""   # N_REJECT = 3
        result = dispatch(agent, task, contract(worktree, branch, artifact) + nudge,
                          deadline=DEADLINE)     # a stall past DEADLINE == a death

        outcome = classify(result, worktree, artifact)
        if outcome == OK:
            break
        if outcome == SCHEMA_REJECTED:
            rejections += 1                      # channel died, not the work
            if file_exists(artifact) or branch_has_commits(branch):
                break                            # D2/D1: deliverable is durable; salvage it
            continue                             # re-dispatch same key with the nudge (D4)
        if outcome == DIED_ZERO_WRITE:
            continue                             # D3: safe same-key retry (idempotent)
        if outcome == DIED_WITH_WRITES:
            break                                # D3: do NOT retry blind -> reconcile (D5)

# D5 — reconcile every task from its durable trace, regardless of how the agent exited
for task in tasks:
    salvage_wip_commits(branch_for(task))        # a WIP checkpoint is a finished-enough result
    collect_artifact(artifact_for(task))         # file-based deliverable, even if return was lost
squash_clean_and_open_pr(base="main")            # the reconciler holds commit rights
```

### `classify(...)` — the one function that makes this work

```text
classify(result, worktree, artifact):
    if result.returned_ok and schema_valid(result):        return OK
    if result.schema_rejected:                             return SCHEMA_REJECTED
    # disconnect / stall / no return: decide by what's on disk, not by the channel
    if branch_has_commits(worktree) or file_exists(artifact):  return DIED_WITH_WRITES
    return DIED_ZERO_WRITE
```

The rule in one line: **a disconnected agent is judged by what it left on disk,
never by whether its return arrived.** Wrote something → reconcile (never retry
blind, or you fork the branch). Wrote nothing → same-key retry is free.

## Part 3 — Idempotent worktree helper (concrete)

```bash
# ensure_worktree PATH BRANCH BASE — safe to call on first run AND on retry.
ensure_worktree() {
  path="$1"; branch="$2"; base="${3:-origin/main}"
  git fetch --quiet origin
  if [ -d "$path/.git" ] || git worktree list --porcelain | grep -q "worktree $path"; then
    return 0                       # retry: reuse the existing checkout + its WIP commits
  fi
  git worktree add -B "$branch" "$path" "$base"
}
```

Re-dispatching on the same key reuses the same worktree, so a retry **resumes**
(and finds any WIP commits the dead attempt left) instead of duplicating work.

## Why each piece is load-bearing

| Piece | Default | The death it survives |
|-------|---------|-----------------------|
| WIP-checkpoint after validate | D1 | died 59 min in, post-validate, pre-commit |
| File-first + pointer return | D2 | return channel died / schema rejected 5x |
| Deterministic key + worktree | D3 | stall or zero-write death (same-key retry) |
| `classify` by disk, not channel | D3 | disconnect after writing (reconcile, don't dupe) |
| Schema-repair nudge | D4 | 5 consecutive structured-return rejections |
| Reconciler with commit rights | D5 | any orphaned WIP commit or artifact |
