"use client";

import { motion } from "framer-motion";

/**
 * BentoShowcase
 * Mixed-size grid of product/screenshot cards (awsmd-inspired bento layout).
 * Uses our violet-blue accent on a clean white background.
 */
export function BentoShowcase() {
  const cards = [
    { title: "Health Charts", tag: "Wellness", h: "row-span-2", grad: "from-accent/15 to-accent/5" },
    { title: "Battery Today", tag: "Productivity", h: "", grad: "from-accent/20 to-background" },
    { title: "Welcome, Charlie", tag: "Onboarding", h: "", grad: "from-accent/10 to-accent/25" },
    { title: "Balance 44.99", tag: "Finance", h: "", grad: "from-accent/15 to-background" },
    { title: "Your Projects (4)", tag: "Workspace", h: "row-span-2", grad: "from-background to-accent/15" },
    { title: "$25,685", tag: "Revenue", h: "", grad: "from-accent/20 to-accent/5" },
    { title: "Composer", tag: "Creator Tools", h: "", grad: "from-accent/10 to-background" },
  ];

  return (
    <section className="py-24 lg:py-32 bg-foreground text-background">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-background/50 mb-4">
              Smart Development
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl">
              Data driven, user focused.
            </h2>
          </div>
          <p className="text-background/60 max-w-sm leading-relaxed">
            A glimpse into the products and platforms we ship — built with sovereign infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[200px] gap-4">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className={`${c.h} relative rounded-3xl overflow-hidden border border-background/10 bg-gradient-to-br ${c.grad} group cursor-pointer hover:scale-[1.02] transition-transform`}
            >
              <div className="absolute inset-0 bg-background/5" />
              <div className="relative h-full p-5 flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-wider text-background/60 px-2 py-1 rounded-full bg-background/10 w-fit">
                  {c.tag}
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default BentoShowcase;
