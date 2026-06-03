---
name: forge-test
description: Run the skill-creator eval loop against a forge-draft output to grade whether the drafted skill is promotable. Invokes the grader and analyzer agents plus the aggregate-benchmark script from the official skill-creator plugin and returns a pass/fail verdict + suggested improvements. Use when forge-draft has produced a draft at ~/.claude/forge/drafts/<name>/ and the Forge needs a quantitative grade before promotion.
disable-model-invocation: true
allowed-tools: Read Write Bash(python *) Bash(nohup *)
---

# Forge tester

## Wraps skill-creator's eval harness

The official `skill-creator` plugin at `~/.claude/plugins/cache/claude-plugins-official/skill-creator/d53f6ca4cdb0/` ships five Python scripts that implement the eval loop:

- `scripts/quick_validate.py` — syntactic SKILL.md validation.
- `scripts/aggregate_benchmark.py` — produces `benchmark.json` with pass rates, timing, tokens.
- `scripts/generate_report.py` — HTML viewer generation.
- `scripts/run_eval.py` — runs a single eval case.
- `scripts/run_loop.py` — the full trigger-optimization loop.

## Method

1. **Validate syntax**: from the skill-creator plugin directory (`~/.claude/plugins/cache/claude-plugins-official/skill-creator/d53f6ca4cdb0/`), run `python -m scripts.quick_validate <draft-path>/SKILL.md` — this is skill-creator's `scripts.quick_validate`, not re-forge's own `scripts/`. On failure, return the error to `forge-draft` for fixes.
2. **Spawn eval runs**: for each eval case in `<draft-path>/evals/evals.json`, spawn two runs — one with the draft skill, one without (baseline).
   - Use `context: fork` to isolate runs from the main Forge context, per `code.claude.com/docs/en/skills`.
   - Save outputs to `~/.claude/forge/workspaces/<draft-name>/iteration-1/eval-<id>/{with_skill,without_skill}/outputs/`.
3. **Grade**: for each run, spawn the skill-creator's `agents/grader.md` persona to evaluate assertions against outputs. Write `grading.json` per run.
4. **Aggregate**: from the same skill-creator plugin directory, run `python -m scripts.aggregate_benchmark <workspace>/iteration-1 --skill-name <name>` (skill-creator's script, not re-forge's `scripts/`). Produces `benchmark.json`.
5. **Analyze**: spawn skill-creator's `agents/analyzer.md` to surface patterns in the benchmark.
6. **Verdict**:
   - PASS: pass_rate >= 0.8 on all eval cases AND analyzer finds no critical issues.
   - CONDITIONAL: pass_rate 0.6-0.8 OR analyzer flags fixable issues. Return suggestions to `forge-draft` for iteration.
   - FAIL: pass_rate < 0.6 OR critical analyzer findings. Return to `forge-draft` or escalate to `forge-lead` for research-request if stuck.

## Hard rules

- Never skip the eval loop. A skill without evals is unpublishable.
- Never declare PASS without the aggregator + analyzer both clearing.
- Never modify the draft yourself — return feedback to `forge-draft`.
- Minimum 3 eval cases (per Anthropic best-practices doc — "build three scenarios that test these gaps").
- Maximum 3 iterations before escalating to `forge-lead` with a research-request.
