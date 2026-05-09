# claude-forge

claude-forge is a hardened operating procedure for [Claude Code](https://claude.ai/code)'s native subagent and agent-teams primitives — adversarial gating, institutional memory, and on-disk evidence baked into a multi-role research protocol. It is for operators who need their agents to disagree, audit each other, and remember, not for users who just need one assistant to edit a file.

**Get started in 5 minutes →** see [QUICKSTART.md](./QUICKSTART.md).

<!-- TODO record demo before v0.4 final ships -->
[![asciinema demo](https://asciinema.org/a/PLACEHOLDER.svg)](https://asciinema.org/a/PLACEHOLDER)

## Slash commands

Six user-callable commands. Type `/<name>` in any Claude Code session after `bash setup.sh` and a restart. Cost/time figures are typical, calibrated against the v0.2 validation session (`BENCHMARKS_v0.2.md`); a single dispatch can fan out to 17+ specialists in parallel.

| Command | Dispatches | Typical wall-clock | Typical token cost |
|---|---|---|---|
| `/research` | Research Team (17 specialists) — multi-source investigation with adversarial gates (skeptic + adversary + moderator + evaluator) and a 5-dim evaluator rubric | 2–30 min | 50K–500K |
| `/engineer` | Engineering Team (12 specialists) — plan → architect → skeptic → executor → verifier → reviewer loop; reads a research SYNTHESIS as binding spec | 5–60 min | 100K–800K |
| `/security` | Security & Review Team — CVE check, secrets scan, threat model, license audit; auto-detects language/dependency manager | 3–10 min | 30K–150K |
| `/testing` | Testing & QA Team — coverage, mutation testing, property tests, regression detection | 5–30 min | 50K–300K |
| `/docs` | Documentation Team — author + verify README/API docs/changelogs/architecture | 3–15 min | 20K–120K |
| `/forge` | Capability Forge — gap detection → MCP/marketplace scout → draft → test → promote new skills | 5–20 min | 30K–200K |

A first-run `/research` on a deliberately-narrow toy question (see QUICKSTART) lands a SYNTHESIS in 2–3 minutes for well under 50K tokens.

## How claude-forge compares

claude-forge is **a hardened operating procedure for Claude Code's native subagent + agent-teams primitives**, not a runtime, not a graph engine. The differentiators that survive a skeptical engineer:

1. **Adversarial gating is contractual** (every SYNTHESIS re-audited by skeptic + adversary).
2. **Cross-session memory with helpful/harmful counters** (vanilla agent-teams stores nothing across sessions).
3. **A forge meta-agent that evolves the workforce** (none of the alternatives below attempts this).

| Alternative | Install | Why pick claude-forge over it |
|---|---|---|
| Claude Code native subagents + agent-teams | bundled | adversarial gating + cross-session memory + on-disk EVIDENCE substrate |
| LangGraph | `pip install langgraph` | stay inside Claude Code REPL; no graph runtime to deploy |
| AutoGen | `pip install autogen-agentchat` | **AutoGen is in maintenance mode** (Microsoft now points users at Microsoft Agent Framework) |
| CrewAI | `uv pip install crewai` | built-in adversary/skeptic/moderator vs polite-collaboration default |
| Mastra / Inngest / Trigger.dev | `npm create mastra` etc. | claude-forge is interactive investigations; these are HTTP-endpoint workflows |
| Goose (block/goose) | `curl … \| bash` | claude-forge optimizes for Claude protocols, not provider portability |
| Aider | `pip install aider-install` | different problem class — single-agent pair programming |

**Persona this is built for:** a research-heavy IC or 2–5 person team running multi-week investigations across multiple codebases who has already noticed Claude Code single-sessions hallucinate citations, anchor early, and forget yesterday's lessons.

## What's inside

### 3 teams + 1 meta-agent

| Team | Leader | Specialists | Purpose |
|---|---|---|---|
| **Research Team v2.1** | `research-lead` | 17 | Investigate any question with adversarial gates (skeptic + adversary + moderator + evaluator) |
| **Engineering Team v1** | `engineering-lead` | 12 | Ship code from research findings via plan-then-build with verifier + reviewer loop |
| **Capability Forge H1** | `forge-lead` | 5 sub-skills | Detect workforce gaps, scout MCP Registry + marketplaces, author new skills |

### Key features

- **Self-evolving memory**: ACE-pattern (generation/reflection/curation) via retrospector + scribe. Lessons accumulate across sessions and transfer across projects
- **Adversarial gates**: Skeptic (attacks reasoning) + adversary (attacks sources for SEO fraud, citation laundering, astroturfing) + evaluator (5-dim rubric) before "high confidence"
- **Structured debate**: Moderator runs 3-round debates with 5 verdict types (A_WINS, B_WINS, COMPLEMENTARITY, REFRAME, DEFER) instead of lead arbitrating with bias
- **Full-activation enforcement**: Evidence-file-as-contract ensures every specialist actually runs. Audit script catches shortcuts
- **Parallel orchestration**: Run 4+ teams concurrently with file-locked memory segregation (empirically validated: 10 concurrent writers, 70ms, zero lost writes)
- **Per-project isolation**: Sessions are project-local (`<cwd>/.claude/teams/`), infrastructure is global (`~/.claude/`)
- **All Opus, all max effort**: Every agent runs on the strongest model. No downgrades

### Research-backed design

| Source | What we imported |
|---|---|
| [Anthropic multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) | Orchestrator-worker, 5-dim rubric, scaling rules |
| [Anthropic "Building effective agents"](https://www.anthropic.com/research/building-effective-agents) | Workflow/agent distinction, evaluator-optimizer |
| [MAST failure taxonomy](https://arxiv.org/abs/2503.13657) (NeurIPS 2025) | 14 failure modes mapped to specialist ownership |
| [ACE: Agentic Context Engineering](https://arxiv.org/abs/2510.04618) (Stanford) | Generation/reflection/curation loop |
| [DebateCV](https://arxiv.org/abs/2507.19090) | Structured debate for contradictions |
| [Magentic-One](https://arxiv.org/abs/2411.04468) (Microsoft Research) | Ledger-based orchestration, bounded retry |
| [Memory in the Age of AI Agents](https://arxiv.org/abs/2512.13564) (47 authors) | Forms x Functions x Dynamics taxonomy |

## Quick start

### Prerequisites

- [Claude Code](https://claude.ai/code) CLI installed
- Claude Max plan (all agents use Opus with max effort)
- `gh` CLI authenticated (`gh auth login`)
- Python 3.11+ (for audit script)
- `uv` / `uvx` recommended (for arxiv MCP server)

### Installation

```bash
git clone https://github.com/Akasxh/claude-forge.git
cd claude-forge
bash setup.sh           # installs all 5 teams (research, engineering, security, testing, docs) + forge
bash scripts/doctor.sh  # verify install
```

The installer copies agents, protocols, scripts, hooks, skills, and the forge to `~/.claude/`. It backs up anything it would overwrite. As of v0.2 it auto-discovers every `agents/*-team/` and every `memory/*.md`, so all five teams ship out of the box (no manual loop required).

### What gets installed

```
~/.claude/
├── agents/
│   ├── research/          # 18 research team agents
│   ├── engineering/       # 13 engineering team agents
│   └── forge-lead.md      # Capability Forge
├── teams/
│   ├── research/PROTOCOL.md   # Research protocol v2.1
│   └── engineering/PROTOCOL.md # Engineering protocol v1
├── agent-memory/
│   ├── research-lead/MEMORY.md    # 24+ starter lessons
│   ├── engineering-lead/MEMORY.md
│   └── forge-lead/MEMORY.md
├── scripts/
│   ├── audit_evidence.py    # Full-activation gate
│   └── team_status.sh       # Dashboard
├── hooks/
│   ├── session-capture.sh   # Ad-hoc session learning
│   └── log-evidence-writes.sh
├── forge/                   # Forge workspace + 5 sub-skills
└── skills/
    └── hn-search/SKILL.md   # Example authored skill
```

### First run

```bash
cd ~/my-project
claude

# Research something
/research how vLLM handles MoE routing

# Implement from research
/engineer implement Hook A from the memory-layer research

# Check workforce gaps
/forge what capability are we missing?
```

For a deliberately narrow first dispatch (toy question, low token cost, SYNTHESIS in 2–3 min) follow [QUICKSTART.md](./QUICKSTART.md).

### Dashboard

```bash
bash ~/.claude/scripts/team_status.sh
python3 ~/.claude/scripts/audit_evidence.py <slug> --gate=synthesis --strict -v
```

## How it works

### The self-evolution loop

```
Research Team investigates a question
  -> SYNTHESIS.md with adversarial-gated findings
  -> retrospector writes durable lessons to MEMORY.md
  -> scribe deduplicates via ACE grow-and-refine

Engineering Team implements the recommendation
  -> reads research SYNTHESIS as binding spec
  -> plan -> architect -> skeptic -> executor -> verifier -> reviewer
  -> writes handback to research workspace

Capability Forge detects gaps
  -> /forge:gap (inventory + taxonomy diff)
  -> /forge:scout (MCP Registry + marketplaces)
  -> /forge:draft -> /forge:test -> /forge:promote
  -> tracks skill value via helpful/harmful counters

Every session makes the next one smarter.
```

### Memory architecture

Uses the [ACE pattern](https://arxiv.org/abs/2510.04618):
- **Generator**: retrospector extracts 3-7 durable lessons per session
- **Reflector**: durability test ("would this help in 3 months on an unrelated question?")
- **Curator**: scribe merges, deduplicates, marks stale entries

Memory is global (transfers across projects). Sessions are per-project (evidence stays isolated). Hook A routes long-tail overflow to topic files with reference pointers.

### Why adversarial gates matter

Most multi-agent systems fail by adding agents without adding verification. Claude-forge imports the [MAST taxonomy](https://arxiv.org/abs/2503.13657) and assigns each failure mode to a specialist:

- **Skeptic** attacks reasoning (FM-3.3)
- **Adversary** attacks sources: SEO farms, benchmark fraud, citation laundering (FM-3.3 corpus variant)
- **Moderator** runs structured debates on contradictions (FM-2.5)
- **Evaluator** grades output on 5 dimensions (FM-3.2)

The adversary caught [MemPalace's misleading benchmarks](https://github.com/MemPalace/mempalace/issues/214) (50K+ stars, 96.6% LongMemEval R@5 score that actually measured a vanilla ChromaDB lookup, not MemPalace's palace architecture) during the first pilot. The skeptic alone couldn't have caught this — the corpus claim looked plausible until the adversary read the benchmark file.

### Parallel execution

```python
Agent({ subagent_type: "research-lead", prompt: "...", run_in_background: true })
Agent({ subagent_type: "engineering-lead", prompt: "...", run_in_background: true })
```

Memory segregation: retrospectors write to `staging/<slug>.md`, scribes merge via flock + timeout + atomic-rename. Empirically validated with 4 concurrent teams.

## Customization

### Adding a new team

Follow the self-evolving principle:
```
/research how a Testing/QA team should be structured
```

Research-lead produces a SYNTHESIS with a ready-to-write team design. Write the files and pilot.

### Adding skills via the Forge

```
/forge build a skill that wraps the Semantic Scholar API
```

The Forge wraps Claude Code's official `skill-creator` and `mcp-builder`.

### Memory layer phases

| Phase | Status | What |
|---|---|---|
| Hook A | Shipped | Topic-file routing for long-tail lessons |
| Hook B | Spec ready | SQLite + FTS5 + sqlite-vec MCP server |
| Hook C | Spike plan ready | LatentMAS KV-cache handoff |
| Parametric | Direction | LoRA distillation of stable lessons |

## How it was built

This system was built by Claude researching how to build itself:

1. **Self-evolution rounds 1-2**: Research-lead audited itself, found 12 defects against MAST + Anthropic patterns, expanded from 12 to 17 specialists
2. **Memory layer pilot**: First v2 protocol run on a real question. Caught MemPalace fraud. Evaluator PASS 5/5
3. **4 parallel research sessions**: Engineering Team + deeper memory specs + Capability Forge + full-activation protocol. All HIGH confidence
4. **Smoke tests**: Engineering implemented Hook A, Forge authored hn-search skill. Both passed
5. **Infrastructure hardening**: 15 agents upgraded to Opus, Stop hook installed, arxiv MCP, scope model refactored

Total: ~2M tokens, ~600 tool calls, ~8 hours of agent compute across 2 days.

## Troubleshooting

If `/research`, `/security`, `/testing`, or `/docs` fails with a missing-file error, your install drifted from the repo. Run `bash scripts/doctor.sh` from inside the `claude-forge` clone — it diffs every `agents/*-team/` and every `memory/*.md` against `~/.claude/` and reports each missing file. Pass `--fix` to re-run `setup.sh` and repair drift in place: `bash scripts/doctor.sh --fix`. Exit code 0 means clean; 1 means drift detected.

## License

MIT

## Contributing

Run the system, let the retrospector accumulate lessons, share what your team learned. If you build a new team, submit it with the research SYNTHESIS that designed it.

## v0.2-rc — Security/Testing/Docs teams activated (2026-05-01)

The three teams drafted-but-unactivated in v0.1 — **Security**, **Testing**, **Docs** — are now installable. v0.2 was validated end-to-end on `gpucheck v1.0.0rc1` (4-track parallel implementation + 26-process kernel-fuzzer swarm + ~100 distinct agent dispatches). See `RELEASE_NOTES_v0.2.md` for measured deltas, known limitations, and install steps.