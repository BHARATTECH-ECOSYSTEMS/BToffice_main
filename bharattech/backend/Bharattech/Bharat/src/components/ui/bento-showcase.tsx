"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { attachHoverLift } from "@/lib/animations";

/**
 * BentoShowcase
 * Mixed-size grid of product/screenshot cards (awsmd-inspired bento layout).
 * Brand violet/blue accents on the dark brand background.
 */
export function BentoShowcase() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-bento-card]");
    const cleanups = Array.from(cards).map((el) => attachHoverLift(el, { lift: 6, scale: 1.015 }));
    return () => cleanups.forEach((c) => c());
  }, []);

  const cards = [
    { title: "Health Charts", tag: "Wellness", h: "row-span-2", grad: "from-[#4D31E8]/45 to-[#4D31E8]/10" },
    { title: "Battery Today", tag: "Productivity", h: "", grad: "from-[#6A58FF]/50 to-white/5" },
    { title: "Welcome, Charlie", tag: "Onboarding", h: "", grad: "from-[#4D31E8]/35 to-[#8F7BFF]/50" },
    { title: "Balance 44.99", tag: "Finance", h: "", grad: "from-[#6A58FF]/45 to-white/5" },
    { title: "Your Projects (4)", tag: "Workspace", h: "row-span-2", grad: "from-white/5 to-[#4D31E8]/45" },
    { title: "$25,685", tag: "Revenue", h: "", grad: "from-[#8F7BFF]/50 to-[#4D31E8]/10" },
    { title: "Composer", tag: "Creator Tools", h: "", grad: "from-[#4D31E8]/35 to-white/5" },
  ];

  return (
    <section className="py-16 lg:py-20 bg-brand-bg2 text-white">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-4">
              Smart Development
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl text-white">
              Data driven, user focused.
            </h2>
          </div>
          <p className="text-white/60 max-w-sm leading-relaxed">
            A glimpse into the products and platforms we ship — built with sovereign infrastructure.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-4 auto-rows-[200px] gap-4">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              data-bento-card
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className={`${c.h} relative rounded-3xl overflow-hidden border border-brand-border bg-gradient-to-br ${c.grad} group cursor-pointer`}
            >
              <div className="absolute inset-0 bg-white/5" />
              <div className="relative h-full p-5 flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-wider text-white/60 px-2 py-1 rounded-full bg-white/10 w-fit">
                  {c.tag}
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">{c.title}</h3>
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
