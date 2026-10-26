/**
 * Learning's tangerine progress bar. The fill is scaled, not resized, so a new value slides in (400 ms) without
 * re-laying out the page; with reduced motion it simply jumps.
 */
function ProgressBar({ percent, label, className = "" }) {
  const value = Math.min(100, Math.max(0, Math.round(percent || 0)));

  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-tangerine-wash ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div
        className="h-full w-full origin-left rounded-full bg-tangerine motion-safe:transition-transform motion-safe:duration-[400ms] motion-safe:ease-snappy"
        style={{ transform: `scaleX(${value / 100})` }}
      />
    </div>
  );
}

export default ProgressBar;
