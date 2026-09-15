import React from "react";
import { motion } from "motion/react"; // or 'framer-motion'
import {
  Brain,
  Database,
  MessageSquare,
  Code2,
  Globe,
  Zap,
  GitBranch,
  Cpu,
  Search,
  FileText,
  Mail,
  BarChart2,
  Layers,
  Terminal,
  Workflow,
  Share2,
  BookOpen,
  Mic,
  Image,
  Lock,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

const toolIcons = [
  { Icon: Brain, label: "Memory", accent: "#6A35FF" },
  { Icon: Database, label: "Storage", accent: "#7C3AED" },
  { Icon: MessageSquare, label: "Chat", accent: "#4F46E5" },
  { Icon: Code2, label: "Code", accent: "#2563EB" },
  { Icon: Globe, label: "Web", accent: "#0284C7" },
  { Icon: Zap, label: "Actions", accent: "#EAB308" },
  { Icon: GitBranch, label: "Pipelines", accent: "#6A35FF" },
  { Icon: Cpu, label: "Compute", accent: "#9333EA" },
  { Icon: Search, label: "Search", accent: "#06B6D4" },
  { Icon: FileText, label: "Docs", accent: "#3B82F6" },
  { Icon: Mail, label: "Email", accent: "#6366F1" },
  { Icon: BarChart2, label: "Analytics", accent: "#8B5CF6" },
  { Icon: Layers, label: "Stacks", accent: "#EC4899" },
  { Icon: Terminal, label: "CLI", accent: "#10B981" },
  { Icon: Workflow, label: "Workflows", accent: "#6A35FF" },
  { Icon: Share2, label: "Integrations", accent: "#F97316" },
  { Icon: BookOpen, label: "Knowledge", accent: "#7C3AED" },
  { Icon: Mic, label: "Voice", accent: "#8B5CF6" },
  { Icon: Image, label: "Vision", accent: "#3B82F6" },
  { Icon: Lock, label: "Auth", accent: "#64748B" },
];

const COLS = 4;
const ROWS = 5;

// Pre-computed once statically to avoid recalculating on every re-render
const COLUMNS_DATA = Array.from({ length: COLS }, (_, col) =>
  Array.from({ length: ROWS }, (_, row) => {
    const idx = col * ROWS + row;
    return toolIcons[idx % toolIcons.length];
  }),
);

export const Problems: React.FC = () => {
  return (
    <section
      id="mission"
      className="py-20 sm:py-28 lg:py-32 bg-[#FAFAFA] relative overflow-hidden"
      style={{ fontFamily: "SF Pro Display, Inter, -apple-system, sans-serif" }}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 right-1/2 lg:right-10 -translate-y-1/2 translate-x-1/2 lg:translate-x-0 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-gradient-to-br from-[#6A35FF]/10 via-[#7C3AED]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 flex flex-col lg:flex-row gap-12 sm:gap-16 lg:gap-20 items-center relative z-10">
        {/* ── Left Column: Text & Problem Points ── */}
        <div className="flex-1 w-full max-w-xl lg:max-w-lg text-left">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-semibold tracking-wider uppercase mb-5"
          >
            <AlertCircle size={13} className="text-[#7C3AED]" />
            The Fragmentation Barrier
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#09090B] leading-[1.12] mb-5 sm:mb-6"
          >
            AI today is scattered across{" "}
            <span className="bg-gradient-to-r from-[#6A35FF] to-[#9333EA] bg-clip-text text-transparent">
              siloed tools
            </span>
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="text-base sm:text-lg text-[#52525B] leading-relaxed mb-8 font-normal"
          >
            Every platform forgets context the moment you leave. Your memory,
            knowledge, and workflows are fragmented across dozens of
            disconnected systems — none of them learning from each other.
          </motion.p>

          {/* Problem Cards */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col gap-3"
          >
            {[
              "Today's AI forgets between sessions",
              "Today's AI is fragmented across tools",
              "Today's AI cannot continuously learn",
            ].map((line, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 p-3 rounded-xl bg-white/70 border border-[#E4E4E7]/60 transition-all duration-200 hover:bg-white hover:border-[#6A35FF]/30 hover:shadow-sm group cursor-default"
              >
                <div className="w-2 h-2 rounded-full bg-[#7C3AED] group-hover:scale-125 group-hover:shadow-[0_0_8px_#7C3AED] transition-all duration-200 flex-shrink-0" />
                <span className="text-sm sm:text-base font-medium text-[#3F3F46] group-hover:text-[#09090B] transition-colors duration-200">
                  {line}
                </span>
              </div>
            ))}
          </motion.div>

          {/* CTA Link / Button */}
          <motion.a
            href="#capabilities"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="inline-flex items-center justify-center gap-2 mt-8 sm:mt-10 px-7 py-3.5 rounded-full border border-[#09090B] text-sm font-medium text-[#09090B] hover:bg-[#09090B] hover:text-white transition-all duration-300 shadow-sm hover:shadow-md group w-full sm:w-auto text-center"
          >
            <span>See how we solve this</span>
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform duration-200"
            />
          </motion.a>
        </div>

        {/* ── Right Column: Staggered Responsive Icon Grid ── */}
        <div className="flex-1 w-full flex justify-center items-center overflow-visible">
          <div className="relative flex gap-2.5 sm:gap-3.5 p-2 sm:p-4 rounded-3xl">
            {COLUMNS_DATA.map((col, colIdx) => (
              <div
                key={colIdx}
                className={`flex flex-col gap-2.5 sm:gap-3.5 ${
                  colIdx % 2 === 1 ? "mt-4 sm:mt-7 md:mt-10" : ""
                }`}
              >
                {col.map(({ Icon, label, accent }, rowIdx) => {
                  const globalIdx = colIdx * ROWS + rowIdx;
                  return (
                    <motion.div
                      key={rowIdx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, margin: "-5%" }}
                      transition={{
                        duration: 0.45,
                        delay: globalIdx * 0.02,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      whileHover={{
                        scale: 1.12,
                        y: -3,
                        transition: {
                          type: "spring",
                          stiffness: 450,
                          damping: 22,
                        },
                      }}
                      style={
                        {
                          "--tile-accent": accent,
                          "--tile-glow": `${accent}35`,
                        } as React.CSSProperties
                      }
                      className="group relative flex items-center justify-center rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-sm border border-[#E4E4E7] hover:border-[var(--tile-accent)] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_-6px_var(--tile-glow)] cursor-pointer transition-colors duration-300 select-none z-10 hover:z-30 w-[58px] h-[58px] sm:w-[72px] sm:h-[72px] md:w-[82px] md:h-[82px]"
                    >
                      {/* Radial inner glow on hover */}
                      <div
                        className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at 50% 50%, ${accent}18, transparent 75%)`,
                        }}
                      />

                      {/* Icon with dynamic CSS variable accent and drop-shadow */}
                      <Icon
                        strokeWidth={1.6}
                        className="w-6 h-6 sm:w-7 sm:h-7 text-[#52525B] transition-all duration-300 ease-out group-hover:scale-110 group-hover:[color:var(--tile-accent)] group-hover:[filter:drop-shadow(0_2px_8px_var(--tile-glow))]"
                      />

                      {/* Floating Tooltip Pill */}
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-200 pointer-events-none z-40 whitespace-nowrap">
                        <span className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#09090B] rounded-md shadow-md border border-white/10">
                          {label}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};