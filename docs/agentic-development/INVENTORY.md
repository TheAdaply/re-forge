# Available capability inventory (read-only reference)

Catalogued 2026-05-01 from this Mac's `~/.claude/` after `setup.sh`.

## Teams now dispatchable via Skill

These auto-loaded as soon as claude-forge installed. Each routes to a multi-specialist team with adversarial gates.

- `/research` → 19-agent research team with skeptic + adversary + moderator + evaluator + retrospector + scribe
- `/engineer` → 14-agent engineering team (planner, architect, executor, verifier, reviewer, debugger, skeptic, adversary, moderator, evaluator, retrospector, scribe)
- `/security` → 14-agent security & review team (auto-detects language; SAST + LLM + verification 3-phase pipeline)
- `/testing` → 13-agent testing & QA team (writer, mutator, property, runner, fixture, detector, evaluator, retrospector, scribe, skeptic, planner, lead)
- `/docs` → 9-agent docs & knowledge team (writer, reviewer, planner, evaluator, retrospector, lead, detector, diagrammer, reader, skeptic, tester)
- `/forge` → capability forge (gap → scout → draft → test → promote)

**Note:** Of the above, only research+engineering were installed by setup.sh. Security, Testing, Docs are in the claude-forge repo at `/tmp/yc-recon/claude-forge/agents/{security,testing,docs}-team/` but not yet copied into `~/.claude/agents/`. **Phase 0 of the YC session installs them.**

## Domain skills relevant to gpucheck v1.0

From `~/.claude/skills/`:

| Skill | Use during YC session |
|---|---|
| `flash-attention` | Reference correctness oracle for MPS attention kernels |
| `llama-cpp` | Apple Silicon precedent; check how it handles MPS dispatch |
| `gguf` | Apple Silicon quantization patterns |
| `pytorch-fsdp2`, `accelerate`, `deepspeed` | Skip for v1.0 — out of scope |
| `lm-evaluation-harness`, `bigcode-evaluation-harness` | Patterns for benchmark suite design |
| `hn-search` | Source primary-source feedback on gpucheck competitors |
| `mlflow`, `weights-and-biases`, `tensorboard` | Pattern reference for the new HTML dashboard |
| `langsmith`, `phoenix`, `langchain` | Skip — not relevant |

## Plugin skills relevant

From enabled plugins:

- `superpowers:dispatching-parallel-agents` — used to fan-out from leads to specialists
- `superpowers:test-driven-development` — every gpucheck PR must follow this
- `superpowers:systematic-debugging` — for MPS quirk debugging
- `superpowers:writing-plans` / `executing-plans` — orchestration backbone
- `superpowers:requesting-code-review` / `receiving-code-review` — internal review loop before security team
- `superpowers:verification-before-completion` — before tagging release
- `superpowers:using-git-worktrees` — isolate the 4 parallel implementation tracks
- `frontend-design:frontend-design` — HTML dashboard for the new report format
- `playwright:*` — E2E tests on the dashboard
- `context7` — fetch authoritative `torch.mps` docs (training data may be stale on this)
- `claude-md-management:claude-md-improver` — update gpucheck's CLAUDE.md after the changes
- `skill-creator:skill-creator` — needed for forge to author new skills (e.g., `mps-kernel-debugging`)
- `ralph-loop:ralph-loop` — drive the 6-hour heartbeat / fuzzing swarm
- `code-simplifier` — final simplification pass before merge

## Marketplace plugins NOT installed but maybe useful

(Do NOT install without explicit user approval.)

- `code-review` — 273k installs, multi-agent code review with confidence scoring
- `coderabbit` — external validation third opinion
- `commit-commands` — git workflow helpers
- `huggingface-skills` — for dataset/model registry interaction if we publish benchmarks
- `feature-dev` — alternative orchestration; would conflict with claude-forge
- `chrome-devtools-mcp` — could observe the dashboard during the session
- `github` (official MCP) — already have `gh` CLI; redundant

**My recommendation:** Don't add anything else. claude-forge + the 8 already-enabled plugins are enough.

## Files dropped on disk during prep

- `/Users/cero/Desktop/yc-session/STATE.md` — resume point
- `/Users/cero/Desktop/yc-session/INVENTORY.md` — this file
- `/tmp/yc-recon/gpucheck/` — shallow clone, stable for reading
- `/tmp/yc-recon/claude-forge/` — shallow clone, stable for reading; source of un-installed teams
