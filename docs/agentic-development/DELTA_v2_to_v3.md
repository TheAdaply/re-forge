# What changed v2 → v3

## Why v2 doesn't fit anymore

Between session 1 (2026-05-01) and now (2026-05-07), the world changed:

- **`release/v1.0` PR #2 already exists with everything v2 promised** — MPS backend, stride fuzzing, HTML dashboard, determinism, thread-safety fix, CHANGELOG/CONTRIBUTING/MIGRATION. 5,622 LOC additions. CI green. Just unmerged.
- **v1.1 audit work already ran locally** — 12 specialist evidence files under `.claude/teams/audit/v1.1/SUMMARIES/`, mutation testing 165 REAL_GAPs identified, M5 benchmarks captured (3.54 TFLOPs fp32 / 14.1 TFLOPs fp16 at 4096³), continuous-learning hook attach points designed.
- **Research SYNTHESIS already drafted v1.1 plan** — six concrete deliverables with ready-to-paste TOML and a +91/-8 line patch already specified in evidence.

If we paste v2's prompt now, the orchestrator would re-implement the MPS backend that's already in PR #2. Wasted compute and broken narrative.

## What v3 does instead

v3 is the **second session in a compounding sequence**: review the rc, ship the final, build v1.1 from the already-drafted plan, calibrate the deferred provisionals, close the memory loop, and ship claude-forge v0.2. **Two sessions, three releases, one transcript that shows the framework getting smarter.**

## The structural changes

### 1. Phase 0 is now pure ingestion

Read everything before doing anything. The orchestrator must produce an `INGESTION.md` summarizing PR #2's contents, the SYNTHESIS plan, all 12 audit summaries, mutant survivors, M5 benchmarks, and per-lead memory state — *before any specialist is dispatched*. This explicitly forbids re-doing work and forces the second session to compound on the first.

### 2. Phase 1 is now external-style review of the existing PR, not original work

5 parallel review threads (security, perf, API, numerical, docs), each ~5 specialists, all reading the same 5,622-line diff. Their job is to find what session 1 missed. The audit's own findings are binding inputs (e.g. the api-dx-grade 2.8/5 score for ShapeStrategy, the bare-except violations, the 165 REAL_GAP mutants), and the review must verify them on the actual diff and surface anything new.

### 3. Phase 2 implements 6 specific v1.1 deliverables, not generic "make it better"

Six tracks, each grounded in either SYNTHESIS or an audit summary:

| Track | Source | Concrete deliverable |
|---|---|---|
| 1 | SYNTHESIS table | Per-(kernel, dtype) tolerance overlay (matmul/fp32=16×, matmul/fp16=20×, matmul/bf16=32×, conv2d/fp16=5×, conv2d/bf16=8×, …) replacing PROVISIONAL 2× constant |
| 2 | SYNTHESIS patch | Apple-tile-aware shape fuzzing (+91/-8 lines, drafted) |
| 3 | SYNTHESIS TOML | xfail registry expansion 12 → 43 entries (TOML drafted) |
| 4 | SYNTHESIS design | Silent-downcast catcher (raise-by-default) |
| 5 | detector-files | Consolidate 3 GPU-detection sites; rename naming-collision functions; replace 7 bare-except sites |
| 6 | mutator-survivors | Cover 165 REAL_GAPs; tighten 30 TEST_BUG matchers |

### 4. Phase 3 is calibration empirics, not just dogfooding

The PROVISIONAL 2× MPS multiplier was the open milestone v1 explicitly deferred. v3 measures it: ~30 cells of (kernel × dtype) × 5,000 input pairs × P99 fit. **If measurement disagrees with SYNTHESIS, measurement wins.** Plus rigorous mining of the 102 unused fuzz worktrees with proper denom-magnitude filtering.

### 5. Phase 4 is the memory-loop closure (entirely new)

The audit's architect-continuous-learning evidence specified 4 hook attach points. claude-forge v0.1 has retrospectors that write to staging only — *nothing merges*. v0.2 closes the loop:

- SessionStart hook ranks top-K lessons via Generative-Agents triple (`recency · importance · relevance`), injects them as a context block.
- Agent-dispatch wrapper prepends ranked lessons to every Agent payload.
- SessionEnd hook auto-runs scribe-merge on staging artifacts (with `flock` + atomic-rename, validated empirically in v0.1 at 92-process concurrency).
- Pattern-extraction script (cron/launchd) scans transcripts for recurring tool sequences as candidate skills.

Plus the lesson schema migration (YAML frontmatter + Situation/Action/Outcome/Bounds body), and GC pass for stale lessons.

This is a much stronger v0.2 than v2's "ship a release notes file."

### 6. Phase 5 is real shipping with merge order

Merge `gpucheck PR #2 → main → tag v1.0.0 → release notes` first, then build artifacts, then open the v1.1 PR, then merge `claude-forge PR #1 → tag v0.2`. **Two real releases tagged in one session.** Order matters and is specified.

### 7. Phase 6 explicitly produces a session-1 vs session-2 comparison doc

`SESSION_COMPARE.md` is the YC artifact that makes compounding visible: every metric from session 1 and session 2 side-by-side with the narrative cell explaining the delta. This *is* the YC pitch in document form.

### 8. Tighter forbidden-actions list

New entry: **"Never re-run work the v1.1 audit already did. Read the evidence; trust it; build on it. If you disagree, dispatch one Agent to re-verify before treating the audit as wrong."** This explicitly prevents the orchestrator from re-doing the audit's 12-specialist sweep.

## What stays from v2

- Architecture: orchestrator-dispatches-everyone (Tier-α Agents + Tier-β Bash claude -p + Tier-γ continuous loops). v3 keeps the ≥120 Agent + ≥150 headless target.
- Hard 6h floor with phase minimums.
- Adversarial gates non-negotiable.
- TestPyPI only, never real PyPI; PRs only, never push to main.
- Honesty rule + honest-section in the report.
- Mac MPS only, no cloud spend.

## Pre-flight changes for LAUNCH

Two things have to be different in the launch playbook:

1. **Do not run `git checkout -b release/v1.0`.** That branch already exists with PR #2 open. The orchestrator confirms checkout in Phase 0 instead.
2. **Do not run setup.sh in claude-forge.** The teams are already installed (verified: research/19, engineering/14, security/13, testing/12, docs/11, gpucheck/10).

The pre-launch flow is now just:

```bash
cd ~/Code/gpucheck
git fetch origin && git status                    # confirm clean checkout on release/v1.0
uv pip install -e ".[dev,torch]" hypothesis pytest-cov mutmut
python -c "import torch; print('mps:', torch.backends.mps.is_available())"   # must be True
caffeinate -dimsu -t 23400 &
claude
# paste MEGA_PROMPT_v3.md
```

That's it. The substrate has already absorbed the v1 work.
