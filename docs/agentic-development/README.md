# Agentic development record

This directory captures how `claude-forge` is exercised in practice — the orchestrator prompts that drive the workforce against real engineering targets, and the deltas between prompt versions as we learned what does and doesn't work.

It exists for two audiences:

1. **A future Claude Code session opening this repo cold** to develop on the framework itself. Read this file, then `SESSION_PROMPT_v3.md` (latest), then the most recent report. That's enough context.
2. **Anyone reproducing the workforce on their own engineering target.** Each `SESSION_PROMPT_vN.md` is a full paste-able prompt. Each `DELTA_*.md` explains why the prompt evolved between versions.

## Validation history

claude-forge's own development uses claude-forge to ship things. The session prompts here are the *concrete invocations* that produced shipped artifacts.

| Session | Date | Target | Outcome |
|---|---|---|---|
| 1 | 2026-05-01 | gpucheck v1.0.0rc1 + claude-forge v0.2-rc | rc1 shipped to PR; framework defect found (subagents cannot spawn subagents) |
| 2 | 2026-05-07 | gpucheck v1.0.0 final + v1.1 + claude-forge v0.2 final | v1.0.0 tagged + released; v1.1 PR opened; v0.2 merged + tagged |

The mirror of this directory in [`Akasxh/gpucheck`](https://github.com/Akasxh/gpucheck/tree/main/docs/agentic-development) carries the same prompts plus per-session reports specific to that target. When developing on claude-forge itself, lessons learned from gpucheck sessions feed back through the agent-memory layer.

## The architectural lesson

The single biggest framework defect surfaced by session 1 was that the protocol documents described "Tier-1 lead spawns 12 specialists in-thread", which is impossible in Claude Code (subagents cannot spawn subagents). The lead Agent ended up impersonating all 12 specialists *sequentially in its own thread* — fake parallelism. v2 of the prompt fixed this by having the orchestrator (main thread) dispatch every specialist directly. v0.2 of the framework absorbed the lesson into engineering protocol §Execution-model. See [`DELTA_v1_to_v2.md`](DELTA_v1_to_v2.md) for the full diagnosis.

## Files

| File | Purpose |
|---|---|
| [`SESSION_PROMPT_v3.md`](SESSION_PROMPT_v3.md) | Latest paste-able orchestrator prompt. |
| [`SESSION_PROMPT_v2.md`](SESSION_PROMPT_v2.md) | Previous prompt; introduced orchestrator-dispatches-everyone. |
| [`SESSION_PROMPT_v1.md`](SESSION_PROMPT_v1.md) | First prompt; kept for completeness. |
| [`DELTA_v2_to_v3.md`](DELTA_v2_to_v3.md) | Why v3 differs (compounding-sessions narrative). |
| [`DELTA_v1_to_v2.md`](DELTA_v1_to_v2.md) | Why v2 differs (fake-parallelism diagnosis). |
| [`GPUCHECK_SESSION_1_REPORT.md`](GPUCHECK_SESSION_1_REPORT.md) | Session 1 report from gpucheck side; framework metrics inside. |
| [`LAUNCH.md`](LAUNCH.md) | Pre-flight checklist before pasting a session prompt. |
| [`INVENTORY.md`](INVENTORY.md) | Skills/plugins/teams inventory snapshot. |

For the framework's own evolution timeline, see [`../../README.md`](../../README.md) §"How it was built" and the per-tag release notes (`RELEASE_NOTES_v0.2.md`, `BENCHMARKS_v0.2.md`).

## Provenance

These prompts originated as `/Users/cero/Desktop/yc-session/MEGA_PROMPT_*.md` working notes during the gpucheck v1.0/v1.1 build-out. Mirrored here so the methodology is reproducible from a clean clone of either repo.
