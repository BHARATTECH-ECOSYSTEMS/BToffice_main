import React, { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "motion/react"; // or 'framer-motion'
import {
  PlugZap,
  BrainCircuit,
  Rocket,
  Database,
  FileText,
  MessageSquare,
  GitBranch,
  Radio,
  CheckCircle2,
  Terminal,
  Sparkles,
  ArrowRight,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  Play,
  Pause,
} from "lucide-react";

// ==========================================
// Types & Step Data Definitions
// ==========================================
interface StepData {
  id: string;
  number: string;
  tag: string;
  icon: React.ComponentType<{
    className?: string;
    size?: number;
    style?: React.CSSProperties;
  }>;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  accentLight: string;
  badgeBg: string;
  metricLabel: string;
  metricValue: string;
  features: string[];
}

const steps: StepData[] = [
  {
    id: "ingest",
    number: "01",
    tag: "Data Ingestion",
    icon: PlugZap,
    title: "Connect your sources",
    subtitle: "Automated real-time vector ingestion",
    description:
      "Link documents, databases, APIs, communication tools, and live data feeds in minutes. Origin ingests, normalizes, and structures everything into an encrypted, unified knowledge graph.",
    accent: "#6A35FF",
    accentLight: "rgba(106, 53, 255, 0.08)",
    badgeBg: "rgba(106, 53, 255, 0.12)",
    metricLabel: "Sync Throughput",
    metricValue: "1.4M vectors/sec",
    features: [
      "140+ pre-built native connectors",
      "Semantic chunking & auto-indexing",
      "Real-time delta webhook sync",
    ],
  },
  {
    id: "learn",
    number: "02",
    tag: "Neural Memory",
    icon: BrainCircuit,
    title: "Intelligence continuously learns",
    subtitle: "Adaptive contextual graph evolution",
    description:
      "The memory engine learns from every interaction, decision, and outcome. Unlike static models, Origin evolves with your organization — building deeper organizational context over time.",
    accent: "#7C3AED",
    accentLight: "rgba(124, 58, 237, 0.08)",
    badgeBg: "rgba(124, 58, 237, 0.12)",
    metricLabel: "Memory Retrieval",
    metricValue: "99.8% precision",
    features: [
      "Dynamic episodic & semantic memory",
      "Cross-model feedback synthesis",
      "Zero-data retention isolation",
    ],
  },
  {
    id: "deploy",
    number: "03",
    tag: "Universal Delivery",
    icon: Rocket,
    title: "Deploy across every interface",
    subtitle: "Sub-15ms edge intelligence runtime",
    description:
      "Surface intelligence through chat, REST & GraphQL APIs, web apps, voice, or autonomous agents. One unified intelligence layer — infinite high-speed ways to interact with it.",
    accent: "#4F46E5",
    accentLight: "rgba(79, 70, 229, 0.08)",
    badgeBg: "rgba(79, 70, 229, 0.12)",
    metricLabel: "Edge Latency",
    metricValue: "< 14ms P99",
    features: [
      "Streaming SSE & WebSocket SDKs",
      "Autonomous tool-calling loop",
      "Role-based multi-tenant security",
    ],
  },
];

// ==========================================
// Responsive Magnetic Button Component
// ==========================================
const MagneticButton = ({
  children,
  className = "",
  primary = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  primary?: boolean;
  onClick?: () => void;
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 18, stiffness: 200, mass: 0.1 };
  const mouseX = useSpring(x, springConfig);
  const mouseY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Only apply magnetic physics on mouse/fine pointer devices
    if (!window.matchMedia("(pointer: fine)").matches || !ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x.set((e.clientX - centerX) * 0.2);
    y.set((e.clientY - centerY) * 0.2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ x: mouseX, y: mouseY }}
      whileTap={{ scale: 0.98 }}
      className={`relative group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full font-medium text-sm sm:text-base tracking-tight transition-all duration-300 select-none overflow-hidden w-full sm:w-auto active:scale-[0.98] ${
        primary
          ? "bg-[#09090B] text-white hover:bg-[#18181B] hover:shadow-[0_10px_30px_rgba(106,53,255,0.3)] shadow-sm"
          : "bg-white/90 hover:bg-[#FAFAFC] text-[#09090B] border border-zinc-200 hover:border-zinc-400/60 shadow-xs hover:shadow-sm"
      } ${className}`}
    >
      {primary && (
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
};

// ==========================================
// Interactive Stage Visual: Step 1 (Ingestion)
// ==========================================
const IngestionVisual = () => {
  const sources = [
    { name: "PostgreSQL", icon: Database, color: "#336791" },
    { name: "Notion Docs", icon: FileText, color: "#000000" },
    { name: "Slack Channels", icon: MessageSquare, color: "#E01E5A" },
    { name: "GitHub Repos", icon: GitBranch, color: "#24292F" },
    { name: "REST APIs", icon: Radio, color: "#6A35FF" },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 select-none overflow-hidden">
      <div className="absolute w-64 sm:w-72 h-64 sm:h-72 rounded-full bg-[#6A35FF]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm sm:max-w-md flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Source Nodes */}
        <div className="flex flex-col gap-2">
          {sources.map((src, idx) => {
            const Icon = src.icon;
            return (
              <motion.div
                key={src.name}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.06 }}
                whileHover={{ scale: 1.03, x: 3 }}
                className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/95 backdrop-blur-md border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] cursor-pointer"
              >
                <div
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-white text-xs shadow-xs flex-shrink-0"
                  style={{ backgroundColor: src.color }}
                >
                  <Icon size={13} />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-zinc-800 whitespace-nowrap">
                  {src.name}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-auto" />
              </motion.div>
            );
          })}
        </div>

        {/* Center: Particle Stream Lines */}
        <div className="flex-1 flex flex-col items-center justify-center px-1 sm:px-2">
          <svg
            className="w-full h-36 sm:h-44 overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {[20, 35, 50, 65, 80].map((y, i) => (
              <g key={i}>
                <path
                  d={`M 0 ${y} C 50 ${y}, 50 50, 100 50`}
                  fill="none"
                  stroke="#E4E4E7"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <motion.circle
                  r="2.5"
                  fill="#6A35FF"
                  animate={{
                    cx: [0, 50, 100],
                    cy: [y, 50, 50],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    delay: i * 0.35,
                    ease: "easeInOut",
                  }}
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Right: Central Ingestion Core */}
        <div className="flex flex-col items-center flex-shrink-0">
          <motion.div
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(106,53,255,0.2)",
                "0 0 0 14px rgba(106,53,255,0)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#6A35FF] to-[#9065FF] flex flex-col items-center justify-center text-white p-2.5 shadow-lg shadow-purple-500/25 relative"
          >
            <Layers className="w-6 h-6 sm:w-8 sm:h-8 mb-0.5 sm:mb-1" />
            <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase">
              Origin
            </span>
            <div className="absolute -bottom-2.5 px-2 py-0.5 rounded-full bg-zinc-900 text-[8px] sm:text-[9px] font-mono text-emerald-400 border border-zinc-700 whitespace-nowrap shadow-xs">
              LIVE SYNC
            </div>
          </motion.div>
        </div>
      </div>

      {/* Telemetry Bar */}
      <div className="mt-6 sm:mt-8 w-full max-w-sm sm:max-w-md bg-zinc-50/90 border border-zinc-200/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between text-[11px] sm:text-xs font-mono">
        <div className="flex items-center gap-2 text-zinc-600 truncate">
          <Cpu size={14} className="text-[#6A35FF] flex-shrink-0" />
          <span className="truncate">Knowledge Graph Node v4.2</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-600 font-semibold flex-shrink-0 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>99.98% Synced</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Interactive Stage Visual: Step 2 (Neural Engine)
// ==========================================
const NeuralVisual = () => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 select-none overflow-hidden">
      <div className="absolute w-72 sm:w-80 h-72 sm:h-80 rounded-full bg-[#7C3AED]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm sm:max-w-md bg-white/90 backdrop-blur-md border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(124,58,237,0.06)]">
        {/* Header HUD */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[#7C3AED]" />
            <span className="text-xs font-semibold text-zinc-900">
              Neural Memory Synthesis
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#7C3AED]/10 text-[#7C3AED]">
            Continuous Loop
          </span>
        </div>

        {/* Neural Network Nodes */}
        <div className="relative h-52 sm:h-60 w-full flex items-center justify-center overflow-hidden">
          {/* Synaptic Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-purple-200/70">
            <line
              x1="22%"
              y1="22%"
              x2="50%"
              y2="50%"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <line
              x1="78%"
              y1="22%"
              x2="50%"
              y2="50%"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <line
              x1="22%"
              y1="78%"
              x2="50%"
              y2="50%"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <line
              x1="78%"
              y1="78%"
              x2="50%"
              y2="50%"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          </svg>

          {/* Radar Rings */}
          <div
            className="absolute w-40 sm:w-44 h-40 sm:h-44 rounded-full border border-purple-200/50 animate-spin"
            style={{ animationDuration: "25s" }}
          />
          <div className="absolute w-24 sm:w-28 h-24 sm:h-28 rounded-full border border-dashed border-purple-300/70" />

          {/* Center Nucleus */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              boxShadow: [
                "0 4px 20px rgba(124, 58, 237, 0.25)",
                "0 6px 30px rgba(124, 58, 237, 0.4)",
                "0 4px 20px rgba(124, 58, 237, 0.25)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center text-white"
          >
            <BrainCircuit size={24} strokeWidth={2} />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-300 border-2 border-white" />
            </span>
          </motion.div>

          {/* Floating Nodes with Responsive Text */}
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-2 left-2 sm:top-3 sm:left-4 z-20"
          >
            <div className="px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/95 backdrop-blur-md border border-purple-200/90 text-[10px] sm:text-xs font-semibold text-zinc-800 shadow-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse" />
              <span>User Prefs</span>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.6,
            }}
            className="absolute top-2 right-2 sm:top-3 sm:right-4 z-20"
          >
            <div className="px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/95 backdrop-blur-md border border-purple-200/90 text-[10px] sm:text-xs font-semibold text-zinc-800 shadow-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6A35FF]" />
              <span>Domain Lexicon</span>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{
              duration: 3.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.2,
            }}
            className="absolute bottom-2 left-2 sm:bottom-3 sm:left-4 z-20"
          >
            <div className="px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/95 backdrop-blur-md border border-purple-200/90 text-[10px] sm:text-xs font-semibold text-zinc-800 shadow-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Decision Logs</span>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 4.0,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.8,
            }}
            className="absolute bottom-2 right-2 sm:bottom-3 sm:right-4 z-20"
          >
            <div className="px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/95 backdrop-blur-md border border-purple-200/90 text-[10px] sm:text-xs font-semibold text-zinc-800 shadow-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
              <span>Embeddings</span>
            </div>
          </motion.div>
        </div>

        {/* Live Weight Feedback Bar */}
        <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px]">
          <span className="text-zinc-500">Active Token Parameters</span>
          <span className="font-mono font-semibold text-[#7C3AED]">
            3.8M Context
          </span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Interactive Stage Visual: Step 3 (Deployment)
// ==========================================
const DeploymentVisual = () => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 select-none overflow-hidden">
      <div className="absolute w-72 sm:w-80 h-72 sm:h-80 rounded-full bg-[#4F46E5]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm sm:max-w-md bg-zinc-950 rounded-2xl p-4 sm:p-5 shadow-2xl border border-zinc-800 text-zinc-200">
        {/* Titlebar */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
            <Terminal size={12} />
            <span>origin.deploy()</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
            200 OK
          </span>
        </div>

        {/* Code Preview */}
        <div className="font-mono text-[11px] sm:text-xs text-zinc-300 space-y-1 py-1 overflow-x-auto">
          <p className="text-zinc-500">// Initialize streaming interface</p>
          <p>
            <span className="text-[#818CF8]">const</span> agent ={" "}
            <span className="text-[#38BDF8]">Origin</span>.
            <span className="text-purple-400">createClient</span>({"{"}
          </p>
          <p className="pl-3.5 text-emerald-300">
            stream: <span className="text-amber-300">true</span>,
          </p>
          <p className="pl-3.5 text-emerald-300">
            cache:{" "}
            <span className="text-amber-300">&quot;neural-edge&quot;</span>
          </p>
          <p>{"}"});</p>
          <div className="pt-2 flex items-center gap-2 text-[#818CF8]">
            <span>&gt;</span>
            <span className="text-zinc-100 truncate">
              Deploying: Chat, Slack, REST API...
            </span>
            <span className="w-1.5 h-3.5 bg-[#818CF8] animate-pulse flex-shrink-0" />
          </div>
        </div>

        {/* Channels Grid Pills */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 grid grid-cols-3 gap-1.5 sm:gap-2">
          {["Web / App", "Voice Bot", "REST API"].map((channel) => (
            <div
              key={channel}
              className="px-1.5 sm:px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-center text-zinc-300 flex items-center justify-center gap-1 truncate"
            >
              <CheckCircle2
                size={10}
                className="text-emerald-400 flex-shrink-0"
              />
              <span className="truncate">{channel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Main Architecture Section Component
// ==========================================
export const Architecture: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance step timeline when not paused
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  return (
    <section
      id="architecture"
      className="relative py-20 sm:py-28 lg:py-32 px-4 sm:px-8 lg:px-12 bg-[#FAFAFA] text-[#09090B] overflow-hidden selection:bg-[#6A35FF]/15 selection:text-[#6A35FF]"
      style={{
        fontFamily:
          "SF Pro Display, -apple-system, BlinkMacSystemFont, Inter, sans-serif",
      }}
    >
      {/* Background Decorative Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Top Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-b from-[#6A35FF]/8 via-[#7C3AED]/4 to-transparent blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* ── Masthead ── */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12 sm:mb-16 lg:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-zinc-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] mb-5"
          >
            <span className="w-2 h-2 rounded-full bg-[#6A35FF] animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-800">
              System Architecture &amp; Workflow
            </span>
          </motion.div>
              
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#09090B] leading-[1.12]"
          >
            Launch your enterprise AI assistant{" "}
            <span className="relative whitespace-nowrap">
              <span className="bg-gradient-to-r from-[#6A35FF] via-[#7C3AED] to-[#4F46E5] bg-clip-text text-transparent">
                in minutes.
              </span>
              <svg
                className="absolute -bottom-2 left-0 w-full h-2 text-[#6A35FF]/30 pointer-events-none"
                viewBox="0 0 100 8"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 6 C30 0, 70 8, 100 2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 sm:mt-6 text-base sm:text-lg text-[#52525B] leading-relaxed max-w-2xl font-normal"
          >
            A cohesive three-stage intelligence engine that transforms raw
            enterprise silos into an evolving, self-improving memory layer.
          </motion.p>
        </div>

        {/* ── Interactive Dual-Pane Stage ── */}
        <div
          className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05),0_0_1px_1px_rgba(0,0,0,0.03)]"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          {/* Top Controller Bar */}
          <div className="flex items-center justify-between pb-4 sm:pb-6 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Interactive Pipeline
              </span>
              <span className="text-zinc-300">•</span>
              <span className="text-[11px] sm:text-xs font-mono text-[#6A35FF] font-semibold">
                Step {activeStep + 1} of 3
              </span>
            </div>

            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-zinc-500 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200/80 transition-colors"
              title={isAutoPlaying ? "Pause autoplay" : "Resume autoplay"}
            >
              {isAutoPlaying ? <Pause size={12} /> : <Play size={12} />}
              <span className="hidden sm:inline">
                {isAutoPlaying ? "Auto-playing" : "Paused"}
              </span>
            </button>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch pt-6">
            {/* Left Rail: Interactive Step Cards */}
            <div className="lg:col-span-5 flex flex-col gap-3 justify-between">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = activeStep === idx;

                return (
                  <motion.div
                    key={step.id}
                    onClick={() => {
                      setActiveStep(idx);
                      setIsAutoPlaying(false);
                    }}
                    whileHover={{ scale: 1.008 }}
                    className={`relative p-4 sm:p-5 lg:p-6 rounded-2xl cursor-pointer transition-all duration-300 border ${
                      isActive
                        ? "bg-white border-zinc-300 shadow-[0_8px_24px_-4px_rgba(106,53,255,0.12)]"
                        : "bg-zinc-50/60 hover:bg-white/90 border-transparent hover:border-zinc-200"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeCardIndicator"
                        className="absolute left-0 top-3 bottom-3 w-1.5 bg-[#6A35FF] rounded-r-full"
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                        }}
                      />
                    )}

                    <div className="flex items-start gap-3.5 sm:gap-4">
                      <div
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300"
                        style={{
                          background: isActive
                            ? step.accentLight
                            : "rgba(0,0,0,0.04)",
                          color: isActive ? step.accent : "#71717A",
                        }}
                      >
                        <Icon size={19} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span
                            className="text-[10px] sm:text-[11px] font-bold font-mono tracking-wider uppercase truncate"
                            style={{
                              color: isActive ? step.accent : "#A1A1AA",
                            }}
                          >
                            STEP {step.number} • {step.tag}
                          </span>
                          {isActive && (
                            <span className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex-shrink-0">
                              {step.metricValue}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-zinc-900 tracking-tight">
                          {step.title}
                        </h3>

                        <p className="text-xs sm:text-sm text-zinc-500 mt-1 leading-relaxed line-clamp-2">
                          {step.description}
                        </p>

                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="mt-3 pt-3 border-t border-zinc-100 space-y-1.5"
                            >
                              {step.features.map((feat) => (
                                <div
                                  key={feat}
                                  className="flex items-center gap-2 text-xs font-medium text-zinc-700"
                                >
                                  <CheckCircle2
                                    size={13}
                                    className="text-[#6A35FF] flex-shrink-0"
                                  />
                                  <span>{feat}</span>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Progress indicator that resets on activeStep change */}
                    {isActive && isAutoPlaying && (
                      <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-zinc-100 overflow-hidden rounded-full">
                        <motion.div
                          key={`progress-${activeStep}`}
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 6, ease: "linear" }}
                          className="h-full bg-[#6A35FF]"
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Right Canvas */}
            <div className="lg:col-span-7 bg-zinc-100/70 border border-zinc-200/80 rounded-2xl relative overflow-hidden flex items-center justify-center min-h-[340px] sm:min-h-[400px] lg:min-h-[440px]">
              <AnimatePresence mode="wait">
                {activeStep === 0 && (
                  <motion.div
                    key="step-0"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full h-full"
                  >
                    <IngestionVisual />
                  </motion.div>
                )}
                {activeStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full h-full"
                  >
                    <NeuralVisual />
                  </motion.div>
                )}
                {activeStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full h-full"
                  >
                    <DeploymentVisual />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Bottom CTA & Action Row ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col lg:flex-row items-center justify-between gap-6 mt-12 sm:mt-14 pt-8 border-t border-zinc-200/80"
        >
          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-zinc-500 font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#6A35FF] flex-shrink-0" />
              <span>SOC2 Type II &amp; HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-[#6A35FF] flex-shrink-0" />
              <span>Zero Training on Customer Data</span>
            </div>
          </div>

          {/* Action Buttons: Full width on mobile, auto-width on desktop */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto justify-center">
            <MagneticButton primary>
              <span>Get started free</span>
              <ArrowRight size={16} />
            </MagneticButton>
            <MagneticButton>
              <span>View API Docs</span>
            </MagneticButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
