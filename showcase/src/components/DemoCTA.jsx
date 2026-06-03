import Reveal from "./ui/Reveal.jsx";

const points = [
  ["Install in one command", "bash setup.sh wires every team into ~/.claude/."],
  ["Run the same prompt", "Try /engineer, /research, or /security in your repo."],
  ["Inspect the evidence", "Open the generated SYNTHESIS.md and FINDINGS.md."],
];

export default function DemoCTA({ onDemo }) {
  return (
    <section id="demo" className="sec demo-cta-sec">
      <div className="wrap">
        <Reveal className="demo-cta-card">
          <div className="demo-cta-copy">
            <span className="eyebrow">Try it yourself</span>
            <h2 className="display h2">See the instructions, or test it on your own repo.</h2>
            <p className="lead">
              Everything you watched in the terminals runs locally inside Claude Code. Open the
              step-by-step guide and copy the exact commands.
            </p>
            <div className="demo-cta-actions">
              <button className="btn btn-primary" onClick={onDemo} type="button">
                View instructions
              </button>
              <a
                className="btn btn-ghost"
                href="https://github.com/Akasxh/claude-forge"
                target="_blank"
                rel="noreferrer"
              >
                Open GitHub repo
              </a>
            </div>
          </div>
          <ul className="demo-cta-list">
            {points.map(([title, note], index) => (
              <li key={title}>
                <span className="num">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{note}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
