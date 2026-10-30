import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';

export const Builders = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -150]);

  return (
    <section ref={containerRef} className="py-32 bg-[#09090B] relative overflow-hidden" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-8 lg:px-16">
        
        <div className="mb-24 flex flex-col md:flex-row justify-between items-end gap-8">
          <div>
            <h2 className="text-5xl lg:text-7xl font-medium tracking-tighter text-white mb-4">
              Join the Builders.
            </h2>
            <p className="text-xl text-white/50 font-light max-w-md">
              We are not a SaaS company. We are a research lab building the next computing paradigm.
            </p>
          </div>
          <button className="px-8 py-4 bg-white text-[#09090B] rounded-full font-medium hover:bg-[#F4F4F8] transition-colors whitespace-nowrap">
            View Open Roles
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[800px] overflow-hidden">
          
          <motion.div style={{ y: y1 }} className="flex flex-col gap-6">
            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1562813733-b31f71025d54?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhaSUyMHJlc2VhcmNoJTIwbGFiJTIwZGFya3xlbnwxfHx8fDE3ODI1NjAyMzN8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="AI Research Lab"
                className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700"
              />
              <div className="absolute bottom-6 left-6 z-20">
                <p className="text-white font-medium text-sm">Research Labs</p>
                <p className="text-white/60 text-xs">Bengaluru</p>
              </div>
            </div>
            
            <div className="bg-[#1A1A1E] rounded-2xl p-8 border border-white/5">
              <h3 className="text-white font-medium text-xl mb-2">14+</h3>
              <p className="text-white/50 text-sm">Research Papers Published in 2026</p>
            </div>
          </motion.div>

          <motion.div style={{ y: y2 }} className="flex flex-col gap-6 pt-20">
            <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1695668548342-c0c1ad479aee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncHUlMjBzZXJ2ZXIlMjByYWNrJTIwZGFya3xlbnwxfHx8fDE3ODI1NjAyMzN8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="GPU Cluster"
                className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700 grayscale-[0.5]"
              />
              <div className="absolute bottom-6 left-6 z-20">
                <p className="text-white font-medium text-sm">Sovereign Compute</p>
                <p className="text-white/60 text-xs">100k H100 Cluster</p>
              </div>
            </div>
          </motion.div>

          <motion.div style={{ y: y3 }} className="flex flex-col gap-6 pt-10">
            <div className="bg-[#1A1A1E] rounded-2xl p-8 border border-white/5 aspect-square flex flex-col justify-between">
               <div>
                <p className="text-[#8F6BFF] text-xs font-semibold uppercase tracking-wider mb-2">Open Source</p>
                <h3 className="text-white font-medium text-xl">Origin 1.0</h3>
               </div>
               <p className="text-white/50 text-sm">The most capable open-weights multimodal model globally.</p>
            </div>

            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1635372722656-389f87a941b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZWJvYXJkJTIwY29tcGxleCUyMG1hdGglMjBmb3JtdWxhc3xlbnwxfHx8fDE3ODI1NjAyMzN8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Whiteboard with math"
                className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700"
              />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
