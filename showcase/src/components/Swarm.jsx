import { useEffect, useReducer, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/*
 * Swarm — an animated, self-explanatory simulation of the /research swarm.
 *
 * Honesty: every node name maps to a real agent file in
 * agents/research-team/ (research-web-miner.md, research-github-miner.md,
 * research-librarian.md, research-historian.md, research-skeptic.md,
 * research-adversary.md, research-lead.md). The "KILLED" beat mirrors the
 * real skeptic/adversary gates that reject unverified findings before
 * synthesis. No invented metrics or numbers appear anywhere in the scene.
 *
 * Choreography grammar (documentary discipline):
 *   ONE focal action at a time. At every instant exactly one thing moves;
 *   everything else freezes and recedes to ~40% opacity. The spotlight
 *   (full opacity + subtle glow) rides the current actor. Specialists spawn
 *   one by one with a tiny overshoot; edges draw in as each node lands;
 *   pulse dots run only during the dedicated "working" beat; findings travel
 *   one at a time, each emitted with an anticipation bump and greeted by a
 *   single core pulse on arrival. The kill is a held set piece: the scene
 *   dims, the doomed card goes slow-mo, the strike draws, it shatters, the
 *   label holds, then the world resumes.
 *
 * Perf: animation is pure SVG transforms + opacity (no layout thrash).
 * prefers-reduced-motion renders a single static, fully-labeled end state.
 */

// ── Geometry (SVG user units; viewBox 0 0 800 440) ───────────────────────────
const LEAD = { x: 400, y: 96 };
const CORE = { x: 400, y: 258 }; // synthesis artifact (nudged down so its
//                                  label sits clear of the SYNTHESIS text)

// Six specialist nodes fanning out in an arc below the lead. The two
// adversarial roles (skeptic, adversary) sit on the right flank so the kill
// beat reads as an interception from that side.
const SPECIALISTS = [
  { id: "web-miner", label: "web-miner", x: 132, y: 214, kind: "miner" },
  { id: "github-miner", label: "github-miner", x: 214, y: 300, kind: "miner" },
  { id: "librarian", label: "librarian", x: 330, y: 348, kind: "miner" },
  { id: "historian", label: "historian", x: 470, y: 348, kind: "miner" },
  { id: "skeptic", label: "skeptic", x: 586, y: 300, kind: "adversary" },
  { id: "adversary", label: "adversary", x: 668, y: 214, kind: "adversary" },
];

// The finding that gets killed flies in from the skeptic flank.
const KILL_SOURCE = SPECIALISTS[4]; // skeptic

// ── Beat timeline ────────────────────────────────────────────────────────────
// Each beat names its SINGLE focal action. Durations are tuned so a beat
// fully settles before the next caption crossfades in.
const PHASES = [
  { id: "prompt", caption: "one prompt", ms: 2600 },
  { id: "dispatch", caption: "the lead takes the case", ms: 1500 },
  { id: "spawn", caption: "specialists fan out — one by one", ms: 3300 },
  { id: "work", caption: "every lane goes to work", ms: 1700 },
  { id: "findings", caption: "findings come home", ms: 3400 },
  { id: "kill", caption: "adversaries attack before you see anything", ms: 4200 },
  {
    id: "land",
    caption: "evidence on disk · memory compounds — next session starts smarter",
    ms: 3200,
  },
  { id: "rest", caption: "evidence on disk · memory compounds — next session starts smarter", ms: 600 },
];

const EASE = [0.22, 1, 0.36, 1];

// Per-specialist spawn stagger (seconds) — wide enough to read sequentially.
const SPAWN_STAGGER = 0.46;
// Per-finding emission stagger (seconds).
const FIND_STAGGER = 0.58;

// Receded opacity for everything that is NOT the current focal actor.
const RECEDE = 0.4;

function phaseReducer(index) {
  return (index + 1) % PHASES.length;
}

// ── Sub-parts ────────────────────────────────────────────────────────────────

// An edge that DRAWS IN (pathLength) when `draw` flips true. `delay` lets
// each edge ignite in lockstep with its node's spawn. Once drawn it stays a
// quiet static line; pulse dots live in the separate `work` beat.
function Edge({ node, draw, delay, dim }) {
  const isAdv = node.kind === "adversary";
  return (
    <motion.line
      x1={LEAD.x}
      y1={LEAD.y}
      x2={node.x}
      y2={node.y}
      className={`swarm-edge-line ${isAdv ? "is-adv" : ""}`}
      initial={false}
      animate={{ pathLength: draw ? 1 : 0, opacity: dim ? RECEDE : 1 }}
      transition={{
        pathLength: { duration: 0.42, delay, ease: "easeOut" },
        opacity: { duration: 0.45, ease: EASE },
      }}
    />
  );
}

// A single travelling pulse dot — runs ONCE down an edge during the work beat.
function PulseDot({ node, delay }) {
  const isAdv = node.kind === "adversary";
  return (
    <motion.circle
      r="3"
      className={`swarm-pulse ${isAdv ? "is-adv" : ""}`}
      initial={{ cx: LEAD.x, cy: LEAD.y, opacity: 0 }}
      animate={{ cx: node.x, cy: node.y, opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.95, delay, ease: "easeInOut" }}
    />
  );
}

// `spawn`: when >0, the node pops with overshoot at `delay`.
// `focus`: full opacity + glow when this node is the focal actor.
function Node({ node, visible, spawn, delay = 0, flare, focus = true, lead }) {
  const isAdv = node.kind === "adversary";
  const r = lead ? 25 : 22; // lead reads slightly heavier than specialists
  const animate = !visible
    ? { opacity: 0, scale: 0.2 }
    : spawn
      ? { opacity: focus ? 1 : RECEDE, scale: [0.2, 1.06, 1] }
      : { opacity: focus ? 1 : RECEDE, scale: 1 };
  return (
    <motion.g
      initial={false}
      animate={animate}
      transition={
        spawn
          ? { duration: 0.62, delay, ease: EASE, times: [0, 0.7, 1] }
          : { duration: 0.5, ease: EASE }
      }
      style={{ originX: `${node.x}px`, originY: `${node.y}px` }}
    >
      <circle
        cx={node.x}
        cy={node.y}
        r={r}
        className={`swarm-node-disc ${isAdv ? "is-adv" : ""} ${flare ? "is-flare" : ""} ${focus && visible ? "is-focus" : ""}`}
      />
      {flare && (
        <motion.circle
          cx={node.x}
          cy={node.y}
          r={r}
          className="swarm-node-flare-ring"
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
          style={{ originX: `${node.x}px`, originY: `${node.y}px` }}
        />
      )}
      <text x={node.x} y={node.y + 40} className="swarm-node-label" textAnchor="middle">
        {node.label}
      </text>
    </motion.g>
  );
}

// A finding-card travelling from its node back to CORE. Emits with a tiny
// anticipation bump (handled by the parent node) and is the focal actor while
// in flight. `onArrive`/timing is implicit: the core pulses via `arrivals`.
function FindingCard({ from, delay }) {
  return (
    <motion.g
      initial={{ x: from.x, y: from.y, opacity: 0 }}
      animate={{ x: CORE.x, y: CORE.y, opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.85, delay, ease: EASE }}
    >
      <rect x={-13} y={-9} width={26} height={18} rx={4} className="swarm-card" />
      <rect x={-8} y={-4} width={16} height={2.4} rx={1} className="swarm-card-line" />
      <rect x={-8} y={1} width={11} height={2.4} rx={1} className="swarm-card-line" />
    </motion.g>
  );
}

// The killed card: travels in slow-mo, gets struck through, then shatters.
// Timeline (seconds, relative to kill-beat start):
//   0.00–0.40  scene-wide stillness/dim (handled by Scene)
//   0.40–1.70  card crawls to the interception point (slow-mo)
//   1.70–2.05  strike-through draws
//   2.05–2.55  card shatters
//   1.80–3.20  KILLED label holds (~1s plateau)
function KilledCard() {
  const mid = { x: (KILL_SOURCE.x + CORE.x) / 2, y: (KILL_SOURCE.y + CORE.y) / 2 };
  return (
    <g>
      <motion.g
        initial={{ x: KILL_SOURCE.x, y: KILL_SOURCE.y, opacity: 0 }}
        animate={{
          x: [KILL_SOURCE.x, mid.x, mid.x],
          y: [KILL_SOURCE.y, mid.y, mid.y],
          opacity: [0, 1, 1, 1, 0],
          scale: [1, 1, 1.04, 0.6],
          rotate: [0, 0, -4, 6],
        }}
        transition={{ duration: 2.55, delay: 0.4, ease: EASE, times: [0, 0.5, 0.65, 0.85, 1] }}
      >
        <rect x={-15} y={-10} width={30} height={20} rx={4} className="swarm-card is-killed" />
        <motion.line
          x1={-15}
          y1={0}
          x2={15}
          y2={0}
          className="swarm-strike"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 1.7, ease: "easeOut" }}
        />
      </motion.g>
      {/* shatter shards */}
      {[-1, 1, -0.4, 0.6].map((dir, i) => (
        <motion.rect
          key={i}
          x={mid.x - 2}
          y={mid.y - 2}
          width={4}
          height={4}
          rx={1}
          className="swarm-shard"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: mid.x - 2 + dir * 26,
            y: mid.y - 2 + (i % 2 === 0 ? -1 : 1) * 18,
          }}
          transition={{ duration: 0.7, delay: 2.05, ease: "easeOut" }}
        />
      ))}
      <motion.text
        x={mid.x}
        y={mid.y - 22}
        textAnchor="middle"
        className="swarm-kill-label"
        initial={{ opacity: 0, y: mid.y - 14 }}
        animate={{ opacity: [0, 1, 1, 0], y: mid.y - 22 }}
        transition={{ duration: 1.5, delay: 1.85, ease: EASE, times: [0, 0.18, 0.78, 1] }}
      >
        KILLED — source unverified
      </motion.text>
    </g>
  );
}

function SynthesisCore({ active, sealed, dim, pulseKey }) {
  return (
    <motion.g
      initial={false}
      animate={{ opacity: dim ? RECEDE : 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <motion.circle
        cx={CORE.x}
        cy={CORE.y}
        r="30"
        className={`swarm-core ${sealed ? "is-sealed" : ""}`}
        // `active` = gentle perpetual breathing during the work beat.
        // `pulseKey` = a single sharp pulse fired on each finding arrival.
        animate={
          active
            ? { scale: [1, 1.06, 1] }
            : pulseKey
              ? { scale: [1, 1.12, 1] }
              : { scale: 1 }
        }
        transition={
          active
            ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.5, ease: "easeOut" }
        }
        style={{ originX: `${CORE.x}px`, originY: `${CORE.y}px` }}
        key={pulseKey || "core"}
      />
      <text x={CORE.x} y={CORE.y - 4} textAnchor="middle" className="swarm-core-label">
        SYNTHESIS
      </text>
      <text x={CORE.x} y={CORE.y + 13} textAnchor="middle" className="swarm-core-sub">
        research-lead
      </text>
    </motion.g>
  );
}

// ── Static fallback (prefers-reduced-motion) ─────────────────────────────────
function StaticDiagram() {
  return (
    <svg viewBox="0 0 800 440" className="swarm-svg" role="img"
      aria-label="The /research swarm: a lead dispatches six specialists (web-miner, github-miner, librarian, historian, skeptic, adversary); findings return to a central synthesis; the skeptic and adversary kill an unverified finding; the run lands SYNTHESIS.md and EVIDENCE on disk while memory gains a lesson.">
      <g className="swarm-prompt-static">
        <rect x="270" y="20" width="260" height="34" rx="17" className="swarm-prompt-pill" />
        <text x="400" y="42" textAnchor="middle" className="swarm-prompt-text">
          /research is this auth library safe to ship?
        </text>
      </g>
      {SPECIALISTS.map((n) => (
        <line key={n.id} x1={LEAD.x} y1={LEAD.y} x2={n.x} y2={n.y}
          className={`swarm-edge-line ${n.kind === "adversary" ? "is-adv" : ""}`} />
      ))}
      <SynthesisCore active={false} sealed />
      {SPECIALISTS.map((n) => (
        <Node key={n.id} node={n} visible flare={false} />
      ))}
      <Node node={LEAD} visible flare={false} lead />
      {/* killed finding, frozen */}
      <g transform={`translate(${(KILL_SOURCE.x + CORE.x) / 2}, ${(KILL_SOURCE.y + CORE.y) / 2})`}>
        <rect x={-15} y={-10} width={30} height={20} rx={4} className="swarm-card is-killed" />
        <line x1={-15} y1={0} x2={15} y2={0} className="swarm-strike" />
        <text y={-22} textAnchor="middle" className="swarm-kill-label">
          KILLED — source unverified
        </text>
      </g>
      <ArtifactChips visible />
      <MemoryRing visible grown />
    </svg>
  );
}

function ArtifactChips({ visible }) {
  return (
    <motion.g
      initial={false}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <g transform="translate(560, 372)">
        <rect width="92" height="26" rx="6" className="swarm-chip-file" />
        <text x="46" y="17" textAnchor="middle" className="swarm-chip-text">SYNTHESIS.md</text>
      </g>
      <g transform="translate(664, 372)">
        <rect width="78" height="26" rx="6" className="swarm-chip-file" />
        <text x="39" y="17" textAnchor="middle" className="swarm-chip-text">EVIDENCE/</text>
      </g>
    </motion.g>
  );
}

// The memory ring is part of the LAND beat only — it fades in from nothing the
// first time, so it must never be visible during earlier phases.
function MemoryRing({ visible, grown }) {
  return (
    <motion.g
      initial={false}
      animate={visible ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <motion.circle
        cx="92"
        cy="384"
        r="26"
        className="swarm-mem-ring"
        animate={{ scale: grown ? 1.12 : 1 }}
        transition={{ duration: 0.7, ease: EASE }}
        style={{ originX: "92px", originY: "384px" }}
      />
      <text x="92" y="380" textAnchor="middle" className="swarm-mem-label">memory</text>
      <text x="92" y="394" textAnchor="middle" className="swarm-mem-sub">+1 lesson</text>
    </motion.g>
  );
}

// ── Main animated scene ──────────────────────────────────────────────────────
function Scene({ phase }) {
  const phaseId = PHASES[phase].id;

  // Visibility gates ----------------------------------------------------------
  const showLead = phase >= 1; // dispatch onward
  const showSpecialists = phase >= 2; // spawn onward
  const showCore = phase >= 1; // appears (receded) at dispatch
  const showMemory = phaseId === "land" || phaseId === "rest";

  // Spawn / draw control ------------------------------------------------------
  const spawning = phaseId === "spawn";
  const edgesDrawn = phase >= 2; // edges drawn from spawn onward
  const advFlare = phaseId === "kill";

  // Spotlight: which actor is at full opacity; everyone else recedes. --------
  const spotlight = {
    leadFocus: phaseId === "dispatch",
    coreActive: phaseId === "work",
    coreDim: phaseId === "spawn" || phaseId === "dispatch",
  };

  // Findings ------------------------------------------------------------------
  const showFindings = phaseId === "findings";
  // Survivors emit one by one (skeptic's finding is the doomed one, shown in kill).
  const survivors = SPECIALISTS.filter((s) => s.id !== KILL_SOURCE.id);

  // Pulse dots run ONLY during the work beat. ---------------------------------
  const showPulses = phaseId === "work";

  const sealed = phaseId === "land" || phaseId === "rest";
  const landed = phaseId === "land" || phaseId === "rest";

  // During the kill set-piece everything but the two adversaries + the doomed
  // card recedes; during findings everything but the in-flight train recedes.
  const sceneDimForKill = phaseId === "kill";

  // Helper: is a given specialist a focal actor right now?
  function nodeFocus(node) {
    if (phaseId === "spawn") return true; // each lights as it spawns; recede handled by stagger glow
    if (phaseId === "work") return false; // core is the actor; nodes rest at full but unglowed
    if (phaseId === "findings") return !sceneDimForKill; // train is focal; nodes hold
    if (phaseId === "kill") return node.kind === "adversary"; // only adversaries lit
    return true;
  }

  return (
    <svg viewBox="0 0 800 440" className="swarm-svg" role="img"
      aria-label="Animated simulation of the /research swarm processing one prompt.">
      {/* faint grid backdrop */}
      <rect x="0" y="0" width="800" height="440" className="swarm-bg" />

      {/* Phase 1: prompt pill */}
      <AnimatePresence>
        {phaseId === "prompt" && (
          <motion.g
            key="prompt"
            initial={{ x: -340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8, y: 40 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <rect x="250" y="200" width="300" height="40" rx="20" className="swarm-prompt-pill" />
            <text x="400" y="225" textAnchor="middle" className="swarm-prompt-text">
              /research is this auth library safe to ship?
            </text>
          </motion.g>
        )}
      </AnimatePresence>

      {/* Edges (under nodes) — draw in during spawn, in lockstep with nodes.
          Quiet (no pulse) outside the work beat; dim during the kill. */}
      {showSpecialists &&
        SPECIALISTS.map((n, i) => (
          <Edge
            key={n.id}
            node={n}
            draw={edgesDrawn}
            delay={spawning ? i * SPAWN_STAGGER + 0.04 : 0}
            dim={sceneDimForKill && n.kind !== "adversary"}
          />
        ))}

      {/* Synthesis core */}
      {showCore && (
        <SynthesisCore
          active={spotlight.coreActive}
          sealed={sealed}
          dim={spotlight.coreDim || (sceneDimForKill && false)}
          pulseKey={showFindings ? `find-${phase}` : null}
        />
      )}

      {/* Findings flowing home — one tight staggered train, the sole actor. */}
      {showFindings &&
        survivors.map((s, i) => (
          <FindingCard key={s.id} from={s} delay={i * FIND_STAGGER} />
        ))}

      {/* The kill beat */}
      {phaseId === "kill" && <KilledCard />}

      {/* Survivors confirmed: a single green ring pulses at CORE after the
          kill resolves (one pulse, not a loop). */}
      {phaseId === "kill" && (
        <motion.circle
          cx={CORE.x}
          cy={CORE.y}
          r="34"
          className="swarm-survive-pulse"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: [0, 0.7, 0], scale: [0.9, 1.25, 1.4] }}
          transition={{ duration: 1.1, delay: 3.1, ease: "easeOut" }}
          style={{ originX: `${CORE.x}px`, originY: `${CORE.y}px` }}
        />
      )}

      {/* Pulse dots — ONLY during the work beat, run once down each edge. */}
      {showPulses &&
        SPECIALISTS.map((n, i) => (
          <PulseDot key={n.id} node={n} delay={0.1 + (n.x / 800) * 0.5 + i * 0.04} />
        ))}

      {/* Specialist nodes — spawn one by one; recede when not focal. */}
      {showSpecialists &&
        SPECIALISTS.map((n, i) => (
          <Node
            key={n.id}
            node={n}
            visible={showSpecialists}
            spawn={spawning}
            delay={spawning ? i * SPAWN_STAGGER : 0}
            flare={advFlare && n.kind === "adversary"}
            focus={nodeFocus(n)}
          />
        ))}

      {/* Lead node — focal only during dispatch, then holds. */}
      <Node
        node={LEAD}
        visible={showLead}
        spawn={phaseId === "dispatch"}
        flare={false}
        focus={spotlight.leadFocus || phaseId !== "kill"}
        lead
      />

      {/* Land beat: artifacts + memory (memory fades in fresh here). */}
      <ArtifactChips visible={landed} />
      <MemoryRing visible={showMemory} grown={landed} />

      {/* +1 lesson chip absorbed by the memory ring during land. */}
      {phaseId === "land" && (
        <motion.g
          initial={{ x: 240, y: 384, opacity: 0 }}
          animate={{ x: 92, y: 384, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.6, delay: 0.7, ease: EASE }}
        >
          <rect x={-30} y={-11} width={60} height={22} rx={11} className="swarm-lesson-chip" />
          <text x={0} y={4} textAnchor="middle" className="swarm-lesson-text">+1 lesson</text>
        </motion.g>
      )}
    </svg>
  );
}

export default function Swarm() {
  const reduce = useReducedMotion();
  const [phase, advance] = useReducer(phaseReducer, 0);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (reduce) return undefined;
    const id = window.setTimeout(() => {
      advance();
      setTick((t) => t + 1);
    }, PHASES[phase].ms);
    return () => window.clearTimeout(id);
  }, [phase, reduce]);

  return (
    <section id="swarm" className="sec swarm-sec">
      <div className="wrap">
        <div className="section-copy centered">
          <div className="seclabel centered-label">
            <span className="tick" />
            <span className="eyebrow">the swarm, live</span>
          </div>
          <h2 className="display h2">
            Most agents agree with themselves. <em>Yours get attacked.</em>
          </h2>
          <p className="lead centered">
            What actually happens between your prompt and your answer.
          </p>
        </div>

        <div className="swarm-stage panel panel-vignette">
          <div className="swarm-stage-bar">
            <span className="term-light red" />
            <span className="term-light amber" />
            <span className="term-light green" />
            <span className="swarm-stage-tab">research-team · /research</span>
          </div>

          {reduce ? <StaticDiagram /> : <Scene phase={phase} />}

          <div className="swarm-subtitle" aria-live="polite">
            {!reduce && (
              <div className="swarm-progress">
                {PHASES.filter((p) => p.id !== "rest").map((p, i) => (
                  <span key={p.id} className={`swarm-progress-seg ${i === phase ? "is-active" : ""} ${i < phase ? "is-done" : ""}`} />
                ))}
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.p
                key={reduce ? "static" : phaseId(phase)}
                className="swarm-caption"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                {reduce
                  ? "From one prompt: specialists fan out, adversaries kill unverified findings, evidence and memory persist."
                  : PHASES[phase].caption}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

// Caption key helper: the `rest` beat shares the `land` caption, so they
// crossfade as one — no flicker at the loop seam.
function phaseId(phase) {
  const id = PHASES[phase].id;
  return id === "rest" ? "land" : id;
}
