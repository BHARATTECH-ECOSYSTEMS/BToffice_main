import React from "react";
import { Slot } from "@radix-ui/react-slot";



function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const buttonVariants = ({ variant = "default", size = "default", className }) => {
  const base = [
    "inline-flex",
    "items-center",
    "justify-center",
    "gap-2",
    "whitespace-nowrap",
    "rounded-md",
    "text-sm",
    "font-medium",
    "ring-offset-background",
    "transition-all",
    "duration-300",
    "focus:outline-none",
    "focus:ring-2",
    "focus:ring-ring",
    "focus:ring-offset-2",
    "disabled:pointer-events-none",
    "disabled:opacity-50",
    "[&_svg]:pointer-events-none",
    "[&_svg]:w-4",
    "[&_svg]:h-4",
    "[&_svg]:shrink-0",
  ].join(" ");

  const variants = {
    default: ["bg-gradient-primary", "text-white", "hover:bg-primary/90"].join(" "),
    primary: ["bg-gradient-to-r", "from-blue-500", "to-indigo-500", "text-white", "hover:shadow-lg", "hover:scale-105", "transition-all", "duration-300"].join(" "),
    secondary: ["bg-secondary", "text-secondary-foreground", "hover:bg-secondary/80"].join(" "),
    accent: ["bg-gradient-to-r", "from-pink-500", "to-purple-500", "text-white", "hover:shadow-lg", "hover:scale-105", "transition-all", "duration-300"].join(" "),
    outline: ["border", "border-border", "bg-transparent", "hover:bg-gray-100", "transition-all", "duration-300"].join(" "),
    ghost: ["hover:bg-gray-100", "hover:text-primary", "transition-all", "duration-300"].join(" "),
    destructive: ["bg-red-500", "text-white", "hover:bg-red-600"].join(" "),
    link: ["text-blue-500", "underline", "hover:opacity-80"].join(" "),
    hero: ["bg-gradient-to-r", "from-blue-600", "to-indigo-600", "text-white", "border", "border-blue-400", "hover:shadow-lg", "hover:scale-105", "transition-all", "duration-300"].join(" "),
    glass: ["bg-white/20", "backdrop-blur-sm", "hover:bg-white/30", "hover:border-blue-400", "transition-all", "duration-300"].join(" "),
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3",
    lg: "h-11 px-8",
    icon: "h-10 w-10",
  };

  return cn(base, variants[variant], sizes[size], className);
};

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={buttonVariants({ variant, size, className })} ref={ref} {...props} />;
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
