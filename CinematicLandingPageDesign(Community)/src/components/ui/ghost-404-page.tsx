import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router';
import { FlowButton } from './flow-button';
import { Home, Compass, HelpCircle } from 'lucide-react';

const containerVariants = {
  hidden: { 
    opacity: 0,
    y: 30
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.43, 0.13, 0.23, 0.96],
      delayChildren: 0.1,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { 
    opacity: 0,
    y: 20
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.43, 0.13, 0.23, 0.96]
    }
  }
};

const numberVariants = {
  hidden: (direction: number) => ({
    opacity: 0,
    x: direction * 40,
    y: 15,
    rotate: direction * 5
  }),
  visible: {
    opacity: 0.85,
    x: 0,
    y: 0,
    rotate: 0,
    transition: {
      duration: 0.8,
      ease: [0.43, 0.13, 0.23, 0.96]
    }
  }
};

const ghostVariants = {
  hidden: { 
    scale: 0.8,
    opacity: 0,
    y: 15,
    rotate: -5
  },
  visible: { 
    scale: 1,
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: {
      duration: 0.6,
      ease: [0.43, 0.13, 0.23, 0.96]
    }
  },
  hover: {
    scale: 1.12,
    y: -12,
    rotate: [0, -6, 6, -6, 0],
    transition: {
      duration: 0.8,
      ease: "easeInOut",
      rotate: {
        duration: 2,
        ease: "linear",
        repeat: Infinity,
        repeatType: "reverse"
      }
    }
  },
  floating: {
    y: [-6, 6],
    transition: {
      y: {
        duration: 2.2,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse"
      }
    }
  }
};

interface Ghost404PageProps {
  title?: string;
  description?: string;
  homeLink?: string;
  homeText?: string;
  secondaryLink?: string;
  secondaryText?: string;
  showHelp?: boolean;
}

export function NotFound({
  title = "Boo! Page missing!",
  description = "Whoops! This page must be a ghost — it wandered into the digital void.",
  homeLink = "/",
  homeText = "Return to Home",
  secondaryLink = "/research",
  secondaryText = "Explore Research",
  showHelp = true,
}: Ghost404PageProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center bg-white px-4 overflow-hidden selection:bg-[#6A35FF] selection:text-white" style={{ fontFamily: 'SF Pro Display, Inter, system-ui, sans-serif' }}>
      {/* Cinematic subtle background glow matching the website theme */}
      <div 
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="w-[600px] h-[600px] bg-gradient-to-tr from-[#6A35FF]/10 via-[#8B5CF6]/5 to-transparent rounded-full blur-3xl opacity-70 transform -translate-y-12 animate-pulse" />
        <div className="w-[300px] h-[300px] bg-[#6A35FF]/8 rounded-full blur-2xl opacity-60" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          className="text-center relative z-10 max-w-xl mx-auto py-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* 4 [Ghost] 4 Display */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 mb-8 md:mb-10">
            <motion.span 
              className="text-[84px] sm:text-[110px] md:text-[140px] font-extrabold text-[#09090B] tracking-tighter select-none font-signika"
              style={{
                background: 'linear-gradient(180deg, #09090B 0%, #3F3F46 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
              variants={numberVariants}
              custom={-1}
            >
              4
            </motion.span>

            <motion.div
              variants={ghostVariants}
              whileHover="hover"
              animate={["visible", "floating"]}
              className="relative cursor-pointer flex items-center justify-center filter drop-shadow-[0_12px_24px_rgba(106,53,255,0.25)]"
            >
              {!imageError ? (
                <img
                  src="https://xubohuah.github.io/xubohua.top/Group.png"
                  alt="Friendly Ghost"
                  width={130}
                  height={130}
                  onError={() => setImageError(true)}
                  className="w-[84px] h-[84px] sm:w-[110px] sm:h-[110px] md:w-[130px] md:h-[130px] object-contain select-none transition-transform"
                  draggable="false"
                />
              ) : (
                /* Sleek vector fallback ghost in case offline */
                <svg
                  className="w-[84px] h-[84px] sm:w-[110px] sm:h-[110px] md:w-[130px] md:h-[130px]"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M50 10C30 10 20 28 20 50V85C20 87 23 89 25 87L32 80L40 87L50 80L60 87L68 80L75 87C77 89 80 87 80 85V50C80 28 70 10 50 10Z"
                    fill="url(#ghost-gradient)"
                  />
                  <ellipse cx="40" cy="42" rx="4" ry="6" fill="#09090B" />
                  <ellipse cx="60" cy="42" rx="4" ry="6" fill="#09090B" />
                  <ellipse cx="50" cy="54" rx="3" ry="4" fill="#09090B" opacity="0.7" />
                  <ellipse cx="32" cy="48" rx="4" ry="2" fill="#6A35FF" opacity="0.3" />
                  <ellipse cx="68" cy="48" rx="4" ry="2" fill="#6A35FF" opacity="0.3" />
                  <defs>
                    <linearGradient id="ghost-gradient" x1="50" y1="10" x2="50" y2="87" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#EDE9FF" />
                      <stop offset="1" stopColor="#FFFFFF" />
                    </linearGradient>
                  </defs>
                </svg>
              )}
            </motion.div>

            <motion.span 
              className="text-[84px] sm:text-[110px] md:text-[140px] font-extrabold text-[#09090B] tracking-tighter select-none font-signika"
              style={{
                background: 'linear-gradient(180deg, #09090B 0%, #3F3F46 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
              variants={numberVariants}
              custom={1}
            >
              4
            </motion.span>
          </div>
          
          {/* Main Title */}
          <motion.h1 
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#09090B] mb-3 md:mb-4 tracking-tight select-none"
            variants={itemVariants}
          >
            {title}
          </motion.h1>
          
          {/* Subtitle / Description */}
          <motion.p 
            className="text-base sm:text-lg text-[#71717A] mb-8 md:mb-10 max-w-md mx-auto leading-relaxed select-none"
            variants={itemVariants}
          >
            {description}
          </motion.p>

          {/* Action CTAs */}
          <motion.div 
            className="flex flex-wrap items-center justify-center gap-4"
            variants={itemVariants}
          >
            <Link to={homeLink}>
              <FlowButton text={homeText} variant="primary" />
            </Link>

            {secondaryLink && (
              <Link 
                to={secondaryLink}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-black/10 bg-white hover:bg-zinc-50 hover:border-[#6A35FF]/30 text-sm font-semibold text-[#09090B] transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-zinc-200/50"
              >
                <Compass className="w-4 h-4 text-[#6A35FF]" />
                <span>{secondaryText}</span>
              </Link>
            )}
          </motion.div>

          {/* Help Links Footer */}
          {showHelp && (
            <motion.div 
              className="mt-12 pt-8 border-t border-zinc-100 flex items-center justify-center gap-6 text-xs text-[#71717A]"
              variants={itemVariants}
            >
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 hover:text-[#6A35FF] transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                Main Portal
              </Link>
              <span className="text-zinc-300">•</span>
              <Link
                to="/contact"
                className="inline-flex items-center gap-1.5 hover:text-[#6A35FF] transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Need Assistance?
              </Link>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default NotFound;
