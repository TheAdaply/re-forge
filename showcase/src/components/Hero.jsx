import { useState } from "react";
import { motion } from "framer-motion";

const rise = (delay) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
});

const REPO = "https://github.com/Akasxh/re-forge";

// Every chip is traceable to the repo:
//  - LICENSE (MIT License header)
//  - .github/workflows/ci.yml (fresh-HOME install + doctor on every push)
//  - docs/CATALOG.md / README.md ("6 teams + forge + 119 skills")
//  - README.md ("Status: v0.4 pre-release")
const trustChips = [
  { label: "MIT licensed", href: `${REPO}/blob/main/LICENSE` },
  { label: "CI green on every push", href: `${REPO}/actions/workflows/ci.yml` },
  { label: "119 skills · 6 teams + forge", href: `${REPO}/blob/main/docs/CATALOG.md` },
  { label: "v0.4 pre-release", href: `${REPO}#readme` },
];

const INSTALL = "git clone https://github.com/Akasxh/re-forge.git && cd re-forge && bash setup.sh";

export default function Hero({ onDemo }) {
  const [copied, setCopied] = useState(false);

  const copyInstall = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="about" className="sec hero-sec hero-center">
      <div className="wrap hero-stack">
        <motion.div {...rise(0)} className="eyebrow">
          Multi-agent operating procedure · Claude Code · Cursor · Codex
        </motion.div>
        <motion.h1 {...rise(0.06)} className="display h1 hero-title">
          One prompt. A whole engineering org's worth of rigor.
        </motion.h1>
        <motion.p {...rise(0.14)} className="lead hero-lead">
          re-forge turns your coding agent — Claude Code, Cursor, Codex and beyond — into a hardened
          multi-agent operating procedure with adversarial gates, durable memory, and evidence files.
          See it run a real task below.
        </motion.p>
        <motion.div {...rise(0.22)} className="hero-actions">
          <button className="btn btn-primary" onClick={onDemo} type="button">
            Try the skill
          </button>
          <a
            className="btn btn-ghost"
            href={REPO}
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
          </a>
          <a href="#commands" className="btn btn-ghost">
            Explore the commands
          </a>
        </motion.div>

        <motion.ul {...rise(0.3)} className="hero-trust" aria-label="Project facts">
          {trustChips.map((chip) => (
            <li key={chip.label}>
              <a
                className="trust-chip"
                href={chip.href}
                target="_blank"
                rel="noreferrer"
              >
                {chip.label}
              </a>
            </li>
          ))}
        </motion.ul>

        <motion.div {...rise(0.38)} className="hero-install panel" aria-label="Install re-forge">
          <div className="terminal-top">
            <span />
            <span />
            <span />
            <strong>install</strong>
          </div>
          <div className="hero-install-body">
            <code className="hero-install-cmd">
              <span className="hero-install-prompt">$</span> git clone {REPO}.git &amp;&amp; cd
              re-forge &amp;&amp; bash setup.sh
            </code>
            <button
              className="copy-btn hero-install-copy"
              onClick={copyInstall}
              type="button"
              aria-label="Copy install command"
            >
              {copied ? "copied ✓" : "copy"}
            </button>
          </div>
          <p className="hero-install-verify mono">
            <span className="hero-install-prompt">verify:</span> bash scripts/doctor.sh
          </p>
        </motion.div>
      </div>
    </section>
  );
}
