"""Prose skill counts must match the tree.

The generated catalog cannot drift (its own test), but "N skills" claims in
README/QUICKSTART/showcase prose can. This pins every such claim to the
actual number of shipped skill directories.
"""

from __future__ import annotations

import re

import pytest

from conftest import REPO_ROOT, skill_files

PROSE_FILES = [
    "README.md",
    "QUICKSTART.md",
    "showcase/src/components/Hero.jsx",
]

SKILL_COUNT_CLAIM = re.compile(r"(\d+)\s+skills")


@pytest.mark.parametrize("rel", PROSE_FILES)
def test_skill_count_claims_match_tree(rel: str) -> None:
    actual = len(skill_files())
    text = (REPO_ROOT / rel).read_text(encoding="utf-8")
    claims = [int(m.group(1)) for m in SKILL_COUNT_CLAIM.finditer(text)]
    for claimed in claims:
        if claimed > 50:  # small numbers ("5 sub-skills", "3 new skills") are not inventory claims
            assert claimed == actual, (
                f"{rel} claims {claimed} skills but the tree ships {actual} — "
                "update the prose (the catalog test guards docs/CATALOG.md, this guards prose)"
            )
