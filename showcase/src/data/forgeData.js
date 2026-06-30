export const proofStats = [
  ["92", "concurrent Claude processes measured in v0.2"],
  ["67", "specialist persona dispatches in one validation session"],
  ["0", "research audit violations in the gpucheck release run"],
  ["3", "new skills promoted by Capability Forge"],
];

// Receipts section — every item below is traceable to a file in the repo.
//   proofStats[0]  -> BENCHMARKS_v0.2.md  (concurrent claude processes: 92)
//   proofStats[1]  -> RELEASE_NOTES_v0.2.md line 57 (Tier-2: 67 distinct persona dispatches)
//   proofStats[2]  -> RELEASE_NOTES_v0.2.md line 27 (Research Team: 0 audit violations)
//   proofStats[3]  -> RELEASE_NOTES_v0.2.md line 32 / CHANGELOG.md (3 forge-promoted skills)
export const receipts = {
  feature: {
    label: "Field report · /research adversary",
    body:
      "During its first pilot, the research adversary caught a 50K+-star memory framework's headline " +
      "benchmark measuring a vanilla ChromaDB lookup, not the framework itself.",
    quote: "96.6% LongMemEval R@5 actually measured a vanilla ChromaDB lookup, not MemPalace's palace architecture",
    href: "https://github.com/MemPalace/mempalace/issues/214",
    cite: "MemPalace/mempalace#214",
  },
  links: [
    {
      tag: "CI",
      title: "Every install path smoke-tested in a fresh HOME on every push.",
      href: "https://github.com/TheAdaply/re-forge/actions/workflows/ci.yml",
      cite: "ci.yml · install smoke",
    },
    {
      tag: "Benchmarks",
      title: "One measured session, errata included.",
      href: "https://github.com/TheAdaply/re-forge/blob/main/BENCHMARKS_v0.2.md",
      cite: "BENCHMARKS_v0.2.md",
    },
  ],
};

export const commands = [
  {
    name: "/research",
    title: "Investigate with adversarial gates",
    text: "17 specialists synthesize sources, resolve contradictions, and score confidence.",
  },
  {
    name: "/engineer",
    title: "Build from a verified spec",
    text: "Planner, architect, skeptic, executor, verifier, and reviewer loop until handoff.",
  },
  {
    name: "/security",
    title: "Audit before release",
    text: "CVE checks, secrets scan, threat model, dependency review, and license audit.",
  },
  {
    name: "/testing",
    title: "Stress the implementation",
    text: "Coverage, mutation, property tests, fixtures, regression detection, and runners.",
  },
  {
    name: "/docs",
    title: "Make claims match code",
    text: "README, API docs, changelogs, diagrams, and stale-claim detection.",
  },
  {
    name: "/forge",
    title: "Create missing skills",
    text: "Detect gaps, scout registries, draft, test, promote, and track value over time.",
  },
  {
    name: "/evolution",
    title: "Stay ahead of the ecosystem",
    text: "Self-evolving team scouts Claude Code/Cursor/Codex updates, shadows live sessions, and audits orchestration for gaps.",
  },
];