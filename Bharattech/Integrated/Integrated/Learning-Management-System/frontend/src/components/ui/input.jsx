import React from "react";

export const Input = ({ className = "", ...props }) => {
  return (
    <input
      className={`w-full px-3 py-2 border rounded-md bg-white focus:ring focus:outline-none ${className}`}
      {...props}
    />
  );
};