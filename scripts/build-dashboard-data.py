#!/usr/bin/env python3
"""Generate ``showcase/public/dashboard-data.json`` — the data the static
customer dashboard renders for the five panels (clusters, repeated tasks, work
status, stuck, deadlines).

TWO MODES
---------
* **sample (default)** — emit a high-quality, representative payload with
  ``"source": "sample"``. Stdlib-only, no network, no DB: safe to run in CI and
  safe to commit. This is what the public site renders by default, behind an
  unmissable "Sample data — request a live demo" badge. The numbers are the same
  ones the real composers produce from the baked-in demo seed (verified: the 8
  seed procedures sum to 711 reclaimable minutes / 476k tokens / 52 repeats).

* **live (`--live` or ``REFORGE_DASHBOARD_LIVE=1``)** — read THIS machine's real
  re-forge data through ``~/.reforge/db.env`` (``DATABASE_URL`` + ``REFORGE_ORG``)
  and REUSE the shipped dashboard composers
  (``services/dashboard/app`` : ``repeated.compose_repeated``,
  ``overview._time_signal`` / ``_corpus_counts`` / ``_spend_series``, and the
  ``roi._stuck`` grouping) to export ``"source": "live"`` SAFE AGGREGATES ONLY.
  Falls back to the sample on missing creds, an unreachable/empty DB, or ANY
  error — so the site is always demo-ready. NEVER connects when creds are absent.

HONEST BY CONSTRUCTION (load-bearing for an investor)
-----------------------------------------------------
* The output is built from a FIXED allowlist of safe aggregates — cluster
  labels+sizes+layout coords, short procedure labels, counts, session spans,
  stuck flags keyed by session/repo, deadline dates. It is NEVER a dump of DB
  rows. A final :func:`_assert_safe` gate scans every string for connection
  strings / keys / emails / raw-secret patterns and refuses to emit if any leak.
* The live path reads only pre-aggregated ``reforge.insights`` detail + COUNT(*)s
  + session-span math. It never decrypts prompt content (that needs the per-org
  DEK and lives only in ``explorer.py``), so raw prompts CANNOT reach the file.
* Clusters carry ``embeddings_real`` + an honest note: the 2D positions are a
  readable LAYOUT, never presented as a real semantic projection. When the live
  corpus was embedded with the offline hash embedder, the live note is the
  shipped ``FAKE_EMBED_WARNING`` verbatim (embed-gate R-001/R-004).
* Time / tokens are do-it-once UPPER BOUNDS ``(frequency-1) x avg_minutes``;
  ``avg_minutes`` is the MEASURED average shown apart. Spend is context, never a
  saving. Stuck items are flagged for REVIEW, keyed by session/repo, never a
  person.

USAGE
-----
    python scripts/build-dashboard-data.py            # sample (commit this)
    python scripts/build-dashboard-data.py --live     # try real data, else sample
    python scripts/build-dashboard-data.py -o /path/out.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #
_SCRIPT = Path(__file__).resolve()
REPO_ROOT = _SCRIPT.parent.parent
DEFAULT_OUT = REPO_ROOT / "showcase" / "public" / "dashboard-data.json"
DB_ENV = Path.home() / ".reforge" / "db.env"

# Candidate locations of the shipped FastAPI dashboard package (live reuse only).
# Importing it needs fastapi/psycopg, present only where --live is actually run;
# the sample path never imports it.
_DASHBOARD_DIRS = [
    os.environ.get("REFORGE_FEATURES_DASHBOARD", ""),
    str(Path.home() / "Code" / "reforge-features" / "services" / "dashboard"),
    str(REPO_ROOT.parent / "reforge-features" / "services" / "dashboard"),
]

# --------------------------------------------------------------------------- #
# Honest labels + warnings — copied VERBATIM from the shipped composers so the
# static dashboard says exactly what the live dashboard says.
#   FAKE_EMBED_WARNING  <- services/dashboard/app/repeated.py
#   STUCK_LABEL         <- services/dashboard/app/roi.py  (_stuck)
# --------------------------------------------------------------------------- #
FAKE_EMBED_WARNING = (
    "Clusters are grouped by FAKE (hash-based) embeddings, not semantic ones. "
    "The procedure and sample text is real, but the GROUPING is a hash artifact — "
    "do not read these clusters as meaning-based. Set REFORGE_EMBED_PROVIDER=openai "
    "with OPENAI_API_KEY to cluster on real semantic embeddings."
)
SAMPLE_EMBED_NOTE = (
    "Sample cluster map — the positions are an illustrative layout for readability, "
    "not a real semantic projection. Request a live demo to cluster your own work."
)
STUCK_LABEL = (
    "Where work is stuck — retry spirals, wasteful runs and unusual sessions "
    "flagged for REVIEW (keyed by session/repo, never a person). Support, not "
    "surveillance."
)
DEADLINES_LABEL = (
    "Upcoming delivery dates from tracked work — surfaces/repos only, never "
    "individuals."
)
NOTICE = "Sample data — request a live demo"

# Honest reclaim/measure labels (mirror repeated.compose_repeated["labels"]).
LABELS = {
    "time": (
        "Time reclaimable if each repeated procedure were automated once "
        "(do it once, not N times — an upper bound on the repeats removed, not "
        "the first honest run)"
    ),
    "procedures": "Distinct procedures the team performs over and over",
    "tokens": "Tokens the same do-it-once automation would stop re-spending",
    "clusters": (
        "Each dot is a sub-task; colour groups the procedures the team runs over "
        "and over"
    ),
    "status": (
        "Engineer-time driving agents — measured from session spans. Velocity is "
        "the median session getting shorter as memory compounds."
    ),
}

# How many cluster points to expand per cluster (mirror demo.MAX_CLUSTER_POINTS).
MAX_CLUSTER_POINTS = 16
TOP_CLUSTERS = 12        # clusters plotted on the map
TOP_TASKS = 8            # repeated-procedure cards shipped


# --------------------------------------------------------------------------- #
# Defensive reads — same shape as the composers' ``_f`` / ``_str`` so a junk /
# NaN / inf / bool value can never poison a number or render as ``None``.
# --------------------------------------------------------------------------- #
def _f(detail, *keys: str) -> float:
    if not isinstance(detail, dict):
        return 0.0
    for k in keys:
        v = detail.get(k)
        if v is None or isinstance(v, bool):
            continue
        try:
            x = float(v)
        except (TypeError, ValueError):
            continue
        if math.isfinite(x):
            return x
    return 0.0


def _i(detail, *keys: str) -> int:
    return int(_f(detail, *keys))


def _str(v, default: str = "", limit: int = 240) -> str:
    """A clean, length-bounded display string from possibly-junk input. The cap
    is defence-in-depth: a label is short by construction, so a long value is a
    smell — we truncate rather than ship it."""
    if v is None or isinstance(v, bool):
        return default
    s = str(v).strip()
    if len(s) > limit:
        s = s[:limit].rstrip() + "…"
    return s or default


def _clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x


def _dedup_key(intent: str) -> str:
    """Stable cluster id = ``sha256(normalised intent)[:32]`` — byte-identical to
    ``repeated._dedup_key`` so a sample task carries the same id a live one would."""
    return hashlib.sha256((intent or "").strip().lower().encode("utf-8")).hexdigest()[:32]


# --------------------------------------------------------------------------- #
# Cluster scatter — DETERMINISTIC point cloud from a 2D centroid. Vendored from
# ``demo._jitter`` / ``demo._cluster_points`` (sha256, not a salted ``hash``) so
# the same seed always plots the same scatter, in any process.
# --------------------------------------------------------------------------- #
def _jitter(cid: str, i: int) -> tuple[float, float]:
    h = hashlib.sha256(f"{cid}:{i}".encode()).digest()
    return (h[0] / 127.5) - 1.0, (h[1] / 127.5) - 1.0


def _cluster_points(cid: str, centroid, size: int) -> list[list[float]]:
    if not (isinstance(centroid, (list, tuple)) and len(centroid) >= 2):
        return []
    cx, cy = _clamp01(_f({"x": centroid[0]}, "x")), _clamp01(_f({"x": centroid[1]}, "x"))
    n = max(3, min(int(size or 0), MAX_CLUSTER_POINTS))
    spread = 0.045
    pts = [[round(cx, 4), round(cy, 4)]]  # the centroid anchors the cloud
    for i in range(n - 1):
        dx, dy = _jitter(cid or "c", i)
        pts.append([round(_clamp01(cx + dx * spread), 4), round(_clamp01(cy + dy * spread), 4)])
    return pts


def _layout_centroid(key: str) -> list[float]:
    """A readable 2D position for a live cluster with no stored 2D projection.
    Golden-angle spiral keyed by a digest of the cluster id, so positions are
    stable and well-spread. This is a LAYOUT, never a semantic claim — the honest
    ``embeddings_real`` flag carries the meaning of the grouping."""
    h = int.from_bytes(hashlib.sha256(key.encode()).digest()[:4], "big")
    idx = h % 997
    ang = idx * 2.39996323  # golden angle (radians)
    rad = 0.08 + 0.40 * ((idx % 23) / 22.0)
    return [round(_clamp01(0.5 + rad * math.cos(ang)), 4),
            round(_clamp01(0.5 + rad * math.sin(ang)), 4)]


# --------------------------------------------------------------------------- #
# Repeated procedures — the do-it-once HONEST clamp, vendored from
# ``repeated._cluster`` / ``compose_repeated``: only the (frequency-1) REPEATS
# are reclaimable, never the first honest run, so a producer's overstated value
# is clamped to ``(frequency-1) x avg_minutes``.
# --------------------------------------------------------------------------- #
def _developers(raw) -> list[dict]:
    out = []
    if isinstance(raw, dict):           # live shape: {name: count}
        raw = [{"name": k, "count": v} for k, v in raw.items()]
    if not isinstance(raw, list):
        return []
    for d in raw:
        if not isinstance(d, dict):
            continue
        name, count = _str(d.get("name"), limit=64), _i(d, "count")
        if name and count > 0:
            out.append({"name": name, "count": count})
    out.sort(key=lambda d: (-d["count"], d["name"]))
    return out


def _steps(detail: dict) -> list[str]:
    p = detail.get("steps")
    if p is None:
        p = detail.get("procedure")
    raw = p if isinstance(p, list) else (str(p).replace("▸", "\n").split("\n") if isinstance(p, str) else [])
    return [s for s in (_str(x, limit=80) for x in raw) if s][:8]


def _task(detail: dict, title: str = "") -> dict:
    """One repeated-procedure row -> a render-ready, allowlisted task dict. The
    output carries ONLY safe label/aggregate fields — never ``samples`` (which can
    echo prompt text) and never the raw row."""
    frequency = _i(detail, "frequency", "n_occurrences", "member_count")
    avg_minutes = round(_f(detail, "avg_minutes", "avg_min"), 1)
    repeats = max(0, frequency - 1)
    bound_min = round(repeats * avg_minutes, 1)
    raw_saved = _f(detail, "time_saved_min", "time_saved_minutes")
    if avg_minutes > 0 and frequency > 0:
        time_saved_min = round(min(raw_saved, bound_min), 1) if raw_saved else bound_min
    else:
        time_saved_min = round(raw_saved, 1)
    intent = _str(detail.get("intent") or detail.get("label") or title, "a repeated procedure", limit=160)
    return {
        "id": _str(detail.get("dedup_key"), limit=64) or _dedup_key(intent),
        "intent": intent,
        "domain": _str(detail.get("domain"), limit=48),
        "steps": _steps(detail),
        "frequency": frequency,
        "n_sessions": _i(detail, "n_sessions", "distinct_sessions", "session_count"),
        "developers": _developers(detail.get("developers")),
        "avg_minutes": avg_minutes,
        "time_saved_min": time_saved_min,
        "tokens_saved": _i(detail, "tokens_saved", "tokens_saved_upper_bound"),
        "skill_sketch": _str(detail.get("skill_sketch") or detail.get("suggested_skill") or detail.get("fix"), limit=160),
    }


def _repeated_panel(rows: list[dict], headline_n: int) -> dict:
    """Mirror ``repeated.compose_repeated``: rank tasks, roll up the do-it-once
    bound. ``headline_n`` is the total distinct-procedure count for the strip; the
    shipped cards are the top :data:`TOP_TASKS` with the rest counted as truncated."""
    tasks = [_task(r.get("detail", {}), r.get("title", "")) for r in rows]
    tasks.sort(key=lambda t: -t["time_saved_min"])
    shown = tasks[:TOP_TASKS]
    total_min = round(sum(t["time_saved_min"] for t in shown), 1)
    n_proc = max(headline_n, len(tasks))
    return {
        "total_time_saved_min": total_min,
        "total_time_saved_hours": round(total_min / 60.0, 1),
        "n_procedures": n_proc,
        "total_tokens_saved": int(sum(t["tokens_saved"] for t in shown)),
        "total_repeats": int(sum(max(0, t["frequency"] - 1) for t in shown)),
        "tasks": shown,
        "tasks_truncated": max(0, n_proc - len(shown)),
        "labels": {"time": LABELS["time"], "procedures": LABELS["procedures"], "tokens": LABELS["tokens"]},
    }


# --------------------------------------------------------------------------- #
# Stuck — mirror ``roi._stuck``: failure_pattern / agent_waste / trajectory_anomaly
# unified into one "where is work stuck" list, keyed by session/repo (NEVER a
# person), flagged for REVIEW. The public shape carries ``minutes`` (affected
# wall-clock, optional) and ``z`` (outlier score) — never the $ figure and never
# a name.
# --------------------------------------------------------------------------- #
def _where(detail: dict, repo: str | None) -> str:
    sid = _str(detail.get("session_id"), limit=64)
    short = sid.replace("-", "")[:8] if sid else ""
    parts = []
    if repo:
        parts.append(repo)
    if short:
        parts.append(f"session {short}")
    return " · ".join(parts) or "—"


def _stuck_panel(by_kind: dict[str, list[dict]]) -> dict:
    items: list[dict] = []
    spirals = waste = anomalies = 0
    for r in by_kind.get("failure_pattern") or []:
        d = r.get("detail", {})
        spirals += 1
        repo = _str(d.get("repo"), limit=64) or None
        items.append({"signal": "retry_spiral", "kind": _str(d.get("spiral_kind"), "spiral", limit=40),
                      "title": _str(r.get("title"), "Retry spiral", limit=120), "where": _where(d, repo),
                      "repo": repo, "minutes": _i(d, "minutes", "wall_clock_min", "duration_min", "affected_minutes") or None, "z": None})
    for r in by_kind.get("agent_waste") or []:
        d = r.get("detail", {})
        waste += 1
        repo = _str(d.get("repo"), limit=64) or None
        items.append({"signal": "waste", "kind": _str(d.get("pattern"), "waste", limit=40),
                      "title": _str(r.get("title"), "Agent waste", limit=120), "where": _where(d, repo),
                      "repo": repo, "minutes": _i(d, "minutes", "wall_clock_min", "duration_min", "affected_minutes") or None, "z": None})
    for r in by_kind.get("trajectory_anomaly") or []:
        d = r.get("detail", {})
        anomalies += 1
        items.append({"signal": "anomaly", "kind": "unusual",
                      "title": _str(r.get("title"), "Trajectory anomaly", limit=120), "where": _where(d, None),
                      "repo": None, "minutes": _i(d, "minutes", "wall_clock_min", "duration_min") or None,
                      "z": round(_f(d, "anomaly_z"), 2) or None})
    items.sort(key=lambda x: (-(x["minutes"] or 0), -(x["z"] or 0.0)))
    return {"count": len(items), "spirals": spirals, "waste": waste, "anomalies": anomalies,
            "items": items[:8], "label": STUCK_LABEL}


# --------------------------------------------------------------------------- #
# Deadlines — NO live producer yet (sample-only by design). Dates are computed
# relative to today so the demo never shows a stale/past "upcoming" date. Keyed
# by repo/surface, never a person.
# --------------------------------------------------------------------------- #
def _deadlines_panel() -> dict:
    t = date.today()

    def d(offset: int) -> str:
        return (t + timedelta(days=offset)).isoformat()

    items = [
        {"label": "Ship the deadlines panel in tasklib", "date": d(5), "status": "at_risk",
         "repo": "tasklib", "note": "2 contested surfaces still open in preflight"},
        {"label": "Cut the monthly savings report", "date": d(2), "status": "due_soon",
         "repo": "reporting", "note": "nightly cron green; needs a final reconcile"},
        {"label": "Roll out semantic-search reindex", "date": d(12), "status": "on_track",
         "repo": "retrieval", "note": "embeddings backfill 60% complete"},
        {"label": "Tenant-isolation (RLS) hardening pass", "date": d(-1), "status": "overdue",
         "repo": "security", "note": "one policy test still red — flagged for review"},
        {"label": "Dashboard page-scaffold skill GA", "date": d(-4), "status": "shipped",
         "repo": "dashboard", "note": "merged; now reused across 5 pages"},
    ]
    return {"items": items, "label": DEADLINES_LABEL}


# --------------------------------------------------------------------------- #
# Clusters panel from a list of {id,label,color,centroid,size}.
# --------------------------------------------------------------------------- #
def _clusters_panel(raw: list[dict]) -> list[dict]:
    out = []
    for c in raw[:TOP_CLUSTERS]:
        cid = _str(c.get("id"), limit=48) or _dedup_key(_str(c.get("label")))
        size = _i(c, "size")
        centroid = c.get("centroid") or _layout_centroid(cid + (c.get("label") or ""))
        pts = _cluster_points(cid, centroid, size)
        if not pts:
            continue
        out.append({"id": cid, "label": _str(c.get("label"), "a repeated procedure", limit=80),
                    "color": _str(c.get("color"), "#6D5DFC", limit=16),
                    "size": size, "centroid": [round(_clamp01(_f({"x": centroid[0]}, "x")), 4),
                                               round(_clamp01(_f({"x": centroid[1]}, "x")), 4)],
                    "points": pts})
    return out


# --------------------------------------------------------------------------- #
# The baked-in SAMPLE seed — clusters + procedures are byte-faithful to
# ``services/dashboard/static/demo-seed.json`` (so the sample matches the shipped
# demo exactly), extended with the status / stuck rows the five-panel view needs.
# Verified: the 8 procedures sum to 711 reclaimable min / 476000 tokens / 52
# repeats — the exact figures the live composer would produce.
# --------------------------------------------------------------------------- #
SEED = {
    "workspace": "tasklib · sample team",
    "subtitle": "A 30-day sample capture across 6 developers — what re-forge sees, with nothing installed.",
    "kpis": {"repeated_procedures": 48, "time_reclaimable_hours": 31.0,
             "sessions": 274, "developers": 6, "monthly_spend_usd": 4120.0},
    "clusters": [
        {"id": "ci", "label": "Re-run flaky CI until green", "color": "#6D5DFC", "size": 14, "centroid": [0.18, 0.30]},
        {"id": "ingest", "label": "Wire a new ingest event type", "color": "#4F46E5", "size": 9, "centroid": [0.34, 0.20]},
        {"id": "schema", "label": "Add a column + migration + backfill", "color": "#1B8F55", "size": 7, "centroid": [0.72, 0.27]},
        {"id": "reporting", "label": "Regenerate the savings report", "color": "#F2A93B", "size": 6, "centroid": [0.81, 0.55]},
        {"id": "security", "label": "Debug an RLS / tenant-isolation test", "color": "#EF4444", "size": 5, "centroid": [0.29, 0.70]},
        {"id": "dashboard", "label": "Stand up a new dashboard page", "color": "#6D5DFC", "size": 5, "centroid": [0.55, 0.41]},
        {"id": "cost", "label": "Right-size an opus run to sonnet", "color": "#35D07F", "size": 8, "centroid": [0.63, 0.73]},
        {"id": "testing", "label": "Reproduce a flaky preflight test", "color": "#8B909C", "size": 6, "centroid": [0.45, 0.57]},
        {"id": "retrieval", "label": "Tune embedding / semantic search", "color": "#4F46E5", "size": 4, "centroid": [0.15, 0.54]},
        {"id": "deploy", "label": "Ship a Vercel / Lambda deploy", "color": "#F2A93B", "size": 3, "centroid": [0.86, 0.79]},
        {"id": "docs", "label": "Regenerate CATALOG + docs", "color": "#1B8F55", "size": 5, "centroid": [0.50, 0.13]},
        {"id": "auth", "label": "Fix a device-key / token issue", "color": "#4F46E5", "size": 4, "centroid": [0.78, 0.41]},
    ],
    "procedures": [
        {"intent": "Stand up a new dashboard page (the install pattern)", "domain": "dashboard",
         "steps": ["add module", "write a pure compose() fn", "expose install(app)", "ship the static html"],
         "frequency": 5, "n_sessions": 5, "developers": [{"name": "akash", "count": 3}, {"name": "shine", "count": 2}],
         "avg_minutes": 26.0, "time_saved_min": 104, "tokens_saved": 96000, "skill_sketch": "skill: dashboard-page-scaffold"},
        {"intent": "Resolve a failing CI run by re-running until green", "domain": "ci",
         "steps": ["read the failing job", "re-run", "patch the flaky test", "re-run"],
         "frequency": 14, "n_sessions": 11, "developers": [{"name": "shine", "count": 6}, {"name": "akash", "count": 5}, {"name": "mei", "count": 3}],
         "avg_minutes": 8.0, "time_saved_min": 104, "tokens_saved": 52000, "skill_sketch": "/forge:ci-triage — read, reproduce, patch, re-run"},
        {"intent": "Add a column + migration + backfill end to end", "domain": "schema migrations",
         "steps": ["write migration", "add column", "backfill", "update model"],
         "frequency": 7, "n_sessions": 6, "developers": [{"name": "akash", "count": 4}, {"name": "rui", "count": 3}],
         "avg_minutes": 16.0, "time_saved_min": 96, "tokens_saved": 61000, "skill_sketch": "skill: migration-scaffold (migration + model + backfill)"},
        {"intent": "Wire a new ingest event type end to end", "domain": "ingest",
         "steps": ["add the Pydantic model", "register in the router", "add the RLS policy", "write a smoke test"],
         "frequency": 9, "n_sessions": 6, "developers": [{"name": "akash", "count": 5}, {"name": "shine", "count": 4}],
         "avg_minutes": 12.0, "time_saved_min": 96, "tokens_saved": 84000, "skill_sketch": "/forge:new-event-type — scaffolds model + router + RLS + test"},
        {"intent": "Regenerate and reconcile the savings report", "domain": "reporting",
         "steps": ["run cost_insights", "run savings_report", "diff vs last"],
         "frequency": 6, "n_sessions": 5, "developers": [{"name": "shine", "count": 6}],
         "avg_minutes": 18.0, "time_saved_min": 90, "tokens_saved": 44000, "skill_sketch": "nightly cron on savings_report"},
        {"intent": "Debug a tenant-isolation (RLS) test failure", "domain": "security",
         "steps": ["reproduce", "set app.org_id", "check the policy", "re-run"],
         "frequency": 5, "n_sessions": 4, "developers": [{"name": "rui", "count": 3}, {"name": "akash", "count": 2}],
         "avg_minutes": 22.0, "time_saved_min": 88, "tokens_saved": 71000, "skill_sketch": "/forge:rls-debug — set org, diff policy, re-run"},
        {"intent": "Reproduce and fix a flaky embedding / preflight test", "domain": "testing",
         "steps": ["mock the embedder", "seed prompts", "assert the threshold", "re-run"],
         "frequency": 6, "n_sessions": 5, "developers": [{"name": "mei", "count": 4}, {"name": "shine", "count": 2}],
         "avg_minutes": 14.0, "time_saved_min": 70, "tokens_saved": 38000, "skill_sketch": "/forge:flaky-hunt"},
        {"intent": "Right-size an overspending agent run from opus to sonnet", "domain": "cost",
         "steps": ["find the opus run", "check the task", "switch the model", "verify the output"],
         "frequency": 8, "n_sessions": 7, "developers": [{"name": "akash", "count": 4}, {"name": "rui", "count": 4}],
         "avg_minutes": 9.0, "time_saved_min": 63, "tokens_saved": 30000, "skill_sketch": "policy: default sonnet, opus on demand"},
    ],
    # WORK STATUS — measured engineer-time signal + corpus counts.
    "status": {"work_hours": 142.0, "sessions": 274, "avg_session_min": 31.1,
               "velocity_trend": "down", "recent_session_min": 24.0, "older_session_min": 33.0,
               "messages": 8120, "clusters": 12},
    # STUCK — flagged for REVIEW, keyed by session/repo, never a person.
    "stuck": [
        {"signal": "retry_spiral", "kind": "error_retry", "title": "CI job retried 9× without a green run",
         "where": "tasklib · session a1f3c9", "repo": "tasklib", "minutes": 38, "z": None},
        {"signal": "retry_spiral", "kind": "edit_revert", "title": "Same file edited and reverted 6× in one session",
         "where": "retrieval · session 7be204", "repo": "retrieval", "minutes": 27, "z": None},
        {"signal": "waste", "kind": "redo", "title": "Opus re-ran a task already solved earlier that day",
         "where": "reporting · session c4d8a0", "repo": "reporting", "minutes": 21, "z": None},
        {"signal": "waste", "kind": "long_context", "title": "Full repo re-read on every turn (no scoping)",
         "where": "dashboard · session 9f2e1b", "repo": "dashboard", "minutes": 18, "z": None},
        {"signal": "anomaly", "kind": "unusual", "title": "Session ran 4.2× longer than this repo's median",
         "where": "security · session 02bb77", "repo": None, "minutes": None, "z": 3.1},
    ],
}


def _activity_series_sample(days: int = 30) -> list[dict]:
    """A deterministic, realistic daily activity series ending today: busier on
    weekdays, quiet on weekends. Reproducible (digest-seeded), never random."""
    out = []
    today = date.today()
    for off in range(days - 1, -1, -1):
        day = today - timedelta(days=off)
        h = int.from_bytes(hashlib.sha256(day.isoformat().encode()).digest()[:2], "big")
        weekend = day.weekday() >= 5
        base = (2 + h % 3) if weekend else (8 + h % 6)
        runs = base * (4 + (h >> 3) % 3)
        out.append({"day": day.isoformat(), "sessions": base, "runs": runs})
    return out


# --------------------------------------------------------------------------- #
# Assemble the full payload (shared by sample + live).
# --------------------------------------------------------------------------- #
def _envelope(source: str, embeddings_real: bool, *, workspace: str, subtitle: str,
              kpis: dict, clusters: list[dict], repeated: dict, status: dict,
              stuck: dict, deadlines: dict, embed_note: str) -> dict:
    return {
        "source": source,                       # "live" | "sample" — drives the badge
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "workspace": workspace,
        "subtitle": subtitle,
        "embeddings_real": bool(embeddings_real),
        "embeddings_note": embed_note,
        "notice": NOTICE if source == "sample" else "",
        "kpis": kpis,
        "clusters": clusters,
        "cluster_labels": {"clusters": LABELS["clusters"]},
        "repeated": repeated,
        "status": status,
        "stuck": stuck,
        "deadlines": deadlines,
        "footnote": (
            "Time and tokens are do-it-once upper bounds ((frequency−1)×avg); "
            "avg minutes is measured and shown apart. Spend is context, not a "
            "saving. Stuck items are flagged for review, keyed by session/repo, "
            "never a person."
        ),
    }


def build_sample() -> dict:
    k = SEED["kpis"]
    kpis = {
        "repeated_procedures": int(k["repeated_procedures"]),
        "time_reclaimable_hours": round(float(k["time_reclaimable_hours"]), 1),
        "sessions": int(k["sessions"]),
        "developers": int(k["developers"]),
        "monthly_spend_usd": round(float(k["monthly_spend_usd"]), 2),
    }
    clusters = _clusters_panel(SEED["clusters"])
    repeated = _repeated_panel(
        [{"detail": p, "title": p.get("intent", "")} for p in SEED["procedures"]],
        headline_n=kpis["repeated_procedures"],
    )
    st = dict(SEED["status"])
    st["activity"] = _activity_series_sample(30)
    st["labels"] = {"status": LABELS["status"]}
    # Stuck: tally from the seed rows (already in the public shape).
    sitems = SEED["stuck"]
    stuck = {
        "count": len(sitems),
        "spirals": sum(1 for x in sitems if x["signal"] == "retry_spiral"),
        "waste": sum(1 for x in sitems if x["signal"] == "waste"),
        "anomalies": sum(1 for x in sitems if x["signal"] == "anomaly"),
        "items": sitems,
        "label": STUCK_LABEL,
    }
    return _envelope(
        "sample", False, workspace=SEED["workspace"], subtitle=SEED["subtitle"],
        kpis=kpis, clusters=clusters, repeated=repeated, status=st, stuck=stuck,
        deadlines=_deadlines_panel(), embed_note=SAMPLE_EMBED_NOTE,
    )


# --------------------------------------------------------------------------- #
# LIVE path — read ~/.reforge/db.env and REUSE the shipped composers. Wrapped so
# ANY failure (missing creds, unreachable/empty DB, import error) returns None and
# the caller emits the sample instead.
# --------------------------------------------------------------------------- #
def _load_db_env(path: Path) -> dict:
    """Parse ``KEY=VALUE`` (optionally ``export KEY=...``, quoted) into a dict.
    Values are NEVER logged or written to the output."""
    env: dict[str, str] = {}
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            if line.startswith("export "):
                line = line[len("export "):]
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key:
                env[key] = val
    except OSError:
        return {}
    return env


def build_live() -> dict | None:
    env = _load_db_env(DB_ENV)
    db_url = env.get("DATABASE_URL", "").strip()
    org_id = env.get("REFORGE_ORG", "").strip()
    if not db_url or not org_id:
        print("[build-dashboard-data] live: creds absent (no DATABASE_URL/REFORGE_ORG) — not connecting.")
        return None

    # Make the dashboard package importable + give its config the same env. We set
    # only process env for THIS run; nothing here is written to the output.
    for k, v in env.items():
        os.environ.setdefault(k, v)
    os.environ.setdefault("PGCONNECT_TIMEOUT", "6")     # never hang the build
    dash_dir = next((d for d in _DASHBOARD_DIRS if d and (Path(d) / "app").is_dir()), "")
    if not dash_dir:
        print("[build-dashboard-data] live: dashboard package not found — falling back to sample.")
        return None
    sys.path.insert(0, dash_dir)

    try:
        from app import db as rdb                          # noqa: E402  (reuse: tenant_tx + RLS)
        from app import overview as rov                    # noqa: E402  (reuse: time/corpus/series)
        from app.repeated import compose_repeated, embeddings_real  # noqa: E402

        real_embed = bool(embeddings_real())
        with rdb.tenant_tx(org_id) as (_conn, cur):
            # Repeated-procedure clusters (same SELECT as /api/repeated).
            cur.execute(
                "select kind, title, detail, score, status, dedup_key from reforge.insights "
                "where kind = 'repeated_procedure' and status <> 'dismissed' "
                "order by score desc nulls last limit 500"
            )
            rep_rows = [
                {"kind": k, "title": t, "detail": dict(d or {}, dedup_key=dk), "score": s, "status": st}
                for (k, t, d, s, st, dk) in cur.fetchall()
            ]
            rep_payload = compose_repeated(rep_rows, real_embed)

            # All non-dismissed insights -> stuck grouping (same source as /api/roi).
            cur.execute(
                "select kind, title, detail, score, status from reforge.insights "
                "where status <> 'dismissed' order by score desc nulls last, created_at desc limit 1000"
            )
            by_kind: dict[str, list[dict]] = {}
            for (k, t, d, s, st) in cur.fetchall():
                by_kind.setdefault(k or "", []).append({"kind": k, "title": t, "detail": dict(d or {}), "score": s, "status": st})

            counts = rov._corpus_counts(cur)               # messages/sessions/clusters
            tsig = rov._time_signal(cur)                   # measured time + velocity
            spend_series = rov._spend_series(cur)          # daily runs (for activity)

            # Per-day distinct sessions to pair with the run counts (safe aggregate).
            cur.execute(
                "select created_at::date d, count(distinct session_id) "
                "from reforge.prompts where session_id is not null "
                "and created_at >= (current_date - make_interval(days => 30)) group by d order by d"
            )
            sess_by_day = {str(d): int(n or 0) for (d, n) in cur.fetchall()}

            # Live clusters: label+size from the task clusters; layout coords (no
            # stored 2D projection). embeddings_real carries the grouping's meaning.
            cur.execute(
                "select id::text, coalesce(label, ''), size from reforge.clusters "
                "where kind = 'task' order by size desc nulls last limit %s",
                (TOP_CLUSTERS,),
            )
            cluster_rows = [{"id": cid, "label": lab, "size": int(sz or 0)} for (cid, lab, sz) in cur.fetchall()]
            if not cluster_rows:                            # fall back to the repeated clusters
                cluster_rows = [{"id": c["id"], "label": c["intent"], "size": c["frequency"]}
                                for c in rep_payload.get("clusters", [])]

        # Empty org -> not a useful demo; emit the sample instead.
        if not rep_rows and not cluster_rows and not counts.get("messages"):
            print("[build-dashboard-data] live: org is empty — falling back to sample.")
            return None

        # ---- map to the five-panel public schema (safe aggregates only) ----
        palette = ["#6D5DFC", "#4F46E5", "#1B8F55", "#F2A93B", "#EF4444", "#35D07F", "#8B909C"]
        clusters_in = []
        for i, c in enumerate(cluster_rows):
            cid = c["id"]
            clusters_in.append({"id": cid, "label": c["label"] or "a repeated procedure",
                                "color": palette[i % len(palette)], "size": c["size"],
                                "centroid": _layout_centroid(cid + (c["label"] or ""))})
        clusters = _clusters_panel(clusters_in)

        repeated = _repeated_panel(
            [{"detail": dict(c, **{"dedup_key": c.get("id")}), "title": c.get("intent", "")}
             for c in rep_payload.get("clusters", [])],
            headline_n=int(rep_payload.get("n_procedures", 0)),
        )

        activity = [{"day": row["day"], "sessions": sess_by_day.get(row["day"], 0), "runs": int(row.get("agents", 0))}
                    for row in spend_series]
        status = {
            "work_hours": round(_f(tsig, "work_hours"), 1),
            "sessions": int(tsig.get("sessions", counts.get("sessions", 0))),
            "avg_session_min": round(_f(tsig, "avg_session_min"), 1),
            "velocity_trend": _str(tsig.get("velocity_trend"), "flat", limit=8),
            "recent_session_min": round(_f(tsig, "recent_session_min"), 1),
            "older_session_min": round(_f(tsig, "older_session_min"), 1),
            "messages": int(counts.get("messages", 0)),
            "clusters": int(counts.get("clusters", 0)),
            "activity": activity,
            "labels": {"status": LABELS["status"]},
        }

        stuck = _stuck_panel(by_kind)

        # Headline KPIs from the live rollups (spend summed from the series; context).
        spend = round(sum(_f(r, "cost_usd") for r in spend_series), 2)
        dev_names = {d["name"] for t in repeated["tasks"] for d in t["developers"]}
        kpis = {
            "repeated_procedures": int(rep_payload.get("n_procedures", repeated["n_procedures"])),
            "time_reclaimable_hours": round(_f(rep_payload, "total_time_saved_hours"), 1),
            "sessions": status["sessions"],
            "developers": len(dev_names),
            "monthly_spend_usd": spend,
        }

        embed_note = FAKE_EMBED_WARNING if not real_embed else (
            "Clusters are grouped on real semantic embeddings; the 2D positions are "
            "a readable layout, not the exact projection.")
        workspace = _str(env.get("REFORGE_ORG_NAME"), "Your team", limit=80)
        return _envelope(
            "live", real_embed, workspace=workspace,
            subtitle="Live capture from your re-forge workspace — safe aggregates only.",
            kpis=kpis, clusters=clusters, repeated=repeated, status=status,
            stuck=stuck, deadlines=_deadlines_panel(), embed_note=embed_note,
        )
    except Exception as exc:  # unreachable DB, driver missing, schema drift, …
        print(f"[build-dashboard-data] live: {type(exc).__name__}: {exc} — falling back to sample.")
        return None


# --------------------------------------------------------------------------- #
# Allowlist gate — defence-in-depth. The payload is BUILT from a fixed schema, so
# this can only fail if a label/aggregate smuggled a secret-shaped string. On a
# hit we refuse to emit (fail-closed) rather than risk a leak.
# --------------------------------------------------------------------------- #
_FORBIDDEN = [
    (re.compile(r"\b\w+://[^/\s:@]+:[^/\s@]+@"), "connection string with credentials"),
    (re.compile(r"postgres(?:ql)?://", re.I), "postgres connection string"),
    (re.compile(r"\b(?:mysql|mongodb(?:\+srv)?|redis|amqp)://", re.I), "db/broker connection string"),
    (re.compile(r"\bDATABASE_URL\b"), "DATABASE_URL"),
    (re.compile(r"REFORGE_MASTER_KEK|MASTER_KEK"), "master KEK reference"),
    (re.compile(r"\bsk-[A-Za-z0-9]{16,}"), "OpenAI-style secret key"),
    (re.compile(r"\brfk_[A-Za-z0-9]{8,}"), "re-forge device key"),
    (re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{12,}"), "AWS access key id"),
    (re.compile(r"\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{10,}"), "GitHub token"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"), "private key block"),
    (re.compile(r"[A-Za-z0-9+/]{43}="), "base64-encoded 32-byte key"),
    (re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}"), "email address"),
    (re.compile(r"eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\."), "JWT"),
]
# Keys whose VALUES are allowed to look list-y but must still be scanned.
_MAX_STRING = 400


class SafetyError(RuntimeError):
    pass


def _walk_strings(obj, path="$"):
    if isinstance(obj, str):
        yield path, obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from _walk_strings(v, f"{path}.{k}")
    elif isinstance(obj, (list, tuple)):
        for i, v in enumerate(obj):
            yield from _walk_strings(v, f"{path}[{i}]")


def _assert_safe(payload: dict) -> None:
    """Raise :class:`SafetyError` if any string in the payload matches a secret /
    PII / connection-string pattern, or is suspiciously long (a label is short by
    construction). This is the strict allowlist's last line of defence."""
    for path, s in _walk_strings(payload):
        if len(s) > _MAX_STRING:
            raise SafetyError(f"oversized string at {path} ({len(s)} chars) — possible raw content")
        for rx, why in _FORBIDDEN:
            if rx.search(s):
                raise SafetyError(f"forbidden content ({why}) at {path}")


# --------------------------------------------------------------------------- #
def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Build showcase/public/dashboard-data.json")
    ap.add_argument("--live", action="store_true",
                    help="attempt real data via ~/.reforge/db.env; fall back to sample on any failure")
    ap.add_argument("-o", "--out", default=str(DEFAULT_OUT), help="output path")
    args = ap.parse_args(argv)

    want_live = args.live or os.environ.get("REFORGE_DASHBOARD_LIVE", "").strip().lower() in ("1", "true", "yes", "on")

    payload = None
    if want_live:
        payload = build_live()
    if payload is None:
        if want_live:
            print("[build-dashboard-data] => emitting SAMPLE (source=sample).")
        payload = build_sample()
    else:
        print("[build-dashboard-data] => emitting LIVE (source=live), safe aggregates only.")

    # Fail-closed safety gate. If live data trips it (it shouldn't — we only ever
    # carry labels/aggregates), drop to the sample rather than risk a leak.
    try:
        _assert_safe(payload)
    except SafetyError as exc:
        print(f"[build-dashboard-data] SAFETY: {exc} — emitting sample instead.")
        payload = build_sample()
        _assert_safe(payload)   # the sample is hand-controlled; must pass

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    rep = payload["repeated"]
    print(
        f"[build-dashboard-data] wrote {out}  "
        f"(source={payload['source']}, clusters={len(payload['clusters'])}, "
        f"tasks={len(rep['tasks'])}/{rep['n_procedures']}, "
        f"reclaim={rep['total_time_saved_hours']}h, stuck={payload['stuck']['count']}, "
        f"deadlines={len(payload['deadlines']['items'])})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
