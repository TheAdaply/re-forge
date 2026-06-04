import Reveal from "./ui/Reveal.jsx";

const playbooks = [
  {
    source: "Anthropic · Engineering",
    title: "Multi-agent research system",
    text: "Orchestrator-worker decomposition, a 5-dimension rubric, and the scaling rules for how many agents a task warrants.",
    href: "https://www.anthropic.com/engineering/multi-agent-research-system",
    cite: "anthropic.com",
  },
  {
    source: "Anthropic · Research",
    title: "Building effective agents",
    text: "The workflow-vs-agent distinction and the evaluator-optimizer loop that re-forge runs as adversarial gates.",
    href: "https://www.anthropic.com/research/building-effective-agents",
    cite: "anthropic.com",
  },
  {
    source: "NeurIPS 2025",
    title: "MAST failure taxonomy",
    text: "14 multi-agent failure modes, each mapped to a specialist that owns catching it before handoff.",
    href: "https://arxiv.org/abs/2503.13657",
    cite: "arxiv 2503.13657",
  },
  {
    source: "Stanford",
    title: "ACE: Agentic Context Engineering",
    text: "A generation, reflection, and curation loop for durable memory that compounds across sessions.",
    href: "https://arxiv.org/abs/2510.04618",
    cite: "arxiv 2510.04618",
  },
  {
    source: "Research",
    title: "DebateCV",
    text: "Structured debate for resolving contradictions instead of anchoring on the first plausible answer.",
    href: "https://arxiv.org/abs/2507.19090",
    cite: "arxiv 2507.19090",
  },
  {
    source: "Microsoft Research",
    title: "Magentic-One",
    text: "Ledger-based orchestration with bounded retry, so loops terminate instead of spinning.",
    href: "https://arxiv.org/abs/2411.04468",
    cite: "arxiv 2411.04468",
  },
];

export default function Playbooks() {
  return (
    <section id="playbooks" className="sec playbooks-sec">
      <div className="wrap">
        <div className="section-copy centered">
          <div className="seclabel centered-label">
            <span className="tick" />
            <span className="eyebrow">research-backed design</span>
          </div>
          <h2 className="display h2">Your agents run the published playbooks.</h2>
          <p className="lead">
            Every protocol traces back to a primary source — orchestration patterns, failure
            taxonomies, and memory loops from the labs that wrote them down.
          </p>
        </div>
        <div className="playbook-grid">
          {playbooks.map((playbook, index) => (
            <Reveal
              className="command-card playbook-card"
              delay={index * 0.04}
              key={playbook.href}
            >
              <span className="eyebrow playbook-source">{playbook.source}</span>
              <h3>{playbook.title}</h3>
              <p>{playbook.text}</p>
              <a
                className="playbook-link"
                href={playbook.href}
                target="_blank"
                rel="noreferrer"
              >
                {playbook.cite} ↗
              </a>
            </Reveal>
          ))}
        </div>
        <p className="lead playbook-close centered">
          Not personas pretending to be famous engineers — published methods, cited, that your
          agents actually execute.
        </p>
      </div>
    </section>
  );
}
