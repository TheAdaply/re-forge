import Reveal from "./ui/Reveal.jsx";
import { commands } from "../data/forgeData.js";

export default function Commands() {
  return (
    <section id="commands" className="sec commands-sec">
      <div className="wrap">
        <div className="section-copy centered">
          <div className="seclabel centered-label">
            <span className="tick" />
            <span className="eyebrow">seven commands</span>
          </div>
          <h2 className="display h2">One interface, multiple expert teams.</h2>
        </div>
        <div className="command-grid">
          {commands.map((command, index) => (
            <Reveal className="command-card" delay={index * 0.04} key={command.name}>
              <code>{command.name}</code>
              <h3>{command.title}</h3>
              <p>{command.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
