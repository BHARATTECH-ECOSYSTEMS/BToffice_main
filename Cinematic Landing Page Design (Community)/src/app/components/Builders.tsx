import React from 'react';
import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ArrowUpRight, Award, Cpu, FileText } from 'lucide-react';

export const Builders = () => {
  return (
    <section
      className="py-28 px-6 lg:px-16 bg-[#FAFAFA] relative overflow-hidden"
      style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6"
        >
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-[#7C3AED] mb-3">
              Our Culture & Research
            </p>
            <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#09090B] leading-tight">
              Join the <span className="text-[#6A35FF]">Builders</span>
            </h2>
            <p className="text-base text-[#52525B] font-normal max-w-lg mt-3">
              We are not just building software. We are an advanced research lab engineering the next paradigm of artificial intelligence.
            </p>
          </div>

          <button className="px-6 py-3.5 bg-[#09090B] text-white rounded-full font-medium text-sm hover:bg-[#6A35FF] transition-all duration-300 flex items-center gap-2 shadow-sm shadow-black/5 hover:shadow-md">
            <span>View Open Roles</span>
            <ArrowUpRight size={16} />
          </button>
        </motion.div>

        {/* Aligned Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Card 1 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col gap-6"
          >
            <div className="relative h-72 sm:h-80 w-full rounded-3xl overflow-hidden group shadow-md shadow-black/5 border border-[#E4E4E7]">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1562813733-b31f71025d54?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhaSUyMHJlc2VhcmNoJTIwbGFiJTIwZGFya3xlbnwxfHx8fDE3ODI1NjAyMzN8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="AI Research Lab"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-5 left-6 right-6 z-10 flex justify-between items-end">
                <div>
                  <p className="text-white font-semibold text-base">Research Labs</p>
                  <p className="text-white/70 text-xs mt-0.5">Bengaluru Innovation Campus</p>
                </div>
                <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  <Award size={16} />
                </span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-7 border border-[#E4E4E7] shadow-sm flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <FileText size={20} className="text-[#6A35FF]" />
                <h3 className="text-[#09090B] font-bold text-3xl">14+</h3>
              </div>
              <p className="text-[#52525B] text-sm font-medium">Research Papers Published in 2026</p>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col gap-6"
          >
            <div className="bg-gradient-to-br from-[#6A35FF]/10 to-[#7C3AED]/5 rounded-3xl p-7 border border-[#6A35FF]/20 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-[#6A35FF] bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-[#6A35FF]/15">
                  Open Source
                </span>
                <h3 className="text-[#09090B] font-semibold text-xl mt-4 mb-2">Origin 1.0 Multimodal</h3>
                <p className="text-[#52525B] text-sm leading-relaxed">
                  The most capable open-weights multimodal model built for enterprise scale.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#6A35FF]">
                <span>Explore Model Weights</span>
                <ArrowUpRight size={14} />
              </div>
            </div>

            <div className="relative h-72 sm:h-80 w-full rounded-3xl overflow-hidden group shadow-md shadow-black/5 border border-[#E4E4E7] flex-1">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1695668548342-c0c1ad479aee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncHUlMjBzZXJ2ZXIlMjByYWNrJTIwZGFya3xlbnwxfHx8fDE3ODI1NjAyMzN8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="GPU Cluster"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-5 left-6 right-6 z-10 flex justify-between items-end">
                <div>
                  <p className="text-white font-semibold text-base">Sovereign Compute</p>
                  <p className="text-white/70 text-xs mt-0.5">100k H100 GPU Cluster</p>
                </div>
                <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  <Cpu size={16} />
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col gap-6"
          >
            <div className="relative h-72 sm:h-80 w-full rounded-3xl overflow-hidden group shadow-md shadow-black/5 border border-[#E4E4E7]">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1635372722656-389f87a941b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZWJvYXJkJTIwY29tcGxleCUyMG1hdGglMjBmb3JtdWxhc3xlbnwxfHx8fDE3ODI1NjAyMzN8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Whiteboard with math formulas"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-5 left-6 right-6 z-10">
                <p className="text-white font-semibold text-base">First-Principles Science</p>
                <p className="text-white/70 text-xs mt-0.5">Mathematical Reasoning & Alignment</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-7 border border-[#E4E4E7] shadow-sm flex-1 flex flex-col justify-center">
              <span className="text-xs font-bold text-[#6A35FF] uppercase tracking-wider mb-1">Global Team</span>
              <h4 className="text-[#09090B] font-semibold text-lg">World-Class AI Scientists</h4>
              <p className="text-[#71717A] text-xs mt-1">Engineers & researchers across India, US, & Europe.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

