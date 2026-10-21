import React from 'react';
import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import bharattechLogo from '../../imports/BHARATTECH_ORIGIN_Logo-02.png';

export const Navbar = () => {
  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <ImageWithFallback 
          src={bharattechLogo} 
          alt="Bharattech Origin Logo" 
          className="h-8 object-contain"
        />
        <span className="font-semibold tracking-tighter text-[#09090B] text-lg leading-none" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
          BHARATTECH ORIGIN
        </span>
      </div>

      <div className="hidden lg:flex items-center gap-8 bg-[#F4F4F8]/80 backdrop-blur-xl px-6 py-3 rounded-full border border-[#EDEDF3]">
        {['Home', 'Mission', 'Research', 'Capabilities', 'Careers', 'Blog', 'Contact'].map((item) => (
          <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-[#09090B]/60 hover:text-[#09090B] transition-colors font-medium">
            {item}
          </a>
        ))}
      </div>
    </motion.nav>
  );
};
