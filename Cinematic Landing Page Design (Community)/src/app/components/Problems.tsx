import React, { useRef } from 'react';
import { motion } from 'motion/react';
import {
  Brain, Database, MessageSquare, Code2, Globe, Zap,
  GitBranch, Cpu, Search, FileText, Mail, BarChart2,
  Layers, Terminal, Workflow, Share2, BookOpen, Mic,
  Image, Lock, ArrowRight, AlertCircle
} from 'lucide-react';

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
const TILE = 82;
const GAP = 14;

export const Problems = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const columns = Array.from({ length: COLS }, (_, col) =>
    Array.from({ length: ROWS }, (_, row) => {
      const idx = col * ROWS + row;
      return toolIcons[idx % toolIcons.length];
    })
  );

  return (
    <section
      id="mission"
      ref={containerRef}
      className="py-32 bg-[#FAFAFA] relative overflow-hidden"
      style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 right-10 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-[#6A35FF]/10 via-[#7C3AED]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-8 lg:px-16 flex flex-col lg:flex-row gap-16 lg:gap-20 items-center relative z-10">

        {/* Left: text content */}
        <div className="flex-1 max-w-lg">
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

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#09090B] leading-tight mb-6"
          >
            AI today is scattered across <span className="text-[#6A35FF]">siloed tools</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="text-base text-[#52525B] leading-relaxed mb-8"
          >
            Every platform forgets context the moment you leave. Your memory, knowledge, and workflows are fragmented across dozens of disconnected systems — none of them learning from each other.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col gap-3.5"
          >
            {[
              "Today's AI forgets between sessions",
              "Today's AI is fragmented across tools",
              "Today's AI cannot continuously learn",
            ].map((line, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 hover:bg-white hover:shadow-xs group cursor-default"
              >
                <div className="w-2 h-2 rounded-full bg-[#7C3AED] group-hover:scale-125 group-hover:shadow-[0_0_8px_#7C3AED] transition-all duration-200 flex-shrink-0" />
                <span className="text-sm font-medium text-[#3F3F46] group-hover:text-[#09090B] transition-colors duration-200">{line}</span>
              </div>
            ))}
          </motion.div>

          <motion.a
            href="#capabilities"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="inline-flex items-center gap-2 mt-10 px-7 py-3.5 rounded-full border border-[#09090B] text-sm font-medium text-[#09090B] hover:bg-[#09090B] hover:text-white transition-all duration-300 shadow-sm hover:shadow-md group"
          >
            <span>See how we solve this</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
          </motion.a>
        </div>

        {/* Right: staggered icon grid with interactive micro-animations & glowing tooltips */}
        <div className="flex-1 w-full flex justify-center items-center">
          <div
            className="relative flex gap-3.5 p-4 rounded-3xl"
            style={{ height: `${ROWS * (TILE + GAP) + TILE / 2}px` }}
          >
            {columns.map((col, colIdx) => (
              <div
                key={colIdx}
                className="flex flex-col gap-3.5"
                style={{ marginTop: colIdx % 2 === 1 ? `${(TILE + GAP) / 2}px` : 0 }}
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
                        delay: globalIdx * 0.025,
                        ease: [0.16, 1, 0.3, 1]
                      }}
                      whileHover={{
                        scale: 1.14,
                        y: -4,
                        transition: { type: "spring", stiffness: 450, damping: 22 }
                      }}
                      className="group relative flex items-center justify-center rounded-2xl bg-white/95 backdrop-blur-sm border border-[#E4E4E7] hover:border-[#6A35FF]/40 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_-6px_rgba(106,53,255,0.22)] cursor-pointer transition-colors duration-300 select-none z-10 hover:z-30"
                      style={{ width: TILE, height: TILE }}
                    >
                      {/* Ambient inner glow on hover */}
                      <div
                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at 50% 50%, ${accent}15, transparent 75%)`
                        }}
                      />

                      {/* Icon */}
                      <Icon
                        size={28}
                        strokeWidth={1.6}
                        className="text-[#52525B] group-hover:scale-110 transition-all duration-300 ease-out"
                        style={{
                          color: undefined,
                        }}
                      />

                      {/* Dynamic accent color change on hover via inline style override class */}
                      <style dangerouslySetInnerHTML={{
                        __html: `
                          .group:hover svg {
                            color: ${accent} !important;
                            filter: drop-shadow(0 2px 8px ${accent}40);
                          }
                        `
                      }} />

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
