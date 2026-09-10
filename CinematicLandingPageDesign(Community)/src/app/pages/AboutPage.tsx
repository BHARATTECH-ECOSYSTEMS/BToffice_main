import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'motion/react';
import { Link } from 'react-router';

const principles = [
  { num: '01', title: 'Intelligence should remember.', desc: 'Context is never lost. Every interaction, every piece of knowledge, persists and compounds over time.' },
  { num: '02', title: 'Intelligence should evolve.', desc: 'Systems that learn continuously — improving through use rather than requiring constant retraining.' },
  { num: '03', title: 'Intelligence should collaborate.', desc: 'Specialized systems working in concert, sharing knowledge, creating capabilities none could achieve alone.' },
  { num: '04', title: 'Intelligence should remain trustworthy.', desc: 'Security, sovereignty, and ethical design are not optional features — they are foundational requirements.' },
  { num: '05', title: 'Intelligence should be accessible.', desc: 'From cloud environments to edge devices, intelligence infrastructure available to everyone who needs it.' },
  { num: '06', title: 'Intelligence should serve humanity.', desc: 'Technology exists to amplify human potential — not replace it. We build with humanity as the constant.' },
];

const milestones = [
  { year: '2022', event: 'Bharattech Origin founded in India with a singular mission: build the operating system for intelligence.' },
  { year: '2023', event: 'Core research begins across six intelligence domains. Early architecture of the Rivinity Core takes shape.' },
  { year: '2024', event: 'GI Rivinity prototype demonstrates continuous learning across sessions. First enterprise partnerships established.' },
  { year: '2025', event: 'Unified Intelligence Architecture validated. IoT and Geo Intelligence modules reach research completion.' },
  { year: '2026', event: 'Platform enters developer preview. Defense Intelligence and Miniature Intelligence research accelerates.' },
];

const audiences = [
  'Researchers', 'Scientists', 'Developers', 'Enterprises',
  'Governments', 'Educational Institutions', 'Defense Organizations',
  'Startups', 'Innovators', 'Students',
];

function PrincipleCard({ p, i }: { p: typeof principles[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-10%' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32, rotateX: 12 }}
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      transition={{ duration: 0.7, delay: (i % 3) * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
      className="bg-white border border-[#E4E4E7] rounded-3xl p-8 flex flex-col gap-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] cursor-default"
      style={{ transformStyle: 'preserve-3d' }}
    >
      <span className="text-5xl font-bold text-[#6A35FF]/15 leading-none">{p.num}</span>
      <h3 className="text-lg font-semibold text-[#09090B] leading-snug">{p.title}</h3>
      <p className="text-[14px] text-[#71717A] leading-relaxed">{p.desc}</p>
    </motion.div>
  );
}

export const AboutPage = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <div className="bg-white" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-24 pb-20 px-8 lg:px-16">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse,rgba(106,53,255,0.09)_0%,transparent_70%)]" />
        </div>

        {/* Floating 3D orb */}
        <motion.div style={{ y }} className="absolute right-[8%] top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="w-[420px] h-[420px] relative"
          >
            {[0, 30, 60, 90, 120, 150].map((deg, i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full border border-[#6A35FF]/10"
                style={{ transform: `rotateY(${deg}deg) rotateX(${deg * 0.4}deg)`, transformStyle: 'preserve-3d' }}
              />
            ))}
            <div className="absolute inset-8 rounded-full bg-[radial-gradient(circle,rgba(106,53,255,0.12)_0%,transparent_70%)]" />
          </motion.div>
        </motion.div>

        <motion.div style={{ opacity }} className="relative z-10 max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xs font-semibold tracking-widest uppercase text-[#6A35FF] mb-5"
          >
            About Bharattech Origin
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl lg:text-7xl font-semibold tracking-tight text-[#09090B] leading-[1.05] mb-8"
          >
            We are building the
            <br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg,#B497FF 0%,#6A35FF 50%,#4F46E5 100%)' }}>
              operating system
            </span>
            <br />
            for intelligence.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="text-lg text-[#52525B] leading-relaxed max-w-2xl"
          >
            Bharattech Origin is an Indian deep-technology research and engineering company. We are not building another AI model — we are building the intelligence infrastructure on which future AI systems can collaborate, evolve, and create new capabilities together.
          </motion.p>
        </motion.div>
      </section>

      {/* ─── Vision & Mission ─── */}
      <section className="py-24 px-8 lg:px-16 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[
            {
              tag: 'Vision',
              heading: 'To make intelligence as accessible as information.',
              body: 'Bharattech Origin envisions a future where intelligence is no longer confined to isolated AI applications. It becomes a universal infrastructure that powers research, education, automation, governance, industry, and everyday life.',
              gradient: 'from-[#EDE9FF] to-[#F5F3FF]',
              border: 'border-[#6A35FF]/15',
            },
            {
              tag: 'Mission',
              heading: 'To transform AI from isolated models into a unified intelligence ecosystem.',
              body: 'Capable of continuous learning, persistent memory, autonomous reasoning, and global collaboration — our mission is to build the foundational layer on which the next generation of intelligent systems are constructed.',
              gradient: 'from-[#E8F5F0] to-[#F0FBF7]',
              border: 'border-[#059669]/15',
            },
          ].map((card, i) => (
            <motion.div
              key={card.tag}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, delay: i * 0.1 }}
              className={`bg-gradient-to-br ${card.gradient} border ${card.border} rounded-3xl p-10`}
            >
              <p className="text-xs font-semibold tracking-widest uppercase text-[#6A35FF] mb-4">{card.tag}</p>
              <h3 className="text-2xl font-semibold text-[#09090B] leading-snug mb-5">{card.heading}</h3>
              <p className="text-[15px] text-[#52525B] leading-relaxed">{card.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Philosophy ─── */}
      <section className="py-24 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mb-16"
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-[#6A35FF] mb-4">Our Philosophy</p>
            <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#09090B] leading-tight mb-6">
              Intelligence that behaves more like the human brain
            </h2>
            <p className="text-[16px] text-[#52525B] leading-relaxed">
              Today's AI systems are powerful, but fragmented. Each model operates independently. Knowledge rarely flows between systems. We are researching a future where multiple specialized systems work together as one — the foundation of our Generative Intelligence philosophy.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {principles.map((p, i) => <PrincipleCard key={p.num} p={p} i={i} />)}
          </div>
        </div>
      </section>

      {/* ─── Timeline ─── */}
      <section className="py-24 px-8 lg:px-16 bg-[#09090B] overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-[#B497FF] mb-4">Our Journey</p>
            <h2 className="text-4xl lg:text-5xl font-semibold text-white tracking-tight">
              Built in Bharat.{' '}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg,#B497FF,#6A35FF)' }}>
                For the world.
              </span>
            </h2>
          </motion.div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[96px] lg:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#6A35FF]/40 to-transparent" />

            {milestones.map((m, i) => (
              <motion.div
                key={m.year}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ duration: 0.65, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={`flex items-start gap-8 mb-12 last:mb-0 lg:flex-row ${i % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}
              >
                {/* Year bubble */}
                <div className="flex-shrink-0 w-[88px] flex justify-center">
                  <div className="px-4 py-2 rounded-full bg-[#6A35FF]/20 border border-[#6A35FF]/30 text-[#B497FF] text-sm font-bold">
                    {m.year}
                  </div>
                </div>

                {/* Content */}
                <div className={`flex-1 lg:max-w-[42%] bg-white/5 border border-white/10 rounded-2xl px-6 py-5 ${i % 2 !== 0 ? 'lg:text-right' : ''}`}>
                  <p className="text-[15px] text-white/70 leading-relaxed">{m.event}</p>
                </div>

                {/* Spacer for opposite side on desktop */}
                <div className="hidden lg:block flex-1 lg:max-w-[42%]" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Who We Build For ─── */}
      <section className="py-24 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-[#6A35FF] mb-4">Who We Build For</p>
            <h2 className="text-4xl font-semibold text-[#09090B] tracking-tight">Intelligence for everyone who needs it</h2>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-3">
            {audiences.map((a, i) => (
              <motion.div
                key={a}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                whileHover={{ scale: 1.06, y: -3 }}
                className="px-6 py-3 rounded-full bg-[#F5F3FF] border border-[#6A35FF]/15 text-[#3F3F46] font-medium text-sm cursor-default"
              >
                {a}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 px-8 lg:px-16 bg-[#FAFAFA]">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-semibold text-[#09090B] tracking-tight mb-6"
          >
            Interested in what we are building?
          </motion.h2>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link to="/research" className="px-8 py-3.5 bg-[#6A35FF] text-white rounded-full font-medium hover:bg-[#7C3AED] transition-colors shadow-[0_4px_20px_rgba(106,53,255,0.3)]">
              Explore Our Research
            </Link>
            <Link to="/contact" className="px-8 py-3.5 border border-[#E4E4E7] text-[#09090B] rounded-full font-medium hover:border-[#6A35FF]/40 transition-colors bg-white">
              Get in Touch
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
