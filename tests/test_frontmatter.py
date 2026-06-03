"""Frontmatter contract for every distributed skill and agent definition.

A skill/agent with broken or missing frontmatter installs fine but never
triggers, which is the worst failure mode for a distribution repo: silent.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from conftest import REPO_ROOT, agent_files, forge_skill_files, skill_files

# Descriptions that could describe anything do not let the model route a
# dispatch; they are defects even when syntactically valid.
GENERIC_DESCRIPTIONS = {"a skill", "a skill for claude", "an agent", "helper", "utility", "todo", "tbd"}
MIN_DESCRIPTION_LEN = 40

ALL_DEFINITION_FILES = skill_files() + forge_skill_files() + agent_files()


def parse_frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        pytest.fail(f"{path.relative_to(REPO_ROOT)}: no frontmatter block at top of file")
    try:
        _, fm, _ = text.split("---", 2)
    except ValueError:
        pytest.fail(f"{path.relative_to(REPO_ROOT)}: unterminated frontmatter block")
    data = yaml.safe_load(fm)
    if not isinstance(data, dict):
        pytest.fail(f"{path.relative_to(REPO_ROOT)}: frontmatter is not a YAML mapping")
    return data


@pytest.mark.parametrize("path", ALL_DEFINITION_FILES, ids=lambda p: str(p.relative_to(REPO_ROOT)))
def test_frontmatter_parses_with_name_and_description(path: Path) -> None:
    data = parse_frontmatter(path)
    rel = path.relative_to(REPO_ROOT)

    name = data.get("name")
    assert isinstance(name, str) and name.strip(), f"{rel}: missing or empty 'name'"

    description = data.get("description")
    assert isinstance(description, str) and description.strip(), f"{rel}: missing or empty 'description'"
    assert len(description.strip()) >= MIN_DESCRIPTION_LEN, (
        f"{rel}: description is {len(description.strip())} chars; "
        f"under {MIN_DESCRIPTION_LEN} it cannot carry enough signal to trigger correctly"
    )
    assert description.strip().lower() not in GENERIC_DESCRIPTIONS, f"{rel}: generic description"


@pytest.mark.parametrize("path", skill_files() + forge_skill_files(), ids=lambda p: str(p.relative_to(REPO_ROOT)))
def test_skill_name_matches_directory(path: Path) -> None:
    """The directory name is the installed, user-visible invocation surface.

    Forge sub-skills are deliberately namespaced (`forge-gap` in dir `gap`,
    invoked as /forge:gap) — see agents/forge/forge-lead.md.
    """
    data = parse_frontmatter(path)
    expected = path.parent.name
    if path.parent.parent == REPO_ROOT / "agents" / "forge" / "skills":
        expected = f"forge-{path.parent.name}"
    assert data["name"] == expected, (
        f"{path.relative_to(REPO_ROOT)}: frontmatter name {data['name']!r} != expected {expected!r}"
    )


@pytest.mark.parametrize("path", agent_files(), ids=lambda p: str(p.relative_to(REPO_ROOT)))
def test_agent_name_matches_filename(path: Path) -> None:
    data = parse_frontmatter(path)
    expected = path.stem
    assert data["name"] == expected, (
        f"{path.relative_to(REPO_ROOT)}: frontmatter name {data['name']!r} != filename {expected!r}"
    )


def test_no_duplicate_skill_names() -> None:
    names: dict[str, Path] = {}
    for path in skill_files() + forge_skill_files():
        name = parse_frontmatter(path)["name"]
        assert name not in names, f"duplicate skill name {name!r}: {names[name]} and {path}"
        names[name] = path


def test_no_duplicate_agent_names() -> None:
    names: dict[str, Path] = {}
    for path in agent_files():
        name = parse_frontmatter(path)["name"]
        assert name not in names, f"duplicate agent name {name!r}: {names[name]} and {path}"
        names[name] = path
