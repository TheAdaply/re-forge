export const proofStats = [
  ["92", "concurrent Claude processes measured in v0.2"],
  ["67", "specialist persona dispatches in one validation session"],
  ["0", "research audit violations in the gpucheck release run"],
  ["3", "new skills promoted by Capability Forge"],
];

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

export const flow = [
  ["01", "Lead scopes the mission", "Research, engineering, security, testing, docs, or forge selects a protocol and writes a session slug."],
  ["02", "Specialists fan out", "Persona agents investigate in parallel instead of one assistant anchoring on the first plausible answer."],
  ["03", "Adversaries attack", "Skeptic, adversary, moderator, and evaluator catch weak reasoning, bad sources, and missing evidence."],
  ["04", "Evidence becomes contract", "Artifacts land under .claude/teams/; the audit script verifies that required roles ran."],
  ["05", "Memory compounds", "Retrospector and scribe promote durable lessons, so tomorrow's session starts smarter than today's."],
];
