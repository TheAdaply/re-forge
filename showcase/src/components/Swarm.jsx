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
 * Perf: animation is pure SVG transforms + opacity (no layout thrash).
 * prefers-reduced-motion renders a single static, fully-labeled end state.
 */

// ── Geometry (SVG user units; viewBox 0 0 800 440) ───────────────────────────
const LEAD = { x: 400, y: 96 };
const CORE = { x: 400, y: 250 }; // synthesis artifact

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

const PHASES = [
  { id: "prompt", caption: "one prompt", ms: 3000 },
  { id: "burst", caption: "specialists fan out in parallel", ms: 3400 },
  { id: "findings", caption: "findings come home", ms: 3000 },
  { id: "kill", caption: "adversaries attack before you see anything", ms: 3400 },
  {
    id: "land",
    caption: "evidence on disk · memory compounds — next session starts smarter",
    ms: 3600,
  },
];

const EASE = [0.22, 1, 0.36, 1];

function phaseReducer(index) {
  return (index + 1) % PHASES.length;
}

// ── Sub-parts ────────────────────────────────────────────────────────────────

function Edge({ node, active }) {
  return (
    <g className="swarm-edge">
      <line
        x1={LEAD.x}
        y1={LEAD.y}
        x2={node.x}
        y2={node.y}
        className={`swarm-edge-line ${node.kind === "adversary" ? "is-adv" : ""}`}
      />
      {active && (
        <motion.circle
          r="3"
          className={`swarm-pulse ${node.kind === "adversary" ? "is-adv" : ""}`}
          initial={{ cx: LEAD.x, cy: LEAD.y, opacity: 0 }}
          animate={{ cx: node.x, cy: node.y, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: node.x / 1600 }}
        />
      )}
    </g>
  );
}

function Node({ node, visible, flare }) {
  const isAdv = node.kind === "adversary";
  return (
    <motion.g
      initial={false}
      animate={
        visible
          ? { opacity: 1, scale: 1 }
          : { opacity: 0, scale: 0.2 }
      }
      transition={{ duration: 0.5, ease: EASE }}
      style={{ originX: `${node.x}px`, originY: `${node.y}px` }}
    >
      <circle
        cx={node.x}
        cy={node.y}
        r="22"
        className={`swarm-node-disc ${isAdv ? "is-adv" : ""} ${flare ? "is-flare" : ""}`}
      />
      {flare && (
        <motion.circle
          cx={node.x}
          cy={node.y}
          r="22"
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

// A small finding-card travelling from a node back toward CORE.
function FindingCard({ from, delay, killed }) {
  return (
    <motion.g
      initial={{ x: from.x, y: from.y, opacity: 0 }}
      animate={
        killed
          ? {
              x: [from.x, (from.x + CORE.x) / 2],
              y: [from.y, (from.y + CORE.y) / 2],
              opacity: [0, 1, 1],
            }
          : { x: CORE.x, y: CORE.y, opacity: [0, 1, 1, 0] }
      }
      transition={{ duration: killed ? 1 : 1.3, delay, ease: EASE }}
    >
      <rect x={-13} y={-9} width={26} height={18} rx={4} className="swarm-card" />
      <rect x={-8} y={-4} width={16} height={2.4} rx={1} className="swarm-card-line" />
      <rect x={-8} y={1} width={11} height={2.4} rx={1} className="swarm-card-line" />
    </motion.g>
  );
}

// The killed card: struck through, then shatters/dissolves with a label.
function KilledCard() {
  const mid = { x: (KILL_SOURCE.x + CORE.x) / 2, y: (KILL_SOURCE.y + CORE.y) / 2 };
  return (
    <g>
      <motion.g
        initial={{ x: mid.x, y: mid.y, opacity: 1 }}
        animate={{ opacity: [1, 1, 0], scale: [1, 1.04, 0.6], rotate: [0, -4, 6] }}
        transition={{ duration: 1.1, delay: 0.5, ease: EASE, times: [0, 0.55, 1] }}
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
          transition={{ duration: 0.35, delay: 0.5, ease: "easeOut" }}
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
          transition={{ duration: 0.8, delay: 0.95, ease: "easeOut" }}
        />
      ))}
      <motion.text
        x={mid.x}
        y={mid.y - 22}
        textAnchor="middle"
        className="swarm-kill-label"
        initial={{ opacity: 0, y: mid.y - 14 }}
        animate={{ opacity: [0, 1, 1, 0], y: mid.y - 22 }}
        transition={{ duration: 1.8, delay: 0.6, ease: EASE }}
      >
        KILLED — source unverified
      </motion.text>
    </g>
  );
}

function SynthesisCore({ active, sealed }) {
  return (
    <g>
      <motion.circle
        cx={CORE.x}
        cy={CORE.y}
        r="30"
        className={`swarm-core ${sealed ? "is-sealed" : ""}`}
        animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 1.4, repeat: active ? Infinity : 0, ease: "easeInOut" }}
        style={{ originX: `${CORE.x}px`, originY: `${CORE.y}px` }}
      />
      <text x={CORE.x} y={CORE.y - 2} textAnchor="middle" className="swarm-core-label">
        SYNTHESIS
      </text>
      <text x={CORE.x} y={CORE.y + 12} textAnchor="middle" className="swarm-core-sub">
        research-lead
      </text>
    </g>
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
      <Node node={LEAD} visible flare={false} />
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

function MemoryRing({ visible, grown }) {
  return (
    <motion.g
      initial={false}
      animate={visible ? { opacity: 1 } : { opacity: 0.25 }}
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
  const showLead = phase >= 1;
  const showSpecialists = phase >= 1;
  const edgesActive = phaseId === "burst" || phaseId === "findings";
  const advFlare = phaseId === "kill";
  const showCore = phase >= 1;
  const coreActive = phaseId === "findings" || phaseId === "kill";
  const sealed = phaseId === "land";
  const showFindings = phaseId === "findings" || phaseId === "kill";
  const landed = phaseId === "land";

  // surviving cards = the 5 non-killed specialists
  const survivors = SPECIALISTS.filter((s) => s.id !== KILL_SOURCE.id);

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

      {/* Edges (under nodes) */}
      {showSpecialists &&
        SPECIALISTS.map((n) => <Edge key={n.id} node={n} active={edgesActive} />)}

      {/* Synthesis core */}
      {showCore && <SynthesisCore active={coreActive} sealed={sealed} />}

      {/* Findings flowing home */}
      {showFindings &&
        survivors.map((s, i) => (
          <FindingCard key={s.id} from={s} delay={i * 0.18} killed={false} />
        ))}

      {/* The kill beat */}
      {phaseId === "kill" && <KilledCard />}

      {/* Surviving cards pulse green at CORE during kill */}
      {phaseId === "kill" && (
        <motion.circle
          cx={CORE.x}
          cy={CORE.y}
          r="34"
          className="swarm-survive-pulse"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: [0, 0.7, 0], scale: [0.9, 1.25, 1.4] }}
          transition={{ duration: 1.2, delay: 1.6, ease: "easeOut" }}
          style={{ originX: `${CORE.x}px`, originY: `${CORE.y}px` }}
        />
      )}

      {/* Specialist nodes */}
      {showSpecialists &&
        SPECIALISTS.map((n) => (
          <Node key={n.id} node={n} visible={showSpecialists} flare={advFlare && n.kind === "adversary"} />
        ))}

      {/* Lead node */}
      <Node node={LEAD} visible={showLead} flare={false} />

      {/* Phase 5: artifacts + memory */}
      <ArtifactChips visible={landed} />
      <MemoryRing visible={landed} grown={landed} />

      {/* +1 lesson chip absorbed by memory ring during land */}
      {landed && (
        <motion.g
          initial={{ x: 240, y: 384, opacity: 0 }}
          animate={{ x: 92, y: 384, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.6, delay: 0.6, ease: EASE }}
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
                {PHASES.map((p, i) => (
                  <span key={p.id} className={`swarm-progress-seg ${i === phase ? "is-active" : ""} ${i < phase ? "is-done" : ""}`} />
                ))}
              </div>
            )}
            <p className="swarm-caption">
              {reduce ? "From one prompt: specialists fan out, adversaries kill unverified findings, evidence and memory persist." : PHASES[phase].caption}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
