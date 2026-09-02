import React from 'react';
import { motion } from 'motion/react';
import { PlugZap, BrainCircuit, Rocket } from 'lucide-react';
import { GlowCard } from '@/components/ui/spotlight-card';

const steps = [
  {
    number: "01",
    icon: PlugZap,
    title: "Connect your sources",
    description:
      "Link documents, databases, APIs, communication tools, and live data feeds in minutes. Origin ingests and structures everything into a unified knowledge graph.",
    accent: "#6A35FF",
    accentLight: "rgba(106, 53, 255, 0.08)",
    glowColor: "purple" as const,
  },
  {
    number: "02",
    icon: BrainCircuit,
    title: "Intelligence continuously learns",
    description:
      "The memory engine learns from every interaction, decision, and outcome. Unlike static models, Origin evolves with your organization — building deeper context over time.",
    accent: "#7C3AED",
    accentLight: "rgba(124, 58, 237, 0.08)",
    glowColor: "purple" as const,
  },
  {
    number: "03",
    icon: Rocket,
    title: "Deploy across every interface",
    description:
      "Surface intelligence through chat, API, web apps, voice, or custom agents. One unified intelligence layer — infinite ways to interact with it.",
    accent: "#4F46E5",
    accentLight: "rgba(79, 70, 229, 0.08)",
    glowColor: "purple" as const,
  },
];

export const Architecture = () => {
  return (
    <section
      className="py-32 px-8 lg:px-16 bg-[#FAFAFA]"
      style={{ fontFamily: "SF Pro Display, Inter, sans-serif" }}
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-[#7C3AED] mb-3">
            How It Works
          </p>
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#09090B] leading-tight">
            Launch your AI assistant
            <br />
            <span className="text-[#6A35FF]">in minutes</span>
          </h2>
        </motion.div>

        {/* Steps container */}
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Continuous Flow Line Track (Desktop) */}
          <div className="hidden lg:block absolute top-[56px] left-[10%] right-[10%] h-[3px] bg-[#E4E4E7] rounded-full overflow-hidden pointer-events-none z-0">
            {/* Continuous traveling glowing energy beam */}
            <motion.div
              className="absolute top-0 bottom-0 w-64 bg-gradient-to-r from-transparent via-[#6A35FF] to-transparent shadow-[0_0_16px_#6A35FF]"
              animate={{
                x: ['-100%', '450%'],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </div>

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-8%" }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 flex flex-col h-full"
              >
                <GlowCard
                  customSize={true}
                  glowColor={step.glowColor}
                  className="w-full h-full flex flex-col justify-between group hover:border-[#6A35FF]/40 transition-all duration-300"
                >
                  <div>
                    {/* Step header: icon + step number + live pill badge */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 relative bg-white shadow-xs border border-black/5"
                          style={{ background: step.accentLight }}
                        >
                          <Icon size={22} style={{ color: step.accent }} strokeWidth={1.8} />
                          {/* Dynamic pulse node on icon */}
                          <motion.div
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#6A35FF]"
                            animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
                            style={{ boxShadow: "0 0 8px rgba(106,53,255,0.8)" }}
                          />
                        </div>
                        <span
                          className="text-4xl font-bold leading-none tracking-tight"
                          style={{ color: step.accent }}
                        >
                          {step.number}
                        </span>
                      </div>

                      {/* Step indicator tag */}
                      <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#6A35FF]/10 text-[#6A35FF]">
                        Step {i + 1}
                      </span>
                    </div>

                    <h3 className="text-xl font-semibold text-[#09090B] mb-3 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-[15px] text-[#52525B] leading-relaxed">{step.description}</p>
                  </div>

                  {/* Bottom circuit beam indicator line */}
                  <div className="mt-8 relative h-1 rounded-full bg-[#F4F4F5] overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 w-1/2 rounded-full"
                      style={{ background: `linear-gradient(90deg, transparent, ${step.accent}, transparent)` }}
                      animate={{ x: ['-100%', '250%'] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                    />
                  </div>
                </GlowCard>
              </motion.div>
            );
          })}
        </div>

        {/* CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-16"
        >
          <button className="px-8 py-3.5 bg-[#6A35FF] text-white rounded-full font-medium text-[15px] hover:bg-[#7C3AED] transition-colors shadow-[0_4px_24px_rgba(106,53,255,0.3)] hover:shadow-[0_4px_32px_rgba(106,53,255,0.45)]">
            Get started free
          </button>
          <button className="px-8 py-3.5 border border-[#E4E4E7] text-[#09090B] rounded-full font-medium text-[15px] hover:border-[#6A35FF]/40 hover:text-[#6A35FF] transition-colors bg-white">
            View documentation
          </button>
        </motion.div>
      </div>
    </section>
  );
};

