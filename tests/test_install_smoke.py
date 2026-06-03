"""Install smoke test: setup.sh must produce a doctor-green install in a
clean HOME, and a second run must be a no-op (no backup spray).

This is the execution-grounded guarantee behind the README quick start.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from conftest import REPO_ROOT


def _run(cmd: list[str], home: Path) -> subprocess.CompletedProcess:
    env = {"HOME": str(home), "PATH": "/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin"}
    return subprocess.run(cmd, cwd=REPO_ROOT, env=env, capture_output=True, text=True, check=False)


@pytest.mark.smoke
def test_fresh_install_passes_doctor_and_reruns_clean(tmp_path: Path) -> None:
    home = tmp_path / "home"
    home.mkdir()

    first = _run(["bash", "setup.sh"], home)
    assert first.returncode == 0, f"setup.sh failed on a clean HOME:\n{first.stdout}\n{first.stderr}"

    doctor = _run(["bash", "scripts/doctor.sh"], home)
    assert doctor.returncode == 0, f"doctor.sh reports drift after a fresh install:\n{doctor.stdout}"
    assert "0 fail" in doctor.stdout, f"doctor.sh summary not clean:\n{doctor.stdout}"

    second = _run(["bash", "setup.sh"], home)
    assert second.returncode == 0, f"setup.sh re-run failed:\n{second.stdout}\n{second.stderr}"

    backups = list((home / ".claude").rglob("*.bak-*"))
    assert backups == [], f"idempotency broken — re-run created backups: {backups[:5]}"

    doctor2 = _run(["bash", "scripts/doctor.sh"], home)
    assert doctor2.returncode == 0, f"doctor.sh failed after re-run:\n{doctor2.stdout}"
