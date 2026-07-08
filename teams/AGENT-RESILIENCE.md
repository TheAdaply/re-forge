# Agent-death resilience — build workflows for the disconnect

Long-running agents die. `API Error: Connection closed mid-response` is infra
weather, not a bug you can fix in your workflow — so the workflow has to assume
every agent may vanish at any instant and still lose **zero** work. This is the
contract every re-forge team/workflow author builds against. The companion
drop-in template is [`templates/resilient-orchestrator.md`](templates/resilient-orchestrator.md).

## The failure (measured, not hypothetical)

From one multi-agent build workflow (finding #9 of the reforge-ml handoff):

- **2 of 10** build agents were killed by `Connection closed mid-response`.
- One died **~6 min in** (a spec investigation — lost, it had written nothing).
- One died **59 minutes in, post-validate but pre-commit** — a full, validated
  implementation left uncommitted in the working tree. Nearly an hour of paid
  compute one `git commit` away from being saved.
- A stalled agent was auto-retried on the **same key** and finished cleanly.
- One agent **burned its entire structured-return channel** on 5 consecutive
  schema rejections; its work survived only because the deliverable was a file
  on disk, not the return payload.

**Net loss after recovery: zero** — but only because the workflow had file-based
artifacts and a reconciler with commit rights. Without those two, that run loses
an hour of work and a full research lane. The defaults below are what made the
difference.

## The five defaults

### D1 — Commit a WIP checkpoint the moment a change validates

**Rule:** an implementer never holds more than one validated change uncommitted.
The instant tests/validation go green, `git commit` a WIP checkpoint (amend it as
you go). Never 59 minutes of uncommitted work.

**Prevents:** the post-validate/pre-commit death — the single most expensive
failure observed. A committed change survives the agent; an uncommitted one dies
with it.

**How:** validate → `git add -A && git commit -m "wip: <task> (validated)"` →
keep working and `--amend`, or stack further checkpoints. The reconciler (D5)
squashes/cleans before the PR. A dirty tree at agent death is a bug in the
workflow, not an accident.

### D2 — File-based deliverables; the structured return is a pointer

**Rule:** every agent writes its real deliverable to a **file** (a committed
branch, a report, an artifact path) *before* it returns. The structured/tool
return carries a **pointer** to that file — never the deliverable itself.

**Prevents:** total loss when the return channel dies mid-response or the
structured payload is rejected. The agent that survived 5 schema rejections did
so because its report was already on disk; the channel was disposable.

**How:** make the durable write happen first and the return last. A good return
is `{"status", "artifact_path", "branch"}`. If the process dies after the write
but before the return, the orchestrator still finds the artifact by convention
(a deterministic path) and salvages it.

### D3 — Same-key retry on stall; retry-on-disconnect for zero-write deaths

**Rule:** an agent that **stalls** or dies **having written nothing** is safe to
re-dispatch on the **same key** (same worktree, same branch, same output path).
An agent that died **after writing** is NOT re-dispatched blind — it goes to the
reconciler (D5).

**Prevents:** both silent loss (a stall nobody retried) and silent duplication (a
blind retry that redoes committed work and forks the branch).

**How:** make agents **idempotent by construction** — a fixed worktree/branch and
a deterministic artifact path per task key, so re-running resumes instead of
duplicating. Bound the retries (2–3) and record the disconnect cause so it stops
being anecdotal.

### D4 — Schema-repair nudge after N structured-return rejections

**Rule:** after **N** consecutive structured-output/tool-schema rejections
(N = 3 is a good default), stop re-emitting the full payload. Feed the exact
validation error back to the agent and have it return the **minimal valid
payload** — a pointer to the already-written file — instead of burning the
channel on a large or malformed object.

**Prevents:** an agent spending its whole return budget losing to a schema it
keeps mis-satisfying (observed: 5 rejections in a row).

**How:** the orchestrator counts rejections, and on the Nth injects the error
text plus "return only `{status, artifact_path}`; your work is already on disk."
Small valid beats large invalid.

### D5 — A reconciler with commit rights is the safety net

**Rule:** the workflow has one component — the reconciler/orchestrator — that
holds commit rights, owns the branches, and runs **after** the agents. It
salvages WIP commits, squashes checkpoints into clean commits, opens the PRs,
and decides retry-vs-reconcile for every death.

**Prevents:** orphaned work. Every other default (D1–D4) produces a durable
artifact; D5 is what turns those artifacts into a merged result even when the
agent that made them is gone.

**How:** agents produce; the reconciler integrates. Agents are never trusted to
finish — they are trusted only to leave a durable trace the reconciler can find.

## Copy this into your team PROTOCOL

```text
Agent-death resilience checklist (see teams/AGENT-RESILIENCE.md):
[ ] D1  commit a WIP checkpoint the moment validation is green (never hold >1 uncommitted)
[ ] D2  write the deliverable to a file BEFORE returning; the return is a pointer
[ ] D3  idempotent worktree+branch+output path per task key (safe to same-key retry)
[ ] D4  after 3 structured-return rejections: return {status, artifact_path} only
[ ] D5  a reconciler with commit rights salvages WIP + opens the PR
```

## Product tie-in

reforge captures these transcripts, so it is well placed to **detect** the D1
failure after the fact: a coding session that ended on an API error / abnormal
termination while the git tree was still dirty — work started, never committed,
at risk of being lost. This is a **planned** capability, not a shipped one: the
*stranded-work* insight (spec'd, not yet built) **would** surface such a session
priced in **hours at risk** and clear it once the work is committed. Built, it
would be a genuine selling point — "reforge caught the hour of work your agent
stranded when it died." The engine-side spec lives in the private engine repo
(`reforge-cloud`, `specs/stranded-work/`); until it ships, treat this as roadmap.
