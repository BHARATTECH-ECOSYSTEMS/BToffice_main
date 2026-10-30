import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { HeroVisualization } from './HeroVisualization';

export const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity1 = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scaleLogo = useTransform(scrollYProgress, [0, 1], [1, 1.5]);

  return (
    <section 
      ref={containerRef}
      className="relative min-h-screen w-full flex items-center justify-center bg-[#FFFFFF] overflow-hidden px-8 lg:px-16 pt-32 pb-20"
      style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}
    >
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-[#B497FF]/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between z-10 gap-16 lg:gap-8">
        
        {/* Left Side: Typography */}
        <motion.div 
          style={{ y: y1, opacity: opacity1 }}
          className="flex-1 flex flex-col justify-center"
        >
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="text-5xl lg:text-7xl xl:text-[88px] font-medium leading-[1.05] tracking-tighter text-[#09090B] mb-8"
          >
            INTELLIGENCE<br />
            SHOULD NEVER<br />
            FORGET.
          </motion.h1>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            className="flex flex-col gap-4 text-xl lg:text-2xl text-[#09090B]/60 max-w-xl font-light tracking-tight"
          >
            <p>The world's first continuously evolving intelligence infrastructure.</p>
            <p>One intelligence. Infinite capabilities.</p>
            <p className="font-medium text-[#09090B]">Built in Bharat. For the world.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
            className="flex items-center gap-6 mt-12"
          >
            <button className="px-8 py-4 bg-[#09090B] text-white rounded-full font-medium hover:bg-[#6A35FF] transition-all duration-500 ease-out shadow-[0_0_40px_rgba(106,53,255,0)] hover:shadow-[0_0_40px_rgba(106,53,255,0.4)]">
              Explore Intelligence
            </button>
            <button className="px-8 py-4 bg-transparent text-[#09090B] border border-[#EDEDF3] rounded-full font-medium hover:bg-[#FAFAFC] transition-colors flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full border border-[#09090B]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <div className="w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-[#09090B] border-b-4 border-b-transparent ml-1" />
              </div>
              Watch Film
            </button>
          </motion.div>
        </motion.div>

        {/* Right Side: Living Intelligence Object */}
        <div className="flex-1 w-full lg:h-[600px] flex items-center justify-center relative mt-8 lg:mt-0">
          <HeroVisualization />
        </div>

      </div>
    </section>
  );
};
