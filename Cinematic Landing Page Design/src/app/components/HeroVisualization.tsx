import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import bharattechLogo from '../../imports/BHARATTECH_ORIGIN_Logo-02.png';

const LAYERS = [
  { id: 1, title: "GI Rivinity" },
  { id: 2, title: "Rivinity Core" },
  { id: 3, title: "IoT Intelligence" },
  { id: 4, title: "Geo Intelligence" },
  { id: 5, title: "Defense Intelligence" },
  { id: 6, title: "Miniature Intelligence" }
];

export const HeroVisualization = () => {
  const [hoveredLayer, setHoveredLayer] = useState<number | null>(null);
  const [activePulseLayer, setActivePulseLayer] = useState<number>(-1);
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  // Continuous ambient animation
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setActivePulseLayer(prev => {
        if (prev >= LAYERS.length) return -1;
        return prev + 1;
      });
    }, 1800); // Pulse every 1.8 seconds moves to next layer

    return () => clearInterval(pulseInterval);
  }, []);

  return (
    <div className="relative w-full h-[450px] lg:h-[600px] flex items-center justify-center pointer-events-auto" style={{ perspective: '1200px' }}>
      
      {/* Volumetric glow behind architecture */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
         <div className="w-[300px] h-[300px] lg:w-[400px] lg:h-[400px] bg-[radial-gradient(circle_at_center,rgba(180,151,255,0.15)_0%,rgba(255,255,255,0)_70%)] rounded-full blur-2xl" />
      </div>

      <div 
        className="relative w-[220px] h-[220px] lg:w-[280px] lg:h-[280px] scale-75 lg:scale-100"
        style={{ 
          transformStyle: 'preserve-3d', 
          transform: 'rotateX(60deg) rotateZ(-45deg)' 
        }}
      >
        {/* Core Final Node (Bottom) */}
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transform: `translateZ(-50px)` }}
        >
           <motion.div 
             animate={{ 
               scale: activePulseLayer === LAYERS.length ? [1, 1.5, 1] : 1,
               opacity: activePulseLayer === LAYERS.length ? [0, 1, 0] : 0
             }}
             transition={{ duration: 1 }}
             className="w-16 h-16 rounded-full bg-[#6A35FF] blur-xl"
           />
        </div>

        {/* Downward Energy Beam (Passes through all layers) */}
        <AnimatePresence>
          {isLogoHovered && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 400, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 w-[2px] bg-gradient-to-b from-[#6A35FF] via-[#B497FF] to-transparent pointer-events-none"
              style={{ 
                transformOrigin: 'top center',
                transform: 'translate(-50%, 0) translateZ(350px) rotateX(90deg)' 
              }}
            />
          )}
        </AnimatePresence>

        {/* 6 Layers */}
        {LAYERS.map((layer, index) => {
          // Layer 1 is top (index 0), Layer 6 is bottom (index 5)
          const zOffset = (5 - index) * 50; 
          const isHovered = hoveredLayer === index;
          const isPulsing = activePulseLayer === index;
          
          return (
            <motion.div
              key={layer.id}
              onMouseEnter={() => setHoveredLayer(index)}
              onMouseLeave={() => setHoveredLayer(null)}
              className="absolute inset-0 cursor-pointer group"
              initial={{ translateZ: zOffset }}
              animate={{ 
                translateZ: isHovered ? zOffset + 16 : zOffset,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Glass Panel */}
              <motion.div 
                className="absolute inset-0 rounded-[2rem] border border-[rgba(180,151,255,0.3)] bg-[rgba(255,255,255,0.3)] backdrop-blur-md shadow-[inset_0_0_20px_rgba(106,53,255,0.05),0_10px_30px_rgba(0,0,0,0.02)] flex items-center justify-center overflow-hidden"
                animate={{
                  backgroundColor: isHovered || isPulsing ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)",
                  borderColor: isHovered || isPulsing ? "rgba(106,53,255,0.5)" : "rgba(180,151,255,0.3)",
                  boxShadow: isHovered || isPulsing 
                    ? "inset 0 0 30px rgba(106,53,255,0.15), 0 10px 30px rgba(106,53,255,0.1)" 
                    : "inset 0 0 20px rgba(106,53,255,0.05), 0 10px 30px rgba(0,0,0,0.02)"
                }}
              >
                {/* Inner grid or tech lines for a premium feel */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(106,53,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(106,53,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
                
                {/* Center dot/node */}
                <motion.div 
                  className="w-2 h-2 rounded-full bg-[#6A35FF]"
                  animate={{
                    scale: isHovered || isPulsing ? [1, 1.5, 1] : 1,
                    opacity: isHovered || isPulsing ? 1 : 0.3,
                    boxShadow: isHovered || isPulsing ? "0 0 10px rgba(106,53,255,0.8)" : "none"
                  }}
                  transition={{ duration: 0.5 }}
                />
              </motion.div>

              {/* Label and Beam Container (Counter-rotated to face screen) */}
              <div 
                className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none"
                style={{ 
                  transform: 'rotateZ(45deg) rotateX(-60deg)' 
                }}
              >
                <AnimatePresence>
                  {isHovered && (
                    <motion.div 
                      initial={{ opacity: 0, x: 0 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.3 }}
                      className="absolute top-1/2 -translate-y-1/2 flex items-center"
                      style={{ left: '100px' }} // Positioned to the right of the stack
                    >
                      {/* Beam */}
                      <motion.div 
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ scaleX: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="h-[1px] w-[80px] bg-gradient-to-r from-[#6A35FF] to-transparent origin-left"
                      />
                      
                      {/* Label */}
                      <div className="flex items-center gap-3 ml-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#EDEDF3] shadow-sm whitespace-nowrap">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#6A35FF]" />
                        <span className="text-sm font-medium text-[#09090B]">{layer.title}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}

        {/* Bharattech Origin Logo (Top Layer) */}
        <motion.div
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
          className="absolute inset-0 flex items-center justify-center cursor-pointer pointer-events-auto"
          initial={{ translateZ: 350 }}
          animate={{ 
            translateZ: isLogoHovered ? 370 : 350,
            scale: isLogoHovered ? 1.05 : 1
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Logo container, counter-rotated so it faces the screen nicely, or just keep it flat?
              Wait, if we keep it flat in 3D, it looks like it's printed on a glass layer.
              But it's a logo, it might be better if it stands up and faces the user, or lays flat like a core.
              "The Bharattech Origin logo should float above the first layer. The logo becomes the intelligence core."
              Let's counter-rotate it slightly so it faces the user, or lay it flat. Laying flat is more "Apple Silicon" style.
              But since it's an image, laying flat might distort it unless it's a perfect icon.
              Let's keep it flat in the 3D plane but counter-rotate it to face the user.
          */}
          <motion.div
             className="relative w-24 h-24 flex items-center justify-center"
             style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}
          >
             {/* Glow effect behind logo */}
             <motion.div 
               className="absolute inset-0 bg-[#6A35FF] blur-2xl rounded-full"
               animate={{ 
                 opacity: isLogoHovered ? 0.6 : (activePulseLayer === -1 ? 0.4 : 0.1),
                 scale: isLogoHovered ? 1.2 : 1
               }}
               transition={{ duration: 1 }}
             />
             
             {/* Ribbons / Pulse effect requested by prompt (simulated behind/around the PNG since it's a flat image) */}
             <AnimatePresence>
               {isLogoHovered && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1.1 }}
                   exit={{ opacity: 0, scale: 0.8 }}
                   className="absolute inset-0 border-2 border-white/80 rounded-full"
                   style={{
                     boxShadow: "0 0 20px rgba(255,255,255,0.5), inset 0 0 20px rgba(255,255,255,0.5)"
                   }}
                 />
               )}
             </AnimatePresence>

             {/* The actual PNG logo */}
             <div className="relative z-10 w-full h-full">
               <ImageWithFallback 
                 src={bharattechLogo} 
                 alt="Bharattech Origin Core"
                 className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
               />
             </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
