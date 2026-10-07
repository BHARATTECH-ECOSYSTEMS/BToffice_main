import { useEffect, useId, useRef, type CSSProperties } from 'react';
import './PillarAnimation.css';

type Kind = 'remember' | 'connect' | 'learn';
const delay = (seconds: number) => ({ '--phase': `${seconds}s` }) as CSSProperties;
const NODES = [[90, 78], [320, 78], [350, 150], [320, 222], [90, 222], [60, 150]] as const;

export function PillarAnimation({ kind, label }: { kind: Kind; label: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inView = false;
    const update = () => el.classList.toggle('is-playing', inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    }, { threshold: 0.15 });
    observer.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <svg ref={ref} className={`pillar-animation pillar-animation--${kind}`} viewBox="0 0 410 256" role="img" aria-label={label}>
      <defs>
        <pattern id={`${id}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="0.8" fill="currentColor" />
        </pattern>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--violet)" />
          <stop offset="1" stopColor="var(--azure)" />
        </linearGradient>
      </defs>
      <rect width="410" height="256" fill={`url(#${id}-grid)`} className="pa-grid" />
      <ellipse cx="205" cy="225" rx="110" ry="9" className="pa-shadow" />

      {kind === 'remember' && (
        <g>
          <ellipse cx="205" cy="173" rx="126" ry="49" className="pa-orbit" />
          {[2, 1, 0].map((layer) => (
            <g key={layer} transform={`translate(0 ${layer * 26})`}>
              <g className="pa-memory-layer" style={delay(-layer * 0.35)}>
                <path d="M205 48 309 96Q317 100 309 105L213 152Q205 156 197 152L101 105Q93 100 101 96Z" className="pa-paper" />
                <path d="m122 112 75 36q8 4 16 0l75-36" className="pa-edge" />
                <path d="m161 87 44-21 44 21-44 21Z" fill={`url(#${id}-fill)`} className="pa-memory-core" />
                <path d="m162 112 31 15m-17-25 31 15m-3-15 22 10" className="pa-detail" />
              </g>
            </g>
          ))}
          {[0, 1, 2].map((n) => <circle key={n} cx="205" cy="43" r="4" className="pa-memory-signal" style={delay(-n * 1.5)} />)}
          <g transform="translate(308 57)"><circle r="18" className="pa-paper" /><path d="m-7 0 5 5 9-10" className="pa-check" /></g>
        </g>
      )}

      {kind === 'connect' && (
        <g transform="translate(0 -22)">
          <ellipse cx="205" cy="150" rx="120" ry="83" className="pa-orbit" />
          {NODES.map(([x, y], n) => (
            <g key={n}>
              <path d={`M${x} ${y} Q205 ${y} 205 150`} className="pa-wire" />
              <path d={`M${x} ${y} Q205 ${y} 205 150`} pathLength="100" className="pa-packet" style={delay(-n * 0.6)} />
              <g transform={`translate(${x} ${y})`}>
                <rect x="-19" y="-19" width="38" height="38" rx="12" className="pa-paper" />
                {n % 3 === 0 ? <path d="m-7-4-5 4 5 4m14-8 5 4-5 4m-5-10-4 12" className="pa-icon" /> : n % 3 === 1 ? <g className="pa-icon"><rect x="-8" y="-9" width="16" height="18" rx="2" /><path d="M-4-3h8m-8 5h6" /></g> : <g className="pa-icon"><circle r="9" /><path d="M-9 0h18M0-9q8 9 0 18M0-9q-8 9 0 18" /></g>}
              </g>
            </g>
          ))}
          <circle cx="205" cy="150" r="39" className="pa-hub-ring" />
          <rect x="178" y="123" width="54" height="54" rx="18" fill={`url(#${id}-fill)`} />
          <g stroke="white" strokeWidth="2" fill="none"><path d="m191 150 14-9 14 9-14 9Z" /><path d="m191 156 14 9 14-9m-28-12 14-9 14 9" /></g>
        </g>
      )}

      {kind === 'learn' && (
        <g>
          <path d="M89 197H321M89 151H321M89 105H321M89 59H321" className="pa-guide" />
          {[38, 60, 84, 108, 139].map((height, n) => (
            <g key={n} transform={`translate(${103 + n * 43} 197)`}>
              <rect x="0" y={-height} width="25" height={height} rx="7" fill={`url(#${id}-fill)`} className="pa-bar" style={delay(-n * 0.3)} />
            </g>
          ))}
          <path d="M96 144C135 145 141 121 164 112S201 113 216 86 259 77 291 39" className="pa-trend-base" />
          <path d="M96 144C135 145 141 121 164 112S201 113 216 86 259 77 291 39" pathLength="100" className="pa-trend" />
          <g transform="translate(311 52)"><circle r="21" className="pa-paper" /><g className="pa-cycle"><path d="M-9-1a9 9 0 0 1 16-5m-1-5 2 6-6 1M9 1a9 9 0 0 1-16 5m1 5-2-6 6-1" className="pa-icon" /></g></g>
          <circle cx="96" cy="144" r="4" className="pa-spark" />
        </g>
      )}
    </svg>
  );
}
