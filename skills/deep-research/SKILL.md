---
name: deep-research
description: Use this skill to produce thorough, cited research reports synthesized from multiple web sources. Activate when the user wants to research a topic in depth, do competitive analysis, evaluate a technology, size a market, or run due diligence — anytime an answer requires evidence and source attribution. Triggers include "research", "deep dive", "investigate", "what's the current state of", or "compare X vs Y with sources".
---

# Deep Research

Produce thorough, cited research reports from multiple web sources. Every claim must be backed by a source.

> **Drift-prone.** Web search/scrape tool names, quotas, and result shapes change. Before promising coverage or quoting live source counts, verify which search/fetch tools are actually configured in this environment (re-forge's MCP config in `~/.claude.json`, or built-in web search/fetch) and what the current API docs say.

## When to activate
- Researching any topic in depth, or competitive/market analysis
- Technology evaluation or due diligence on companies/investors/technologies
- Any question requiring synthesis across multiple sources
- The user says "research", "deep dive", "investigate", or "current state of"

## Tooling
Use whatever search and fetch capabilities are available — configured search/scrape MCP tools (e.g. firecrawl, exa) if present, otherwise the built-in web search and web fetch. Confirm availability before promising breadth of coverage.

## What to do
1. **Understand the goal.** Ask 1–2 quick clarifying questions (learning vs. deciding vs. writing? any specific angle or depth?). If the user says "just research it", proceed with reasonable defaults.
2. **Plan.** Break the topic into 3–5 research sub-questions (e.g. main applications, measured outcomes, regulatory landscape, leading players, market size/trajectory).
3. **Execute multi-source search.** For each sub-question, search with 2–3 keyword variations, mixing general and news-focused queries. Aim for 15–30 unique sources total. Prioritize academic/official/reputable news > blogs > forums.
4. **Deep-read key sources.** Fetch full content for the 3–5 most promising URLs — do not rely on search snippets alone.
5. **Synthesize and write the report** in the structure below.
6. **Deliver.** Short topics: post the full report in chat. Long reports: post the executive summary + key takeaways and save the full report to a file.

## Report structure
```markdown
# [Topic]: Research Report
*Generated: [date] | Sources: [N] | Confidence: [High/Medium/Low]*

## Executive Summary
[3–5 sentence overview of key findings]

## 1. [Major Theme]
- Key point ([Source Name](url))
- Supporting data ([Source Name](url))

## 2. [Major Theme]
...

## Key Takeaways
- [Actionable insight]

## Sources
1. [Title](url) — one-line summary

## Methodology
Searched [N] queries across web and news. Analyzed [M] sources.
Sub-questions investigated: [list]
```

## Parallel research
For broad topics, parallelize with subagents (one per cluster of sub-questions). Each agent searches, deep-reads, and returns findings; the main session synthesizes the final report.

## Hard rules (quality)
- Every claim needs a source — no unsourced assertions.
- Cross-reference: if only one source says it, flag it as unverified.
- Prefer sources from the last 12 months; recency matters.
- Acknowledge gaps explicitly — if a sub-question lacks good info, say "insufficient data found."
- No hallucination. Separate fact from inference; label estimates, projections, and opinions clearly.
