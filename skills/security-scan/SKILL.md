---
name: security-scan
description: Use this skill to audit re-forge's agent configuration (the `.claude/` directory — CLAUDE.md, settings.json, MCP configs, hooks, and agent/skill definitions) for security vulnerabilities, misconfigurations, and prompt-injection risks. Activate when setting up a new project, after editing `.claude/settings.json` / `CLAUDE.md` / MCP configs, before committing config changes, or for periodic config hygiene. Triggers include "scan my config", "is my .claude setup safe", or "audit hooks/MCP".
---

# Security Scan

Audit re-forge's agent configuration for security issues. This skill scans the `.claude/` directory of a project (and `~/.claude/` for global config) by inspecting each config surface against known risk patterns. It is self-contained — perform the inspection manually with Read/Grep; if an external config-scanner is available you may use it to supplement, never replace, this review.

## When to activate
- Setting up a new re-forge project
- After modifying `.claude/settings.json`, `CLAUDE.md`, or MCP configs
- Before committing configuration changes
- Onboarding to a repo with existing agent configs, or for periodic hygiene

## What to scan
| Surface | Checks |
|---|---|
| `CLAUDE.md` | Hardcoded secrets, auto-run instructions, prompt-injection patterns |
| `settings.json` | Overly permissive allow lists, missing deny lists, dangerous bypass flags |
| `mcp.json` / MCP configs | Risky MCP servers, hardcoded env secrets, `npx -y` supply-chain risk |
| `hooks/` | Command injection via `${...}` interpolation, data exfiltration, silent error suppression |
| `agents/*.md`, `skills/*` | Unrestricted tool access, prompt-injection surface, missing model specs |

## What to do
1. **Locate configs.** Read the project `.claude/` directory and `~/.claude/` global config. Enumerate `CLAUDE.md`, `settings.json`, any `mcp.json`, `hooks/`, and agent/skill definitions.
2. **Scan for secrets.** Grep all config files for key/token patterns (`sk-`, `api_key`, `token`, `password`, bearer strings). Any hit is a finding.
3. **Audit permissions.** In `settings.json`, flag wildcard allow entries (especially `Bash(*)`), missing deny lists, and dangerous bypass/skip flags. Permissions should be scoped to exactly what's needed.
4. **Audit hooks.** Flag command injection where untrusted values (`${file}`, tool output) are interpolated into shell commands, any data egress to external hosts, and silent error suppression (`2>/dev/null`, `|| true`) that hides failures.
5. **Audit MCP servers.** Flag shell-running servers, hardcoded env secrets, `npx -y` auto-install, and servers missing descriptions.
6. **Audit agents/skills.** Flag agents with unnecessary `Bash`/broad tool access, missing model specs, and CLAUDE.md "auto-run" instructions that create a prompt-injection vector.
7. **Grade and report** (see below).

## Severity & grading
Assign each finding a severity and produce an overall grade (A 90–100 secure · B 75–89 minor · C 60–74 needs attention · D 40–59 significant risk · F 0–39 critical).

- **Critical (fix now):** hardcoded keys/tokens in config; `Bash(*)` allow; command injection in hooks; shell-running MCP servers.
- **High (fix before production):** auto-run instructions in `CLAUDE.md`; missing deny lists; agents with unnecessary Bash access.
- **Medium (recommended):** silent error suppression in hooks; missing PreToolUse security hooks; `npx -y` auto-install in MCP configs.
- **Info (awareness):** missing MCP server descriptions; prohibitive instructions correctly present (good practice).

## Output
Emit a report: one line per finding (severity · surface · file · description · suggested fix), then the overall grade and the prioritized fix list.

## Hard rules
- Treat any hardcoded secret as a critical finding — recommend moving it to an environment variable and rotating it.
- Never auto-apply destructive fixes; propose changes and let the owner apply them.
- Re-scan after remediation to confirm the grade improved.
