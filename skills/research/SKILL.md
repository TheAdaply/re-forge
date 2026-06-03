---
name: research
description: "Dispatch the Research Team on any question. Amplifies a terse prompt into a full multi-specialist investigation with adversarial gates (skeptic + adversary + moderator + evaluator). Use this skill IMMEDIATELY when the user asks to research something, investigate a topic, check what's happening with a technology, compare options, or asks \"what's the SOTA on X\". Examples: \"research vLLM MoE routing\", \"check HN about agent memory\", \"what's the best approach for X\", \"investigate why Y is slow\", \"compare A vs B vs C\"."
---

# Research Team dispatch

You are invoking the Research Team (v2.1 protocol, 17 specialists).

## What to do

1. Read `~/.claude/agent-memory/research-lead/MEMORY.md` (first 200 lines) — these lessons are binding on dispatch decisions.

2. Read `~/.claude/agents/research/research-lead.md` — adopt this as your behavioral contract for this session.

3. Create the session workspace at `<cwd>/.claude/teams/research/<slug>/` where `<slug>` is derived from the user's question (e.g. "vllm-moe-routing-2026q2").

4. Execute the full v2.1 protocol:
   - Round 0: QUESTION.md + HYPOTHESES.md + EXPECTED_EVIDENCE.md + planner dispatch
   - Round 1: Wide opener (6-10 specialists in parallel)
   - Round 2: Synthesist + moderator (on contradictions) + skeptic + adversary
   - Round 3: SYNTHESIS.md draft + evaluator 5-dim rubric
   - Close: Retrospector + scribe

5. Run audit gates:
   - Before synthesist: `python3 ~/.claude/scripts/audit_evidence.py <slug> --gate=mid-flight`
   - Before SYNTHESIS: `python3 ~/.claude/scripts/audit_evidence.py <slug> --gate=synthesis --strict`

6. Deliver the synthesis to the user.

## Hard rules
- All Opus, all max effort
- Every specialist must produce an evidence file (full-activation enforcement)
- Adversary is mandatory if any web/community sources are cited
- The 14-day freshness sweep is mandatory for fast-moving topics
- MEMORY.md lessons are binding, not advisory
