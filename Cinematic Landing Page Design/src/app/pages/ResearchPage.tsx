import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'motion/react';
import { Link } from 'react-router';
import { Brain, Cpu, Globe2, Shield, Layers, Minimize2 } from 'lucide-react';

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
    colorLight: 'rgba(106,53,255,0.08)',
    colorBorder: 'rgba(106,53,255,0.2)',
    bgGradient: 'from-[#EDE9FF] to-[#F5F3FF]',
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
    colorLight: 'rgba(124,58,237,0.08)',
    colorBorder: 'rgba(124,58,237,0.2)',
    bgGradient: 'from-[#F3EEFF] to-[#F8F5FF]',
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
    colorLight: 'rgba(5,150,105,0.08)',
    colorBorder: 'rgba(5,150,105,0.2)',
    bgGradient: 'from-[#E8F5F0] to-[#F0FBF7]',
  },
  {
    id: 'geo-intelligence',
    tag: '04',
    icon: Globe2,
    name: 'Geo Intelligence',
    subtitle: 'Geospatial & Location AI',
    description: 'A specialized intelligence layer combining AI with geospatial technologies, GIS, remote sensing, satellite imagery, climate analysis, transportation networks, and location-based reasoning to understand and reason about the physical world.',
    details: ['Satellite imagery analysis', 'GIS & geospatial reasoning', 'Climate intelligence', 'Transportation optimization', 'Remote sensing AI'],
    color: '#0891B2',
    colorLight: 'rgba(8,145,178,0.08)',
    colorBorder: 'rgba(8,145,178,0.2)',
    bgGradient: 'from-[#E0F7FA] to-[#F0FBFD]',
  },
  {
    id: 'defense-intelligence',
    tag: '05',
    icon: Shield,
    name: 'Defense Intelligence',
    subtitle: 'Secure & Mission-Critical AI',
    description: 'Research focused on secure AI architectures for defense, cybersecurity, strategic analysis, autonomous monitoring, and mission-critical decision support. Emphasis on trustworthy and resilient intelligence systems operating in adversarial environments.',
    details: ['Secure AI architecture', 'Cybersecurity intelligence', 'Strategic analysis', 'Autonomous monitoring', 'Mission-critical reliability'],
    color: '#DC2626',
    colorLight: 'rgba(220,38,38,0.08)',
    colorBorder: 'rgba(220,38,38,0.2)',
    bgGradient: 'from-[#FEF2F2] to-[#FFF5F5]',
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
    colorLight: 'rgba(217,119,6,0.08)',
    colorBorder: 'rgba(217,119,6,0.2)',
    bgGradient: 'from-[#FFFBEB] to-[#FEFDF5]',
  },
];

function DomainCard({ domain, i }: { domain: typeof domains[0]; i: number }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-8%' });
  const Icon = domain.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      transition={{ duration: 0.7, delay: (i % 3) * 0.12, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.25 } }}
      className={`relative bg-gradient-to-br ${domain.bgGradient} border rounded-3xl p-8 flex flex-col gap-6 cursor-default overflow-hidden`}
      style={{ borderColor: domain.colorBorder, transformStyle: 'preserve-3d' }}
    >
      {/* Background glow on hover */}
      <motion.div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ background: `radial-gradient(circle at 30% 30%, ${domain.color}15, transparent 70%)` }}
      />

      {/* Tag + Icon */}
      <div className="flex items-start justify-between relative z-10">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: domain.colorLight }}
        >
          <Icon size={22} style={{ color: domain.color }} strokeWidth={1.7} />
        </div>
        <span className="text-4xl font-bold leading-none" style={{ color: domain.color, opacity: 0.2 }}>
          {domain.tag}
        </span>
      </div>

      {/* Text */}
      <div className="relative z-10">
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: domain.color }}>
          {domain.subtitle}
        </p>
        <h3 className="text-2xl font-semibold text-[#09090B] tracking-tight mb-3">{domain.name}</h3>
        <p className="text-[14px] text-[#52525B] leading-relaxed">{domain.description}</p>
      </div>

      {/* Details list */}
      <div className="relative z-10 flex flex-col gap-2 pt-4 border-t" style={{ borderColor: domain.colorBorder }}>
        {domain.details.map(d => (
          <div key={d} className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: domain.color }} />
            <span className="text-[13px] text-[#3F3F46]">{d}</span>
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

  return (
    <div className="bg-white" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative min-h-[80vh] flex items-center justify-center overflow-hidden pt-28 pb-20 px-8 lg:px-16 bg-[#09090B]">
        {/* Particle grid */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse,rgba(106,53,255,0.25)_0%,transparent_70%)]" />
        </div>

        {/* Rotating 3D sphere of rings */}
        <motion.div
          style={{ y }}
          className="absolute right-[5%] top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <div className="relative w-[360px] h-[360px]" style={{ perspective: '1000px' }}>
            {[0, 30, 60, 90, 120, 150].map((deg, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border border-[#6A35FF]/25"
                animate={{ rotateY: [deg, deg + 360] }}
                transition={{ duration: 12 + i * 2, repeat: Infinity, ease: 'linear' }}
                style={{ transformStyle: 'preserve-3d', transform: `rotateY(${deg}deg) rotateX(20deg)` }}
              />
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-[radial-gradient(circle,rgba(180,151,255,0.5),rgba(106,53,255,0.2))] blur-xl" />
            </div>
          </div>
        </motion.div>

        <div className="relative z-10 max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xs font-semibold tracking-widest uppercase text-[#B497FF] mb-5"
          >
            Core Research Areas
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl lg:text-7xl font-semibold tracking-tight text-white leading-[1.05] mb-8"
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
            className="text-lg text-white/50 leading-relaxed max-w-2xl"
          >
            Our research spans six interconnected intelligence domains that together form a single unified ecosystem — where knowledge flows continuously and new capabilities emerge through interaction.
          </motion.p>
        </div>
      </section>

      {/* ─── Domain Cards ─── */}
      <section className="py-24 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {domains.map((d, i) => <DomainCard key={d.id} domain={d} i={i} />)}
          </div>
        </div>
      </section>

      {/* ─── Unified Architecture ─── */}
      <section className="py-24 px-8 lg:px-16 bg-[#FAFAFA]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-[#6A35FF] mb-4">Unified Architecture</p>
            <h2 className="text-4xl lg:text-5xl font-semibold text-[#09090B] tracking-tight mb-8 leading-tight">
              Not six products.<br />One living intelligence.
            </h2>
            <p className="text-[16px] text-[#52525B] leading-relaxed max-w-2xl mx-auto mb-12">
              The six research domains are not independent products — they form a single intelligence ecosystem where research improves every model, memory is shared intelligently, specialized systems collaborate, knowledge flows continuously, and new capabilities emerge through interaction.
            </p>
          </motion.div>

          {/* Connection diagram */}
          <div className="relative w-full max-w-lg mx-auto aspect-square mb-12">
            {/* Center node */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-[#6A35FF] flex items-center justify-center z-20"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="text-white text-xs font-bold text-center leading-tight">Rivinity<br/>Core</div>
            </motion.div>

            {/* Outer nodes */}
            {domains.filter(d => d.id !== 'rivinity-core').map((d, i) => {
              const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
              const r = 38;
              const cx = 50 + r * Math.cos(angle);
              const cy = 50 + r * Math.sin(angle);
              const Icon = d.icon;
              return (
                <React.Fragment key={d.id}>
                  {/* Line */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                    <motion.line
                      x1="50" y1="50" x2={cx} y2={cy}
                      stroke={d.color} strokeWidth="0.5" opacity="0.4"
                      strokeDasharray="2 2"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: i * 0.15 }}
                    />
                  </svg>
                  {/* Node */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 + 0.3 }}
                    className="absolute w-12 h-12 rounded-2xl flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${cx}%`, top: `${cy}%`, background: d.colorLight, border: `1px solid ${d.colorBorder}` }}
                  >
                    <Icon size={18} style={{ color: d.color }} strokeWidth={1.7} />
                  </motion.div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 px-8 lg:px-16">
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
