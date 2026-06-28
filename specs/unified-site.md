# Unified site spec — hero + dashboard, one Vite build, GitHub Pages

One static site on the apex custom domain **re-forge.theadaply.com**, served from the
`showcase/` Vite app's `gh-pages` branch. Free, no server, no cold starts. Two parts,
one build:

1. **HERO** — `/` — the existing landing page (`showcase/src/App.jsx`). Unchanged
   content + style; we only add a `Dashboard` link to the nav.
2. **DASHBOARD** — `/dashboard/` — what a customer sees of their team's work. Five
   panels, investor-grade, on-brand with the hero. Renders a static
   `public/dashboard-data.json` (safe aggregates only).

The hero and the dashboard already share **one brand**: identical fonts (Instrument
Serif / Inter Tight / JetBrains Mono) and palette (`--primary #4F46E5`,
`--primary-bright #6D5DFC`, `--accent #F2A93B`, `--win #1B8F55/#35D07F`, paper
`#F7F8FA`, ink `#14161D`). `showcase/src/styles/tokens.css` and the dashboard's
`reforge.css` define the same tokens, so the two surfaces match with zero re-skinning.

## Routing (GitHub Pages, `base: '/'`)

**Decision: multi-page Vite build (two real HTML entry points).** Not an SPA route.
On Pages, `/dashboard/` then resolves to a real `dashboard/index.html` file — deep-links
and refreshes work with **no `404.html` redirect hack and no router**.

- `vite.config.js`: keep `base` unset (= `/`, correct for the apex domain) and add a
  second rollup input:

  ```js
  import { defineConfig } from "vite";
  import react from "@vitejs/plugin-react";
  import { resolve } from "node:path";

  export default defineConfig({
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),               // hero (React)
          dashboard: resolve(__dirname, "dashboard/index.html"), // dashboard (vanilla)
        },
      },
    },
  });
  ```

- New entry `showcase/dashboard/index.html` → builds to `dist/dashboard/index.html`,
  served at `/dashboard/`. It is **plain HTML + a module script** (no React): it ports
  the existing `demo.html` markup verbatim, so it stays light and reuses the proven
  viz. Its `<script type="module" src="./dashboard.js">` does `import "../src/dashboard/reforge.css"`
  so Vite bundles + hashes the CSS into the build graph.
- Data: `showcase/public/dashboard-data.json` → copied to `dist/dashboard-data.json`,
  fetched by the page as `/dashboard-data.json` (absolute, base `/`).
- Belt-and-suspenders: add `showcase/public/404.html` (a copy of the hero `index.html`)
  so any unknown deep path still lands on-brand. Not load-bearing for `/dashboard/`.
- Nav link in `showcase/src/components/Nav.jsx` → `<a href="/dashboard/">Dashboard</a>`
  inside `.nav-links` (inherits the existing `.nav-links a` underline style). The
  dashboard masthead's brand link points back to `/`.

> Zero-config fallback (if the build step wants minimum risk): drop the whole page at
> `showcase/public/dashboard/index.html` (+ `public/reforge.css`) instead of a rollup
> input. Same `/dashboard/` URL, no `vite.config.js` change; assets are passthrough,
> not hashed. The MPA input above is preferred for an investor-grade build.

## Dashboard layout (single page, five panels in order)

Reuses the dashboard design system (`reforge.css`) verbatim: sticky `.masthead`,
`.wrap` container, `.pagehead` + `.eyebrow`, `.kpis`/`.kpi` strip, dark signature
`.panel`, `.card.pad`, `.lever`, `.pill`, `.foot`. Page-local `<style>` (cluster map,
proc cards, etc.) is lifted from `demo.html`.

1. **Masthead + sample badge.** `.masthead` (brand → `/`, anchor nav to the five
   sections). When `source === "sample"`, render the amber `.sample-bar` with
   `data.notice` ("Sample data — request a live demo") + a "Request a live demo" CTA.
   Honest by construction — a screenshot can never omit it.
2. **KPI strip** (`.kpis`) — repeated procedures, time reclaimable (`up to … h`,
   upper bound), sessions, developers. From `data.kpis`.
3. **(a) CLUSTERS** — the t-SNE repeated-procedures map. Dark `.panel` + SVG scatter
   (`clusterMap()` from `demo.html`) + legend. If `embeddings_real === false`, render
   the hash-embedding warning banner above it — never present hash groupings as
   semantic (embed-gate R-001/R-004).
4. **(b) REPEATED TASKS** — `.card.pad` with the `.clu` procedure cards from
   `demo.html`: intent · steps (`.proc`/`.step`) · domain + dev pills · `done N×
   across M sessions · ~avg min` · `the fix` · `time back if automated`. From
   `data.repeated`.
5. **(c) WORK STATUS** — dark `.panel` hero number (work hours, sessions, avg session,
   velocity trend) + the `sparkline()` activity series from `overview.html`, plus a
   `.kpis` row (velocity Faster/Steady/Slower, sessions, clusters). From `data.status`.
6. **(d) STUCK** — `.card.pad` list (the `.anom`/`.lever` pattern) of retry-spirals /
   wasteful runs / unusual sessions, **keyed by session/repo, never a person** — framed
   "support, not surveillance" via `data.stuck.label`. From `data.stuck`.
7. **(e) DEADLINES** — `.card.pad` list of upcoming dates with a status pill
   (`on_track` / `due_soon` / `at_risk` / `overdue` / `shipped`), keyed by repo/surface.
   From `data.deadlines`.
8. **Footer CTA** — the demo's closing "request a live demo" card + honesty footnote.

## `dashboard-data.json` contract (safe aggregates ONLY)

Never raw prompt content, PII, API keys, or `DATABASE_URL`. Shapes mirror the existing
FastAPI composers so a `live` file can be emitted by the same producers.

```jsonc
{
  "source": "sample",                 // REQUIRED "live" | "sample" — drives the badge
  "generated_at": "2026-06-28T00:00:00Z",
  "workspace": "tasklib · sample team",
  "subtitle": "A 30-day sample capture across 6 developers …",
  "embeddings_real": false,           // clusters on real semantic vectors? false ⇒ warn
  "notice": "Sample data — request a live demo",

  "kpis": {                           // demo.compose_demo.kpis
    "repeated_procedures": 48,
    "time_reclaimable_hours": 31.0,   // do-it-once UPPER BOUND
    "sessions": 274, "developers": 6,
    "monthly_spend_usd": 4120.0       // context, optional, never called a saving
  },

  // (a) CLUSTERS — demo._clusters: centroid + size + precomputed scatter points
  "clusters": [
    { "id": "ci", "label": "Re-run flaky CI until green", "color": "#6D5DFC",
      "size": 14, "centroid": [0.18, 0.30],
      "points": [[0.18,0.30],[0.21,0.27], "… x,y in [0,1] …"] }
  ],

  // (b) REPEATED TASKS — repeated.compose_repeated / demo._procedure
  "repeated": {
    "total_time_saved_min": 711.0, "total_time_saved_hours": 11.9,
    "n_procedures": 48, "total_tokens_saved": 476000, "total_repeats": 52,
    "tasks": [
      { "id": "…dedup_key…", "intent": "Stand up a new dashboard page",
        "domain": "dashboard",
        "steps": ["add module","write compose()","expose install(app)","ship html"],
        "frequency": 5, "n_sessions": 5,
        "developers": [{"name":"akash","count":3},{"name":"shine","count":2}],
        "avg_minutes": 26.0,          // MEASURED
        "time_saved_min": 104,        // (frequency-1) × avg_minutes — UPPER BOUND
        "tokens_saved": 96000,
        "skill_sketch": "skill: dashboard-page-scaffold" }
    ],
    "tasks_truncated": 40
  },

  // (c) WORK STATUS — overview._time_signal + _spend_series(as activity) + _corpus_counts
  "status": {
    "work_hours": 142.0, "sessions": 274, "avg_session_min": 31.1,
    "velocity_trend": "down",         // down = faster | up = slower | flat
    "recent_session_min": 24.0, "older_session_min": 33.0,
    "messages": 8120, "clusters": 12,
    "activity": [ {"day":"2026-05-30","sessions":7,"runs":41} ]  // sparkline series
  },

  // (d) STUCK — roi._stuck. Keyed by session/repo, NEVER a person. Support framing.
  "stuck": {
    "count": 5, "spirals": 2, "waste": 2, "anomalies": 1,
    "items": [
      { "signal": "retry_spiral",     // retry_spiral | waste | anomaly
        "kind": "error_retry",
        "title": "CI job retried 9× without a green run",
        "where": "tasklib · session a1f3c9", "repo": "tasklib",
        "minutes": 38,                // affected wall-clock (optional)
        "z": null }                   // outlier score for anomalies
    ],
    "label": "Where work is stuck — flagged for review (keyed by session/repo, never a person). Support, not surveillance."
  },

  // (e) DEADLINES — NEW panel, no live producer yet ⇒ sample-only. Surfaces, not people.
  "deadlines": {
    "items": [
      { "label": "Ship deadlines feature in tasklib", "date": "2026-07-03",
        "status": "at_risk",          // on_track | due_soon | at_risk | overdue | shipped
        "repo": "tasklib", "note": "2 contested surfaces open" }
    ],
    "label": "Upcoming delivery dates from tracked work — surfaces/repos only, never individuals."
  }
}
```

### Honesty rules (load-bearing, investor-facing)

- `source: "sample"` ⇒ render the `.sample-bar` badge + `notice`; never present as live.
- `embeddings_real: false` ⇒ hash/sample grouping; show the warning above CLUSTERS and
  never label them "semantic" (embed-gate R-001..R-007).
- Time/tokens reclaimable are **upper bounds** ("do it once, not N times"); `avg_minutes`
  is measured and shown apart. Spend is **context**, never a saving.
- STUCK is **for review**, keyed by session/repo, never a person — support, not surveillance.
- No raw prompt content, PII, keys, or DB URLs ever enter this file.

## Files to reuse (read these; copy/adapt, don't reinvent)

| Purpose | Source (absolute) |
| --- | --- |
| Dashboard design system (vendor into `showcase/src/dashboard/reforge.css`) | `/Users/cero/Code/reforge-features/services/dashboard/static/reforge.css` |
| Page markup + JS render (clusterMap, proc cards, kpi, hrs/tokK, sample-bar) | `/Users/cero/Code/reforge-features/services/dashboard/static/demo.html` |
| Sample data shape (clusters centroids, procedures) → seed `dashboard-data.json` | `/Users/cero/Code/reforge-features/services/dashboard/static/demo-seed.json` |
| Cluster + procedure compose logic (point jitter, honest clamps) | `/Users/cero/Code/reforge-features/services/dashboard/app/demo.py`, `app/repeated.py` |
| WORK STATUS markup: `sparkline()`, velocity KPIs, dark `.panel` hero | `/Users/cero/Code/reforge-features/services/dashboard/static/overview.html` |
| WORK STATUS data shape (`_time_signal`, `_spend_series`, `_corpus_counts`) | `/Users/cero/Code/reforge-features/services/dashboard/app/overview.py` |
| STUCK data shape + honest label (`_stuck`) | `/Users/cero/Code/reforge-features/services/dashboard/app/roi.py` |
| `.anom` list styling for STUCK / DEADLINES rows | `/Users/cero/Code/reforge-features/services/dashboard/static/reforge.css` |
| Hero nav (add `Dashboard` link) | `/Users/cero/Code/re-forge-pub/showcase/src/components/Nav.jsx` |
| Hero brand tokens (already match the dashboard) | `/Users/cero/Code/re-forge-pub/showcase/src/styles/tokens.css` |

## Build / deploy notes

- `cd showcase && npm run build` must stay green (CI `showcase` job runs `npm run lint`
  then `npm run build`). Vanilla dashboard HTML/JS isn't ESLinted, so no lint risk.
- Output: `dist/index.html` (hero), `dist/dashboard/index.html` (dashboard),
  `dist/dashboard-data.json`, hashed assets — all served from the apex root.
- Do not commit/push here; a later step deploys the `gh-pages` branch.
