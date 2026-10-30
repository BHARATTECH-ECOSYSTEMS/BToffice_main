import React from 'react';
import { motion } from 'motion/react';

export const Footer = () => {
  return (
    <footer className="relative bg-[#FFFFFF] pt-40 pb-20 overflow-hidden" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
      
      {/* Huge Future Statement */}
      <div className="max-w-7xl mx-auto px-8 lg:px-16 text-center mb-40 relative z-10">
        <motion.h2 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl lg:text-8xl xl:text-[120px] font-medium tracking-tighter text-[#09090B] leading-[0.9] mb-12"
        >
          THE NEXT ERA<br />
          OF INTELLIGENCE<br />
          BEGINS HERE.
        </motion.h2>
        <motion.button 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="px-10 py-5 bg-[#6A35FF] text-white rounded-full font-medium text-lg hover:bg-[#8F6BFF] transition-all shadow-[0_0_40px_rgba(106,53,255,0.4)] hover:shadow-[0_0_60px_rgba(106,53,255,0.6)] hover:-translate-y-1"
        >
          Initialize Origin
        </motion.button>
      </div>

      {/* Footer collapsing threads animation */}
      <div className="relative h-64 w-full flex items-center justify-center mb-20 pointer-events-none">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="relative w-32 h-32"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full opacity-60">
            <motion.circle 
              cx="50" cy="50" r="40" 
              stroke="#09090B" strokeWidth="0.5" fill="none"
              strokeDasharray="4 4"
            />
            <motion.path 
              d="M10 50 Q 50 10 90 50" 
              stroke="#6A35FF" strokeWidth="1" fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path 
              d="M10 50 Q 50 90 90 50" 
              stroke="#B497FF" strokeWidth="1" fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            />
            <circle cx="50" cy="50" r="4" fill="#09090B" />
          </svg>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-8 lg:px-16 flex flex-col md:flex-row justify-between items-center border-t border-[#EDEDF3] pt-8 text-sm text-[#09090B]/40">
        <p>© 2026 Bharattech Origin. All rights reserved.</p>
        <div className="flex gap-8 mt-4 md:mt-0">
          <a href="#" className="hover:text-[#09090B] transition-colors">Privacy</a>
          <a href="#" className="hover:text-[#09090B] transition-colors">Terms</a>
          <a href="#" className="hover:text-[#09090B] transition-colors">System Status</a>
        </div>
      </div>
    </footer>
  );
};
