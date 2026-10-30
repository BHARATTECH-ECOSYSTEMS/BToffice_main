"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { countUpOnScroll } from "@/lib/animations";

const stats = [
  { to: 300, prefix: "+", label: "Projects Delivered" },
  { to: 100, suffix: "K", label: "Daily Users" },
  { to: 10, prefix: "+", label: "Years of Expertise" },
  { to: 280, prefix: "+", label: "Happy Partners" },
];

/**
 * StatsOrb
 * Stats grid on the left, animated orb visual on the right (awsmd "We Strive to Innovate").
 */
export function StatsOrb() {
  const numRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    stats.forEach((s, i) => {
      const el = numRefs.current[i];
      if (el) countUpOnScroll(el, s.to, { prefix: s.prefix, suffix: s.suffix });
    });
  }, []);

  return (
    <section className="py-16 lg:py-20 bg-brand-bg2">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center justify-between mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            We Strive to Innovate
          </h2>
          <button className="hidden md:inline-flex h-10 px-6 rounded-full border border-brand-border text-sm text-white hover:bg-white/10 transition-colors">
            About us →
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: stats */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-12">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div
                  ref={(el) => { if (el) numRefs.current[i] = el; }}
                  className="font-display text-5xl sm:text-6xl font-bold text-white tracking-tight"
                >
                  0
                </div>
                <div className="mt-2 text-sm text-brand-muted">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Right: animated orb */}
          <div className="relative h-[420px] flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, rgba(77,49,232,0.20), rgba(106,88,255,0.06), rgba(143,123,255,0.25), rgba(106,88,255,0.06), rgba(77,49,232,0.20))",
                filter: "blur(40px)",
              }}
            />
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-[340px] h-[340px] rounded-full border border-brand-border bg-gradient-to-br from-[#040406] via-white/5 to-[#040406] shadow-2xl"
              style={{
                boxShadow:
                  "inset -40px -40px 80px rgba(77,49,232,0.18), inset 40px 40px 80px #040406, 0 30px 80px rgba(77,49,232,0.15)",
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full"
              >
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-brand-glow shadow-[0_0_20px_#8F7BFF]" />
                <div className="absolute bottom-10 right-10 w-1.5 h-1.5 rounded-full bg-brand-primary/70" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StatsOrb;
