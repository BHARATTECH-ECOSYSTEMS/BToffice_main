import React from "react";

export const Label = ({ className = "", children, ...props }) => {
  return (
    <label className={`text-sm font-medium ${className}`} {...props}>
      {children}
    </label>
  );
};