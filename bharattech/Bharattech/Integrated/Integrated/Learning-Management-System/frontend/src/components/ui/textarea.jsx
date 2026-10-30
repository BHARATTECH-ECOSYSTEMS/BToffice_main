import React from "react";

export const Textarea = ({ className = "", rows = 4, ...props }) => {
  return (
    <textarea
      className={`w-full px-3 py-2 border rounded-md bg-white focus:ring focus:outline-none resize-y ${className}`}
      rows={rows}
      {...props}
    />
  );
};

