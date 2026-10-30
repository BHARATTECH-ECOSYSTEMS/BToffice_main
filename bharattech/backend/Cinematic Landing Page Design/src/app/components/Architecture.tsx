import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

const layers = [
  { name: "Applications", color: "#B497FF" },
  { name: "Reasoning Engine", color: "#8F6BFF" },
  { name: "Memory Engine", color: "#6A35FF" },
  { name: "Knowledge Engine", color: "#6A35FF" },
  { name: "Research Engine", color: "#4B24B3" },
  { name: "Security Layer", color: "#2D1566" },
  { name: "Infrastructure Layer", color: "#1A0C33" },
  { name: "Compute Layer", color: "#0D061A" },
  { name: "Sovereign Cloud", color: "#09090B" }
];

export const Architecture = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  return (
    <section ref={containerRef} className="py-40 bg-[#09090B] relative overflow-hidden" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
      
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] bg-[#6A35FF]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-8 lg:px-16 flex flex-col items-center">
        <div className="text-center mb-32 z-10">
          <h2 className="text-4xl lg:text-6xl font-medium tracking-tighter text-white mb-6">
            Operating System<br />
            <span className="text-[#8F6BFF]">Architecture.</span>
          </h2>
        </div>

        <div className="relative w-full max-w-3xl aspect-square flex flex-col items-center justify-center perspective-1000">
          {layers.map((layer, index) => {
            // Explode animation on scroll
            const yOffset = useTransform(scrollYProgress, [0.3, 0.7], [0, (index - layers.length / 2) * -60]);
            const scale = useTransform(scrollYProgress, [0.3, 0.7], [1, 1 - index * 0.02]);
            const opacity = useTransform(scrollYProgress, [0.2, 0.4], [0, 1]);

            return (
              <motion.div
                key={layer.name}
                style={{ y: yOffset, scale, opacity, borderColor: "rgba(255, 255, 255, 0.1)" }}
                className="absolute w-[80%] aspect-[3/1] rounded-[2rem] border backdrop-blur-xl flex items-center justify-center transform-gpu"
                initial={{ rotateX: 60, rotateZ: -20 }}
                whileHover={{ scale: 1.05, borderColor: "rgba(255, 255, 255, 0.3)" }}
              >
                <div 
                  className="absolute inset-0 rounded-[2rem] opacity-20"
                  style={{ backgroundColor: layer.color, boxShadow: `0 0 40px ${layer.color}` }}
                />
                
                {/* Surface grid lines for that silicon look */}
                <div className="absolute inset-0 rounded-[2rem] overflow-hidden opacity-10">
                   <div className="w-full h-full" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                </div>

                <span className="relative z-10 text-white/90 font-medium tracking-wide uppercase text-sm lg:text-base">
                  {layer.name}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  );
};
