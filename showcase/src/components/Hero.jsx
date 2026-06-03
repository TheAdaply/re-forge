import { motion } from "framer-motion";

const rise = (delay) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function Hero({ onDemo }) {
  return (
    <section id="about" className="sec hero-sec hero-center">
      <div className="wrap hero-stack">
        <motion.div {...rise(0)} className="eyebrow">
          Hackathon showcase · Claude Code skill stack
        </motion.div>
        <motion.h1 {...rise(0.06)} className="display h1 hero-title">
          One prompt. A whole engineering org's worth of rigor.
        </motion.h1>
        <motion.p {...rise(0.14)} className="lead hero-lead">
          re-forge turns Claude Code into a hardened multi-agent operating procedure with
          adversarial gates, durable memory, and evidence files. See it run a real task below.
        </motion.p>
        <motion.div {...rise(0.22)} className="hero-actions">
          <button className="btn btn-primary" onClick={onDemo} type="button">
            Try the skill
          </button>
          <a href="#commands" className="btn btn-ghost">
            Explore the commands
          </a>
        </motion.div>
      </div>
    </section>
  );
}
