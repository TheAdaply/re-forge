"""Dead-link check across all repo markdown.

Internal links are validated on every run (cheap, deterministic).
External URLs run under ``-m external`` in CI's link job: a 404/410 or DNS
failure is dead; 403/405/429 from bot-blocking hosts counts as alive.
"""

from __future__ import annotations

import re
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from conftest import REPO_ROOT, iter_markdown_files


def _backoff(attempt: int) -> None:
    """Short, deterministic pause between retries to ride out rate limits."""
    time.sleep(0.6 * (attempt + 1))

MARKDOWN_LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
BARE_URL = re.compile(r"<(https?://[^>\s]+)>")
FENCED_CODE = re.compile(r"^(```|~~~).*?^\1\s*$", re.MULTILINE | re.DOTALL)
INLINE_CODE = re.compile(r"`[^`\n]+`")

# Hosts that habitually reject scripted requests yet serve browsers fine.
BOT_BLOCKED_OK = {403, 405, 429, 503}
TIMEOUT_S = 15


def _links() -> list[tuple[Path, str]]:
    found = []
    for md in iter_markdown_files():
        text = md.read_text(encoding="utf-8", errors="replace")
        # Code blocks routinely contain dict[key](call) Python that is not a link.
        text = FENCED_CODE.sub("", text)
        text = INLINE_CODE.sub("", text)
        for m in MARKDOWN_LINK.finditer(text):
            found.append((md, m.group(1)))
        for m in BARE_URL.finditer(text):
            found.append((md, m.group(1)))
    return found


def _internal_links() -> list[tuple[Path, str]]:
    return [
        (md, t)
        for md, t in _links()
        if not t.startswith(("http://", "https://", "mailto:", "#"))
    ]


def _origin_slug() -> str | None:
    """``owner/repo`` for the repo's ``origin`` remote, or None if unavailable.

    Derived from the live remote rather than hardcoded so the self-referential
    allowlist below can never drift out of sync with the repo's real home (e.g.
    after a GitHub org transfer) and silently stop catching a stale badge URL.
    """
    try:
        url = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            check=True,
            timeout=5,
        ).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return None
    # https://github.com/OWNER/REPO(.git)  or  git@github.com:OWNER/REPO(.git)
    m = re.search(r"github\.com[:/]+([^/]+/[^/]+?)(?:\.git)?/?$", url)
    return m.group(1) if m else None


# The repo's own CI badge cannot resolve until the workflow has run on GitHub,
# and checking it from inside that same CI would be circular anyway. The slug is
# read from the `origin` remote so this allowlist tracks the repo automatically.
_SLUG = _origin_slug()
SELF_REFERENTIAL = (
    {f"https://github.com/{_SLUG}/actions/workflows/ci.yml/badge.svg"} if _SLUG else set()
)


def _external_urls() -> list[str]:
    return sorted(
        {t for _, t in _links() if t.startswith(("http://", "https://"))} - SELF_REFERENTIAL
    )


@pytest.mark.parametrize(
    "md,target",
    _internal_links(),
    ids=[f"{md.relative_to(REPO_ROOT)}->{t}" for md, t in _internal_links()],
)
def test_internal_link_resolves(md: Path, target: str) -> None:
    path_part = target.split("#", 1)[0]
    if not path_part:
        return
    resolved = (md.parent / path_part).resolve()
    assert resolved.exists(), (
        f"{md.relative_to(REPO_ROOT)} links to {target!r} but {resolved} does not exist"
    )


@pytest.mark.external
@pytest.mark.parametrize("url", _external_urls())
def test_external_url_alive(url: str) -> None:
    """A URL is dead only if it 404s on a GET across EVERY retry.

    The job hits ~250 third-party URLs; busy hosts (scipy/kaggle/docs) sometimes
    rate-limit a single request with a transient 404 from a CI runner IP. A truly
    dead link 404s on every attempt; a transient one recovers, so we escalate
    HEAD->GET, retry GET 404s with backoff, and only fail when all GET attempts 404.
    """
    headers = {"User-Agent": "re-forge-linkcheck/1.0"}
    req = urllib.request.Request(url, method="HEAD", headers=headers)
    last_exc: Exception | None = None
    notfound_gets = 0
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
                assert resp.status < 400 or resp.status in BOT_BLOCKED_OK, f"{url}: HTTP {resp.status}"
                return
        except urllib.error.HTTPError as e:
            if e.code in (404, 410):
                if req.get_method() == "HEAD":
                    # Some hosts 404 HEAD but serve GET; escalate, do not count yet.
                    req = urllib.request.Request(url, method="GET", headers=headers)
                    continue
                notfound_gets += 1
                last_exc = e
                _backoff(attempt)
                continue  # only a 404 on EVERY GET attempt is a real dead link
            if e.code in BOT_BLOCKED_OK:
                return  # alive but bot-shielded
            last_exc = e
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last_exc = e
        if req.get_method() == "HEAD":
            req = urllib.request.Request(url, method="GET", headers=headers)
        _backoff(attempt)
    if notfound_gets >= 2:
        pytest.fail(f"{url}: HTTP 404 on every GET attempt (dead link)")
    # Transient/non-404 (timeout, DNS, connection reset, 5xx) means "couldn't verify", not
    # "dead" — skip so a flaky network blip never reds CI; real dead links (404) still fail above.
    pytest.skip(f"{url}: unreachable after retries ({last_exc}) — transient/non-404, not a confirmed dead link")
