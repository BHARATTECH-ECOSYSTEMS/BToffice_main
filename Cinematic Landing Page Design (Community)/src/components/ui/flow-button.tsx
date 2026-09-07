import React from 'react';
import { ArrowRight } from 'lucide-react';

interface FlowButtonProps {
  text?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'dark' | 'outline';
}

export function FlowButton({ 
  text = "Modern Button", 
  onClick,
  className = "",
  variant = "primary"
}: FlowButtonProps) {
  const isPrimary = variant === 'primary';
  const isDark = variant === 'dark';

  const borderStyle = isPrimary 
    ? "border-[#6A35FF]/30 hover:border-[#6A35FF]" 
    : isDark 
    ? "border-[#18181B]/30 hover:border-transparent" 
    : "border-black/10 hover:border-[#6A35FF]";

  const textColor = isDark ? "text-[#09090B]" : "text-[#18181B]";
  const arrowStroke = isPrimary ? "stroke-[#6A35FF]" : "stroke-[#18181B]";
  
  const circleBg = isPrimary 
    ? "bg-gradient-to-r from-[#6A35FF] to-[#8B5CF6]" 
    : "bg-[#09090B]";

  return (
    <button 
      onClick={onClick}
      className={`group relative flex items-center gap-1 overflow-hidden rounded-[100px] border-[1.5px] ${borderStyle} bg-transparent px-8 py-3.5 text-sm font-semibold ${textColor} cursor-pointer transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-white hover:rounded-[14px] hover:shadow-lg hover:shadow-[#6A35FF]/20 active:scale-[0.96] ${className}`}
    >
      {/* Left arrow */}
      <ArrowRight 
        className={`absolute w-4 h-4 left-[-25%] ${arrowStroke} fill-none z-[9] group-hover:left-4 group-hover:stroke-white transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]`} 
      />

      {/* Text */}
      <span className="relative z-[1] -translate-x-3 group-hover:translate-x-3 transition-all duration-[800ms] ease-out font-medium tracking-tight">
        {text}
      </span>

      {/* Circle expand effect */}
      <span className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 ${circleBg} rounded-[50%] opacity-0 group-hover:w-[280px] group-hover:h-[280px] group-hover:opacity-100 transition-all duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)] pointer-events-none`}></span>

      {/* Right arrow */}
      <ArrowRight 
        className={`absolute w-4 h-4 right-4 ${arrowStroke} fill-none z-[9] group-hover:right-[-25%] group-hover:stroke-white transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]`} 
      />
    </button>
  );
}

export default FlowButton;
