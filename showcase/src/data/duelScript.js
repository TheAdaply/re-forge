// Streaming scripts for the dual-terminal live demo.
// tone -> color class: cmd, head, ok, warn, err, info, muted, path
// d = delay (ms) before the line appears (controls the typing rhythm)

export const sharedPrompt = "add login + signup to our app";

export const plainMeta = {
  tab: "~/acme-app — zsh",
  user: "you",
  host: "mac",
  cwd: "~/acme-app",
  model: "generic agent",
  branch: "main",
};

export const skillMeta = {
  tab: "~/acme-app — re-forge",
  user: "you",
  host: "mac",
  cwd: "~/acme-app",
  model: "opus · max effort",
  branch: "main",
};

export const plainScript = [
  { t: 'agent run "add login + signup to our app"', c: "cmd", d: 300 },
  { t: "planning…", c: "muted", d: 950 },
  { t: "write src/auth.js", c: "info", d: 800 },
  { t: "add POST /login + POST /signup", c: "info", d: 800 },
  { t: "created auth — 3 files", c: "ok", d: 850 },
  { t: "passwords stored with md5", c: "err", d: 800 },
  { t: "no rate limit on /login (brute-forceable)", c: "warn", d: 780 },
  { t: "JWT secret hardcoded in source", c: "err", d: 760 },
  { t: "no tests · no email verification", c: "warn", d: 740 },
  { t: "done in 1.7s — looks fine?", c: "muted", d: 700 },
];

export const skillScript = [
  { t: 're-forge "add login + signup to our app"', c: "cmd", d: 300 },
  { t: "load SKILL.md → orchestrating 7 teams", c: "info", d: 720 },
  { t: "memory: 47 lessons restored", c: "muted", d: 600 },
  { t: "evals-first → EXPECTED_EVALS.md (EDD)", c: "info", d: 640 },
  { t: "/research · 17 specialists", c: "head", d: 700 },
  { t: "OWASP ASVS · argon2id · session hygiene", c: "info", d: 600 },
  { t: "adversary rejected 1 insecure sample", c: "warn", d: 620 },
  { t: "/engineer · 12 specialists", c: "head", d: 680 },
  { t: "plan → architect → build → verify → review", c: "info", d: 620 },
  { t: "argon2id hashing · rate-limit + lockout", c: "ok", d: 620 },
  { t: "/security", c: "head", d: 620 },
  { t: "secrets 0 · CSRF + session-fixation PASS", c: "ok", d: 640 },
  { t: "/testing", c: "head", d: 620 },
  { t: "128 unit · 19 property · mutation 90%", c: "ok", d: 640 },
  { t: "verification-loop: types·tests·lint·sec PASS", c: "info", d: 640 },
  { t: "/docs", c: "head", d: 600 },
  { t: "API.md · CHANGELOG.md · auth setup guide", c: "ok", d: 620 },
  { t: "/forge", c: "head", d: 600 },
  { t: "gap → drafted auth-bruteforce-guard skill", c: "info", d: 640 },
  { t: "/evolution · self-evolving watch", c: "head", d: 620 },
  { t: "scout: upstream clean · shadow: 0 gaps", c: "muted", d: 600 },
  { t: ".claude/teams/*/EVIDENCE/ written", c: "path", d: 600 },
  { t: "evaluator 5/5 — high confidence", c: "ok", d: 680 },
  { t: "done in 14.6s — ships to production", c: "ok", d: 680 },
];

// "cells" that are always running in the background of the skill terminal
export const backgroundCells = [
  { id: "security", label: "security" },
  { id: "debug", label: "debuggable" },
  { id: "edge", label: "edge cases" },
  { id: "watch", label: "upstream-watch" },
];

export const plainVerdict = {
  score: 37,
  label: "A login that leaks accounts",
  notes: ["Weak hashing", "No rate limit", "Leaked JWT secret", "0 tests"],
};

export const skillVerdict = {
  score: 97,
  label: "Production-grade, fully audited",
  notes: ["EDD-gated", "Secure", "Tested", "Self-evolving"],
};
