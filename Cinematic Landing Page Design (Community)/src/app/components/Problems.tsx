import React, { useRef } from 'react';
import { motion } from 'motion/react';
import {
  Brain, Database, MessageSquare, Code2, Globe, Zap,
  GitBranch, Cpu, Search, FileText, Mail, BarChart2,
  Layers, Terminal, Workflow, Share2, BookOpen, Mic,
  Image, Lock
} from 'lucide-react';

const toolIcons = [
  { Icon: Brain, label: "Memory" },
  { Icon: Database, label: "Storage" },
  { Icon: MessageSquare, label: "Chat" },
  { Icon: Code2, label: "Code" },
  { Icon: Globe, label: "Web" },
  { Icon: Zap, label: "Actions" },
  { Icon: GitBranch, label: "Pipelines" },
  { Icon: Cpu, label: "Compute" },
  { Icon: Search, label: "Search" },
  { Icon: FileText, label: "Docs" },
  { Icon: Mail, label: "Email" },
  { Icon: BarChart2, label: "Analytics" },
  { Icon: Layers, label: "Stacks" },
  { Icon: Terminal, label: "CLI" },
  { Icon: Workflow, label: "Workflows" },
  { Icon: Share2, label: "Integrations" },
  { Icon: BookOpen, label: "Knowledge" },
  { Icon: Mic, label: "Voice" },
  { Icon: Image, label: "Vision" },
  { Icon: Lock, label: "Auth" },
];

const COLS = 4;
const ROWS = 5;
const TILE = 80;
const GAP = 12;

export const Problems = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const columns = Array.from({ length: COLS }, (_, col) =>
    Array.from({ length: ROWS }, (_, row) => {
      const idx = col * ROWS + row;
      return toolIcons[idx % toolIcons.length];
    })
  );

  return (
    <section id="mission" ref={containerRef} className="py-32 bg-[#FAFAFA] relative overflow-hidden" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-8 lg:px-16 flex flex-col lg:flex-row gap-16 items-center">

        {/* Left: text content */}
        <div className="flex-1 max-w-md">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-xs font-semibold tracking-widest uppercase text-[#7C3AED] mb-4"
          >
            The Problem
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#09090B] leading-tight mb-6"
          >
            AI today is scattered across siloed tools
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
            className="flex flex-col gap-3"
          >
            {[
              "Today's AI forgets between sessions",
              "Today's AI is fragmented across tools",
              "Today's AI cannot continuously learn",
            ].map((line, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7C3AED] flex-shrink-0" />
                <span className="text-sm text-[#3F3F46]">{line}</span>
              </div>
            ))}
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 px-6 py-3 rounded-full border border-[#09090B] text-sm font-medium text-[#09090B] hover:bg-[#09090B] hover:text-white transition-colors duration-200"
          >
            See how we solve this
          </motion.button>
        </div>

        {/* Right: staggered icon grid */}
        <div className="flex-1 w-full flex justify-center items-center overflow-hidden">
          <div
            className="relative flex gap-3"
            style={{ height: `${ROWS * (TILE + GAP) + TILE / 2}px` }}
          >
            {columns.map((col, colIdx) => (
              <div
                key={colIdx}
                className="flex flex-col gap-3"
                style={{ marginTop: colIdx % 2 === 1 ? `${(TILE + GAP) / 2}px` : 0 }}
              >
                {col.map(({ Icon, label }, rowIdx) => {
                  const globalIdx = colIdx * ROWS + rowIdx;
                  return (
                    <motion.div
                      key={rowIdx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, margin: "-5%" }}
                      transition={{
                        duration: 0.4,
                        delay: globalIdx * 0.03,
                        ease: [0.16, 1, 0.3, 1]
                      }}
                      whileHover={{ scale: 1.08, transition: { duration: 0.15 } }}
                      className="flex items-center justify-center rounded-2xl bg-white border border-[#E4E4E7] shadow-sm cursor-default"
                      style={{ width: TILE, height: TILE }}
                      title={label}
                    >
                      <Icon size={28} strokeWidth={1.5} className="text-[#3F3F46]" />
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
