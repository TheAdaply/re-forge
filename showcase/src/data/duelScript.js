// Streaming scripts for the dual-terminal live demo.
// tone -> color class: cmd, head, ok, warn, err, info, muted, path
// d = delay (ms) before the line appears (controls the typing rhythm)

export const sharedPrompt = "add multi-tenant SSO with per-org RBAC + audit logs";

export const plainMeta = {
  tab: "~/acme-platform — zsh",
  user: "you",
  host: "mac",
  cwd: "~/acme-platform",
  model: "generic agent",
  branch: "main",
};

export const skillMeta = {
  tab: "~/acme-platform — re-forge",
  user: "you",
  host: "mac",
  cwd: "~/acme-platform",
  model: "opus · max effort",
  branch: "main",
};

export const plainScript = [
  { t: 'agent run "add multi-tenant SSO + RBAC"', c: "cmd", d: 300 },
  { t: "planning…", c: "muted", d: 950 },
  { t: "scaffold SSO + tenant models", c: "info", d: 800 },
  { t: "wire SAML + OIDC handlers", c: "info", d: 800 },
  { t: "created auth/tenant — 6 files", c: "ok", d: 850 },
  { t: "SAML assertion signature not verified", c: "err", d: 800 },
  { t: "tenant_id missing from queries (cross-tenant leak)", c: "err", d: 780 },
  { t: "RBAC enforced only in the UI", c: "warn", d: 760 },
  { t: "DB migration has no rollback", c: "err", d: 740 },
  { t: "no tests · done in 2.1s", c: "muted", d: 700 },
];

export const skillScript = [
  { t: 're-forge "add multi-tenant SSO + RBAC + audit logs"', c: "cmd", d: 300 },
  { t: "load SKILL.md → orchestrating 6 teams + forge", c: "info", d: 720 },
  { t: "memory: 47 lessons restored", c: "muted", d: 600 },
  { t: "evals-first → EXPECTED_EVALS.md (EDD)", c: "info", d: 640 },
  { t: "/research · 17 specialists", c: "head", d: 700 },
  { t: "SAML/OIDC · NIST RBAC · tenant isolation", c: "info", d: 600 },
  { t: "adversary rejected 1 insecure SAML sample", c: "warn", d: 620 },
  { t: "/engineer · 12 specialists", c: "head", d: 680 },
  { t: "plan → architect → build → verify → review", c: "info", d: 620 },
  { t: "signed assertions · row-level tenant isolation", c: "ok", d: 620 },
  { t: "reversible migration + backfill", c: "ok", d: 600 },
  { t: "/security", c: "head", d: 620 },
  { t: "SAML sig verified · IDOR/cross-tenant PASS", c: "ok", d: 640 },
  { t: "/testing", c: "head", d: 620 },
  { t: "214 unit · 31 property · cross-tenant fuzz", c: "ok", d: 640 },
  { t: "verification-loop: types·tests·lint·sec PASS", c: "info", d: 640 },
  { t: "/docs", c: "head", d: 600 },
  { t: "API.md · CHANGELOG.md · tenant onboarding", c: "ok", d: 620 },
  { t: "/forge", c: "head", d: 600 },
  { t: "gap → drafted tenant-isolation-guard skill", c: "info", d: 640 },
  { t: "/evolution · self-evolving watch", c: "head", d: 620 },
  { t: "scout: upstream clean · shadow: 0 gaps", c: "muted", d: 600 },
  { t: ".claude/teams/*/EVIDENCE/ written", c: "path", d: 600 },
  { t: "evaluator 5/5 — high confidence", c: "ok", d: 680 },
  { t: "done in 16.4s — ships to production", c: "ok", d: 680 },
];

// "cells" that are always running in the background of the skill terminal
export const backgroundCells = [
  { id: "security", label: "security" },
  { id: "debug", label: "debuggable" },
  { id: "edge", label: "edge cases" },
  { id: "watch", label: "upstream-watch" },
];

export const plainVerdict = {
  score: 29,
  label: "A cross-tenant breach waiting to happen",
  notes: ["Cross-tenant leak", "SAML unverified", "UI-only RBAC", "No rollback"],
};

export const skillVerdict = {
  score: 97,
  label: "Production-grade, fully audited",
  notes: ["EDD-gated", "Tenant-isolated", "Tested", "Self-evolving"],
};
