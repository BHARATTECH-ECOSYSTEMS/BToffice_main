import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

const problems = [
  { title: "Today's AI forgets.", delay: 0 },
  { title: "Today's AI is fragmented.", delay: 0.2 },
  { title: "Today's AI cannot continuously learn.", delay: 0.4 },
  { title: "Today's AI depends on isolated tools.", delay: 0.6 }
];

export const Problems = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);

  return (
    <section ref={containerRef} className="py-40 bg-[#FFFFFF] relative overflow-hidden" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-8 lg:px-16 flex flex-col lg:flex-row gap-24 items-center">
        
        <div className="flex-1">
          <div className="flex flex-col gap-12">
            {problems.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.8, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
              >
                <h3 className="text-3xl lg:text-4xl font-medium tracking-tight text-[#09090B]">
                  {p.title}
                </h3>
                <div className="h-px w-full max-w-xs bg-[#EDEDF3] mt-6" />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex-1 w-full flex items-center justify-center">
          <motion.div style={{ y }} className="relative w-full max-w-md aspect-square flex items-center justify-center">
            {/* Abstract representation of fragmentation and forgetting */}
            <div className="absolute inset-0">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-32 h-32 border rounded-2xl backdrop-blur-sm"
                  style={{
                    borderColor: "rgba(9, 9, 11, 0.1)",
                    backgroundColor: "rgba(250, 250, 252, 0.5)",
                    top: '50%', left: '50%',
                    marginLeft: '-4rem', marginTop: '-4rem'
                  }}
                  animate={{
                    x: [0, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, 0],
                    y: [0, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, 0],
                    rotate: [0, Math.random() * 90, Math.random() * -90, 0],
                    opacity: [1, 0.2, 0.5, 1]
                  }}
                  transition={{
                    duration: 10 + Math.random() * 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
            
            {/* Core attempting to hold it together */}
            <motion.div 
              className="w-16 h-16 rounded-full bg-[#09090B] z-10 flex items-center justify-center shadow-xl"
              animate={{ scale: [1, 0.8, 1.1, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            </motion.div>
          </motion.div>
        </div>

      </div>
    </section>
  );
};
