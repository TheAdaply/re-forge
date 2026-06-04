import { useEffect, useReducer, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import "../styles/agent-duel.css";

/*
 * AgentDuel — an animated, self-explanatory split-stage simulation.
 *
 * Left  = one lone agent grinding alone (types monotone code, ships a bug
 *         it never noticed).
 * Right = re-forge's coordinated teams (convene, flow work through a
 *         security gate that intercepts + fixes a classic flaw, ship with
 *         evidence).
 *
 * Same cinematic universe as Swarm.jsx: same node discs, mono label
 * typography, dark stage, subtitle/caption bar, progress segments, the
 * slow-mo + dim "kill" grammar.
 *
 * Honesty: no invented numbers. The bug label "refresh token never revoked"
 * is an illustrative classic flaw, not a measured result. The right half
 * mirrors the real research → engineering → security gate flow.
 *
 * Choreography (non-negotiable): exactly ONE focal action at any instant —
 * the inactive half dims to ~35%. Spawns stagger with overshoot-settle.
 * Edges draw in, never pop. Captions crossfade with their phase's first
 * motion.
 *
 * Perf: pure SVG transforms + opacity. prefers-reduced-motion renders one
 * static, fully-labeled end state (left ✗, right ✓).
 */

// ── Geometry ─────────────────────────────────────────────────────────────────
// Two cropped SVGs share one 800×460 user space: left column drawn around
// LX=200 (viewBox "0 0 400 460"), right column around RX=600 (viewBox
// "400 0 400 460"). Keeping one coordinate system lets both halves reuse the
// same atoms.
const LX = 200; // left column centre
const RX = 600; // right column centre

// Left: a single lone agent + a stack of code-line bars beneath it.
const LONE = { x: LX, y: 92 };
const CODE_TOP = 150; // first code bar y
const CODE_STEP = 22;
const CODE_W = 150;

// Right: the lead, three team clusters spawned one by one, a SPEC chip.
const LEAD = { x: RX, y: 92 };
const TEAMS = [
  {
    id: "research",
    label: "research",
    cx: RX - 96,
    cy: 196,
    dots: [
      [-12, -8],
      [12, -8],
      [0, 10],
    ],
  },
  {
    id: "engineering",
    label: "engineering",
    cx: RX,
    cy: 268,
    dots: [
      [-12, -6],
      [12, -6],
      [0, 12],
    ],
  },
  {
    id: "security",
    label: "security",
    cx: RX + 96,
    cy: 196,
    kind: "gate",
    dots: [
      [-10, 0],
      [10, 0],
    ],
  },
];
const RESEARCH = TEAMS[0];
const ENGINEERING = TEAMS[1];
const SECURITY = TEAMS[2];

const PHASES = [
  { id: "prompt", caption: "the same prompt lands on both desks", ms: 2600 },
  { id: "leftType", caption: "one agent starts typing", ms: 3000 },
  { id: "teams", caption: "re-forge convenes teams", ms: 3400 },
  { id: "gate", caption: "work flows through gates — security intercepts", ms: 3800 },
  { id: "ship", caption: "both ship", ms: 3000 },
  { id: "rest", caption: "both ship", ms: 600 },
];

const EASE = [0.22, 1, 0.36, 1];
const OVERSHOOT = [0.34, 1.46, 0.5, 1]; // overshoot-settle for spawns

function phaseReducer(index, action) {
  if (action === "reset") return 0;
  return (index + 1) % PHASES.length;
}

// ── Shared atoms ─────────────────────────────────────────────────────────────

function NodeDisc({ x, y, r = 22, kind = "lead", flare = false, label }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={r}
        className={`ad-node-disc ${kind === "adv" ? "is-adv" : ""} ${flare ? "is-flare" : ""}`}
      />
      {flare && (
        <g transform={`translate(${x} ${y})`}>
          <motion.circle
            cx={0}
            cy={0}
            r={r}
            className="ad-node-flare-ring"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.7, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
          />
        </g>
      )}
      {label && (
        <text x={x} y={y + r + 16} className="ad-node-label" textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  );
}

// Local prompt pill that descends into a single half (top-centre of that
// column). Used by both halves so the stage stacks cleanly on mobile while
// still reading as "the same prompt landed here".
function LocalPrompt({ cx, active, label }) {
  if (!active) return null;
  return (
    <motion.g
      initial={{ y: -54, opacity: 0 }}
      animate={{ y: 0, opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.6, ease: EASE, times: [0, 0.22, 0.62, 1] }}
    >
      <rect x={cx - 86} y={196} width={172} height={34} rx={17} className="ad-prompt-pill" />
      <text x={cx} y={218} textAnchor="middle" className="ad-prompt-text">
        {label}
      </text>
    </motion.g>
  );
}

// ── LEFT half: the lone agent ────────────────────────────────────────────────

// Code lines that stack up as the lone agent "types". One of them carries an
// embedded red bug glyph that the agent never reacts to.
function LeftStack({ typed, bugLine, bugVisible, bugFlare, failed }) {
  const lines = [0, 1, 2, 3, 4];
  return (
    <g>
      {lines.map((i) => {
        const w = CODE_W * [0.92, 0.7, 0.84, 0.55, 0.78][i];
        const y = CODE_TOP + i * CODE_STEP;
        const isBug = i === bugLine;
        return (
          <motion.g
            key={i}
            initial={false}
            animate={i < typed ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
            transition={{ duration: 0.42, ease: EASE }}
          >
            <rect
              x={LX - CODE_W / 2}
              y={y}
              width={w}
              height={9}
              rx={3}
              className={`ad-code-bar ${isBug && failed ? "is-bug-line" : ""}`}
            />
            {isBug && bugVisible && (
              <motion.g
                initial={{ opacity: 0, scale: 0.4 }}
                animate={
                  bugFlare
                    ? { opacity: 1, scale: [1, 1.5, 1.2] }
                    : { opacity: 1, scale: 1 }
                }
                transition={{ duration: bugFlare ? 0.9 : 0.5, ease: EASE }}
                style={{
                  originX: `${LX - CODE_W / 2 + w + 12}px`,
                  originY: `${y + 4.5}px`,
                }}
              >
                {bugFlare && (
                  <motion.circle
                    cx={LX - CODE_W / 2 + w + 12}
                    cy={y + 4.5}
                    r={8}
                    className="ad-bug-flare"
                    initial={{ scale: 0.8, opacity: 0.9 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
                    style={{
                      originX: `${LX - CODE_W / 2 + w + 12}px`,
                      originY: `${y + 4.5}px`,
                    }}
                  />
                )}
                <text
                  x={LX - CODE_W / 2 + w + 12}
                  y={y + 8}
                  textAnchor="middle"
                  className="ad-bug-glyph"
                >
                  🐞
                </text>
              </motion.g>
            )}
          </motion.g>
        );
      })}
    </g>
  );
}

function LeftHalf({ phaseId, dim }) {
  const showPrompt = phaseId === "prompt";
  const typing = phaseId === "leftType";
  // The lone agent keeps typing slowly through teams/gate too.
  const typed =
    phaseId === "prompt"
      ? 0
      : phaseId === "leftType"
      ? 3
      : phaseId === "teams"
      ? 4
      : 5;
  const bugVisible = phaseId !== "prompt";
  const failed = phaseId === "ship" || phaseId === "rest";
  const bugFlare = failed;

  return (
    <motion.g
      initial={false}
      animate={{ opacity: dim ? 0.35 : 1 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <LocalPrompt cx={LX} active={showPrompt} label="login + refresh" />

      <NodeDisc x={LONE.x} y={LONE.y} kind="lead" label="agent" />

      {/* soft typing pulse on the lone node while it works */}
      {typing && (
        <motion.circle
          cx={LONE.x}
          cy={LONE.y}
          r={22}
          className="ad-type-pulse"
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
          style={{ originX: `${LONE.x}px`, originY: `${LONE.y}px` }}
        />
      )}

      {/* blinking caret at the typing frontier */}
      {typing && (
        <motion.rect
          x={LX - CODE_W / 2 - 9}
          y={CODE_TOP + Math.min(typed, 4) * CODE_STEP}
          width={5}
          height={9}
          rx={1}
          className="ad-caret"
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
      )}

      <LeftStack
        typed={typed}
        bugLine={2}
        bugVisible={bugVisible}
        bugFlare={bugFlare}
        failed={failed}
      />

      {/* SHIP outcome: a red ✗ badge on the output */}
      <AnimatePresence>
        {failed && (
          <motion.g
            key="left-fail"
            initial={{ opacity: 0, scale: 0.5, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: OVERSHOOT }}
            style={{ originX: `${LX}px`, originY: "300px" }}
          >
            <rect x={LX - 70} y={296} width={140} height={30} rx={8} className="ad-badge-fail" />
            <text x={LX - 50} y={315} textAnchor="middle" className="ad-badge-x">
              ✗
            </text>
            <text x={LX + 8} y={315} textAnchor="middle" className="ad-badge-fail-text">
              shipped the bug
            </text>
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  );
}

// ── RIGHT half: re-forge's teams ─────────────────────────────────────────────

function TeamCluster({ team, visible, flare }) {
  const isGate = team.kind === "gate";
  return (
    <motion.g
      initial={false}
      animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.2 }}
      transition={{ duration: 0.55, ease: visible ? OVERSHOOT : EASE }}
      style={{ originX: `${team.cx}px`, originY: `${team.cy}px` }}
    >
      {/* cluster halo */}
      <circle
        cx={team.cx}
        cy={team.cy}
        r={26}
        className={`ad-cluster-halo ${isGate ? "is-gate" : ""} ${flare ? "is-flare" : ""}`}
      />
      {flare && (
        <g transform={`translate(${team.cx} ${team.cy})`}>
          <motion.circle
            cx={0}
            cy={0}
            r={26}
            className="ad-node-flare-ring"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
          />
        </g>
      )}
      {team.dots.map(([dx, dy], i) => (
        <circle
          key={i}
          cx={team.cx + dx}
          cy={team.cy + dy}
          r={5}
          className={`ad-team-dot ${isGate ? "is-gate" : ""}`}
        />
      ))}
      <text x={team.cx} y={team.cy + 40} textAnchor="middle" className="ad-team-label">
        {team.label}
      </text>
    </motion.g>
  );
}

// Spawn edge from lead to a team, drawn in.
function SpawnEdge({ team, visible }) {
  return (
    <motion.line
      x1={LEAD.x}
      y1={LEAD.y}
      x2={team.cx}
      y2={team.cy}
      className={`ad-edge ${team.kind === "gate" ? "is-gate" : ""}`}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={visible ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
    />
  );
}

// The artifact card that flows research → engineering → (gate bounce) → pass.
function ArtifactFlow() {
  // stage drives a keyframed position + colour. Single card, one focal motion.
  // path: research -> engineering -> gate(red intercept) -> back to eng(fix) ->
  // gate(pass, green).
  const R = RESEARCH;
  const E = ENGINEERING;
  const G = SECURITY;

  return (
    <g>
      <motion.g
        initial={{ x: R.cx, y: R.cy, opacity: 0 }}
        animate={{
          x: [R.cx, E.cx, G.cx, E.cx, G.cx, G.cx + 40],
          y: [R.cy, E.cy, G.cy, E.cy, G.cy, G.cy - 26],
          opacity: [0, 1, 1, 1, 1, 1],
        }}
        transition={{
          duration: 3.4,
          ease: EASE,
          times: [0, 0.16, 0.4, 0.62, 0.84, 1],
        }}
      >
        {/* card flips green after the fix (≈62% of the timeline) */}
        <motion.rect
          x={-16}
          y={-11}
          width={32}
          height={22}
          rx={5}
          className="ad-artifact"
          animate={{
            fill: [
              "rgba(122,162,247,0.16)",
              "rgba(122,162,247,0.16)",
              "rgba(239,68,68,0.2)",
              "rgba(239,68,68,0.2)",
              "rgba(53,208,127,0.2)",
              "rgba(53,208,127,0.2)",
            ],
            stroke: [
              "rgba(122,162,247,0.55)",
              "rgba(122,162,247,0.55)",
              "#ef4444",
              "#ef4444",
              "#35d07f",
              "#35d07f",
            ],
          }}
          transition={{ duration: 3.4, ease: "linear", times: [0, 0.16, 0.4, 0.62, 0.84, 1] }}
        />
        <rect x={-10} y={-5} width={20} height={2.6} rx={1} className="ad-artifact-line" />
        <rect x={-10} y={1} width={13} height={2.6} rx={1} className="ad-artifact-line" />
      </motion.g>

      {/* RED gate interception: slow-mo flag + the classic-flaw label, then the
          bounce back is implied by the card's return leg above. */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
        transition={{ duration: 3.4, ease: "linear", times: [0, 0.34, 0.42, 0.58, 0.66, 1] }}
      >
        <line
          x1={(E.cx + G.cx) / 2}
          y1={(E.cy + G.cy) / 2 - 26}
          x2={(E.cx + G.cx) / 2}
          y2={(E.cy + G.cy) / 2 - 6}
          className="ad-gate-strike"
        />
        <text
          x={(E.cx + G.cx) / 2}
          y={(E.cy + G.cy) / 2 - 34}
          textAnchor="middle"
          className="ad-gate-label"
        >
          refresh token never revoked
        </text>
      </motion.g>

      {/* GREEN pass tick after the fix clears the gate */}
      <motion.text
        x={G.cx}
        y={G.cy - 30}
        textAnchor="middle"
        className="ad-gate-pass"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0, 0, 0, 1, 1], scale: [0.6, 0.6, 0.6, 0.6, 1, 1] }}
        transition={{ duration: 3.4, ease: EASE, times: [0, 0.2, 0.5, 0.82, 0.9, 1] }}
        style={{ originX: `${G.cx}px`, originY: `${G.cy - 30}px` }}
      >
        ✓ passes
      </motion.text>
    </g>
  );
}

function SpecChip({ visible }) {
  return (
    <motion.g
      initial={false}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
      transition={{ duration: 0.5, ease: OVERSHOOT }}
    >
      <rect x={RX - 34} y={36} width={68} height={24} rx={6} className="ad-spec-chip" />
      <text x={RX} y={52} textAnchor="middle" className="ad-spec-text">
        SPEC
      </text>
    </motion.g>
  );
}

function RightHalf({ phaseId, dim }) {
  const phaseOrder = ["prompt", "leftType", "teams", "gate", "ship", "rest"];
  const idx = phaseOrder.indexOf(phaseId);

  const showLead = idx >= 1;
  const showSpec = idx >= 2;
  // teams spawn one by one during the "teams" phase (handled by per-team delay
  // via visibility gating on phase progression).
  const teamsVisible = idx >= 2;
  const showFlow = phaseId === "gate";
  const passed = phaseId === "ship" || phaseId === "rest";
  const gateFlare = phaseId === "gate";

  return (
    <motion.g
      initial={false}
      animate={{ opacity: dim ? 0.35 : 1 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <LocalPrompt cx={RX} active={phaseId === "prompt"} label="login + refresh" />

      <SpecChip visible={showSpec} />

      {/* edges under clusters; staggered draw-in during teams phase */}
      {TEAMS.map((t, i) => (
        <StaggeredSpawn key={`e-${t.id}`} index={i} active={teamsVisible}>
          <SpawnEdge team={t} visible />
        </StaggeredSpawn>
      ))}

      {/* lead node */}
      {showLead && <NodeDisc x={LEAD.x} y={LEAD.y} kind="lead" label="lead" />}

      {/* team clusters, staggered overshoot-settle spawn */}
      {TEAMS.map((t, i) => (
        <StaggeredSpawn key={`c-${t.id}`} index={i} active={teamsVisible}>
          <TeamCluster team={t} visible flare={t.kind === "gate" && gateFlare} />
        </StaggeredSpawn>
      ))}

      {/* the gate-flow artifact (signature beat) */}
      {showFlow && <ArtifactFlow />}

      {/* SHIP outcome: green shield + two evidence chips */}
      <AnimatePresence>
        {passed && (
          <motion.g
            key="right-pass"
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: OVERSHOOT }}
            style={{ originX: `${RX}px`, originY: "330px" }}
          >
            <circle cx={RX} cy={328} r={20} className="ad-shield" />
            <text x={RX} y={335} textAnchor="middle" className="ad-shield-tick">
              ✓
            </text>
            <g transform={`translate(${RX - 96}, 366)`}>
              <rect width={86} height={24} rx={6} className="ad-evi-chip" />
              <text x={43} y={16} textAnchor="middle" className="ad-evi-text">
                EVIDENCE/
              </text>
            </g>
            <g transform={`translate(${RX + 12}, 366)`}>
              <rect width={84} height={24} rx={6} className="ad-evi-chip" />
              <text x={42} y={16} textAnchor="middle" className="ad-evi-text">
                tests ✓
              </text>
            </g>
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  );
}

// Wraps a spawnable element so each team appears one-by-one with a stagger.
// The stagger is expressed purely as a transition delay (no setState/effect),
// so spawns are deterministic and re-trigger cleanly each loop.
function StaggeredSpawn({ index, active, children }) {
  return (
    <motion.g
      initial={false}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 0.3, ease: EASE, delay: active ? index * 0.46 : 0 }}
    >
      {children}
    </motion.g>
  );
}

// ── Animated scene ───────────────────────────────────────────────────────────
//
// Two cropped SVGs (left column viewBox "0 0 400 460", right "400 0 400 460")
// laid out by CSS grid: side-by-side on desktop, stacked on mobile. The shared
// caption bar below carries the single narrative. Beat 1 ("the same prompt
// lands on both desks") is expressed as the SAME prompt pill descending into
// each column simultaneously.
function Scene({ phase }) {
  const phaseId = PHASES[phase].id;
  // exactly one focal half is lit; the other dims to ~35%.
  const leftDim = phaseId === "teams" || phaseId === "gate";
  const rightDim = phaseId === "leftType";

  return (
    <div className="ad-split">
      <svg
        viewBox="0 0 400 460"
        className="ad-svg ad-svg-left"
        role="img"
        aria-label="Left: one lone agent types code and quietly ships an embedded bug."
      >
        <rect x="0" y="0" width="400" height="460" className="ad-bg" />
        <LeftHalf phaseId={phaseId} dim={leftDim} />
      </svg>
      <svg
        viewBox="400 0 400 460"
        className="ad-svg ad-svg-right"
        role="img"
        aria-label="Right: re-forge convenes research, engineering and security teams; a security gate intercepts a classic flaw, bounces it back for a fix, then ships with evidence."
      >
        <rect x="400" y="0" width="400" height="460" className="ad-bg" />
        <RightHalf phaseId={phaseId} dim={rightDim} />
      </svg>
    </div>
  );
}

// ── Static fallback (prefers-reduced-motion) ─────────────────────────────────
// Same two-column split layout, frozen at the end state (left ✗, right ✓).
function StaticDiagram() {
  return (
    <div className="ad-split">
      <svg
        viewBox="0 0 400 460"
        className="ad-svg ad-svg-left"
        role="img"
        aria-label="Left end state: one lone agent typed code with an embedded bug (a 🐞 on a code line) and shipped it — marked with a red ✗ 'shipped the bug'."
      >
        <rect x="0" y="0" width="400" height="460" className="ad-bg" />
        <NodeDisc x={LONE.x} y={LONE.y} kind="lead" label="agent" />
        <LeftStack typed={5} bugLine={2} bugVisible bugFlare={false} failed />
        <g>
          <rect x={LX - 70} y={296} width={140} height={30} rx={8} className="ad-badge-fail" />
          <text x={LX - 50} y={315} textAnchor="middle" className="ad-badge-x">
            ✗
          </text>
          <text x={LX + 8} y={315} textAnchor="middle" className="ad-badge-fail-text">
            shipped the bug
          </text>
        </g>
      </svg>

      <svg
        viewBox="400 0 400 460"
        className="ad-svg ad-svg-right"
        role="img"
        aria-label="Right end state: re-forge convened research, engineering and security teams under a SPEC; the security gate caught 'refresh token never revoked' and it was fixed, shipping with a green ✓ shield plus EVIDENCE/ and tests ✓ chips."
      >
        <rect x="400" y="0" width="400" height="460" className="ad-bg" />
        <SpecChip visible />
      {TEAMS.map((t) => (
        <line
          key={`s-e-${t.id}`}
          x1={LEAD.x}
          y1={LEAD.y}
          x2={t.cx}
          y2={t.cy}
          className={`ad-edge ${t.kind === "gate" ? "is-gate" : ""}`}
        />
      ))}
      <NodeDisc x={LEAD.x} y={LEAD.y} kind="lead" label="lead" />
      {TEAMS.map((t) => (
        <TeamCluster key={`s-c-${t.id}`} team={t} visible flare={false} />
      ))}
      <text x={SECURITY.cx} y={SECURITY.cy - 30} textAnchor="middle" className="ad-gate-label">
        refresh token never revoked → fixed
      </text>
      <circle cx={RX} cy={328} r={20} className="ad-shield" />
      <text x={RX} y={335} textAnchor="middle" className="ad-shield-tick">
        ✓
      </text>
      <g transform={`translate(${RX - 96}, 366)`}>
        <rect width={86} height={24} rx={6} className="ad-evi-chip" />
        <text x={43} y={16} textAnchor="middle" className="ad-evi-text">
          EVIDENCE/
        </text>
      </g>
      <g transform={`translate(${RX + 12}, 366)`}>
        <rect width={84} height={24} rx={6} className="ad-evi-chip" />
        <text x={42} y={16} textAnchor="middle" className="ad-evi-text">
          tests ✓
        </text>
      </g>
      </svg>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AgentDuel({ onDemo }) {
  const reduce = useReducedMotion();
  const [phase, advance] = useReducer(phaseReducer, 0);
  const [, setTick] = useState(0);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    if (reduce) return undefined;
    const id = window.setTimeout(() => {
      advance();
      setTick((t) => t + 1);
    }, PHASES[phase].ms);
    return () => window.clearTimeout(id);
  }, [phase, reduce, runKey]);

  const replay = () => {
    advance("reset"); // jump back to phase 0
    setRunKey((k) => k + 1); // restart the phase clock
  };

  return (
    <section id="top" className="sec duel-sec ad-sec">
      <div className="wrap">
        <div className="duel-head">
          <div>
            <div className="seclabel">
              <span className="now-playing">
                <span className="np-dot" />
                now playing
              </span>
              <span className="eyebrow">a real task, two agents</span>
            </div>
            <h2 className="display h2">
              Same prompt, two agents. <em>Watch what ships.</em>
            </h2>
            <p className="lead">
              One prompt lands on both desks. Left: a lone agent types fast and ships a flaw it
              never noticed. Right: re-forge convenes teams, and a security gate catches it before
              it ships.
            </p>
          </div>
          <div className="duel-actions">
            <button className="btn btn-primary" onClick={onDemo} type="button">
              Try the skill
            </button>
            <button className="btn btn-ghost" onClick={replay} type="button">
              Replay
            </button>
          </div>
        </div>

        <div className="ad-stage panel panel-vignette">
          <div className="ad-stage-bar">
            <span className="term-light red" />
            <span className="term-light amber" />
            <span className="term-light green" />
            <span className="ad-stage-tab">lone-agent · vs · re-forge</span>
          </div>

          {reduce ? <StaticDiagram /> : <Scene phase={phase} />}

          <div className="ad-subtitle" aria-live="polite">
            {!reduce && (
              <div className="ad-progress">
                {PHASES.slice(0, 5).map((p, i) => (
                  <span
                    key={p.id}
                    className={`ad-progress-seg ${i === Math.min(phase, 4) ? "is-active" : ""} ${
                      i < phase ? "is-done" : ""
                    }`}
                  />
                ))}
              </div>
            )}
            <p className="ad-caption">
              {reduce
                ? "One prompt, two agents: the lone agent ships an embedded bug; re-forge's security gate catches the classic flaw and ships with evidence."
                : PHASES[phase].caption}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
