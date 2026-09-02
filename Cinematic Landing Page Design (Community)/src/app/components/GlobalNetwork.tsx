import React from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';

const stats = [
  { value: "350K+", label: "Businesses using Origin" },
  { value: "1.2B+", label: "Memory nodes indexed" },
  { value: "12ms", label: "Average response latency" },
  { value: "99.9%", label: "Platform uptime SLA" },
];

const testimonials = [
  {
    quote:
      "Origin completely changed how our team interacts with information. It remembers context across months of conversations, connects dots we never could, and just keeps getting smarter.",
    name: "Ananya Sharma",
    role: "CTO, NovaMind Technologies",
    initials: "AS",
    accent: "#6A35FF",
  },
  {
    quote:
      "We replaced six different AI tools with Origin. The unified intelligence layer saved us enormous time and the continuous learning means the system gets better every single week.",
    name: "Rahul Mehta",
    role: "Head of AI, Scalex Systems",
    initials: "RM",
    accent: "#059669",
  },
  {
    quote:
      "Finally, an AI platform built for the long run. The memory architecture is unlike anything else we have evaluated — it handles our enterprise knowledge graph with zero configuration.",
    name: "Priya Nair",
    role: "VP Engineering, DataForge",
    initials: "PN",
    accent: "#4F46E5",
  },
];

export const GlobalNetwork = () => {
  return (
    <section
      className="py-32 px-8 lg:px-16 bg-[#FFFFFF]"
      style={{ fontFamily: "SF Pro Display, Inter, sans-serif" }}
    >
      <div className="max-w-7xl mx-auto">

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6"
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-[#7C3AED] mb-3">
            Loved by modern teams and businesses
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#FAFAFA] rounded-2xl px-6 py-8 border border-[#E4E4E7] text-center"
            >
              <div className="text-4xl lg:text-5xl font-bold text-[#09090B] tracking-tight mb-2">
                {s.value}
              </div>
              <div className="text-[13px] text-[#71717A] leading-snug">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-8%" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-3xl p-8 flex flex-col gap-6"
            >
              {/* Stars */}
              <div className="flex gap-1">
                {[...Array(5)].map((_, si) => (
                  <Star key={si} size={14} fill="#F59E0B" stroke="none" />
                ))}
              </div>

              <p className="text-[15px] text-[#3F3F46] leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="flex items-center gap-3 pt-2 border-t border-[#E4E4E7]">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                  style={{ background: t.accent }}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[#09090B]">{t.name}</div>
                  <div className="text-[12px] text-[#71717A]">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
