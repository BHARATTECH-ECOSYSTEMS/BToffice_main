"use client";

import { motion } from "framer-motion";
import { QRCode } from "@/components/ui/qr-code";

const subsidiaries = [
  {
    name: "Collegecue",
    tagline: "Student Lifecycle AI",
    eyebrow: "Scan to visit",
    badge: "students",
    href: "https://collegecue.com",
  },
  {
    name: "Rivinity",
    tagline: "Multi-functional AI Suite",
    eyebrow: "Scan to visit",
    badge: "ai suite",
    href: "https://rivinity.com",
  },
  {
    name: "RECAG",
    tagline: "GPU & Research Ecosystem",
    eyebrow: "Scan to visit",
    badge: "gpu network",
    href: "https://recag.com",
  },
];

export function SubsidiariesSection() {
  return (
    <section className="py-24 lg:py-32">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            The Ecosystem
          </p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.05]">
            Three platforms, one{" "}
            <span className="text-accent">sovereign mission</span>.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Bharattech operates a family of focused subsidiaries — each building India's AI future
            in students, software, and silicon.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {subsidiaries.map((s, i) => (
            <motion.a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative p-6 rounded-3xl border border-border bg-card hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col"
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-sm text-muted-foreground">{s.eyebrow}</p>
                  <h3 className="font-display text-2xl font-bold text-foreground tracking-tight mt-1">
                    {s.name}
                  </h3>
                </div>
                <span className="text-xs text-accent font-medium pt-1">
                  {s.badge}
                </span>
              </div>

              <div
                className="rounded-2xl p-4 flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--accent) / 0.85) 100%)",
                }}
              >
                <QRCode
                  value={s.href}
                  size={260}
                  fgColor="hsl(var(--accent-foreground))"
                  bgColor="transparent"
                  className="w-full h-auto"
                />
              </div>

              <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
                {s.tagline}
              </p>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default SubsidiariesSection;
