import React, { forwardRef } from "react";

export const cx = (...classes) => classes.filter(Boolean).join(" ");

export const cardShell =
  "flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] !transition-all !duration-500 !ease-out overflow-hidden hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(15,23,42,0.14)]";

export const Btn = ({
  as: Comp = "button",
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
  };
  const variants = {
    primary:
      "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/25 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-600/30 focus-visible:ring-blue-500",
    outline:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400",
    outlineBlue:
      "border-2 border-blue-500 bg-white text-blue-700 hover:bg-blue-50 focus-visible:ring-blue-400",
    danger:
      "border border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100 focus-visible:ring-red-400",
    subtle:
      "bg-gradient-to-br from-slate-50 to-slate-200 text-slate-600 hover:from-slate-100 hover:to-slate-300 focus-visible:ring-slate-400",
    ghost: "text-slate-500 hover:bg-slate-100 focus-visible:ring-slate-400",
  };

  return (
    <Comp
      disabled={disabled}
      className={cx(base, sizes[size] || sizes.md, variants[variant] || variants.primary, className)}
      {...props}
    >
      {children}
    </Comp>
  );
};

export const IconBadge = ({ icon: Icon, className = "" }) => (
  <div
    className={cx(
      "flex h-10 w-10 items-center justify-center rounded-xl",
      className
    )}
  >
    <Icon className="h-5 w-5" />
  </div>
);

export const Eyebrow = ({ children, className = "" }) => (
  <p
    className={cx(
      "mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
      className
    )}
  >
    {children}
  </p>
);

export const Input = forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cx(
      "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Label = ({ children }) => (
  <label className="mb-1.5 block text-xs font-semibold text-slate-500">
    {children}
  </label>
);

export const Select = ({ className, children, ...props }) => (
  <select
    className={cx(
      "w-full appearance-none rounded-xl border border-slate-300 bg-white bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2364748b%22><path d=%22M5.5 7.5l4.5 4.5 4.5-4.5%22 stroke=%22%2364748b%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-[length:18px] bg-[right_0.65rem_center] bg-no-repeat px-3.5 py-2.5 pr-9 text-sm text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",
      className
    )}
    {...props}
  >
    {children}
  </select>
);
