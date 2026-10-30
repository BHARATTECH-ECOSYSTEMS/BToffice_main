import React, { useState } from 'react';
import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { Link } from 'react-router';
import { ArrowRight, MapPin, Clock, Briefcase } from 'lucide-react';

const roles = [
  { title: 'Research Scientist — Generative Intelligence', team: 'GI Rivinity', location: 'Hybrid · India', type: 'Full-time', dept: 'Research' },
  { title: 'Senior ML Engineer — Memory Architecture', team: 'Rivinity Core', location: 'Remote · Global', type: 'Full-time', dept: 'Engineering' },
  { title: 'AI Infrastructure Engineer', team: 'Platform', location: 'Hybrid · India', type: 'Full-time', dept: 'Engineering' },
  { title: 'Research Engineer — IoT Intelligence', team: 'IoT Intelligence', location: 'Hybrid · India', type: 'Full-time', dept: 'Research' },
  { title: 'Geospatial AI Researcher', team: 'Geo Intelligence', location: 'Hybrid · India', type: 'Full-time', dept: 'Research' },
  { title: 'Security AI Researcher', team: 'Defense Intelligence', location: 'On-site · India', type: 'Full-time', dept: 'Research' },
  { title: 'Frontend Engineer — Developer Platform', team: 'Platform', location: 'Remote · Global', type: 'Full-time', dept: 'Engineering' },
  { title: 'Technical Writer — Research Documentation', team: 'Communications', location: 'Remote · Global', type: 'Full-time', dept: 'Operations' },
];

const depts = ['All', 'Research', 'Engineering', 'Operations'];

const values = [
  { heading: 'Long-term thinking', body: 'We are building infrastructure for decades. Every decision is made with that timeline in mind.' },
  { heading: 'Deep craft', body: 'We hire people who care deeply about the quality of their work — not just shipping, but shipping right.' },
  { heading: 'Calm confidence', body: 'We operate with precision and clarity, not urgency theater. The best intelligence is thoughtful intelligence.' },
  { heading: 'Mission first', body: 'We are building for humanity — researchers, governments, developers, students. That purpose drives everything we do.' },
];

export const CareersPage = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const filtered = activeFilter === 'All' ? roles : roles.filter(r => r.dept === activeFilter);

  const heroRef = useRef<HTMLDivElement>(null);
  const isHeroInView = useInView(heroRef, { once: true });

  return (
    <div className="bg-white" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative min-h-[70vh] flex items-center pt-28 pb-20 px-8 lg:px-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[700px] h-[600px] bg-[radial-gradient(ellipse,rgba(106,53,255,0.07)_0%,transparent_70%)]" />
          {/* 3D floating shapes */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-2xl border border-[#6A35FF]/10 bg-[#F5F3FF]/40 backdrop-blur-sm"
              style={{
                width: 60 + i * 20,
                height: 60 + i * 20,
                top: `${15 + i * 12}%`,
                right: `${5 + i * 6}%`,
                transformStyle: 'preserve-3d',
              }}
              animate={{
                rotateY: [0, 15, 0],
                rotateX: [0, -10, 0],
                y: [0, -10, 0],
              }}
              transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-semibold tracking-widest uppercase text-[#6A35FF] mb-5"
          >
            Careers at Bharattech Origin
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl lg:text-7xl font-semibold tracking-tight text-[#09090B] leading-[1.05] mb-8"
          >
            Build intelligence
            <br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg,#B497FF 0%,#6A35FF 60%)' }}>
              with us.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="text-lg text-[#52525B] leading-relaxed max-w-2xl"
          >
            We are researchers, engineers, and builders working on some of the hardest problems in AI infrastructure. If you want your work to matter at a foundational level, this is where you belong.
          </motion.p>
        </div>
      </section>

      {/* ─── Culture values ─── */}
      <section className="py-20 px-8 lg:px-16 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-[#6A35FF] mb-3">How We Work</p>
            <h2 className="text-4xl font-semibold text-[#09090B] tracking-tight">Our culture</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v, i) => (
              <motion.div
                key={v.heading}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white border border-[#E4E4E7] rounded-3xl p-7 flex flex-col gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-[#6A35FF]" style={{ boxShadow: '0 0 8px rgba(106,53,255,0.6)' }} />
                <h3 className="text-lg font-semibold text-[#09090B]">{v.heading}</h3>
                <p className="text-[14px] text-[#71717A] leading-relaxed">{v.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Open Roles ─── */}
      <section className="py-24 px-8 lg:px-16">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12"
          >
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-[#6A35FF] mb-2">Open Positions</p>
              <h2 className="text-4xl font-semibold text-[#09090B] tracking-tight">Current openings</h2>
            </div>
            {/* Filter tabs */}
            <div className="flex gap-2 bg-[#F5F5F5] rounded-full p-1">
              {depts.map(d => (
                <button
                  key={d}
                  onClick={() => setActiveFilter(d)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeFilter === d ? 'bg-white text-[#09090B] shadow-sm' : 'text-[#71717A] hover:text-[#09090B]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="flex flex-col gap-3">
            {filtered.map((role, i) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                whileHover={{ x: 4, transition: { duration: 0.15 } }}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E4E4E7] rounded-2xl px-6 py-5 hover:border-[#6A35FF]/30 hover:shadow-[0_4px_20px_rgba(106,53,255,0.08)] transition-all duration-200 cursor-pointer"
              >
                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-[#09090B] text-[15px] group-hover:text-[#6A35FF] transition-colors">
                    {role.title}
                  </span>
                  <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#71717A]">
                    <span className="flex items-center gap-1.5"><Briefcase size={12} />{role.team}</span>
                    <span className="flex items-center gap-1.5"><MapPin size={12} />{role.location}</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} />{role.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-[#F5F3FF] text-[#6A35FF]">
                    {role.dept}
                  </span>
                  <div className="w-8 h-8 rounded-full border border-[#E4E4E7] flex items-center justify-center group-hover:bg-[#6A35FF] group-hover:border-[#6A35FF] transition-all">
                    <ArrowRight size={14} className="text-[#71717A] group-hover:text-white transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* No positions message */}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-[#71717A]">No open positions in this department right now.</div>
          )}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 px-8 lg:px-16 bg-[#09090B] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse,rgba(106,53,255,0.2),transparent_70%)] pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-semibold text-white tracking-tight mb-4"
          >
            Do not see a role that fits?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[16px] text-white/50 mb-8"
          >
            We are always looking for exceptional researchers and engineers. Send us your story.
          </motion.p>
          <Link
            to="/contact"
            className="inline-block px-8 py-4 bg-white text-[#09090B] rounded-full font-semibold hover:bg-[#EDE9FF] transition-colors"
          >
            Send an Open Application
          </Link>
        </div>
      </section>
    </div>
  );
};
