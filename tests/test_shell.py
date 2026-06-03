"""Shell entry-point quality gates: shellcheck-clean and strict mode.

Hooks are exempt from ``set -e`` on purpose — a hook that aborts mid-run can
break the host Claude Code session — but everything a user invokes directly
must run under strict mode.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

from conftest import REPO_ROOT, shell_scripts

# User-invoked entry points: a silent partial failure here corrupts an install.
STRICT_MODE_REQUIRED = [
    "setup.sh",
    "sync.sh",
    "scripts/doctor.sh",
    "scripts/team_status.sh",
    "scripts/forge-gap-refresh.sh",
    "scripts/setup-schedules.sh",
    "scripts/test-infrastructure.sh",
    "memory-mcp/bootstrap.sh",
    "memory-mcp/backup.sh",
]


@pytest.mark.parametrize("script", shell_scripts(), ids=lambda p: str(p.relative_to(REPO_ROOT)))
def test_shellcheck_clean(script: Path) -> None:
    if shutil.which("shellcheck") is None:
        pytest.fail("shellcheck not installed (brew install shellcheck / apt install shellcheck)")
    proc = subprocess.run(
        ["shellcheck", "--severity=warning", str(script)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"shellcheck findings in {script.relative_to(REPO_ROOT)}:\n{proc.stdout}"


@pytest.mark.parametrize("rel", STRICT_MODE_REQUIRED)
def test_strict_mode_present(rel: str) -> None:
    script = REPO_ROOT / rel
    assert script.exists(), f"{rel} disappeared — update STRICT_MODE_REQUIRED"
    head = "\n".join(script.read_text(encoding="utf-8").splitlines()[:30])
    assert "set -euo pipefail" in head or "set -uo pipefail" in head, (
        f"{rel}: no strict mode in the first 30 lines "
        "(set -euo pipefail, or set -uo pipefail where a non-zero check result is expected)"
    )
