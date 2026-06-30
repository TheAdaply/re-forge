import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const steps = [
  {
    n: "1",
    title: "Install the skill",
    note: "Clones the repo and installs all teams into ~/.claude/.",
    code: "git clone https://github.com/TheAdaply/re-forge.git\ncd re-forge\nbash setup.sh",
  },
  {
    n: "2",
    title: "Restart Claude Code",
    note: "Quit and relaunch so it loads the new agents and skills.",
    code: "bash scripts/doctor.sh   # verify the install",
  },
  {
    n: "3",
    title: "Run the demo prompt",
    note: "Try the same real task you saw in the terminals.",
    code: "/engineer add Stripe checkout + webhooks to our store\n/security audit this repo before release",
  },
  {
    n: "4",
    title: "Inspect the evidence",
    note: "Proof that every specialist actually ran lands on disk.",
    code: "cat .claude/teams/research/*/SYNTHESIS.md",
  },
];

function CopyBlock({ code }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="copy-block">
      <pre>
        <code>{code}</code>
      </pre>
      <button className="copy-btn" onClick={copy} type="button">
        {copied ? "copied ✓" : "copy"}
      </button>
    </div>
  );
}

export default function DemoModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Try the skill"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-top">
              <div>
                <span className="eyebrow">Try it yourself</span>
                <h3 className="display">Run re-forge in about a minute.</h3>
              </div>
              <button className="modal-close" onClick={onClose} type="button" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="modal-steps">
              {steps.map((step) => (
                <div className="modal-step" key={step.n}>
                  <span className="step-num">{step.n}</span>
                  <div className="step-body">
                    <strong>{step.title}</strong>
                    <p>{step.note}</p>
                    <CopyBlock code={step.code} />
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-foot">
              <span className="mono">Requires Claude Code · Python 3.11+ · gh CLI</span>
              <a
                className="btn btn-primary"
                href="https://github.com/TheAdaply/re-forge"
                target="_blank"
                rel="noreferrer"
              >
                Open GitHub repo
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
