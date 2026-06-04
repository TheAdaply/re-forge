import Reveal from "./ui/Reveal.jsx";
import { flow } from "../data/forgeData.js";

const EMPHASIZED = "03";

export default function Gates() {
  return (
    <section id="gates" className="sec gates-sec">
      <div className="wrap">
        <div className="section-copy centered">
          <div className="seclabel centered-label">
            <span className="tick" />
            <span className="eyebrow">the adversarial pipeline</span>
          </div>
          <h2 className="display h2">Five gates between your prompt and your answer.</h2>
          <p className="lead centered">
            Every mission runs the same way: a lead scopes it, specialists fan out, adversaries
            attack the synthesis, evidence becomes a contract, and memory compounds for next time.
          </p>
        </div>
        <div className="flow-board gates-board">
          {flow.map(([index, title, text], i) => {
            const isAttack = index === EMPHASIZED;
            return (
              <Reveal
                className={`flow-node gate-node${isAttack ? " gate-node--attack" : ""}`}
                delay={i * 0.06}
                key={index}
              >
                <span className="node-index eyebrow">{index}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                {isAttack ? (
                  <p className="gate-kicker">
                    Skeptic, adversary, moderator, evaluator — every synthesis is attacked before
                    you see it.
                  </p>
                ) : null}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
