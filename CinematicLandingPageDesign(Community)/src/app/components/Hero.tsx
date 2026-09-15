import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "motion/react"; // or 'framer-motion'
import { HeroVisualization } from "./HeroVisualization";

export const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  // Parallax transform will only run on desktop to prevent mobile overlap
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Desktop parallax
  const yParallax = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y1 = isDesktop ? yParallax : 0;
  const opacity1 = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      id="home"
      ref={containerRef}
      className="relative min-h-screen w-full flex items-center justify-center bg-[#FFFFFF] overflow-hidden px-8 lg:px-16 pt-32 pb-20"
      style={{ fontFamily: "SF Pro Display, Inter, sans-serif" }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-[#B497FF]/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between z-10 gap-16 lg:gap-8">
        {/* Left Side: Typography & Buttons */}
        <motion.div
          style={{ y: y1, opacity: opacity1 }}
          className="flex-1 flex flex-col justify-center relative z-20 w-full"
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="text-5xl lg:text-7xl xl:text-[88px] font-medium leading-[1.05] tracking-tighter text-[#09090B] mb-8"
          >
            INTELLIGENCE
            <br />
            SHOULD NEVER
            <br />
            <span className="bg-gradient-to-r from-[#09090B] via-[#5B21B6] to-[#6A35FF] bg-clip-text text-transparent">
              FORGET.
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            className="flex flex-col gap-4 text-xl lg:text-2xl text-[#09090B]/60 max-w-xl font-light tracking-tight"
          >
            <p>
              The world&apos;s first continuously evolving intelligence
              infrastructure.
            </p>
            <p>One intelligence. Infinite capabilities.</p>
            <p className="font-medium text-[#09090B]">
              Built in Bharat. For the world.
            </p>
          </motion.div>

          {/* Buttons Container: Full-width stacked on mobile, auto-width row on sm+ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 mt-12 w-full sm:w-auto relative z-30"
          >
            {/* Explore Button */}
            <button className="w-full sm:w-auto px-8 py-4 bg-[#09090B] text-white rounded-full font-medium inline-flex items-center justify-center transition-all duration-300 ease-out hover:bg-[#18181B] hover:shadow-[0_0_35px_rgba(106,53,255,0.35)] active:scale-[0.98]">
              Explore Intelligence
            </button>

            {/* Watch Film Button */}
            <button className="w-full sm:w-auto px-8 py-4 bg-transparent text-[#09090B] border border-[#EDEDF3] rounded-full font-medium hover:bg-[#FAFAFC] hover:border-[#09090B]/20 transition-all duration-300 inline-flex items-center justify-center gap-3 group active:scale-[0.98]">
              <div className="w-8 h-8 rounded-full border border-[#09090B]/20 flex items-center justify-center group-hover:scale-110 group-hover:border-[#6A35FF]/40 group-hover:bg-[#6A35FF]/5 transition-all">
                <svg
                  className="w-3.5 h-3.5 fill-[#09090B] group-hover:fill-[#6A35FF] ml-0.5 transition-colors"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              Watch Film
            </button>
          </motion.div>
        </motion.div>

        {/* Right Side: Living Intelligence Object */}
        <div className="flex-1 w-full lg:h-[600px] flex items-center justify-center relative z-10 mt-36 sm:mt-40 lg:mt-40">
          <HeroVisualization />
        </div>
      </div>
    </section>
  );
};
