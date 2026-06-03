---
name: forge-promote
description: Move a tested skill draft from ~/.claude/forge/drafts/ to ~/.claude/skills/<name>/ for personal use or to ~/.claude/forge/outputs/<plugin>/ for plugin packaging. Updates the Forge's MEMORY.md catalog with a bullet entry (authored_at, helpful_count=0, harmful_count=0), notifies the user, and optionally offers to publish via skill-creator's package_skill.py. Use when forge-test has returned PASS on a draft.
disable-model-invocation: true
allowed-tools: Read Write Edit Bash(cp *) Bash(mv *) Bash(python *)
---

# Forge promoter

## Method

1. **Final validation**: re-run `python -m scripts.quick_validate <draft-path>/SKILL.md` one more time — this runs from the skill-creator plugin directory (`~/.claude/plugins/cache/claude-plugins-official/skill-creator/d53f6ca4cdb0/`), using skill-creator's `scripts.quick_validate`, not re-forge's own `scripts/`.
2. **Destination decision**:
   - **Personal skill**: move to `~/.claude/skills/<name>/`. This makes it available in all Akash's projects per the personal scope rule in `code.claude.com/docs/en/skills`.
   - **Plugin-bundled**: move to `~/.claude/forge/outputs/<plugin>/skills/<name>/`. This lets Akash publish as a plugin later.
   - **Default**: personal scope unless the draft's metadata requests plugin bundling.
3. **Execute move**: `cp -r ~/.claude/forge/drafts/<name>/ <destination>/` (copy, not move — keep the draft for audit).
4. **Update MEMORY.md**: append an ACE-style bullet to `~/.claude/agent-memory/forge-lead/MEMORY.md`:

```markdown
### Authored: <name>
- **authored_at**: <ISO8601>
- **destination**: <path>
- **gap-closed**: <what capability>
- **source-primitives**: <skill-creator | mcp-builder | etc.>
- **eval-pass-rate**: <decimal>
- **helpful_count**: 0
- **harmful_count**: 0
- **last_triggered**: null
- **deprecated_at**: null
```

5. **Notify Akash**: write a final status message:

```
Forge promoted: <name>
Path: <destination>
Gap closed: <description>
Eval pass rate: <N>/<M>

Next: to install as a plugin, run:
  /plugin install <name>@forge
Or to publish (from the skill-creator plugin directory, using its scripts.package_skill — not re-forge's scripts/):
  python -m scripts.package_skill <destination>
```

6. **Optional packaging**: if Akash confirms, run `python -m scripts.package_skill <destination>` from the skill-creator plugin directory (skill-creator's `scripts.package_skill`, not re-forge's `scripts/`) to produce a `.skill` file.

## Counter reconciliation (session-start, not promotion)

At the start of every Forge session, `forge-lead` reads MEMORY.md and runs the reconciliation algorithm:

- For each authored bullet with `authored_at > 7 days ago`:
  - Grep `~/.claude/projects/*/memory/MEMORY.md` for the skill's name in recent sessions.
  - If found as a successful invocation: `helpful_count += 1`.
  - If found as an error/rollback: `harmful_count += 1`.
  - Update `last_triggered` if any mention.
- Bullets with `harmful_count > 2 * helpful_count` are flagged for deprecation review.

This is NOT part of promotion (promotion is author-time); it's a start-of-session hook.

## Hard rules

- Never promote without the final validation pass.
- Never overwrite an existing skill at the destination — if a skill with that name exists, rename with a suffix or report a collision.
- Never delete the draft (keep for audit).
- Never silently update counters — always log the reconciliation delta in LOG.md-equivalent.
