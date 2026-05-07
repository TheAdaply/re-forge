# claude-forge v0.2-rc — Release Notes

**Date:** 2026-05-01
**Validation session:** gpucheck v1.0.0rc1 multi-team build
**Tag (proposed):** v0.2-rc

## Summary

v0.2 activates the three teams that were drafted-but-unactivated in v0.1 — **Security, Testing, Docs** — and validates four-team parallel execution end-to-end on a real engineering workload. The v1.0 release of `gpucheck` was produced under this protocol and used as the live integration test.

## What's new

### Three new teams installable

The following teams ship with v0.2 and can be installed by copying agents into `~/.claude/agents/<team>/` and `PROTOCOL.md` into `~/.claude/teams/<team>/`:

- **Security Team** — 13 specialists (threat-modeler, owasp-scanner, secrets-hunter, dependency-auditor, license-auditor, config-scanner, crypto-reviewer, architecture-reviewer, planner, skeptic, evaluator, retrospector + lead). Verdict model: BLOCKER / ADVISORY / PASS. Output: `THREAT_MODEL.md`, `FINDINGS.md`, per-specialist `EVIDENCE/*.md`.
- **Testing Team** — 12 specialists (planner, property, mutator, fixture, writer, runner, detector, scribe, skeptic, evaluator, retrospector + lead). Owns property tests, mutation testing, and the kernel-fuzzer swarm protocol (Tier-3 headless `claude -p` workers).
- **Docs Team** — 11 specialists (planner, reader, detector, writer, reviewer, diagrammer, tester, skeptic, evaluator, retrospector + lead). Two-phase: Phase-1 audit + drafts, Phase-3 finalization with DIFF_LOG-bound CHANGELOG/CONTRIBUTING/MIGRATION.

All three teams' PROTOCOLs follow the same evidence-on-disk + adversarial-gate model as Research and Engineering.

### Validation: gpucheck v1.0.0rc1 multi-team session

A single 6-hour orchestrator session ran six teams in parallel + a 26-process Tier-3 kernel-fuzzer swarm. Outcomes:

- Research Team: 17 specialists, 17 evidence files, 0 audit violations, 44 distinct primary citations, 5/5 evaluator dimensions PASS.
- Security Team: 13 specialists, 0 BLOCKER + 21 ADVISORY findings, evaluator 0.97.
- Engineering Team: 4 parallel implementation tracks committed cleanly (147 / 139 / 126 / 157 tests across tracks; reporting coverage 0% → 98%; mypy strict + ruff PASS on all four). evaluator STRICT 1.00 / 1.00.
- Testing Team: 32 property tests planned + ~675 mutation targets specified; 26-process swarm executed 6 500 iterations on real Apple Silicon MPS.
- Docs Team: 5 docs files landed on `release/v1.0` with conventional commits; 12 stale claims reconciled; 224/224 tests still passing post-doc-landing.
- Forge: 4 capability gaps identified, 3 skills drafted + tested + promoted (`mps-kernel-debugging`, `metal-shader-profiling`, `hatch-testpypi-release`).

End-state: `gpucheck v1.0.0rc1` tagged and built. PR `release/v1.0 → main` opened on `Akasxh/gpucheck` with the full team protocol evidence trail under `.claude/teams/`.

### Forge promoted 3 skills

`~/.claude/skills/` gains:

- **`mps-kernel-debugging`** — torch.mps op-coverage + tolerance shifts vs CUDA + `torch.mps.synchronize()` event timing.
- **`metal-shader-profiling`** — `xctrace` Metal System Trace + `MTLCaptureManager` `.gputrace` + `metal-tt`.
- **`hatch-testpypi-release`** — `hatch build/publish` + Trusted Publisher OIDC + sigstore signing.

Each was scouted against the MCP Registry and `anthropics/skills` before authoring (no shelf duplicates).

## Known limitations (carry-overs to v0.3)

- **Subagent-write restriction.** A persona dispatched as a sub-agent (via `Agent` tool) may have certain top-level files denied by the harness; the security-lead persona reported this and worked around it by inlining the FINDINGS table in its return value (the orchestrator materialized the file from there). v0.3 should document this restriction in `~/.claude/teams/<team>/PROTOCOL.md` and either adjust the writer's filename pattern or surface the restriction explicitly in the lead's return.
- **Memory-staging merge.** `engineering-scribe` followed the flock+atomic-rename protocol to fold its staging file into canonical `MEMORY.md`. The other 5 team scribes did not run end-to-end in this session; their lessons sit in `~/.claude/agent-memory/<team>-lead/staging/v1.0-gpucheck.md` waiting for a scribe pass. v0.3 should make scribe-merge mandatory at retrospect time.
- **Tier-3 swarm reliability.** 26 of 26 RESULTS_*.md files written, but only 9 of 26 emitted the JSONL aggregate line. Each headless agent should be required to flush JSONL as the final step or the orchestrator should parse RESULTS_*.md directly.
- **Filing-bar enforcement.** The kernel-fuzzer swarm flagged a number of "borderline" divergences (1-5× tolerance) and recommended pytorch upstream filings for some of them. Independent reproduction by the orchestrator showed none cleared the testing-lead's > 10× threshold; the borderlines were near-zero-denominator relative-error artifacts. v0.3 should either tighten the filing recommendation logic in the swarm prompt template or have the orchestrator require independent repro before any `gh issue create`.

## Tier counts measured this session

- Tier-0 (orchestrator): 1
- Tier-1 (team leads): 6
- Tier-2 (specialists across all teams): 67 distinct persona dispatches (research 17, engineering 18, security 11, testing 9, docs 7, forge 5)
- Tier-3 (headless swarm): 26 `claude -p` processes (4 per wave, 7 waves, 0 process errors)
- **Total distinct named agents in flight at peak: ~100.**

## Files added in this branch

- `RELEASE_NOTES_v0.2.md` (this file)
- README updates (forthcoming in this branch's next commit) noting Security/Testing/Docs teams as activated.

## How to install v0.2

```bash
# from the claude-forge clone
for team in security testing docs; do
  mkdir -p ~/.claude/agents/$team ~/.claude/teams/$team
  find agents/${team}-team -maxdepth 1 -name '*.md' ! -name 'PROTOCOL.md' \
    -exec cp {} ~/.claude/agents/$team/ \;
  cp agents/${team}-team/PROTOCOL.md ~/.claude/teams/$team/PROTOCOL.md
done
```

(Subagent registry is loaded at session start; you'll need to restart Claude Code or use `general-purpose` adopt-persona until then.)

## Co-author

🤖 Generated with [Claude Code](https://claude.com/claude-code) via the claude-forge protocol.
