"""Round-trip guarantee: uninstall.sh removes what setup.sh installed.

The senior-reviewer bar for a curl-and-run installer: it must be cleanly
reversible, and removal must not touch user data (memory lessons, third-party
skills) or other settings.json content.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from conftest import REPO_ROOT


def _run(cmd: list[str], home: Path) -> subprocess.CompletedProcess:
    env = {"HOME": str(home), "PATH": "/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin"}
    return subprocess.run(cmd, cwd=REPO_ROOT, env=env, capture_output=True, text=True, check=False)


@pytest.mark.smoke
def test_install_uninstall_round_trip(tmp_path: Path) -> None:
    home = tmp_path / "home"
    home.mkdir()

    # Pre-existing user state that must survive: a foreign skill, a foreign hook setting
    foreign_skill = home / ".claude" / "skills" / "my-private-skill" / "SKILL.md"
    foreign_skill.parent.mkdir(parents=True)
    foreign_skill.write_text("---\nname: my-private-skill\ndescription: private\n---\n")
    settings = home / ".claude" / "settings.json"
    settings.write_text(json.dumps({"model": "opus", "hooks": {"Stop": [
        {"matcher": "", "hooks": [{"type": "command", "command": "echo user-own-hook"}]}
    ]}}))

    assert _run(["bash", "setup.sh"], home).returncode == 0
    assert _run(["bash", "scripts/doctor.sh"], home).returncode == 0

    # User accumulates a lesson after install
    memory = home / ".claude" / "agent-memory" / "research-lead" / "MEMORY.md"
    memory.write_text(memory.read_text() + "\n### my hard-won lesson\n")

    dry = _run(["bash", "scripts/uninstall.sh"], home)
    assert dry.returncode == 0 and "DRY RUN" in dry.stdout
    assert (home / ".claude" / "agents" / "research").exists(), "dry run must not remove anything"

    real = _run(["bash", "scripts/uninstall.sh", "--force"], home)
    assert real.returncode == 0, real.stdout + real.stderr

    claude = home / ".claude"
    assert not (claude / "agents" / "research").exists()
    assert not (claude / "forge").exists()
    assert not (claude / "skills" / "research").exists()
    assert not (claude / "hooks" / "session-capture.sh").exists()

    # User data and foreign content survive
    assert foreign_skill.exists(), "uninstall removed a third-party skill"
    assert "my hard-won lesson" in memory.read_text(), "uninstall destroyed user memory"

    after = json.loads(settings.read_text())
    assert after.get("model") == "opus", "uninstall clobbered unrelated settings"
    stop_cmds = json.dumps(after.get("hooks", {}).get("Stop", []))
    assert "user-own-hook" in stop_cmds, "uninstall removed the user's own Stop hook"
    assert "session-capture" not in stop_cmds, "re-forge Stop hook not de-registered"
