import Reveal from "./ui/Reveal.jsx";

const VENUE = "https://scale-icml-2026.github.io/";

// Titles, author order, and findings are verbatim from each paper's title page.
const papers = [
  {
    title:
      "Compute-Aware Mixture-of-Agents: Verifier-Gated Adaptive Aggregation under a Fixed Token Budget",
    authors: "Shine Gupta · S Akash",
    finding: "A verifier decides per query when to stop aggregating — MoA compute only where it pays.",
    href: "https://openreview.net/forum?id=reVvPpjoje",
  },
  {
    title: "Who Hallucinates Tools, How Often, and What Fixes It?",
    authors: "S Akash · Shine Gupta",
    finding:
      "Frontier models: 0% tool fabrication over 6,000+ calls. Open-weight: up to 10.4%. One structured re-prompt clears every logged fabrication.",
    href: "https://openreview.net/forum?id=njwFtNF0OW",
  },
];

export default function PapersProof() {
  return (
    <section id="papers" className="sec papers-sec">
      <div className="wrap">
        <div className="section-copy centered">
          <div className="seclabel centered-label">
            <span className="tick" />
            <span className="eyebrow">shipped research</span>
          </div>
          <h2 className="display h2">Two papers, both accepted.</h2>
          <p className="lead papers-kicker">
            The research and engineering runs behind both papers were orchestrated with re-forge
            teams.
          </p>
        </div>

        <div className="papers-grid">
          {papers.map((paper, index) => (
            <Reveal className="paper-card" delay={index * 0.06} key={paper.href}>
              <span className="paper-fold" aria-hidden="true" />
              <a className="paper-link" href={paper.href} target="_blank" rel="noreferrer">
                <h3 className="paper-title paper-serif">{paper.title}</h3>
                <p className="paper-authors paper-serif">{paper.authors}</p>
                <p className="paper-finding">{paper.finding}</p>
                <span className="paper-note">OpenReview · public at camera-ready ↗</span>
              </a>
              <a className="paper-venue" href={VENUE} target="_blank" rel="noreferrer">
                ICML 2026 · SCALE Workshop — accepted ↗
              </a>
            </Reveal>
          ))}
        </div>

        <p className="lead papers-close centered">
          Findings fed straight back into the agents&apos; prompts.
        </p>
      </div>
    </section>
  );
}
