"""Behavioral tests for the hooks setup.sh registers.

The session-capture Stop hook shipped as a silent no-op for months because
its `-newer` reference file was never created and nothing asserted capture
behavior — only executability. These tests run the real hook against a
synthetic HOME so a dead hook fails CI.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from conftest import REPO_ROOT

HOOK = REPO_ROOT / "hooks" / "session-capture.sh"


def _run_hook(home: Path, payload: dict) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["bash", str(HOOK)],
        input=json.dumps(payload),
        env={"HOME": str(home), "PATH": "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin"},
        capture_output=True,
        text=True,
        check=False,
    )


def _staging(home: Path) -> list[Path]:
    return list((home / ".claude" / "agent-memory" / "research-lead" / "staging").glob("adhoc-*.md"))


def test_substantive_session_is_captured(tmp_path: Path) -> None:
    home = tmp_path / "home"
    transcript = home / ".claude" / "projects" / "demo" / "session.jsonl"
    transcript.parent.mkdir(parents=True)
    transcript.write_text('{"type":"x"}\n' * 5000)  # ~65KB, over the 50KB bar

    proc = _run_hook(home, {"session_id": "t1", "cwd": str(tmp_path)})
    assert proc.returncode == 0, proc.stderr

    captures = _staging(home)
    assert len(captures) == 1, f"hook did not capture a substantive session (stderr: {proc.stderr})"
    assert "bytes of transcript" in captures[0].read_text()


def test_small_session_is_skipped(tmp_path: Path) -> None:
    home = tmp_path / "home"
    transcript = home / ".claude" / "projects" / "demo" / "session.jsonl"
    transcript.parent.mkdir(parents=True)
    transcript.write_text('{"type":"x"}\n' * 10)  # tiny

    proc = _run_hook(home, {"session_id": "t2", "cwd": str(tmp_path)})
    assert proc.returncode == 0, proc.stderr
    assert _staging(home) == [], "hook captured a trivial session"


def test_team_session_with_retrospector_is_skipped(tmp_path: Path) -> None:
    home = tmp_path / "home"
    transcript = home / ".claude" / "projects" / "demo" / "session.jsonl"
    transcript.parent.mkdir(parents=True)
    transcript.write_text('{"type":"x"}\n' * 5000)

    evidence = tmp_path / ".claude" / "teams" / "research" / "slug" / "EVIDENCE"
    evidence.mkdir(parents=True)
    (evidence / "retrospector.md").write_text("lessons already captured")

    proc = _run_hook(home, {"session_id": "t3", "cwd": str(tmp_path)})
    assert proc.returncode == 0, proc.stderr
    assert _staging(home) == [], "hook double-captured a team session"
