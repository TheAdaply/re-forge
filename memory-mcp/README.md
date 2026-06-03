# Memory MCP Server

SQLite + FTS5 queryable memory layer for Claude Code. Hook B of the two-hook memory system.

## Architecture

```
~/.claude/memory-mcp/
├── server.py      # MCP stdio server (raw JSON-RPC, zero dependencies)
├── schema.sql     # DDL: memories table + FTS5 virtual table + triggers + indexes
├── ranker.py      # 3-factor hybrid scorer: FTS5 BM25 + recency + importance
├── bootstrap.sh   # One-time setup: create DB, apply schema, import MEMORY.md files
├── backup.sh      # WAL checkpoint + timestamped backup
├── requirements.txt
└── README.md
```

## Tools exposed

| Tool | Description |
|------|-------------|
| `memory_search(query, k=5)` | Hybrid FTS5 + recency + importance search |
| `memory_insert(content, ...)` | Insert a new memory entry |
| `memory_get(id)` | Fetch a single entry by id |
| `memory_recent(hours=24, limit=10)` | List recent entries |
| `memory_stats()` | DB statistics |

## Ranker

Score = 0.4 * fts_score + 0.3 * recency_score + 0.3 * importance_score

- **FTS5 BM25**: `1 / (1 + |rank|)` — keyword relevance
- **Recency**: `exp(-age_days / 30)` — exponential decay, 30-day half-life
- **Importance**: `importance / max_importance` — access-weighted priority

Access tracking (AKL): each read adds +3 importance; each insert starts at 50.0.

## Setup

memory-mcp is a manual opt-in: `setup.sh` does NOT install it. To enable it, run
the bootstrap script from the repo yourself.

```bash
# One-time bootstrap: create DB + import existing MEMORY.md files
bash memory-mcp/bootstrap.sh

# Verify tools are exposed
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | python3 memory-mcp/server.py

# Check imported entry count
sqlite3 ~/.claude/memory-mcp/memory.db "SELECT COUNT(*) FROM memories"
```

Bootstrap is optional: `server.py` falls back to the `schema.sql` shipped next to
it, so a bare `python3 memory-mcp/server.py` creates and serves a working database
without running bootstrap first (covered by `tests/test_memory_mcp.py`). Run
bootstrap only when you also want to import existing `MEMORY.md` files.

## MCP registration (`~/.claude/mcp.json`)

```json
{
  "mcpServers": {
    "memory": {
      "command": "python3",
      "args": ["~/.claude/memory-mcp/server.py"]
    }
  }
}
```

## Backup

```bash
# Manual backup
bash ~/.claude/memory-mcp/backup.sh

# Cron: daily at 2am
# 0 2 * * * bash ~/.claude/memory-mcp/backup.sh >> ~/.claude/memory-mcp/backup.log 2>&1
```

## Schema

The `memories` table holds all entries. An FTS5 content table (`memories_fts`) mirrors
`content`, `source_agent`, `tags`, and `session_slug` for full-text search. Three triggers
(INSERT/UPDATE/DELETE) keep the FTS index in sync automatically.

## Failure recovery

- **Corrupt WAL**: `sqlite3 memory.db "PRAGMA integrity_check"`, then restore from backup.
- **FTS out of sync**: `INSERT INTO memories_fts(memories_fts) VALUES('rebuild')`.
- **Locked DB**: Check for lingering processes: `fuser memory.db`.
- **Missing entries after crash**: `sqlite3 memory.db "PRAGMA wal_checkpoint(FULL)"`.
- **Schema drift**: Drop and re-run `schema.sql` (data preserved if only adding columns).
