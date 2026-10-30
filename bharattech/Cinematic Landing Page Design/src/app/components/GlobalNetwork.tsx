import React, { useRef, useEffect } from 'react';
import { motion, useInView } from 'motion/react';
import createGlobe from 'cobe';

const GLOBE_MARKERS: { location: [number, number]; size: number }[] = [
  { location: [28.6139, 77.209], size: 0.08 },   // Delhi
  { location: [19.076, 72.8777], size: 0.1 },    // Mumbai
  { location: [12.9716, 77.5946], size: 0.06 },  // Bengaluru
  { location: [37.7749, -122.4194], size: 0.05 }, // San Francisco
  { location: [40.7128, -74.006], size: 0.05 },  // New York
  { location: [51.5072, -0.1276], size: 0.05 },  // London
  { location: [1.3521, 103.8198], size: 0.04 },  // Singapore
  { location: [35.6762, 139.6503], size: 0.04 }, // Tokyo
  { location: [-33.8688, 151.2093], size: 0.04 }, // Sydney
];

const Globe = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;
    let width = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onResize = () => {
      if (canvas) width = canvas.offsetWidth;
    };
    window.addEventListener('resize', onResize);
    onResize();

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.95, 0.95, 0.97],
      markerColor: [0.42, 0.21, 1],
      glowColor: [0.56, 0.42, 1],
      markers: GLOBE_MARKERS,
    });

    let frame: number;
    const animate = () => {
      phi += 0.003;
      globe.update({ phi, width: width * 2, height: width * 2 });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', aspectRatio: 1, cursor: 'grab' }}
    />
  );
};

export const GlobalNetwork = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  return (
    <section className="py-40 bg-[#FFFFFF] relative overflow-hidden" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-8 lg:px-16 flex flex-col lg:flex-row items-center gap-16">
        
        <div className="flex-1">
          <motion.div 
            ref={ref}
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-5xl lg:text-7xl font-medium tracking-tighter text-[#09090B] mb-8 leading-[1.1]">
              Built in Bharat.<br />
              <span className="text-[#8F6BFF]">For the World.</span>
            </h2>
            <p className="text-xl text-[#09090B]/60 font-light max-w-md">
              A decentralized intelligence network scaling from the heart of India to every node across the globe.
            </p>
          </motion.div>
        </div>

        <div className="flex-1 relative w-full aspect-square">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="w-full h-full relative flex items-center justify-center"
          >
            {/* Abstract glowing globe/map visualization */}
            <div className="absolute inset-0 bg-[#FAFAFC] rounded-full border border-[#EDEDF3] shadow-[inset_0_0_100px_rgba(0,0,0,0.02)]" />
            
            {/* Grid */}
            <div className="absolute inset-0 rounded-full overflow-hidden opacity-[0.03]">
              <div className="w-full h-full" style={{ backgroundImage: 'linear-gradient(#09090B 1px, transparent 1px), linear-gradient(90deg, #09090B 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>

            {/* Glowing nodes (abstract representation) */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-[#6A35FF]"
                style={{
                  top: `${Math.random() * 60 + 20}%`,
                  left: `${Math.random() * 60 + 20}%`,
                  boxShadow: '0 0 10px rgba(106,53,255,0.8)'
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 1, 0.4]
                }}
                transition={{
                  duration: Math.random() * 2 + 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: Math.random() * 2
                }}
              />
            ))}

            {/* Connecting lines */}
            <svg className="absolute inset-0 w-full h-full opacity-30">
              {[...Array(10)].map((_, i) => (
                <motion.path
                  key={`line-${i}`}
                  d={`M ${Math.random() * 300 + 100} ${Math.random() * 300 + 100} Q 250 250 ${Math.random() * 300 + 100} ${Math.random() * 300 + 100}`}
                  stroke="#8F6BFF"
                  strokeWidth="1"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 0.5, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: Math.random() * 2
                  }}
                />
              ))}
            </svg>

          </motion.div>
        </div>

      </div>
    </section>
  );
};
