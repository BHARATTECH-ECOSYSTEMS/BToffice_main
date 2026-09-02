import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';

const capabilities = [
  "Deep Research", "Agent Builder", "Knowledge Memory", "Voice Intelligence", 
  "Vision Intelligence", "AI Search", "Workspace", "AI Studio", 
  "Browser", "Workflow Builder", "Developer APIs", "Enterprise Intelligence", 
  "Security", "Model Deployment", "Marketplace"
];

export const Capabilities = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  return (
    <section className="py-40 px-8 lg:px-16 bg-[#FAFAFC] relative overflow-hidden" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
      <div className="max-w-7xl mx-auto">
        <motion.div 
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-24"
        >
          <h2 className="text-4xl lg:text-6xl font-medium tracking-tighter text-[#09090B] mb-6">
            One Intelligence.<br />
            <span className="text-[#6A35FF]">Infinite Capabilities.</span>
          </h2>
          <p className="text-xl text-[#09090B]/50 font-light max-w-2xl mx-auto">
            Everything belongs to ONE Intelligence. No fragmented tools. No isolated data.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }}
              style={{ backgroundColor: "rgba(255, 255, 255, 0.5)", boxShadow: "0 0px 0px rgba(106,53,255,0)" }}
              whileHover={{ scale: 1.05, backgroundColor: "#FFFFFF", boxShadow: "0 20px 40px rgba(106,53,255,0.08)" }}
              className="aspect-square backdrop-blur-md border border-[#EDEDF3] rounded-[32px] p-6 flex flex-col items-center justify-center text-center group cursor-pointer transition-colors"
            >
              <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-b from-[#F4F4F8] to-[#FFFFFF] border border-[#EDEDF3] flex items-center justify-center shadow-inner group-hover:border-[#B497FF]/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-[#6A35FF]/10 flex items-center justify-center group-hover:bg-[#6A35FF]/20">
                  <div className="w-2 h-2 rounded-full bg-[#6A35FF] shadow-[0_0_8px_rgba(106,53,255,0.8)]" />
                </div>
              </div>
              <span className="text-[15px] font-medium text-[#09090B]/80 group-hover:text-[#09090B] leading-tight">
                {cap}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
