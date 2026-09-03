import React from "react";

const variantStyles = {
  default: "bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 text-white hover:from-blue-600 hover:via-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5",
  outline: "border-2 border-gray-300 bg-transparent text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 shadow-sm hover:shadow-md",
  ghost: "bg-transparent text-gray-700 hover:bg-gray-100 hover:text-blue-600",
  link: "text-blue-600 underline-offset-4 hover:underline bg-transparent",
  premium: "bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white hover:from-blue-600 hover:via-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-1 hover:scale-105",
};

const sizeStyles = {
  default: "px-6 py-3 text-sm",
  sm: "px-4 py-2 text-xs",
  lg: "px-8 py-4 text-base",
  icon: "p-2",
};

export const Button = ({ 
  className = "", 
  variant = "default",
  size = "default",
  children, 
  ...props 
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none relative overflow-hidden group";
  const variantClass = variantStyles[variant] || variantStyles.default;
  const sizeClass = sizeStyles[size] || sizeStyles.default;
  
  return (
    <button
      className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {(variant === "premium" || variant === "default") && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
};