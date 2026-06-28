/* re-forge customer dashboard — vanilla render module (no React).
 *
 * Ported from the FastAPI dashboard's demo.html / overview.html render functions
 * so the customer-facing view reuses the proven cluster map + procedure cards,
 * and extended with WORK STATUS, STUCK and DEADLINES. It fetches the static
 * /dashboard-data.json (safe aggregates only) and renders five panels.
 *
 * Honesty is load-bearing: the sample badge ships visible by default and is only
 * removed when a source:"live" file loads; clusters grouped on hash embeddings
 * (embeddings_real === false) carry a warning and are never labelled semantic.
 */
import "../src/dashboard/reforge.css";
import "../src/dashboard/dashboard.css";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const num = (n) => (+n || 0).toLocaleString("en-US");
const usd = (n) => "$" + (+n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
// Prefer an authoritative string from the data file (honesty copy the producer
// controls) and fall back to a built-in default when absent.
const pick = (v, fb) => (typeof v === "string" && v ? v : fb);

function hrs(min) {
  min = +min || 0;
  if (min <= 0) return "0m";
  if (min < 60) return Math.round(min) + "m";
  const h = min / 60;
  return (h >= 100 ? Math.round(h) : (Math.round(h * 10) / 10).toString().replace(/\.0$/, "")) + "h";
}
function tokK(n) {
  n = +n || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
  return n >= 1000 ? (n / 1000).toFixed(0) + "k" : String(Math.round(n));
}
function fmtDate(iso) {
  const t = Date.parse(iso);
  if (isNaN(t)) return esc(iso);
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
function daysFrom(nowIso, iso) {
  const a = Date.parse(nowIso), b = Date.parse(iso);
  if (isNaN(a) || isNaN(b)) return "";
  const d = Math.round((b - a) / 86400000);
  if (d === 0) return " · today";
  return d > 0 ? " · in " + d + "d" : " · " + -d + "d ago";
}

function kpi(lab, val, sub, green) {
  return `<div class="kpi"><div class="lab">${lab}</div><div class="val${green ? " green" : ""}">${val}</div><div class="sub">${sub}</div></div>`;
}

/* ---- (a) CLUSTERS — SVG t-SNE scatter (ported from demo.html) -------------- */
// Deterministic two offsets in [-1,1] from a string seed — a sync stand-in for
// the producer's SHA-256 jitter, used only when a cluster ships a centroid+size
// but no precomputed points (e.g. the bare seed). A live file carries points.
function jitter2(seed) {
  let h = 2166136261 >>> 0;
  for (let k = 0; k < seed.length; k++) {
    h ^= seed.charCodeAt(k);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return [(h & 0xffff) / 32767.5 - 1, ((h >>> 16) & 0xffff) / 32767.5 - 1];
}
function clusterPoints(c) {
  const clamp = (v) => Math.min(1, Math.max(0, +v || 0));
  if (Array.isArray(c.points) && c.points.length) {
    return c.points.filter((p) => Array.isArray(p) && p.length >= 2).map((p) => [clamp(p[0]), clamp(p[1])]);
  }
  const ce = c.centroid;
  if (!(Array.isArray(ce) && ce.length >= 2)) return [];
  const cx = clamp(ce[0]), cy = clamp(ce[1]);
  const n = Math.max(3, Math.min(+c.size || 0, 40));
  const cid = String(c.id || "c"), pts = [[cx, cy]];
  for (let i = 0; i < n - 1; i++) {
    const [dx, dy] = jitter2(cid + ":" + i);
    pts.push([clamp(cx + dx * 0.045), clamp(cy + dy * 0.045)]);
  }
  return pts;
}
function clusterMap(clusters) {
  if (!clusters.length) return `<p class="sub">No clusters in this capture yet.</p>`;
  const S = 100, parts = [], legend = [];
  clusters.forEach((c) => {
    const col = c.color || "#6D5DFC";
    const points = clusterPoints(c);
    let sx = 0, sy = 0, k = 0;
    points.forEach((p) => {
      const x = p[0] * S, y = (1 - p[1]) * S; // flip y: up = positive
      sx += x; sy += y; k++;
      parts.push(`<circle class="dot" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.5" fill="${col}" fill-opacity="0.85"/>`);
    });
    if (k) {
      const lx = Math.min(S - 1, Math.max(1, sx / k)), ly = Math.min(S - 2, Math.max(3, sy / k - 3));
      parts.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" fill-opacity="0.92">${esc(c.label)}</text>`);
    }
    legend.push(`<div class="row"><span class="sw" style="background:${col}"></span>${esc(c.label)}<span class="n">${num(c.size)}×</span></div>`);
  });
  return `
  <div class="map-wrap">
    <svg class="map-svg" viewBox="0 0 ${S} ${(S * 0.72).toFixed(0)}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="t-SNE cluster map of repeated procedures">
      ${parts.join("")}
    </svg>
    <div class="legend">${legend.join("")}</div>
  </div>`;
}

/* ---- (b) REPEATED TASKS — procedure cards (ported from demo.html) ---------- */
function procRow(steps) {
  if (!Array.isArray(steps) || !steps.length) return "";
  return `<div class="proc">${steps
    .slice(0, 8)
    .map((s, i) => `${i ? '<span class="arrow">→</span>' : ""}<span class="step">${esc(String(s).slice(0, 40))}</span>`)
    .join("")}</div>`;
}
function devPills(devs) {
  return (devs || []).map((d) => `<span class="pill dev">${esc(d.name)}×${num(d.count)}</span>`).join("");
}

/* ---- (c) WORK STATUS — activity sparkline (ported from overview.html) ------ */
function sparkline(values, color) {
  const v = (values || []).map((n) => +n || 0);
  if (v.length < 2) return "";
  const W = 168, H = 46;
  const mx = Math.max(...v, 1), mn = Math.min(...v, 0), sp = mx - mn || 1;
  const pts = v.map((y, i) => [(i / (v.length - 1)) * W, H - 3 - ((y - mn) / sp) * (H - 6)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const last = pts[pts.length - 1];
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;margin-left:auto" role="img" aria-label="activity trend">
    <path d="${d} L${W} ${H} L0 ${H} Z" fill="${color}" opacity=".16"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.8" fill="${color}"/>
  </svg>`;
}

/* ---- honesty badge: sample watermark + masthead state pill ---------------- */
function renderBadge(d) {
  const live = d.source === "live";
  const pill = $("srcPill");
  if (pill) {
    pill.className = "src-pill " + (live ? "live" : "sample");
    pill.textContent = live ? "Live · " + (d.workspace || "your team") : "Sample · no login";
  }
  const bar = $("sampleBar");
  if (bar) {
    if (live) bar.remove();
    else {
      const txt = bar.querySelector(".txt");
      if (txt && d.notice) txt.textContent = d.notice;
    }
  }
  const ws = $("wsLabel");
  if (ws) ws.textContent = d.workspace || (live ? "Live workspace" : "Sample workspace");
  const sub = $("subtitle");
  if (sub && d.subtitle) sub.textContent = d.subtitle;
}

const MAIL = "mailto:hello@re-forge.dev?subject=re-forge%20live%20demo";
const STUCK_TXT = { retry_spiral: "retry spiral", waste: "wasteful run", anomaly: "unusual session" };
const STUCK_SEV = { retry_spiral: "spiral", waste: "waste", anomaly: "anomaly" };
const DL_TXT = { on_track: "on track", due_soon: "due soon", at_risk: "at risk", overdue: "overdue", shipped: "shipped" };

function clustersPanel(d) {
  const clusters = d.clusters || [];
  const warn =
    d.embeddings_real === false
      ? `<div class="warn-embed"><span class="k">Heads up</span><span>${esc(pick(d.embeddings_note, "These groupings use hash-based placeholder embeddings, not real semantic vectors — an illustrative layout, not a semantic projection. A live capture clusters on your real embeddings."))}</span></div>`
      : "";
  const sub = pick(
    d.cluster_labels && d.cluster_labels.clusters,
    "Each dot is one captured sub-task; colour groups the procedures that recur across sessions and developers.",
  );
  return `
  <section class="block rise" id="clusters">
    <div class="eyebrow line">Clusters · what the team keeps doing</div>
    ${warn}
    <div class="panel">
      <div class="panel-in">
        <div class="panel-bar"><span class="tl r"></span><span class="tl y"></span><span class="tl g"></span><span class="lbl">CLUSTER MAP · ${esc(String(d.workspace || "workspace").toUpperCase())}</span></div>
        <div class="lab" style="margin-bottom:4px">Repeated procedures — every sub-task, grouped</div>
        <p class="sub" style="margin:0 0 20px;max-width:62ch">${esc(sub)}</p>
        ${clusterMap(clusters)}
      </div>
    </div>
  </section>`;
}

function repeatedPanel(d) {
  const r = d.repeated || {};
  const tasks = r.tasks || [];
  const cards = tasks.length
    ? tasks
        .map(
          (c, i) => `
        <div class="clu">
          <div class="top">
            <div>
              <div class="rank">#${i + 1}${c.domain ? " · " + esc(c.domain) : ""}</div>
              <div class="intent">${esc(c.intent)}</div>
            </div>
            <div class="saved">${hrs(c.time_saved_min)}<small>back if automated</small></div>
          </div>
          ${procRow(c.steps)}
          <div class="pills" style="margin-top:10px">
            ${c.domain ? `<span class="pill dom">${esc(c.domain)}</span>` : ""}
            ${devPills(c.developers)}
          </div>
          <div class="freq">done <b>${num(c.frequency)}×</b> across <b>${num(c.n_sessions)}</b> sessions${c.avg_minutes > 0 ? ` · ~${c.avg_minutes} min each` : ""}</div>
          ${c.skill_sketch ? `<div class="fix"><b>the fix</b><code>${esc(c.skill_sketch)}</code></div>` : ""}
        </div>`,
        )
        .join("")
    : `<p class="muted">No repeated procedures in this capture yet.</p>`;
  const rollup = [
    r.total_time_saved_hours != null ? `<b>up to ${r.total_time_saved_hours}h</b> reclaimable` : "",
    r.total_repeats != null ? `${num(r.total_repeats)} repeats over ${num(r.n_procedures)} procedures` : "",
    r.total_tokens_saved ? `~${tokK(r.total_tokens_saved)} tokens` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return `
  <section class="block rise" id="repeated">
    <div class="eyebrow line">Repeated tasks · ranked by reclaimable time</div>
    <div class="card pad">
      ${cards}
      ${r.tasks_truncated ? `<div class="more">+${num(r.tasks_truncated)} more repeated procedures in the full capture</div>` : ""}
    </div>
    <p class="foot">${rollup ? rollup + ". " : ""}Reclaimable time is the <em>repeats</em>, not the first honest run — <b>(frequency − 1) × measured average</b>, an upper bound on what automating the procedure once removes. The measured average is shown apart.</p>
  </section>`;
}

function statusPanel(d) {
  const s = d.status || {};
  const trend = s.velocity_trend;
  const vel = trend === "down" ? "↓ getting faster" : trend === "up" ? "↑ getting slower" : "→ holding steady";
  const velKpi = trend === "down" ? "Faster" : trend === "up" ? "Slower" : "Steady";
  const series = (s.activity || []).map((a) => +a.runs || +a.sessions || 0);
  const days = (s.activity || []).length;
  return `
  <section class="block rise" id="status">
    <div class="eyebrow line">Work status · time &amp; velocity</div>
    <div class="panel">
      <div class="panel-in">
        <div class="panel-bar"><span class="tl r"></span><span class="tl y"></span><span class="tl g"></span><span class="lbl">WORK STATUS</span></div>
        <div class="status-head">
          <div>
            <div class="lab">Time with agents${days ? " · last " + days + " days" : ""}</div>
            <div class="big">${num(s.work_hours)}<span style="font-family:var(--font-ui);font-size:.3em;font-weight:500;color:var(--panel-muted);margin-left:.22em">hrs</span></div>
            <div class="sub">${num(s.sessions)} sessions · ~${num(s.avg_session_min)} min each · <b>${vel}</b></div>
          </div>
          <div class="status-spark">
            ${sparkline(series, "#35D07F")}
            <div class="sub" style="margin-top:8px">daily activity</div>
          </div>
        </div>
        <div class="status-foot">
          <span><b>${velKpi}</b> — median session ${num(s.older_session_min)}→${num(s.recent_session_min)} min</span>
          <span style="flex:1"></span>
          <span>${num(s.messages)} messages · ${num(s.clusters)} clusters</span>
        </div>
      </div>
    </div>
    <div class="kpis" style="margin-top:16px">
      ${kpi("Velocity", velKpi, "median session " + num(s.older_session_min) + "→" + num(s.recent_session_min) + " min", trend === "down")}
      ${kpi("Sessions", num(s.sessions), "~" + num(s.avg_session_min) + " min each")}
      ${kpi("Task clusters", num(s.clusters), "recurring work grouped")}
      ${kpi("Messages", num(s.messages), "captured across tools")}
    </div>
  </section>`;
}

function stuckPanel(d) {
  const st = d.stuck || {};
  const items = st.items || [];
  const summary = [
    st.spirals ? `${num(st.spirals)} retry spirals` : "",
    st.waste ? `${num(st.waste)} wasteful runs` : "",
    st.anomalies ? `${num(st.anomalies)} unusual sessions` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const rows = items.length
    ? items
        .map((it) => {
          const sev = STUCK_SEV[it.signal] || "anomaly";
          const tag = STUCK_TXT[it.signal] || "review";
          const right =
            it.minutes != null && +it.minutes > 0
              ? `<span class="mins">~${hrs(it.minutes)}</span>`
              : it.z != null
                ? `<span class="mins">z ${esc(it.z)}</span>`
                : "";
          const where = it.where || it.repo || "";
          return `<div class="anom">
            <span class="sev ${sev}"></span>
            <div class="body">
              <div class="title">${esc(it.title)} <span class="pill ${sev}">${tag}</span></div>
              ${where ? `<div class="where">${esc(where)}</div>` : ""}
            </div>
            ${right}
          </div>`;
        })
        .join("")
    : `<p class="muted">Nothing flagged for review — no retry spirals or stuck sessions in this capture.</p>`;
  return `
  <section class="block rise" id="stuck">
    <div class="eyebrow line">Stuck · flagged for review, not surveillance</div>
    <div class="card pad">
      ${summary ? `<p class="sub" style="margin:0 0 14px;color:var(--ink-soft)">${summary}.</p>` : ""}
      <div class="anoms">${rows}</div>
      <p class="foot">${esc(st.label || "Where work is stuck — flagged for review (keyed by session/repo, never a person). Support, not surveillance.")}</p>
    </div>
  </section>`;
}

function deadlinesPanel(d) {
  const dl = d.deadlines || {};
  const items = dl.items || [];
  const rows = items.length
    ? items
        .map((it) => {
          const status = it.status || "on_track";
          const tag = DL_TXT[status] || status;
          const rel = daysFrom(d.generated_at, it.date);
          const where = [it.repo, it.note].filter(Boolean).map(esc).join(" · ");
          return `<div class="anom">
            <span class="sev ${esc(status)}"></span>
            <div class="body">
              <div class="title">${esc(it.label)} <span class="pill ${esc(status)}">${tag}</span></div>
              ${where ? `<div class="where">${where}</div>` : ""}
            </div>
            <span class="mins">${fmtDate(it.date)}${rel}</span>
          </div>`;
        })
        .join("")
    : `<p class="muted">No tracked delivery dates yet.</p>`;
  return `
  <section class="block rise" id="deadlines">
    <div class="eyebrow line">Deadlines · upcoming delivery dates</div>
    <div class="card pad">
      <div class="anoms">${rows}</div>
      <p class="foot">${esc(dl.label || "Upcoming delivery dates from tracked work — surfaces/repos only, never individuals.")}</p>
    </div>
  </section>`;
}

function kpiStrip(d) {
  const k = d.kpis || {};
  const spend = k.monthly_spend_usd ? kpi("Spend / month", usd(k.monthly_spend_usd), "context · never a saving") : "";
  return `
  <div class="kpis rise d1">
    ${kpi("Repeated procedures", num(k.repeated_procedures), "distinct things the team does over &amp; over")}
    ${kpi("Time reclaimable", "up to " + (k.time_reclaimable_hours || 0) + "h", "if automated once · <span class='pos'>upper bound</span>", true)}
    ${kpi("Sessions captured", num(k.sessions), num(k.developers) + " developers")}
    ${spend}
  </div>`;
}

function closingCard(d) {
  const live = d.source === "live";
  return `
  <div class="card pad rise cta-card">
    <div class="eyebrow" style="justify-content:center">${live ? "Live workspace" : "★ Sample data — request a live demo"}</div>
    <h2>${live ? "This is your team, captured." : "This is a sample. Yours fills in from your own team."}</h2>
    <p class="muted" style="max-width:62ch;margin:0 auto 18px">Point re-forge at your team for an hour and this dashboard fills with your real procedures, your real activity, and live collision warnings — open-core, $30/seat, land-free-expand-to-team.</p>
    <a class="cta-btn" href="${MAIL}">Request a live demo</a>
  </div>
  <p class="foot" style="margin-top:40px;border-top:1px solid var(--line);padding-top:22px">${esc(pick(d.footnote, "Safe aggregates only — cluster labels, counts, minutes and dates. No raw prompt content, PII, API keys or database URLs ever enter this file."))} The live product is tenant-isolated by Postgres RLS; you only ever see your own org.</p>`;
}

function render(d) {
  renderBadge(d);
  $("content").innerHTML = [
    kpiStrip(d),
    clustersPanel(d),
    repeatedPanel(d),
    statusPanel(d),
    stuckPanel(d),
    deadlinesPanel(d),
    closingCard(d),
  ].join("");
}

async function load() {
  try {
    const r = await fetch("/dashboard-data.json", { cache: "no-cache" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    render(await r.json());
  } catch (e) {
    // The sample badge stays visible (honest by default). Show a branded notice.
    $("content").innerHTML = `<div class="connect"><h2>Dashboard</h2>
      <p>Couldn't load the workspace data (${esc(e.message)}). This is a baked-in sample surface —
      <a href="${MAIL}">request a live demo</a> and we'll point it at your team.</p></div>`;
  }
}
load();
