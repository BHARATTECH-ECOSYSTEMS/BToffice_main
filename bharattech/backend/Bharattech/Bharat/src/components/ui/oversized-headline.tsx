"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { scrollReveal } from "@/lib/animations";

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
  const introRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const x = useTransform(scrollYProgress, [0, 1], ["10%", "-40%"]);

  useEffect(() => {
    if (introRef.current) scrollReveal(introRef.current, { distance: 22, duration: 700 });
  }, []);

  // Slow shimmer sweep across the oversized text — a subtle premium accent, no copy change.
  useEffect(() => {
    if (!headlineRef.current) return;
    animate(headlineRef.current, {
      backgroundPositionX: ["0%", "200%"],
      duration: 8000,
      loop: true,
      ease: "linear",
    });
  }, []);

  return (
    <section ref={ref} className="py-16 lg:py-24 overflow-hidden bg-brand-bg">
      <div ref={introRef} style={{ opacity: 0 }} className="max-w-[1200px] mx-auto px-6 mb-16">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-muted mb-4">
          {eyebrow}
        </p>
        <p className="text-lg text-white/80 max-w-xl leading-relaxed">
          {description}
        </p>
      </div>
      <motion.h2
        ref={headlineRef}
        style={{
          x,
          backgroundImage: "linear-gradient(100deg, #FFFFFF 40%, #8F7BFF 50%, #FFFFFF 60%)",
          backgroundSize: "250% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
        className="font-display font-bold tracking-tight whitespace-nowrap text-[18vw] leading-[0.9]"
      >
        {text}
      </motion.h2>
    </section>
  );
}

export default OversizedHeadline;
