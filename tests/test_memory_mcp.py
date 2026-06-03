"""Protocol smoke test for memory-mcp/server.py.

Boots the real server (stdio, line-delimited JSON-RPC) against an isolated
HOME and walks the minimal MCP lifecycle: initialize → tools/list → insert →
search. The server is deliberately stdlib-only (see memory-mcp/requirements.txt),
so this needs no third-party installs.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from conftest import REPO_ROOT

SERVER = REPO_ROOT / "memory-mcp" / "server.py"


class McpClient:
    def __init__(self, home: Path) -> None:
        self.proc = subprocess.Popen(
            [sys.executable, str(SERVER)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={"HOME": str(home), "PATH": "/usr/bin:/bin"},
        )

    def call(self, method: str, params: dict | None = None, req_id: int = 1) -> dict:
        req = {"jsonrpc": "2.0", "id": req_id, "method": method, "params": params or {}}
        assert self.proc.stdin and self.proc.stdout
        self.proc.stdin.write(json.dumps(req) + "\n")
        self.proc.stdin.flush()
        line = self.proc.stdout.readline()
        assert line, f"server produced no response to {method} (stderr: {self.proc.stderr.read() if self.proc.stderr else ''})"
        return json.loads(line)

    def close(self) -> None:
        if self.proc.stdin:
            self.proc.stdin.close()
        self.proc.wait(timeout=10)


@pytest.fixture
def client(tmp_path: Path):
    c = McpClient(tmp_path / "home")
    yield c
    c.close()


def test_initialize_and_tools_list(client: McpClient) -> None:
    init = client.call("initialize")
    assert init.get("id") == 1 and "error" not in init, init

    tools = client.call("tools/list", req_id=2)
    names = {t["name"] for t in tools["result"]["tools"]}
    assert names == {"memory_search", "memory_insert", "memory_get", "memory_recent", "memory_stats"}, names


def test_insert_then_search_round_trip(client: McpClient) -> None:
    client.call("initialize")
    ins = client.call(
        "tools/call",
        {"name": "memory_insert", "arguments": {"content": "flock prevents lost writes in parallel merges", "tags": "concurrency"}},
        req_id=2,
    )
    payload = json.loads(ins["result"]["content"][0]["text"])
    assert not ins["result"].get("isError"), payload
    assert payload.get("id"), f"insert returned no id: {payload}"

    search = client.call(
        "tools/call",
        {"name": "memory_search", "arguments": {"query": "flock", "k": 3}},
        req_id=3,
    )
    hits = json.loads(search["result"]["content"][0]["text"])
    assert isinstance(hits, list), f"memory_search should return a list of hits: {hits}"
    assert any("flock" in h.get("content", "") for h in hits), hits
