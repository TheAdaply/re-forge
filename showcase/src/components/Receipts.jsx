import Reveal from "./ui/Reveal.jsx";
import { proofStats, receipts } from "../data/forgeData.js";

export default function Receipts() {
  const { feature, links } = receipts;

  return (
    <section id="receipts" className="sec receipts-sec">
      <div className="wrap">
        <div className="section-copy centered">
          <div className="seclabel centered-label">
            <span className="tick" />
            <span className="eyebrow">receipts, not adjectives</span>
          </div>
          <h2 className="display h2">Claims you can click.</h2>
        </div>

        <div className="proof-grid receipts-stats">
          {proofStats.map(([value, label], index) => (
            <Reveal className="proof-stat" delay={index * 0.05} key={label}>
              <span className="proof-value display">{value}</span>
              <span>{label}</span>
            </Reveal>
          ))}
        </div>

        <div className="receipts-evidence">
          <Reveal className="receipt-feature panel panel-vignette" delay={0.05}>
            <span className="eyebrow receipt-feature-label">{feature.label}</span>
            <p className="receipt-feature-body">{feature.body}</p>
            <a
              className="receipt-quote"
              href={feature.href}
              target="_blank"
              rel="noreferrer"
            >
              <span className="receipt-quote-mark">finding</span>
              <span className="receipt-quote-text">“{feature.quote}”</span>
              <span className="receipt-cite mono">{feature.cite} ↗</span>
            </a>
          </Reveal>

          <div className="receipt-links">
            {links.map((link, index) => (
              <Reveal className="receipt-chip" delay={0.1 + index * 0.05} key={link.href}>
                <a
                  className="receipt-chip-link"
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="chip receipt-chip-tag">{link.tag}</span>
                  <strong className="receipt-chip-title">{link.title}</strong>
                  <span className="receipt-cite mono">{link.cite} ↗</span>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
