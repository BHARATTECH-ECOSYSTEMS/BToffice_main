import React from "react";

export const Card = ({ className = "", children }) => (
  <div className={`rounded-lg p-6 bg-[white] shadow ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ children }) => (
  <div className="mb-4">{children}</div>
);

export const CardTitle = ({ children }) => (
  <h2 className="text-xl font-semibold">{children}</h2>
);

export const CardDescription = ({ children }) => (
  <p className="text-sm text-gray-500">{children}</p>
);

export const CardContent = ({ children }) => (
  <div className="my-4">{children}</div>
);

export const CardFooter = ({ children }) => (
  <div className="mt-4">{children}</div>
);
