export function ChartContainer({ children, className = "" }) {
  return (
    <div className={`w-full h-full ${className}`}>
      {children}
    </div>
  );
}

export function ChartTooltip({ children }) {
  return (
    <div className="p-2 bg-black text-white text-xs rounded">
      {children}
    </div>
  );
}

export function ChartTooltipContent({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="font-medium">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
