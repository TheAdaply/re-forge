"""Dead-link check across all repo markdown.

Internal links are validated on every run (cheap, deterministic).
External URLs run under ``-m external`` in CI's link job: a 404/410 or DNS
failure is dead; 403/405/429 from bot-blocking hosts counts as alive.
"""

from __future__ import annotations

import re
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from conftest import REPO_ROOT, iter_markdown_files

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


# The repo's own CI badge cannot resolve until the workflow has run on GitHub,
# and checking it from inside that same CI would be circular anyway.
SELF_REFERENTIAL = {"https://github.com/Akasxh/re-forge/actions/workflows/ci.yml/badge.svg"}


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
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "re-forge-linkcheck/1.0"})
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
                assert resp.status < 400 or resp.status in BOT_BLOCKED_OK, f"{url}: HTTP {resp.status}"
                return
        except urllib.error.HTTPError as e:
            if e.code in (404, 410):
                pytest.fail(f"{url}: HTTP {e.code} (dead link)")
            if e.code in BOT_BLOCKED_OK:
                return  # alive but bot-shielded
            last_exc = e
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last_exc = e
        if attempt == 0 and req.get_method() == "HEAD":
            req = urllib.request.Request(url, method="GET", headers=req.headers)
    pytest.fail(f"{url}: unreachable after retries ({last_exc})")
