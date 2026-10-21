"use client";

import { motion } from "framer-motion";

/**
 * ResearchHero
 * Deep-blue cinematic hero with animated light beams fanning from the right,
 * inspired by the Titan reference. Pure CSS/SVG + framer-motion (no extra deps).
 */
export function ResearchHero({
  eyebrow = "Research",
  title1 = "Powering Sovereign",
  title2 = "AI Research",
  tagline = ["Innovation.", "Implementation.", "Impact."],
}: {
  eyebrow?: string;
  title1?: string;
  title2?: string;
  tagline?: string[];
}) {
  // Beams fanning from a focal point on the right
  const beams = [
    { rotate: -28, delay: 0.1, opacity: 0.55, width: 1400 },
    { rotate: -14, delay: 0.25, opacity: 0.7, width: 1500 },
    { rotate: 0, delay: 0.0, opacity: 0.85, width: 1600 },
    { rotate: 12, delay: 0.35, opacity: 0.65, width: 1450 },
    { rotate: 26, delay: 0.5, opacity: 0.5, width: 1350 },
  ];

  return (
    <section
      className="relative w-full overflow-hidden rounded-b-[2.5rem]"
      style={{
        background:
          "radial-gradient(120% 90% at 75% 50%, #6A58FF 0%, #4D31E8 45%, #040406 100%)",
      }}
    >
      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_40%,rgba(0,0,0,0.55)_100%)]" />

      {/* Animated light beams (fanning from right) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute"
          style={{
            top: "50%",
            right: "-10%",
            transform: "translateY(-50%)",
          }}
        >
          {beams.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scaleX: 0.6 }}
              animate={{
                opacity: [0, b.opacity, b.opacity * 0.75, b.opacity],
                scaleX: [0.6, 1, 0.95, 1],
              }}
              transition={{
                duration: 6,
                delay: b.delay,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: b.width,
                height: 90,
                transform: `translateY(-50%) rotate(${b.rotate}deg)`,
                transformOrigin: "right center",
                background:
                  "linear-gradient(90deg, transparent 0%, hsl(225 100% 70% / 0.0) 5%, hsl(225 100% 72% / 0.55) 45%, hsl(220 100% 85% / 0.85) 75%, hsl(0 0% 100% / 0.95) 100%)",
                filter: "blur(14px)",
                borderRadius: "9999px",
              }}
            />
          ))}

          {/* Bright focal core */}
          <motion.div
            initial={{ opacity: 0.6, scale: 0.9 }}
            animate={{ opacity: [0.6, 1, 0.7, 1], scale: [0.9, 1.05, 0.95, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              top: "-60px",
              right: "-60px",
              width: 220,
              height: 220,
              borderRadius: "9999px",
              background:
                "radial-gradient(circle, hsl(220 100% 92% / 0.95) 0%, hsl(225 100% 70% / 0.55) 40%, transparent 70%)",
              filter: "blur(8px)",
            }}
          />
        </div>

        {/* Soft ambient glow on left */}
        <div className="absolute -left-32 top-1/3 h-[500px] w-[500px] rounded-full bg-[rgba(77,49,232,0.25)] blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-16 lg:py-24 min-h-[70vh] flex flex-col items-center justify-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-xs uppercase tracking-[0.3em] text-white/60 mb-6"
        >
          {eyebrow}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
          className="font-display font-bold tracking-tight leading-[0.95] text-5xl sm:text-6xl md:text-7xl lg:text-8xl"
        >
          <span className="bg-gradient-to-b from-white via-white/90 to-white/50 bg-clip-text text-transparent">
            {title1}
          </span>
          <br />
          <span className="bg-gradient-to-b from-white via-white/85 to-white/40 bg-clip-text text-transparent">
            {title2}
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 md:mt-24 space-y-1 text-sm sm:text-base text-white/70 leading-relaxed"
        >
          {tagline.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade into page */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-brand-bg to-transparent" />
    </section>
  );
}

export default ResearchHero;
