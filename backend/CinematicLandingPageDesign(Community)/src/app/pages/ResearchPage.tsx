import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import { Brain, Cpu, Globe2, Shield, Layers, Minimize2, Sparkles, CheckCircle2, Activity, Zap } from 'lucide-react';

const domains = [
  {
    id: 'gi-rivinity',
    tag: '01',
    icon: Brain,
    name: 'GI Rivinity',
    subtitle: 'Generative Intelligence',
    description: 'The flagship research initiative focused on developing an autonomous intelligence model capable of continuous learning, long-term memory, reasoning, and adaptive decision-making. Unlike conventional LLMs, this model aims to evolve over time while preserving context across all interactions.',
    details: ['Continuous learning architecture', 'Long-term persistent memory', 'Autonomous reasoning engine', 'Adaptive decision-making', 'Context preservation across sessions'],
    color: '#6A35FF',
    colorSecondary: '#A855F7',
    colorLight: 'rgba(106, 53, 255, 0.08)',
    colorBorder: 'rgba(106, 53, 255, 0.22)',
    badgeBg: 'rgba(106, 53, 255, 0.10)',
    shaderGradient: 'radial-gradient(ellipse 130% 100% at 10% 10%, rgba(106, 53, 255, 0.12) 0%, rgba(168, 85, 247, 0.06) 40%, rgba(255, 255, 255, 0.95) 75%), linear-gradient(145deg, #FAF8FF 0%, #FFFFFF 100%)',
    shaderGlow: 'radial-gradient(circle at 85% 15%, rgba(106, 53, 255, 0.22) 0%, rgba(168, 85, 247, 0.12) 35%, transparent 70%)',
    accentLine: 'linear-gradient(90deg, #6A35FF 0%, #A855F7 100%)',
    status: 'Active • 99.8% Sync',
  },
  {
    id: 'rivinity-core',
    tag: '02',
    icon: Layers,
    name: 'Rivinity Core',
    subtitle: 'Universal Intelligence OS',
    description: 'A universal intelligence operating layer designed to orchestrate AI capabilities across applications, industries, and devices. This acts as the central intelligence backbone connecting multiple specialized systems into one unified ecosystem.',
    details: ['Cross-system orchestration', 'Unified capability layer', 'Real-time intelligence routing', 'Multi-model coordination', 'Shared knowledge fabric'],
    color: '#7C3AED',
    colorSecondary: '#C026D3',
    colorLight: 'rgba(124, 58, 237, 0.08)',
    colorBorder: 'rgba(124, 58, 237, 0.22)',
    badgeBg: 'rgba(124, 58, 237, 0.10)',
    shaderGradient: 'radial-gradient(ellipse 130% 100% at 10% 10%, rgba(124, 58, 237, 0.12) 0%, rgba(192, 38, 211, 0.06) 40%, rgba(255, 255, 255, 0.95) 75%), linear-gradient(145deg, #FCF8FF 0%, #FFFFFF 100%)',
    shaderGlow: 'radial-gradient(circle at 85% 15%, rgba(124, 58, 237, 0.22) 0%, rgba(192, 38, 211, 0.12) 35%, transparent 70%)',
    accentLine: 'linear-gradient(90deg, #7C3AED 0%, #C026D3 100%)',
    status: 'Core Backbone Active',
  },
  {
    id: 'iot-intelligence',
    tag: '03',
    icon: Cpu,
    name: 'IoT Intelligence',
    subtitle: 'Embedded & Physical AI',
    description: 'Research into integrating artificial intelligence with connected devices, sensors, robotics, industrial automation, and smart infrastructure. The objective is to create environments where intelligence becomes embedded into physical systems.',
    details: ['Connected device intelligence', 'Industrial automation AI', 'Smart infrastructure', 'Sensor fusion & reasoning', 'Physical-digital integration'],
    color: '#059669',
    colorSecondary: '#10B981',
    colorLight: 'rgba(5, 150, 105, 0.08)',
    colorBorder: 'rgba(5, 150, 105, 0.22)',
    badgeBg: 'rgba(5, 150, 105, 0.10)',
    shaderGradient: 'radial-gradient(ellipse 130% 100% at 10% 10%, rgba(5, 150, 105, 0.12) 0%, rgba(16, 185, 129, 0.06) 40%, rgba(255, 255, 255, 0.95) 75%), linear-gradient(145deg, #F5FBFA 0%, #FFFFFF 100%)',
    shaderGlow: 'radial-gradient(circle at 85% 15%, rgba(5, 150, 105, 0.20) 0%, rgba(16, 185, 129, 0.10) 35%, transparent 70%)',
    accentLine: 'linear-gradient(90deg, #059669 0%, #10B981 100%)',
    status: '1.4M Nodes Connected',
  },
  {
    id: 'geo-intelligence',
    tag: '04',
    icon: Globe2,
    name: 'Geo Intelligence',
    subtitle: 'Geospatial & Location AI',
    description: 'A specialized intelligence layer combining AI with geospatial technologies, GIS, remote sensing, satellite imagery, climate analysis, transportation networks, and location-based reasoning to understand and reason about the physical world.',
    details: ['Satellite imagery analysis', 'GIS & geospatial reasoning', 'Climate intelligence', 'Transportation optimization', 'Remote sensing AI'],
    color: '#0284C7',
    colorSecondary: '#06B6D4',
    colorLight: 'rgba(2, 132, 199, 0.08)',
    colorBorder: 'rgba(2, 132, 199, 0.22)',
    badgeBg: 'rgba(2, 132, 199, 0.10)',
    shaderGradient: 'radial-gradient(ellipse 130% 100% at 10% 10%, rgba(2, 132, 199, 0.12) 0%, rgba(6, 182, 212, 0.06) 40%, rgba(255, 255, 255, 0.95) 75%), linear-gradient(145deg, #F3FAFD 0%, #FFFFFF 100%)',
    shaderGlow: 'radial-gradient(circle at 85% 15%, rgba(2, 132, 199, 0.20) 0%, rgba(6, 182, 212, 0.10) 35%, transparent 70%)',
    accentLine: 'linear-gradient(90deg, #0284C7 0%, #06B6D4 100%)',
    status: 'Global Satellite Mesh',
  },
  {
    id: 'defense-intelligence',
    tag: '05',
    icon: Shield,
    name: 'Defense Intelligence',
    subtitle: 'Secure & Mission-Critical AI',
    description: 'Research focused on secure AI architectures for defense, cybersecurity, strategic analysis, autonomous monitoring, and mission-critical decision support. Emphasis on trustworthy and resilient intelligence systems operating in adversarial environments.',
    details: ['Secure AI architecture', 'Cybersecurity intelligence', 'Strategic analysis', 'Autonomous monitoring', 'Mission-critical reliability'],
    color: '#E11D48',
    colorSecondary: '#F43F5E',
    colorLight: 'rgba(225, 29, 72, 0.08)',
    colorBorder: 'rgba(225, 29, 72, 0.22)',
    badgeBg: 'rgba(225, 29, 72, 0.10)',
    shaderGradient: 'radial-gradient(ellipse 130% 100% at 10% 10%, rgba(225, 29, 72, 0.10) 0%, rgba(244, 63, 94, 0.05) 40%, rgba(255, 255, 255, 0.95) 75%), linear-gradient(145deg, #FFF6F7 0%, #FFFFFF 100%)',
    shaderGlow: 'radial-gradient(circle at 85% 15%, rgba(225, 29, 72, 0.18) 0%, rgba(244, 63, 94, 0.09) 35%, transparent 70%)',
    accentLine: 'linear-gradient(90deg, #E11D48 0%, #F43F5E 100%)',
    status: 'Zero-Trust Shielded',
  },
  {
    id: 'miniature-intelligence',
    tag: '06',
    icon: Minimize2,
    name: 'Miniature Intelligence',
    subtitle: 'Edge AI & Lightweight Models',
    description: 'Development of lightweight AI models capable of running efficiently on personal computers, smartphones, embedded devices, and edge hardware. These models remain connected to the larger intelligence network while operating locally with full capability.',
    details: ['Edge deployment models', 'On-device inference', 'Low-power AI', 'Network-connected edge nodes', 'Cross-device intelligence'],
    color: '#D97706',
    colorSecondary: '#F59E0B',
    colorLight: 'rgba(217, 119, 6, 0.08)',
    colorBorder: 'rgba(217, 119, 6, 0.22)',
    badgeBg: 'rgba(217, 119, 6, 0.10)',
    shaderGradient: 'radial-gradient(ellipse 130% 100% at 10% 10%, rgba(217, 119, 6, 0.10) 0%, rgba(245, 158, 11, 0.05) 40%, rgba(255, 255, 255, 0.95) 75%), linear-gradient(145deg, #FFFDF6 0%, #FFFFFF 100%)',
    shaderGlow: 'radial-gradient(circle at 85% 15%, rgba(217, 119, 6, 0.18) 0%, rgba(245, 158, 11, 0.09) 35%, transparent 70%)',
    accentLine: 'linear-gradient(90deg, #D97706 0%, #F59E0B 100%)',
    status: 'Sub-10ms Edge Inference',
  },
];

function DomainCard({ domain, i }: { domain: typeof domains[0]; i: number }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-6%' });
  const Icon = domain.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: (i % 3) * 0.1, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -4, transition: { duration: 0.25, ease: 'easeOut' } }}
      className="group relative rounded-3xl p-8 flex flex-col justify-between cursor-default overflow-hidden border transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)]"
      style={{
        background: domain.shaderGradient,
        borderColor: hovered ? domain.colorBorder : 'rgba(228, 228, 231, 0.9)',
      }}
    >
      {/* ─── Shader Chromatic Mesh & Caustic Light Layer ─── */}
      <div
        className="absolute inset-0 rounded-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: domain.shaderGlow }}
      />

      {/* Subtle iridescent corner flare shader */}
      <div
        className="absolute -top-24 -left-24 w-60 h-60 rounded-full blur-2xl opacity-40 group-hover:opacity-75 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${domain.color} 0%, ${domain.colorSecondary} 60%, transparent 80%)`,
        }}
      />

      {/* Top Accent Shader Line (Subtle) */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: domain.accentLine }}
      />

      {/* ─── Card Header: Icon + Number ─── */}
      <div className="flex items-start justify-between relative z-10 mb-6">
        <div
          className="w-13 h-13 rounded-2xl flex items-center justify-center relative shadow-xs border border-white/60 transition-transform duration-300 group-hover:scale-105"
          style={{ background: domain.colorLight }}
        >
          <Icon size={22} style={{ color: domain.color }} strokeWidth={1.8} />
          {/* Micro ambient pulse on icon */}
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ boxShadow: `inset 0 0 12px ${domain.color}30` }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-colors duration-200"
            style={{
              color: domain.color,
              background: domain.badgeBg,
              borderColor: `${domain.color}25`,
            }}
          >
            Phase {domain.tag}
          </span>
        </div>
      </div>

      {/* ─── Title & Description ─── */}
      <div className="relative z-10 flex-1">
        <p
          className="text-[11px] font-semibold tracking-wider uppercase mb-1.5 flex items-center gap-1.5"
          style={{ color: domain.color }}
        >
          <Sparkles size={11} style={{ color: domain.color }} />
          {domain.subtitle}
        </p>
        <h3 className="text-2xl font-semibold text-[#09090B] tracking-tight mb-3 group-hover:text-[#09090B] transition-colors duration-200">
          {domain.name}
        </h3>
        <p className="text-[14px] text-[#52525B] leading-relaxed mb-6 font-normal">
          {domain.description}
        </p>
      </div>

      {/* ─── Details List ─── */}
      <div
        className="relative z-10 flex flex-col gap-2 pt-5 border-t transition-colors duration-300"
        style={{ borderColor: 'rgba(228, 228, 231, 0.8)' }}
      >
        {domain.details.map((d) => (
          <div key={d} className="flex items-center gap-2.5">
            <CheckCircle2
              size={13}
              style={{ color: domain.color }}
              strokeWidth={2.2}
              className="flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
            />
            <span className="text-[13px] text-[#3F3F46] font-medium leading-snug">
              {d}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export const ResearchPage = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);

  // Unified Architecture Interactive State
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [isCoreHovered, setIsCoreHovered] = useState<boolean>(false);

  const outerDomains = domains.filter((d) => d.id !== 'rivinity-core');
  const activeDomain = domains.find((d) => d.id === activeDomainId);

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative min-h-[85vh] flex items-center bg-[#09090B] overflow-hidden pt-36 pb-24 px-8 lg:px-16">
        {/* Background particle grid & glowing ambient backdrops */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          <div className="absolute top-1/2 -left-40 -translate-y-1/2 w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(106,53,255,0.2)_0%,transparent_70%)] blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 -right-40 -translate-y-1/2 w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(124,58,237,0.25)_0%,transparent_70%)] blur-3xl pointer-events-none" />
        </div>

        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-12 relative z-10">
          {/* Left Side: Typography & Research Badges */}
          <div className="flex-1 max-w-2xl flex flex-col justify-center text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6A35FF]/20 border border-[#6A35FF]/40 text-[#B497FF] text-xs font-semibold tracking-wider uppercase mb-6 self-start"
            >
              <Sparkles size={13} className="text-[#B497FF]" />
              Core Research Initiatives
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl lg:text-7xl xl:text-[80px] font-semibold tracking-tight text-white leading-[1.05] mb-8"
            >
              Six domains.
              <br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg,#B497FF 0%,#6A35FF 60%)' }}>
                One ecosystem.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="text-lg lg:text-xl text-white/60 leading-relaxed max-w-xl mb-10 font-normal"
            >
              Our research spans six interconnected intelligence domains that together form a single unified ecosystem — where knowledge flows continuously and new capabilities emerge through interaction.
            </motion.p>

            {/* Micro stats / key research pillars */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10"
            >
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight">6</div>
                <div className="text-[12px] text-white/50 tracking-wide uppercase font-medium mt-1">Core Domains</div>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-[#B497FF] tracking-tight">100%</div>
                <div className="text-[12px] text-white/50 tracking-wide uppercase font-medium mt-1">Shared Memory</div>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-white tracking-tight">&lt;10ms</div>
                <div className="text-[12px] text-white/50 tracking-wide uppercase font-medium mt-1">Cross-Node Sync</div>
              </div>
            </motion.div>
          </div>

          {/* Right Side: Rotating 3D Neural Sphere & Orbital Rings */}
          <div className="flex-1 w-full flex items-center justify-center lg:justify-end relative">
            <motion.div
              style={{ y }}
              className="relative w-[340px] sm:w-[420px] lg:w-[460px] aspect-square flex items-center justify-center pointer-events-none"
              aria-hidden
            >
              {[0, 30, 60, 90, 120, 150].map((deg, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border border-[#6A35FF]/30"
                  animate={{ rotateY: [deg, deg + 360] }}
                  transition={{ duration: 14 + i * 2.5, repeat: Infinity, ease: 'linear' }}
                  style={{ transformStyle: 'preserve-3d', transform: `rotateY(${deg}deg) rotateX(25deg)` }}
                />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-[radial-gradient(circle,rgba(180,151,255,0.6),rgba(106,53,255,0.3))] blur-2xl" />
              </div>
              <div className="absolute w-20 h-20 rounded-full bg-gradient-to-tr from-[#6A35FF] to-[#A855F7] flex items-center justify-center shadow-[0_0_40px_rgba(106,53,255,0.8)] z-10 border border-white/20">
                <Brain size={32} className="text-white drop-shadow-md" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Domain Cards ─── */}
      <section className="py-24 px-8 lg:px-16 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#6A35FF] mb-3">
              Autonomous Systems & Foundational Models
            </p>
            <h2 className="text-3xl lg:text-4xl font-semibold text-[#09090B] tracking-tight">
              Pioneering the frontiers of persistent intelligence
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 items-stretch">
            {domains.map((d, i) => <DomainCard key={d.id} domain={d} i={i} />)}
          </div>
        </div>
      </section>

      {/* ─── Unified Architecture Connection Diagram ─── */}
      <section className="py-28 px-8 lg:px-16 bg-white border-t border-[#E4E4E7] overflow-hidden relative">
        {/* Subtle background ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-br from-[#6A35FF]/10 via-[#7C3AED]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6A35FF]/10 text-[#6A35FF] text-xs font-semibold tracking-wider uppercase mb-4">
              <Activity size={13} className="text-[#6A35FF]" />
              Live Neural Architecture
            </div>
            <h2 className="text-4xl lg:text-5xl font-semibold text-[#09090B] tracking-tight mb-6 leading-tight">
              Not six products.<br />
              <span className="text-[#6A35FF]">One living intelligence.</span>
            </h2>
            <p className="text-[16px] text-[#52525B] leading-relaxed max-w-2xl mx-auto mb-14">
              Hover over the central core or connected intelligence nodes to inspect real-time data orchestration and bidirectional synaptic workflows across the ecosystem.
            </p>
          </motion.div>

          {/* Connection Diagram Container */}
          <div className="relative w-full max-w-[560px] mx-auto aspect-square mb-8 select-none">

            {/* ─── Rotating Orbital Rings ─── */}
            <motion.div
              className="absolute inset-[6%] rounded-full border border-dashed border-[#6A35FF]/20 pointer-events-none"
              animate={{ rotate: 360 }}
              transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-[18%] rounded-full border border-dotted border-[#7C3AED]/25 pointer-events-none"
              animate={{ rotate: -360 }}
              transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-[30%] rounded-full border border-[#E4E4E7] pointer-events-none"
              animate={{ scale: [1, 1.03, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* ─── SVG Dynamic Synaptic Beams & Flowing Photons ─── */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
              viewBox="0 0 100 100"
            >
              <defs>
                <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="corePulseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6A35FF" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#A855F7" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {outerDomains.map((d, i) => {
                const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
                const r = 38;
                const cx = 50 + r * Math.cos(angle);
                const cy = 50 + r * Math.sin(angle);
                const isSelected = activeDomainId === d.id;
                const isHighlighted = isCoreHovered || isSelected;

                return (
                  <g key={`synapse-${d.id}`}>
                    {/* Base synaptic link track */}
                    <line
                      x1="50"
                      y1="50"
                      x2={cx}
                      y2={cy}
                      stroke={d.color}
                      strokeWidth={isHighlighted ? '1.5' : '0.6'}
                      strokeDasharray={isHighlighted ? 'none' : '2.5 2'}
                      opacity={isHighlighted ? 0.9 : 0.25}
                      className="transition-all duration-300"
                    />

                    {/* Glowing highlight beam when hovered */}
                    {isHighlighted && (
                      <line
                        x1="50"
                        y1="50"
                        x2={cx}
                        y2={cy}
                        stroke={d.color}
                        strokeWidth="3.5"
                        opacity={0.35}
                        filter="url(#laserGlow)"
                      />
                    )}

                    {/* Live Traveling Photon 1 (Center to Outer) */}
                    <motion.circle
                      r={isHighlighted ? '2' : '1.4'}
                      fill={d.color}
                      filter="url(#laserGlow)"
                      animate={{
                        cx: [50, cx],
                        cy: [50, cy],
                        opacity: [0, 1, 0],
                        scale: [0.8, 1.3, 0.8],
                      }}
                      transition={{
                        duration: isHighlighted ? 1.4 : 2.6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.45,
                      }}
                    />

                    {/* Live Traveling Photon 2 (Outer to Center - Bidirectional Sync) */}
                    <motion.circle
                      r={isHighlighted ? '1.8' : '1.2'}
                      fill="#FFFFFF"
                      stroke={d.color}
                      strokeWidth="0.5"
                      animate={{
                        cx: [cx, 50],
                        cy: [cy, 50],
                        opacity: [0, 0.9, 0],
                      }}
                      transition={{
                        duration: isHighlighted ? 1.6 : 3.0,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.45 + 0.8,
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* ─── Center Node (Rivinity Core Hub) ─── */}
            <motion.div
              onMouseEnter={() => {
                setIsCoreHovered(true);
                setActiveDomainId('rivinity-core');
              }}
              onMouseLeave={() => {
                setIsCoreHovered(false);
                setActiveDomainId(null);
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full flex flex-col items-center justify-center z-30 cursor-pointer transition-all duration-300 group/core"
              animate={{
                scale: isCoreHovered ? 1.12 : [1, 1.04, 1],
                boxShadow: isCoreHovered
                  ? '0 0 45px rgba(106,53,255,0.7), inset 0 0 20px rgba(255,255,255,0.4)'
                  : '0 0 30px rgba(106,53,255,0.35)',
              }}
              transition={{
                scale: { duration: 3, repeat: isCoreHovered ? 0 : Infinity, ease: 'easeInOut' },
                boxShadow: { duration: 0.3 },
              }}
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #6A35FF 60%, #4F46E5 100%)',
              }}
            >
              {/* Core Pulsing Halo */}
              <motion.div
                className="absolute -inset-2.5 rounded-full border-2 border-[#6A35FF]/40 pointer-events-none"
                animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
              />

              <Layers size={22} className="text-white mb-1 group-hover/core:rotate-12 transition-transform duration-300" />
              <div className="text-white text-[13px] font-bold tracking-tight text-center leading-none">
                Rivinity
                <br />
                <span className="text-[11px] font-medium text-white/80">Core</span>
              </div>
            </motion.div>

            {/* ─── Outer Domain Satellite Nodes ─── */}
            {outerDomains.map((d, i) => {
              const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
              const r = 38;
              const cx = 50 + r * Math.cos(angle);
              const cy = 50 + r * Math.sin(angle);
              const Icon = d.icon;
              const isSelected = activeDomainId === d.id;
              const isDimmed = activeDomainId && activeDomainId !== d.id && !isCoreHovered;

              return (
                <div
                  key={d.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
                  style={{ left: `${cx}%`, top: `${cy}%` }}
                >
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.08 + 0.2 }}
                    onMouseEnter={() => setActiveDomainId(d.id)}
                    onMouseLeave={() => setActiveDomainId(null)}
                    whileHover={{
                      scale: 1.25,
                      y: -3,
                      transition: { type: 'spring', stiffness: 450, damping: 20 },
                    }}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 relative group/node ${
                      isSelected
                        ? 'shadow-[0_10px_28px_rgba(0,0,0,0.16)] ring-3'
                        : 'shadow-md hover:shadow-lg'
                    }`}
                    style={{
                      background: isSelected ? '#FFFFFF' : d.colorLight,
                      border: `1.5px solid ${isSelected ? d.color : d.colorBorder}`,
                      opacity: isDimmed ? 0.45 : 1,
                      filter: isSelected ? `drop-shadow(0 0 12px ${d.color}60)` : undefined,
                    }}
                  >
                    {/* Ripple on active/hovered */}
                    {isSelected && (
                      <motion.div
                        className="absolute -inset-2 rounded-2xl border-2 pointer-events-none"
                        style={{ borderColor: d.color }}
                        animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                      />
                    )}

                    <Icon
                      size={22}
                      style={{ color: d.color }}
                      strokeWidth={1.8}
                      className="transition-transform duration-200 group-hover/node:scale-110"
                    />

                    {/* Node Mini Label Pill */}
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/node:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-40">
                      <span
                        className="px-2 py-0.5 text-[10px] font-bold rounded-md text-white shadow-md"
                        style={{ background: d.color }}
                      >
                        {d.name}
                      </span>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* ─── Dynamic Live Status Telemetry Bar ─── */}
          <div className="max-w-md mx-auto min-h-[58px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {activeDomain ? (
                <motion.div
                  key={activeDomain.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="w-full inline-flex items-center justify-between gap-4 px-5 py-3 rounded-2xl bg-white border shadow-sm"
                  style={{ borderColor: activeDomain.colorBorder }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: activeDomain.colorLight }}
                    >
                      <activeDomain.icon size={16} style={{ color: activeDomain.color }} strokeWidth={2} />
                    </div>
                    <div className="text-left">
                      <div className="text-[13px] font-semibold text-[#09090B] leading-none mb-1">
                        {activeDomain.name}
                      </div>
                      <div className="text-[11px] text-[#71717A] leading-none">
                        {activeDomain.subtitle}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full animate-ping" style={{ background: activeDomain.color }} />
                    <span className="text-[11px] font-bold" style={{ color: activeDomain.color }}>
                      {activeDomain.status}
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="default-telemetry"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#F4F4F5] text-[#71717A] text-xs font-medium"
                >
                  <Zap size={13} className="text-[#6A35FF]" />
                  <span>Interactive Graph • Click or hover any intelligence node</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 px-8 lg:px-16 bg-[#FAFAFA]">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-semibold text-[#09090B] tracking-tight mb-6"
          >
            Collaborate with our research team
          </motion.h2>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link to="/contact" className="px-8 py-3.5 bg-[#6A35FF] text-white rounded-full font-medium hover:bg-[#7C3AED] transition-colors shadow-[0_4px_20px_rgba(106,53,255,0.3)]">
              Contact Research Team
            </Link>
            <Link to="/careers" className="px-8 py-3.5 border border-[#E4E4E7] text-[#09090B] rounded-full font-medium hover:border-[#6A35FF]/40 transition-colors bg-white">
              Join as Researcher
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
