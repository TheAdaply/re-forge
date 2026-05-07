# BENCHMARKS — claude-forge v0.2-rc

**Date:** 2026-05-04 (session ran 2026-05-01 → 2026-05-04 across credit-cap pause)
**Workload:** gpucheck v1.0.0rc1 multi-team build (validation session)
**Host:** Apple Silicon Mac, MPS-capable, single user

## Measured concurrency

| metric | peak | wall-clock | notes |
|---|---|---|---|
| concurrent claude processes | **92** | spike at v2 Phase 1+2 cross-over | 1 main + 6 leads + 67 specialists + ~20 swarm + monitor + mutmut |
| Tier-1 lead Agents (parallel) | 6 | Phase 1 floor | research, security, docs, forge, engineering, testing |
| Tier-2 specialist Agents (one-shot dispatches) | **20+ in single batch** | R2+R3 fan-out | dispatched in parallel as 8+8+6 R2/R3 |
| Tier-3 headless `claude -p` swarm | **28** | spawn ladder of 10/wave | v1's 26 + v2's first 28 (rest aborted at credit cap) |
| Total distinct named agents over session | **~120** | 3-day session window | research 17 + engineering 18 + security 11 + testing 9 + docs 10 + forge 5 + R2 8 + R3 6 + depth 2 + tier-3 28 + heartbeat 1 |

## Cost-of-parallelism observations

1. **Subagent harness has a write-restriction.** Security-lead dispatched as a sub-Agent could not write `FINDINGS.md`; orchestrator materialized it from the inline return value. v0.3 should document this in PROTOCOL.md.

2. **The launcher script bash quoting is a sharp edge.** v2 first attempt used a nested heredoc + escaped `\$()` and had a parse error after wave 2 (28 of 98 kernels spawned). Re-launch with a proper `.sh` script file fixed it. v0.3: ship `swarm-launcher.sh` as a first-class artifact, never inline-heredoc.

3. **Persistent monitors have unbounded cost.** A `Monitor` started at session minute 1 with `persistent: true` ran for ~3 days during a credit-cap idle period and emitted ~432 heartbeat events into the conversation context. v0.3: monitors should expire by default (`timeout_ms: 7200_000`) unless explicitly persistent, and the orchestrator should `TaskStop` them at phase transitions.

4. **Credit caps silently truncate Agent returns.** When the user's API quota was exhausted mid-batch, 7 in-flight Agents returned with empty bodies (`tool_uses: 13` and the cap message in `result`). The underlying file writes mostly completed before the cap; only the *summary text* return was lost. v0.3: file existence is the source of truth; never trust `result` text alone.

5. **Multi-version matrix is structurally bounded by PyPI wheel availability.** macOS arm64 wheels only exist for torch 2.10 / 2.11 (older versions are Linux arm64 only). The "≥6 versions" target is unmeetable for a macOS-only host. v0.3: `BENCHMARKS.md` should publish a feasibility check rather than aspirational targets.

## Wall-clock timing (best-effort, from heartbeat log)

```
Session start:      2026-05-01T08:58Z (estimated)
v2 expansion start: 2026-05-01T09:00Z
Credit cap hit:     2026-05-01T09:43Z (43 min into v2)
Heartbeat resumed:  2026-05-01T09:29Z onward (every 10 min for 3 days)
Monitor stopped:    2026-05-03T20:09Z (manual TaskStop)
Final consolidation: 2026-05-04T01:30+ IST (post-credit-reset)
```

## v0.3 carry-overs (from this session's measurements)

1. **Subagent-write restriction documented in PROTOCOL.md** (carried from v0.2 known-limitations).
2. **Launcher script bash hygiene.** Ship `claude-forge/scripts/launch-swarm.sh` as a tested artifact, not inline.
3. **Bounded monitor lifetimes** — default 2h timeout, explicit opt-in for persistence.
4. **Wheel-availability pre-check** for multi-version matrix tasks (queries PyPI before promising version count).
5. **Credit-cap-aware retry logic** — Agent dispatches that fail with credit-cap should be queued for retry post-reset, not abandoned.

## Comparison vs v0.1 baseline

v0.1 had no measured concurrency — only Research and Engineering teams were exercised, sequentially. v0.2 measured ~92 concurrent claude processes across 6 teams + Tier-3 swarm + heartbeat monitor on a single Mac. **The framework demonstrably scales to ~100-process parallel execution on commodity hardware.**

The credit-cap interrupt at minute 43 is itself useful evidence: at that scale the framework's bottleneck is not the orchestrator's coordination overhead but the user's API budget. v0.3 should treat budget as a first-class scheduling input.
