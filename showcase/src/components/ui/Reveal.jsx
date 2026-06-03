import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function Reveal({ children, delay = 0, y = 18, as = "div", style, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const M = motion[as] || motion.div;

  return (
    <M
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={style}
    >
      {children}
    </M>
  );
}
