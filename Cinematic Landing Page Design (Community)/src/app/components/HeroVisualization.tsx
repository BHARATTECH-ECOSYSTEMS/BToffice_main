import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import bharattechLogo from '../../imports/BHARATTECH_ORIGIN_Logo-02.png';

const LAYERS = [
  { id: 1, tag: "01", title: "GI Rivinity", subtitle: "Cognitive Foundation" },
  { id: 2, tag: "02", title: "Rivinity Core", subtitle: "Neural Operating System" },
  { id: 3, tag: "03", title: "IoT Intelligence", subtitle: "Connected Hardware Fabric" },
  { id: 4, tag: "04", title: "Geo Intelligence", subtitle: "Spatial & Planetary Mapping" },
  { id: 5, tag: "05", title: "Defense Intelligence", subtitle: "Autonomous Security Matrix" },
  { id: 6, tag: "06", title: "Miniature Intelligence", subtitle: "Edge & Micro Silicon Models" }
];

export const HeroVisualization = () => {
  const [hoveredLayer, setHoveredLayer] = useState<number | null>(null);
  const [activePulseLayer, setActivePulseLayer] = useState<number>(-1);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  // Continuous ambient animation pulsing down through the stack
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setActivePulseLayer(prev => {
        if (prev >= LAYERS.length) return -1;
        return prev + 1;
      });
    }, 1800);

    return () => clearInterval(pulseInterval);
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const stackScale = isDesktop ? 1 : 0.75;

  return (
    <div className="relative w-full h-[450px] lg:h-[600px] flex items-center justify-center pointer-events-auto" style={{ perspective: '1200px' }}>

      {/* Volumetric ambient glow behind architecture */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[220px] h-[220px] sm:w-[300px] sm:h-[300px] lg:w-[400px] lg:h-[400px] bg-[radial-gradient(circle_at_center,rgba(180,151,255,0.15)_0%,rgba(255,255,255,0)_70%)] rounded-full blur-2xl" />
      </div>

      <div
        className="relative w-[220px] h-[220px] lg:w-[280px] lg:h-[280px]"
        style={{
          transformStyle: 'preserve-3d',
          transform: `scale(${stackScale}) rotateX(60deg) rotateZ(-45deg)`
        }}
      >
        {/* Core Final Node (Bottom Grounding Core) */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transform: `translateZ(-50px)` }}
        >
          <motion.div
            animate={{
              scale: activePulseLayer === LAYERS.length ? [1, 1.4, 1] : 1,
              opacity: activePulseLayer === LAYERS.length ? [0, 1, 0] : 0.3
            }}
            transition={{ duration: 1 }}
            className="w-16 h-16 rounded-full bg-[#6A35FF] blur-xl"
          />
        </div>

        {/* Central Penetrating Blue Laser Conduit (Passes straight through all layers) */}
        <div
          className="absolute top-1/2 left-1/2 pointer-events-none"
          style={{
            transformOrigin: 'top center',
            transform: 'translate(-50%, 0) translateZ(380px) rotateX(-90deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Outer glow conduit */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 rounded-full blur-[2px]"
            style={{
              height: '440px',
              background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.3) 0%, rgba(56, 189, 248, 0.6) 20%, rgba(135, 93, 255, 0.7) 60%, rgba(99, 102, 241, 0.4) 90%, rgba(56, 189, 248, 0.1) 100%)'
            }}
          />

          {/* Sharp Core Luminous Blue Laser Beam */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] rounded-full"
            style={{
              height: '440px',
              background: 'linear-gradient(180deg, rgba(224, 242, 254, 0.9) 0%, #38BDF8 25%, #818CF8 60%, #A855F7 85%, rgba(168, 85, 247, 0.2) 100%)',
              boxShadow: '0 0 6px rgba(56, 189, 248, 0.8), 0 0 12px rgba(129, 140, 248, 0.5)'
            }}
          />

          {/* Cross plane for true 3D volumetric cylinder rendering */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] rounded-full"
            style={{
              height: '440px',
              transform: 'rotateY(90deg)',
              background: 'linear-gradient(180deg, rgba(224, 242, 254, 0.8) 0%, #38BDF8 25%, #818CF8 60%, #A855F7 85%, rgba(168, 85, 247, 0.2) 100%)',
              boxShadow: '0 0 6px rgba(56, 189, 248, 0.8)'
            }}
          />

          {/* Continuous flowing energy packet moving along the beam */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 w-2 h-14 rounded-full bg-gradient-to-b from-white via-cyan-300 to-transparent blur-[1px]"
            animate={{
              top: ['0px', '410px'],
              opacity: [0, 1, 1, 0]
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        {/* 6 Intelligence Architecture Layers */}
        {LAYERS.map((layer, index) => {
          const zOffset = (5 - index) * 50;
          const isHovered = hoveredLayer === index;
          const isPulsing = activePulseLayer === index;

          return (
            <div
              key={layer.id}
              onMouseEnter={() => setHoveredLayer(index)}
              onMouseLeave={() => setHoveredLayer(null)}
              className="absolute inset-0 cursor-pointer group"
              style={{
                transform: `translateZ(${zOffset}px)`,
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Glass Panel Layer Body */}
              <motion.div
                className="absolute inset-0 rounded-[2rem] border flex items-center justify-center overflow-hidden"
                animate={{
                  backgroundColor: isHovered || isPulsing ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)",
                  borderColor: isHovered || isPulsing ? "rgba(106,53,255,0.55)" : "rgba(180,151,255,0.3)",
                  boxShadow: isHovered || isPulsing
                    ? "inset 0 0 30px rgba(106,53,255,0.15), 0 10px 30px rgba(106,53,255,0.1)"
                    : "inset 0 0 20px rgba(106,53,255,0.05), 0 10px 30px rgba(0,0,0,0.02)"
                }}
                transition={{ duration: 0.2 }}
                style={{
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
              >
                {/* Tech Grid Coordinate Lines */}
                <div 
                  className="absolute inset-0 bg-[linear-gradient(rgba(106,53,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(106,53,255,0.035)_1px,transparent_1px)] bg-[size:20px_20px]"
                />

                {/* Center Node / Penetration Dot */}
                <motion.div
                  className="w-2.5 h-2.5 rounded-full pointer-events-none z-10"
                  animate={{
                    backgroundColor: isHovered || isPulsing ? "#38BDF8" : "#6A35FF",
                    scale: isHovered || isPulsing ? [1, 1.3, 1] : 1,
                    opacity: isHovered || isPulsing ? 1 : 0.45,
                    boxShadow: isHovered || isPulsing 
                      ? "0 0 10px rgba(56, 189, 248, 0.9), 0 0 18px rgba(106, 53, 255, 0.6)" 
                      : "none"
                  }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>

              {/* Counter-rotated 3D Screen-Aligned Label Badge & Connector */}
              <div
                className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none"
                style={{
                  transform: 'rotateZ(45deg) rotateX(-60deg) translateZ(0.01px)',
                  transformStyle: 'preserve-3d',
                  willChange: 'transform',
                  backfaceVisibility: 'visible',
                  WebkitBackfaceVisibility: 'visible',
                }}
              >
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: -8, scale: 0.92 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -8, scale: 0.92 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="absolute top-1/2 -translate-y-1/2 flex items-center"
                      style={{ left: `${isDesktop ? 80 : 105}px` }}
                    >
                      {/* Luminous Connector Beam */}
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ scaleX: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="h-[1.5px] w-[32px] lg:w-[130px] bg-gradient-to-r from-[#38BDF8] via-[#6A35FF] to-[#875dff] origin-left shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                      />

                      {/* Glassmorphic Layer Label Badge */}
                      <div
                        className="flex items-center gap-3 ml-2 bg-white/95 backdrop-blur-xl pl-3.5 pr-4 py-2 lg:px-4 lg:py-2.5 rounded-2xl border border-[#6A35FF]/30 shadow-[0_12px_30px_rgba(106,53,255,0.15),0_0_15px_rgba(56,189,248,0.2)]"
                        style={{ width: isDesktop ? 'auto' : '150px' }}
                      >
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#6A35FF]/10 text-[#6A35FF] border border-[#6A35FF]/20">
                          {layer.tag}
                        </span>
                        <div className="flex flex-col">
                          <span
                            className="text-xs lg:text-sm font-semibold text-[#09090B] leading-none"
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            {layer.title}
                          </span>
                          {/* <span className="text-[10px] text-[#09090B]/50 font-normal leading-tight mt-0.5" style={{ whiteSpace: 'nowrap' }}>
                            {layer.subtitle}
                          </span> */}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Flat Glow underneath the Logo */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transform: `translateY(${-365 * stackScale}px)`
        }}
      >
        <motion.div
          className="w-28 h-28 bg-gradient-to-tr from-[#6A35FF] via-[#38BDF8] to-[#875dff] blur-2xl rounded-full"
          animate={{
            opacity: isLogoHovered ? 0.65 : (activePulseLayer === -1 ? 0.4 : 0.15),
            scale: isLogoHovered ? 1.15 : 1
          }}
          transition={{ duration: 0.6 }}
        />
      </div>

      {/* Bharattech Origin Core Logo (Top Node) */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transformStyle: 'preserve-3d',
          transform: `scale(${stackScale}) rotateX(60deg) rotateZ(-45deg)`
        }}
      >
        <div
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
          className="absolute inset-0 flex items-center justify-center cursor-pointer pointer-events-auto"
          style={{ 
            transform: 'translateZ(350px)',
            transformStyle: 'preserve-3d' 
          }}
        >
          <motion.div
            className="relative w-24 h-24 flex items-center justify-center"
            style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}
          >
            {/* Luminous Pulsing Outer Ring on Logo Hover */}
            <AnimatePresence>
              {isLogoHovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1.15 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 border-2 border-cyan-400/80 rounded-full"
                  style={{
                    boxShadow: "0 0 25px rgba(56,189,248,0.7), inset 0 0 20px rgba(135,93,255,0.6)"
                  }}
                />
              )}
            </AnimatePresence>

            {/* PNG Logo */}
            <div className="relative z-10 w-full h-full">
              <ImageWithFallback
                src={bharattechLogo}
                alt="Bharattech Origin Core"
                className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.9)]"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

