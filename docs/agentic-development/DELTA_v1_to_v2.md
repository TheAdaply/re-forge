# What changed v1 → v2

## The diagnosis (from the executed transcript)

v1 ran for ~1h20m wall-clock and dispatched ~10 Agents + 26 headless processes. The deliverables shipped, but two architectural mistakes destroyed the "100 parallel agents over 6 hours" effect.

### Mistake 1 — Subagents cannot spawn subagents

I told the orchestrator: *"Tier-1 lead spawns 12 specialists in-thread."* In Claude Code, subagents cannot spawn subagents. So when `engineering-lead` was dispatched as a single Agent, it impersonated all 12 engineering specialists *sequentially in its own model thread*. One model doing 12 things is not 12 models doing 1 thing each — it's the same wall-clock as a solo agent doing all the work, just with extra prose.

The transcript proves this: "Phase 2 engineering-lead 4-track" returned with all 4 tracks complete in one Agent return. That's a single thread sequentially producing 4 worktrees worth of code, not 4 threads working in parallel.

**Fix in v2:** the orchestrator (main thread) directly dispatches every specialist via `Agent({ subagent_type: "engineering-executor", run_in_background: true })`. The "lead" is just the synthesist role — it runs *after* the specialists, reads their evidence files, and writes SYNTHESIS.md. It does not orchestrate. **The orchestrator orchestrates.**

### Mistake 2 — Newly-installed teams not registered at startup

v1's Phase 0 said "install Security/Testing/Docs teams from the claude-forge repo." Claude Code loads the subagent registry once at session start; mid-session installs aren't picked up. The transcript shows the orchestrator catching this: *"Security and docs lead types aren't in the registered agent list (newly installed; not picked up at session start). Re-dispatching them as general-purpose."*

A `general-purpose` Agent adopting a persona via prompt is a workable fallback, but it loses the persona's frontmatter (`model: opus`, `effort: max`) and the specialist registry routing. More importantly: those `general-purpose` agents inherit the same single-thread limitation, so they couldn't do real Tier-2 fan-out either.

**Fix in v2 + v2 LAUNCH.md:** install all teams *before* starting the claude session. The launch playbook now includes a `bash setup-all-teams.sh` step that copies security/testing/docs from `/tmp/yc-recon/claude-forge/agents/` into `~/.claude/agents/` *before* `claude` is invoked. Pre-flight in v2 verifies all six team directories exist; halts if not.

### Mistake 3 — Completion criteria didn't include time

v1 said "by hour 6 you should have shipped X". v1 didn't say "even if X is shipped at hour 2, do not advance." The orchestrator hit the deliverables and stopped. The 6-hour figure was aspirational; v2 makes it a hard floor.

**Fix in v2:** every phase has a *minimum elapsed time* gate. Advancement requires (deliverables met) AND (elapsed ≥ floor). When you're early, expand depth from the catalog in §5. ScheduleWakeup enforces minimums.

## What v2 adds beyond fixing v1

### 1. Real parallelism via direct orchestrator dispatch

- ≥120 Agent dispatches over the session, peaks of 30+ concurrent.
- ≥150 headless `claude -p` over the session, peaks of 50+ concurrent.
- Three rounds of research with novelty injection between rounds.
- 4-track engineering = 48 distinct engineering Agents, not 1 lead-Agent.
- 12-Agent dispatch per track (3 plan + 4 build + 3 verify + 2 adversarial).

### 2. 4× the swarm depth

- 100 kernel targets (was 26).
- 1000 iterations per kernel (was 250). Total iterations 400,000 (was 6,500).
- Real mutation testing with mutmut, ≥1000 mutants, runs for 1+ hour.
- Continuous heartbeat: pytest+lint+mypy every 10 min for the whole session.

### 3. Multi-version PyTorch matrix

Phase 4 spins up six PyTorch versions (2.6 → 2.11) and runs the full suite on each via 30 parallel headless workers. MATRIX_REPORT.md is a substantial new YC-visible artifact: gpucheck v1.0 verified across 6 framework versions in one session.

### 4. Rigorous independent reproduction before upstream filing

The v1 swarm reported 58 attention divergences as "filable to pytorch/pytorch." Independent reproduction in v1's Phase 3 caught all 58 as near-zero-denominator artifacts (`abs_err=4.17e-7` vs `threshold=1.99e-4`). The orchestrator filed 0 issues — correct call, but unstructured.

v2 makes this systematic: top-K divergences each get a dedicated `engineering-debugger` Agent that sweeps ≥1000 iterations, distinguishes near-zero-denom from real, and writes `EVIDENCE/repro-<rank>.md` with FILABLE/NOT_FILABLE/NEEDS_TRIAGE verdict. Only FILABLE proceeds to upstream prior-art search and issue draft. **Spam is forbidden** is now a structured pipeline, not just a rule.

### 5. CI-environment-faithful verification

v1's late catch: engineering-verifier ran mypy locally and called it green; CI on Linux py3.12 caught an unused `# type: ignore` and failed lint. v2 standing rule: **mypy strict checks must use the CI matrix Python version**, not just the local interpreter. Codified.

### 6. Empirical claude-forge benchmarks

Phase 4 now ships `BENCHMARKS_v0.2.md` in claude-forge: a table of agent type × peak concurrent × wall-clock × tokens. This is direct empirical evidence that v0.2 actually scales — measured on the very session that produced gpucheck v1.0. Direct YC-reviewer signal: "the framework provably handles this load."

### 7. Depth-expansion catalog (§5)

Ten substantive 6+ Agent catalog items the orchestrator runs when ahead of schedule. From per-file deep audits to cross-backend differential testing to a competitive landscape study to a conference talk outline. Effectively infinite depth — that's the design.

### 8. Honesty section in SESSION_REPORT

Required section: anything overclaimed in the spec that execution corrected. The v1 transcript caught two: "408 baseline tests" was actually 117, and 0 upstream issues filed instead of ≥1. Both were the right calls. v2 codifies "be honest under-delivery > confident over-claim" and makes the honesty visible in the YC artifact.

## Updated launch playbook deltas

Update LAUNCH.md to add (before starting claude):

```bash
# Pre-install all claude-forge teams (NOT just research+engineering)
SRC=/tmp/yc-recon/claude-forge/agents
DST=~/.claude/agents
for team in security-team testing-team docs-team; do
  team_short=$(echo $team | sed 's/-team$//')
  mkdir -p "$DST/$team_short"
  cp "$SRC/$team"/*.md "$DST/$team_short/" 2>/dev/null
  cp "$SRC/$team/PROTOCOL.md" "$HOME/.claude/teams/$team_short/PROTOCOL.md" 2>/dev/null
done

# Promote gpucheck experts to subagents (so they're registered at session start)
SRC=~/Code/gpucheck/.claude/experts
DST=~/.claude/agents/gpucheck
mkdir -p "$DST"
for f in "$SRC"/*/AGENT.md; do
  name=$(basename "$(dirname "$f")")
  # write with frontmatter; preserve body
  { echo "---"
    echo "name: $name"
    echo "model: opus"
    echo "effort: max"
    echo "description: $(grep -m1 '^## Identity' -A1 "$f" | tail -1 | head -c 150)"
    echo "---"
    echo
    cat "$f"
  } > "$DST/$name.md"
done

# Verify all six team dirs are populated before launching claude
for t in research engineering security testing docs gpucheck; do
  count=$(ls ~/.claude/agents/$t 2>/dev/null | wc -l)
  echo "  $t: $count agents"
done
```

If any count is 0, fix before launching.

## What stays the same from v1

- Recursive dogfood narrative (gpucheck v1.0 + claude-forge v0.2-rc).
- Apple MPS dogfood, no cloud spend.
- Phase structure (5 phases: bootstrap, research, build, dogfood, release).
- TestPyPI only, never real PyPI; PRs only, never push to main.
- Adversarial gates (skeptic + adversary + moderator + evaluator).
- File-on-disk turn-based comms.
- All Opus, all max effort.

## How to use v2

Same flow as v1: paste `MEGA_PROMPT_v2.md` into a fresh Claude Code session in `~/Code/gpucheck/` on `release/v1.0`. Use the updated `LAUNCH.md` for the pre-flight (especially the team-install step). The session targets a 6h hard floor and ~270 total parallel processes (Agents + headless).
