"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "+300", label: "Projects Delivered" },
  { value: "100K", label: "Daily Users" },
  { value: "+10", label: "Years of Expertise" },
  { value: "+280", label: "Happy Partners" },
];

/**
 * StatsOrb
 * Stats grid on the left, animated orb visual on the right (awsmd "We Strive to Innovate").
 */
export function StatsOrb() {
  return (
    <section className="py-24 lg:py-32">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center justify-between mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            We Strive to Innovate
          </h2>
          <button className="hidden md:inline-flex h-10 px-6 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors">
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
                <div className="font-display text-5xl sm:text-6xl font-bold text-foreground tracking-tight">
                  {s.value}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
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
                  "conic-gradient(from 0deg, hsl(var(--accent) / 0.15), hsl(var(--accent) / 0.05), hsl(var(--accent) / 0.2), hsl(var(--accent) / 0.05), hsl(var(--accent) / 0.15))",
                filter: "blur(40px)",
              }}
            />
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-[340px] h-[340px] rounded-full border border-border bg-gradient-to-br from-background via-muted to-background shadow-2xl"
              style={{
                boxShadow:
                  "inset -40px -40px 80px hsl(var(--accent) / 0.15), inset 40px 40px 80px hsl(var(--background)), 0 30px 80px hsl(var(--accent) / 0.1)",
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full"
              >
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent shadow-[0_0_20px_hsl(var(--accent))]" />
                <div className="absolute bottom-10 right-10 w-1.5 h-1.5 rounded-full bg-accent/70" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StatsOrb;
