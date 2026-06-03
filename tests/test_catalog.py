"""docs/CATALOG.md must always equal what the generator produces from the tree."""

from __future__ import annotations

import sys
from pathlib import Path

from conftest import REPO_ROOT

sys.path.insert(0, str(REPO_ROOT / "scripts"))

from build_catalog import CATALOG_PATH, build_catalog  # noqa: E402


def test_catalog_exists() -> None:
    assert CATALOG_PATH.exists(), "docs/CATALOG.md missing — run: python scripts/build_catalog.py"


def test_catalog_not_stale() -> None:
    expected = build_catalog()
    actual = CATALOG_PATH.read_text(encoding="utf-8")
    assert actual == expected, (
        "docs/CATALOG.md has drifted from skill/agent frontmatter — "
        "regenerate with: python scripts/build_catalog.py"
    )
