import { useEffect, useRef, useState } from "react";
import {
  backgroundCells,
  plainMeta,
  plainScript,
  plainVerdict,
  skillMeta,
  skillScript,
  skillVerdict,
} from "../data/duelScript.js";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const GLYPH = { ok: "✔", warn: "▲", err: "✖", info: "›", path: "＋", head: "■", cmd: "❯", muted: "·" };

function scheduleStream(lines, setCount, timers) {
  let acc = 0;
  lines.forEach((line, index) => {
    acc += line.d;
    timers.push(window.setTimeout(() => setCount(index + 1), acc));
  });
  return acc;
}

function formatTokens(value) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`;
}

function Verdict({ verdict, tone }) {
  return (
    <div className={`verdict ${tone}`}>
      <div className="verdict-score">
        <span className="num">{verdict.score}</span>
        <small>/100 quality</small>
      </div>
      <div className="verdict-meta">
        <strong>{verdict.label}</strong>
        <div className="verdict-tags">
          {verdict.notes.map((note) => (
            <span key={note}>{note}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Terminal({
  variant,
  meta,
  lines,
  visible,
  streaming,
  spinner,
  cells,
  verdict,
  showVerdict,
  tokens,
  elapsed,
}) {
  const bodyRef = useRef(null);

  const times = [];
  let runningTime = 0;
  lines.forEach((line) => {
    runningTime += line.d;
    times.push((runningTime / 1000).toFixed(1));
  });

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [visible, showVerdict]);

  return (
    <article className={`term term-${variant}`}>
      <div className="term-bar">
        <span className="term-light red" />
        <span className="term-light amber" />
        <span className="term-light green" />
        <span className="term-tab">{meta.tab}</span>
        <span className={`term-state ${streaming ? "live" : "idle"}`}>
          {streaming ? "running" : "exit 0"}
        </span>
      </div>

      {cells && (
        <div className="term-cells" aria-label="Always-on background checks">
          <span className="cells-label">always-on</span>
          {cells.map((cell) => (
            <span className="cell" key={cell.id}>
              <span className="cell-dot" />
              {cell.label}
            </span>
          ))}
        </div>
      )}

      <div className="term-body" ref={bodyRef}>
        {lines.slice(0, visible).map((line, index) => {
          if (line.c === "cmd") {
            return (
              <p className="term-line tone-cmd" key={`${variant}-${index}`}>
                <span className="ts">{times[index]}</span>
                <span className="sh-user">
                  {meta.user}@{meta.host}
                </span>
                <span className="sh-path">{meta.cwd}</span>
                <span className="sh-caret">❯</span>
                <span className="sh-cmd">{line.t}</span>
              </p>
            );
          }
          return (
            <p className={`term-line tone-${line.c}`} key={`${variant}-${index}`}>
              <span className="ts">{times[index]}</span>
              <span className="gl">{GLYPH[line.c] || "·"}</span>
              <span>{line.t}</span>
            </p>
          );
        })}
        {streaming && visible > 0 && (
          <p className="term-line tone-run">
            <span className="ts">{times[Math.min(visible, times.length - 1)]}</span>
            <span className="gl spin">{SPINNER[spinner]}</span>
            <span>executing step</span>
            <span className="block-caret">█</span>
          </p>
        )}
      </div>

      <div className="term-status">
        <span className="st-branch">⎇ {meta.branch}</span>
        <span className="st-model">{meta.model}</span>
        <span className="st-spacer" />
        <span className="st-tok">{formatTokens(tokens)} tok</span>
        <span className="st-time">{(elapsed / 1000).toFixed(1)}s</span>
      </div>

      <div className={`term-foot ${showVerdict ? "is-open" : ""}`}>
        {showVerdict && <Verdict verdict={verdict} tone={variant} />}
      </div>
    </article>
  );
}

export default function TerminalDuel({ onDemo }) {
  const [plainVisible, setPlainVisible] = useState(0);
  const [skillVisible, setSkillVisible] = useState(0);
  const [done, setDone] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [spinner, setSpinner] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timers = [];
    const plainEnd = scheduleStream(plainScript, setPlainVisible, timers);
    const skillEnd = scheduleStream(skillScript, setSkillVisible, timers);
    const total = Math.max(plainEnd, skillEnd);
    timers.push(window.setTimeout(() => setDone(true), total + 500));

    // auto-loop so it plays like a video
    timers.push(
      window.setTimeout(() => {
        setPlainVisible(0);
        setSkillVisible(0);
        setElapsed(0);
        setDone(false);
        setRunKey((key) => key + 1);
      }, total + 4200),
    );

    const spin = window.setInterval(() => setSpinner((f) => (f + 1) % SPINNER.length), 90);
    const clock = window.setInterval(() => {
      setElapsed((value) => (value >= total ? total : value + 100));
    }, 100);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(spin);
      window.clearInterval(clock);
    };
  }, [runKey]);

  const replay = () => {
    setPlainVisible(0);
    setSkillVisible(0);
    setElapsed(0);
    setDone(false);
    setRunKey((key) => key + 1);
  };

  const plainStreaming = plainVisible < plainScript.length;
  const skillStreaming = skillVisible < skillScript.length;

  return (
    <section id="top" className="sec duel-sec">
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
              Ask both to <em>add multi-tenant SSO + RBAC</em>. Watch what ships.
            </h2>
            <p className="lead">
              One complex task. The left is a plain agent. The right loads{" "}
              <code className="inline-code">SKILL.md</code>, defines its evals first (EDD), and runs
              all six teams — research, engineering, security, testing, docs, and a
              self-evolving watch team — plus the Capability Forge meta-agent, with security, debugging, edge-case, and upstream-watch
              checks always live in the background.
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

        <div className="duel-grid">
          <Terminal
            variant="plain"
            meta={plainMeta}
            lines={plainScript}
            visible={plainVisible}
            streaming={plainStreaming}
            spinner={spinner}
            verdict={plainVerdict}
            showVerdict={done}
            tokens={Math.round(elapsed * 0.9)}
            elapsed={Math.min(elapsed, 1400)}
          />
          <Terminal
            variant="skill"
            meta={skillMeta}
            lines={skillScript}
            visible={skillVisible}
            streaming={skillStreaming}
            spinner={spinner}
            cells={backgroundCells}
            verdict={skillVerdict}
            showVerdict={done}
            tokens={Math.round(elapsed * 9.2)}
            elapsed={Math.min(elapsed, 16400)}
          />
        </div>
      </div>
    </section>
  );
}
