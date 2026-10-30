export function Badge({ children, variant = "default", className = "" }) {
  const baseClass =
    "inline-flex items-center px-2 py-1 rounded text-xs font-medium";

  const variants = {
    default: "bg-gray-200 text-gray-900",
    secondary: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-700",
    danger: "bg-red-100 text-red-700",
    outline: "bg-white border border-gray-900 text-gray-900",
  };

  return (
    <span className={`${baseClass} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
