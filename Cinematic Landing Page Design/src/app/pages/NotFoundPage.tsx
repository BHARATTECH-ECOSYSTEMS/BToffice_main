import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';

export const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center px-8" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
    <div className="text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-9xl font-bold text-[#EDE9FF] leading-none mb-4">404</p>
        <h1 className="text-3xl font-semibold text-[#09090B] mb-4 tracking-tight">Page not found</h1>
        <p className="text-[#71717A] mb-8 max-w-sm mx-auto">The page you are looking for does not exist or has been moved.</p>
        <Link
          to="/"
          className="inline-block px-8 py-3.5 bg-[#6A35FF] text-white rounded-full font-medium hover:bg-[#7C3AED] transition-colors"
        >
          Back to home
        </Link>
      </motion.div>
    </div>
  </div>
);
