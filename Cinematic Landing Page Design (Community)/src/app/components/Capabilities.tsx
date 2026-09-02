import React from 'react';
import { motion } from 'motion/react';
import { Brain, Layers, Zap } from 'lucide-react';

const features = [
  {
    eyebrow: "Persistent Memory",
    title: "Intelligence that never forgets",
    description:
      "Every interaction, decision, and piece of knowledge is retained forever. Our memory engine continuously indexes context so your AI always picks up right where it left off — across every session, every device, every agent.",
    icon: Brain,
    bg: "from-[#EDE9FF] to-[#F5F3FF]",
    iconBg: "bg-[#6A35FF]/10",
    iconColor: "text-[#6A35FF]",
    visual: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {[
          { text: "User context loaded", sub: "Real-time sync" },
          { text: "Prior session recalled", sub: "Instant retrieval" },
          { text: "Knowledge graph updated", sub: "Continuous learning" },
          { text: "Agent memory synced", sub: "Multi-agent state" },
        ].map((t, i) => (
          <motion.div
            key={t.text}
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 * i, duration: 0.4 }}
            className="flex items-center gap-3.5 bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-[#6A35FF]/15 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-3 h-3 rounded-full bg-[#6A35FF] flex-shrink-0" style={{ boxShadow: "0 0 8px rgba(106,53,255,0.7)" }} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#18181B]">{t.text}</span>
              <span className="text-xs text-[#71717A]">{t.sub}</span>
            </div>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    eyebrow: "Unified Platform",
    title: "One intelligence. Every capability.",
    description:
      "No more stitching together 20 different tools. Research, reasoning, vision, voice, code execution, and workflow automation all live inside one continuously learning intelligence layer.",
    icon: Layers,
    bg: "from-[#E8F5F0] to-[#F0FBF7]",
    iconBg: "bg-[#059669]/10",
    iconColor: "text-[#059669]",
    visual: (
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 w-full">
        {[
          { cap: "Research", detail: "Deep Search" },
          { cap: "Vision", detail: "Multimodal" },
          { cap: "Voice", detail: "Real-time Audio" },
          { cap: "Code", detail: "Sandbox Runtime" },
          { cap: "Memory", detail: "Vector Engine" },
          { cap: "Agents", detail: "Autonomous" },
          { cap: "Reasoning", detail: "Chain of Thought" },
          { cap: "Workflow", detail: "DAG Execution" },
          { cap: "APIs", detail: "REST & gRPC" },
        ].map((item, i) => (
          <motion.div
            key={item.cap}
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 * i, duration: 0.35 }}
            className="flex flex-col items-center justify-center bg-white/80 backdrop-blur-md rounded-2xl py-3.5 px-3 border border-[#059669]/15 shadow-sm hover:shadow-md transition-all text-center"
          >
            <span className="text-xs font-bold text-[#09090B]">{item.cap}</span>
            <span className="text-[11px] font-medium text-[#059669] mt-0.5">{item.detail}</span>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    eyebrow: "Instant Deployment",
    title: "Deploy in minutes, scale infinitely",
    description:
      "Connect your data sources, configure your agents, and ship. Our infrastructure handles scaling, security, and sovereign compliance automatically — so you focus on building, not ops.",
    icon: Zap,
    bg: "from-[#EEF2FF] to-[#F5F7FF]",
    iconBg: "bg-[#4F46E5]/10",
    iconColor: "text-[#4F46E5]",
    visual: (
      <div className="w-full flex flex-col gap-3.5">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-[#4F46E5]/15 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-[#09090B] uppercase tracking-wider">Deployment Mesh</span>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-semibold">99.99% Uptime</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Global Edge Latency", val: "12ms avg", pct: "95%" },
              { label: "Requests Processed", val: "98.4K/sec", pct: "88%" },
            ].map(({ label, val, pct }) => (
              <div key={label} className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-[#71717A] font-medium">{label}</span>
                  <span className="font-bold text-[#09090B]">{val}</span>
                </div>
                <div className="h-2 rounded-full bg-[#E4E4E7]">
                  <motion.div
                    className="h-full rounded-full bg-[#4F46E5]"
                    initial={{ width: "0%" }}
                    whileInView={{ width: pct }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

export const Capabilities = () => {
  return (
    <section
      id="capabilities"
      className="py-32 px-6 lg:px-16 bg-[#FFFFFF]"
      style={{ fontFamily: "SF Pro Display, Inter, sans-serif" }}
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-[#7C3AED] mb-3">
            Platform
          </p>
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#09090B] leading-tight max-w-2xl">
            Powerful platform designed to{" "}
            <span className="text-[#6A35FF]">automate workflows</span> and{" "}
            <span className="text-[#6A35FF]">scale effortlessly</span>
          </h2>
        </motion.div>

        <div className="flex flex-col gap-8 pb-16">
          {features.map((f, i) => {
            const Icon = f.icon;
            const topOffset = 100 + i * 24;
            return (
              <div
                key={f.eyebrow}
                className="sticky transition-all duration-300"
                style={{ top: `${topOffset}px`, zIndex: i + 1 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-8%" }}
                  transition={{ duration: 0.65, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className={`bg-gradient-to-br ${f.bg} rounded-3xl p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12 border border-white/80 shadow-xl shadow-black/5 backdrop-blur-md`}
                >
                  {/* Left text column (5 cols) */}
                  <div className="lg:col-span-5">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${f.iconBg} mb-5 shadow-xs`}>
                      <Icon size={22} className={f.iconColor} strokeWidth={1.8} />
                    </div>
                    <p className="text-xs font-semibold tracking-widest uppercase text-[#71717A] mb-2">
                      {f.eyebrow}
                    </p>
                    <h3 className="text-2xl lg:text-3xl font-semibold tracking-tight text-[#09090B] mb-4 leading-snug">
                      {f.title}
                    </h3>
                    <p className="text-[15px] text-[#52525B] leading-relaxed">{f.description}</p>
                  </div>

                  {/* Right visual column (7 cols) */}
                  <div className="lg:col-span-7 w-full flex items-center justify-center">
                    {f.visual}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

