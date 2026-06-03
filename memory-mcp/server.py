#!/usr/bin/env python3
"""Memory MCP Server — SQLite + FTS5 queryable memory for Claude Code.

Exposes 5 tools over the MCP stdio protocol:
  memory_search  — hybrid FTS5 + recency + importance search
  memory_insert  — insert a new memory entry
  memory_get     — fetch a single entry by id
  memory_recent  — list recent entries
  memory_stats   — database statistics
"""

import json
import os
import sqlite3
import sys
from pathlib import Path

# Ensure ranker module is importable from the same directory
sys.path.insert(0, str(Path(__file__).parent))
from ranker import score_result

DB_PATH = Path.home() / ".claude" / "memory-mcp" / "memory.db"
SCHEMA_PATH = Path.home() / ".claude" / "memory-mcp" / "schema.sql"

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_db() -> sqlite3.Connection:
    """Return a WAL-mode connection, applying schema on first run."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(str(DB_PATH))
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA synchronous=NORMAL")

    # Bootstrap schema if memories table absent
    tables = {
        r[0]
        for r in db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
    }
    if "memories" not in tables:
        # Prefer the installed schema (bootstrap.sh copies it to ~/.claude),
        # fall back to the copy shipped next to this file so a bare
        # `python3 server.py` still gets a working database.
        schema = SCHEMA_PATH if SCHEMA_PATH.exists() else Path(__file__).parent / "schema.sql"
        if not schema.exists():
            raise RuntimeError(
                f"schema.sql not found at {SCHEMA_PATH} or {Path(__file__).parent} — "
                "run memory-mcp/bootstrap.sh or keep schema.sql next to server.py"
            )
        db.executescript(schema.read_text())

    return db


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def memory_search(query: str, k: int = 5) -> list[dict]:
    """Hybrid search: FTS5 BM25 + recency + importance, returns top-k."""
    db = get_db()

    max_imp_row = db.execute("SELECT MAX(importance) FROM memories").fetchone()
    max_imp = float(max_imp_row[0]) if max_imp_row[0] is not None else 1.0

    # Fetch more candidates than needed so reranking has room to work
    rows = db.execute(
        """
        SELECT m.*, memories_fts.rank AS fts_rank
        FROM memories_fts
        JOIN memories m ON m.id = memories_fts.rowid
        WHERE memories_fts MATCH ?
        ORDER BY memories_fts.rank
        LIMIT ?
        """,
        (query, k * 3),
    ).fetchall()

    scored: list[dict] = []
    ids_accessed: list[int] = []

    for row in rows:
        d = dict(row)
        d["score"] = score_result(
            fts_rank=d["fts_rank"],
            created_at=d["created_at"],
            importance=d["importance"],
            max_importance=max_imp,
        )
        scored.append(d)
        ids_accessed.append(d["id"])

    # Batch access-tracking update (AKL: +3 importance on access)
    if ids_accessed:
        placeholders = ",".join("?" * len(ids_accessed))
        db.execute(
            f"""
            UPDATE memories
            SET accessed_at = datetime('now'),
                access_count = access_count + 1,
                importance = importance + 3
            WHERE id IN ({placeholders})
            """,
            ids_accessed,
        )
        db.commit()

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:k]


def memory_insert(
    content: str,
    source_agent: str = "manual",
    session_slug: str | None = None,
    lesson_type: str = "lesson",
    tags: str = "",
) -> dict:
    """Insert a new memory entry and return its id."""
    if not content or not content.strip():
        return {"error": "content must not be empty"}

    valid_types = {"lesson", "pattern", "warning", "core-principle"}
    if lesson_type not in valid_types:
        lesson_type = "lesson"

    db = get_db()
    cursor = db.execute(
        """
        INSERT INTO memories (content, source_agent, session_slug, lesson_type, tags)
        VALUES (?, ?, ?, ?, ?)
        """,
        (content.strip(), source_agent, session_slug, lesson_type, tags),
    )
    db.commit()
    return {"id": cursor.lastrowid, "status": "inserted"}


def memory_get(id: int) -> dict:
    """Fetch a single memory entry by id."""
    db = get_db()
    row = db.execute("SELECT * FROM memories WHERE id = ?", (id,)).fetchone()
    if row is None:
        return {"error": f"Memory {id} not found"}
    # Update access tracking
    db.execute(
        "UPDATE memories SET accessed_at = datetime('now'), access_count = access_count + 1, importance = importance + 3 WHERE id = ?",
        (id,),
    )
    db.commit()
    return dict(row)


def memory_recent(hours: int = 24, limit: int = 10) -> list[dict]:
    """Return the most recent entries from the last N hours."""
    db = get_db()
    rows = db.execute(
        """
        SELECT * FROM memories
        WHERE created_at > datetime('now', ? || ' hours')
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (f"-{hours}", limit),
    ).fetchall()
    return [dict(r) for r in rows]


def memory_stats() -> dict:
    """Return DB statistics."""
    db = get_db()
    total = db.execute("SELECT COUNT(*) FROM memories").fetchone()[0]
    by_agent = db.execute(
        "SELECT source_agent, COUNT(*) as cnt FROM memories GROUP BY source_agent ORDER BY cnt DESC"
    ).fetchall()
    by_type = db.execute(
        "SELECT lesson_type, COUNT(*) as cnt FROM memories GROUP BY lesson_type ORDER BY cnt DESC"
    ).fetchall()
    last_updated = db.execute("SELECT MAX(updated_at) FROM memories").fetchone()[0]
    db_size = DB_PATH.stat().st_size if DB_PATH.exists() else 0

    return {
        "total_entries": total,
        "by_agent": {r["source_agent"]: r["cnt"] for r in by_agent},
        "by_type": {r["lesson_type"]: r["cnt"] for r in by_type},
        "database_size_bytes": db_size,
        "last_updated": last_updated,
        "db_path": str(DB_PATH),
    }


# ---------------------------------------------------------------------------
# MCP stdio protocol
# ---------------------------------------------------------------------------

TOOL_DEFS = [
    {
        "name": "memory_search",
        "description": (
            "Search the memory database using hybrid FTS5 + recency + importance "
            "ranking. Returns top-k results with relevance scores. Supports FTS5 "
            "syntax: AND, OR, NOT, phrase matching (\"quoted phrases\"), prefix "
            "matching (word*)."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query (FTS5 syntax supported)",
                },
                "k": {
                    "type": "integer",
                    "description": "Number of results to return",
                    "default": 5,
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "memory_insert",
        "description": "Insert a new memory entry into the database.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "content": {
                    "type": "string",
                    "description": "The memory content text",
                },
                "source_agent": {
                    "type": "string",
                    "description": "Which agent produced this (e.g. research-lead, engineering-lead)",
                    "default": "manual",
                },
                "session_slug": {
                    "type": "string",
                    "description": "Session identifier that produced this memory",
                },
                "lesson_type": {
                    "type": "string",
                    "enum": ["lesson", "pattern", "warning", "core-principle"],
                    "default": "lesson",
                    "description": "Classification of the memory",
                },
                "tags": {
                    "type": "string",
                    "description": "Comma-separated tags for filtering",
                    "default": "",
                },
            },
            "required": ["content"],
        },
    },
    {
        "name": "memory_get",
        "description": "Fetch a single memory entry by its integer id.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "id": {
                    "type": "integer",
                    "description": "The memory id to retrieve",
                },
            },
            "required": ["id"],
        },
    },
    {
        "name": "memory_recent",
        "description": "Get recent memory entries created in the last N hours.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "hours": {
                    "type": "integer",
                    "description": "Lookback window in hours",
                    "default": 24,
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of entries to return",
                    "default": 10,
                },
            },
        },
    },
    {
        "name": "memory_stats",
        "description": (
            "Get database statistics: total entries, entries per agent, "
            "entries per type, database size, and last updated timestamp."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
]


def handle_request(request: dict) -> dict | None:
    """Dispatch a JSON-RPC 2.0 request and return the response (or None)."""
    method = request.get("method", "")
    params = request.get("params") or {}
    req_id = request.get("id")

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "memory-mcp", "version": "0.2.0"},
            },
        }

    if method == "notifications/initialized":
        return None  # one-way notification, no response

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"tools": TOOL_DEFS},
        }

    if method == "tools/call":
        tool_name = params.get("name", "")
        args = params.get("arguments") or {}

        try:
            if tool_name == "memory_search":
                result = memory_search(args["query"], int(args.get("k", 5)))
            elif tool_name == "memory_insert":
                result = memory_insert(
                    content=args["content"],
                    source_agent=args.get("source_agent", "manual"),
                    session_slug=args.get("session_slug"),
                    lesson_type=args.get("lesson_type", "lesson"),
                    tags=args.get("tags", ""),
                )
            elif tool_name == "memory_get":
                result = memory_get(int(args["id"]))
            elif tool_name == "memory_recent":
                result = memory_recent(
                    hours=int(args.get("hours", 24)),
                    limit=int(args.get("limit", 10)),
                )
            elif tool_name == "memory_stats":
                result = memory_stats()
            else:
                result = {"error": f"Unknown tool: {tool_name}"}
        except Exception as exc:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {"type": "text", "text": json.dumps({"error": str(exc)})}
                    ],
                    "isError": True,
                },
            }

        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(result, indent=2, default=str),
                    }
                ]
            },
        }

    # Unknown method
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"},
    }


def main() -> None:
    """Run the MCP server on stdio (line-delimited JSON-RPC)."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            continue

        try:
            response = handle_request(request)
        except Exception as exc:
            response = {
                "jsonrpc": "2.0",
                "id": request.get("id"),
                "error": {"code": -32603, "message": f"Internal error: {exc}"},
            }

        if response is not None:
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
