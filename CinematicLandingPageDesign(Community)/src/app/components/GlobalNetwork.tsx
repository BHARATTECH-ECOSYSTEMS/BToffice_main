import React from 'react';
import { motion } from 'motion/react';
import { Star, Sparkles } from 'lucide-react';

const stats = [
  { value: "350K+", label: "Businesses using Origin", subtext: "Across 45+ countries" },
  { value: "1.2B+", label: "Memory nodes indexed", subtext: "Real-time vector graphs" },
  { value: "12ms", label: "Average response latency", subtext: "Sub-second inference" },
  { value: "99.99%", label: "Platform uptime SLA", subtext: "Enterprise reliability" },
];

const testimonials = [
  {
    quote:
      "Origin completely changed how our team interacts with information. It remembers context across months of conversations, connects dots we never could, and just keeps getting smarter.",
    name: "Ananya Sharma",
    role: "CTO, NovaMind Technologies",
    initials: "AS",
    accent: "#6A35FF",
    company: "NovaMind",
  },
  {
    quote:
      "We replaced six different AI tools with Origin. The unified intelligence layer saved us enormous time and the continuous learning means the system gets better every single week.",
    name: "Rahul Mehta",
    role: "Head of AI, Scalex Systems",
    initials: "RM",
    accent: "#7C3AED",
    company: "Scalex",
  },
  {
    quote:
      "Finally, an AI platform built for the long run. The memory architecture is unlike anything else we evaluated — it handles our enterprise knowledge graph with zero configuration.",
    name: "Priya Nair",
    role: "VP Engineering, DataForge",
    initials: "PN",
    accent: "#4F46E5",
    company: "DataForge",
  },
  {
    quote:
      "The latency and context retention are mind-blowing. Our customer support resolution time dropped by 64% within two weeks of deploying Origin agents.",
    name: "David Chen",
    role: "Lead Architect, HyperScale AI",
    initials: "DC",
    accent: "#2563EB",
    company: "HyperScale",
  },
  {
    quote:
      "Integrating Origin with our multi-model pipelines was seamless. It acts as the intelligent nervous system of our entire technical ecosystem.",
    name: "Sarah Jenkins",
    role: "Director of Product, CloudCore",
    initials: "SJ",
    accent: "#9333EA",
    company: "CloudCore",
  },
  {
    quote:
      "The privacy-first local memory clustering gave us total compliance confidence without sacrificing any of the generative intelligence power.",
    name: "Vikram Malhotra",
    role: "Founder, Synthetix Labs",
    initials: "VM",
    accent: "#6A35FF",
    company: "Synthetix",
  },
];

export const GlobalNetwork = () => {
  // Duplicate for seamless infinite loop
  const marqueeItems = [...testimonials, ...testimonials];

  return (
    <section
      className="py-28 lg:py-36 bg-[#FFFFFF] overflow-hidden"
      style={{ fontFamily: "SF Pro Display, Inter, sans-serif" }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes marquee-horizontal {
              0% {
                transform: translate3d(0, 0, 0);
              }
              100% {
                transform: translate3d(-50%, 0, 0);
              }
            }

            .marquee-track {
              display: flex;
              width: max-content;
              animation: marquee-horizontal 38s linear infinite;
              will-change: transform;
            }

            .marquee-track:hover {
              animation-play-state: paused !important;
            }

            .marquee-container:hover .marquee-track {
              animation-play-state: paused !important;
            }
          `,
        }}
      />

      <div className="max-w-7xl mx-auto px-8 lg:px-16">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6A35FF]/10 text-[#6A35FF] text-xs font-semibold tracking-wider uppercase mb-4">
            <Sparkles size={13} className="text-[#6A35FF]" />
            Global Performance & Trust
          </div>
          <h2 className="text-3xl lg:text-5xl font-semibold tracking-tight text-[#09090B] leading-tight max-w-2xl mx-auto">
            Loved by fast-moving teams and enterprise leaders
          </h2>
        </motion.div>

        {/* Stats Row with Subtle Hover Effects */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 mb-24">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="group relative bg-[#FAFAFA] hover:bg-white rounded-3xl p-6 lg:p-8 border border-[#E4E4E7] hover:border-[#6A35FF]/30 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_12px_32px_-12px_rgba(106,53,255,0.12)] cursor-default overflow-hidden flex flex-col justify-between"
            >
              {/* Subtle top ambient glow line on hover */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#6A35FF] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div>
                <div className="text-3xl lg:text-5xl font-bold text-[#09090B] group-hover:text-[#6A35FF] tracking-tight mb-2 transition-colors duration-300">
                  {s.value}
                </div>
                <div className="text-[14px] font-medium text-[#27272A] leading-snug mb-1">
                  {s.label}
                </div>
              </div>
              <div className="text-[12px] text-[#A1A1AA] font-normal mt-3 pt-3 border-t border-[#F4F4F5] group-hover:border-[#E4E4E7] transition-colors duration-300">
                {s.subtext}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Testimonials Marquee with Smooth Horizontal Scroll & Pause on Hover */}
      <div className="relative w-full marquee-container">
        {/* Soft edge gradient fades for smooth mask appearance */}
        <div className="absolute left-0 top-0 bottom-0 w-24 lg:w-48 bg-gradient-to-r from-white via-white/80 to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 lg:w-48 bg-gradient-to-l from-white via-white/80 to-transparent z-20 pointer-events-none" />

        {/* Marquee Track */}
        <div className="marquee-track py-4 gap-6 px-4">
          {marqueeItems.map((t, index) => (
            <div
              key={`${t.name}-${index}`}
              className="w-[340px] sm:w-[380px] lg:w-[420px] flex-shrink-0 bg-[#FAFAFA] hover:bg-white border border-[#E4E4E7] hover:border-[#6A35FF]/35 rounded-3xl p-7 lg:p-8 flex flex-col justify-between gap-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(106,53,255,0.08)] transition-all duration-300 ease-out hover:-translate-y-1 group/card"
            >
              <div>
                {/* Header: 5 Stars + Company Tag */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, si) => (
                      <Star
                        key={si}
                        size={15}
                        fill="#F59E0B"
                        stroke="none"
                        className="drop-shadow-[0_1px_2px_rgba(245,158,11,0.3)]"
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F4F4F5] group-hover/card:bg-[#6A35FF]/10 text-[#71717A] group-hover/card:text-[#6A35FF] transition-colors duration-200">
                    {t.company}
                  </span>
                </div>

                {/* Quote */}
                <p className="text-[15px] text-[#3F3F46] leading-relaxed select-none">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#E4E4E7]/70 group-hover/card:border-[#6A35FF]/20 transition-colors duration-300">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm"
                  style={{ background: t.accent }}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[#09090B] group-hover/card:text-[#6A35FF] transition-colors duration-200">
                    {t.name}
                  </div>
                  <div className="text-[12px] text-[#71717A]">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
