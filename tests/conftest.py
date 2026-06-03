"""Shared collectors for the re-forge validation harness.

The repo distributes markdown skill/agent definitions plus shell entry
points; these fixtures enumerate the units every test file validates.
"""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Directories that are not part of the distribution and must never be scanned.
EXCLUDED_DIRS = {".git", "node_modules", ".playwright-mcp", ".vercel", ".venv", "__pycache__", "dist"}


def iter_markdown_files() -> list[Path]:
    """Every tracked-ish markdown file in the repo, excluding vendored/runtime dirs."""
    out = []
    for p in REPO_ROOT.rglob("*.md"):
        if any(part in EXCLUDED_DIRS for part in p.parts):
            continue
        out.append(p)
    return sorted(out)


def skill_files() -> list[Path]:
    """All distributed skill definitions: skills/<dir>/SKILL.md."""
    return sorted(REPO_ROOT.glob("skills/*/SKILL.md"))


def forge_skill_files() -> list[Path]:
    """Forge sub-skill definitions: agents/forge/skills/<dir>/SKILL.md."""
    return sorted(REPO_ROOT.glob("agents/forge/skills/*/SKILL.md"))


def agent_files() -> list[Path]:
    """All agent persona definitions (PROTOCOL.md files are team docs, not agents)."""
    team_agents = [
        p
        for p in REPO_ROOT.glob("agents/*-team/*.md")
        if p.name != "PROTOCOL.md"
    ]
    return sorted(team_agents + [REPO_ROOT / "agents" / "forge" / "forge-lead.md"])


def shell_scripts() -> list[Path]:
    """Every shell script in the distribution."""
    out = []
    for p in REPO_ROOT.rglob("*.sh"):
        if any(part in EXCLUDED_DIRS for part in p.parts):
            continue
        out.append(p)
    return sorted(out)
