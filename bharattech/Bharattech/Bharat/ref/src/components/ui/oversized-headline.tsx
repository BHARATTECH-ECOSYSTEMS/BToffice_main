"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * OversizedHeadline
 * Massive marquee-style headline that scrolls horizontally as the user scrolls vertically.
 * Used as a section divider, awsmd-inspired.
 */
export function OversizedHeadline({
  text = "even user focused value",
  eyebrow = "Our Philosophy",
  description = "As a tight-knit team of experts, we create memorable and emotional websites, digital experiences, and native apps.",
}: {
  text?: string;
  eyebrow?: string;
  description?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const x = useTransform(scrollYProgress, [0, 1], ["10%", "-40%"]);

  return (
    <section ref={ref} className="py-24 lg:py-36 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 mb-16">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
          {eyebrow}
        </p>
        <p className="text-lg text-foreground/80 max-w-xl leading-relaxed">
          {description}
        </p>
      </div>
      <motion.h2
        style={{ x }}
        className="font-display font-bold tracking-tight text-foreground whitespace-nowrap text-[18vw] leading-[0.9]"
      >
        {text}
      </motion.h2>
    </section>
  );
}

export default OversizedHeadline;
