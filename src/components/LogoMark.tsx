import { useId } from 'react';
import { threadPaths } from '../gl/threads';

const PATHS = threadPaths();

/** The Origin mark, drawn from the same thread geometry the particle sphere uses. */
export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="-1 -1 2 2" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`g${id}`} cx="0.62" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#6E58F5" />
          <stop offset="0.55" stopColor="#4B2DC0" />
          <stop offset="1" stopColor="#35189A" />
        </radialGradient>
        <clipPath id={`c${id}`}>
          <circle r="1" />
        </clipPath>
      </defs>
      <circle r="1" fill={`url(#g${id})`} />
      <g clipPath={`url(#c${id})`} fill="none" stroke="#fff" strokeWidth="0.17" strokeLinecap="round" strokeLinejoin="round">
        {PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}

export function Brand() {
  return (
    <>
      <LogoMark size={30} />
      <span className="brand-word">
        <strong>Bharattech</strong>
        <small>ORIGIN</small>
      </span>
    </>
  );
}
