import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { LogoMark } from './ui';

/** An endless row that drifts sideways and pauses under the cursor. */
export function Marquee({ children, speed = 40, reverse = false }: { children: ReactNode; speed?: number; reverse?: boolean }) {
  return (
    <div className="marquee" style={{ '--speed': `${speed}s` } as CSSProperties} data-reverse={reverse || undefined}>
      <div className="marquee-track">
        <div className="marquee-group">{children}</div>
        <div className="marquee-group" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Types `text` out once `run` is true, with a caret while it writes. */
export function Typewriter({ text, run, speed = 22, onDone }: { text: string; run: boolean; speed?: number; onDone?: () => void }) {
  const [n, setN] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!run) return setN(0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(text.length);
      done.current?.();
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1 + Math.floor(Math.random() * 2);
      setN(Math.min(text.length, i));
      if (i >= text.length) {
        window.clearInterval(id);
        done.current?.();
      }
    }, speed);
    return () => window.clearInterval(id);
  }, [run, text, speed]);
  return (
    <span className="typewriter" data-done={n >= text.length || undefined}>
      {text.slice(0, n)}
    </span>
  );
}

/**
 * Tools arranged around the mark, each joined to it by a beam that carries light inward:
 * many systems, one memory.
 */
export function Beams({ nodes, size = 460 }: { nodes: { label: string; icon: ReactNode; tone: string }[]; size?: number }) {
  const c = size / 2;
  const R = size * 0.34;
  const pts = nodes.map((_, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return { x: c + Math.cos(a) * R, y: c + Math.sin(a) * R };
  });
  return (
    <div className="beams" style={{ '--size': `${size}px` } as CSSProperties}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={c} cy={c} r={size * 0.2} className="beam-halo" />
        <circle cx={c} cy={c} r={R} className="beam-orbit" />
        <circle cx={c} cy={c} r={R * 0.62} className="beam-orbit is-inner" />
        {pts.map((p, i) => {
          const mx = (p.x + c) / 2 + (p.y - c) * 0.18;
          const my = (p.y + c) / 2 - (p.x - c) * 0.18;
          const d = `M${p.x} ${p.y} Q${mx} ${my} ${c} ${c}`;
          return (
            <g key={i} style={{ '--tone': nodes[i].tone, '--i': i } as CSSProperties}>
              <path d={d} className="beam-track" />
              <path d={d} className="beam-light" pathLength={100} />
            </g>
          );
        })}
      </svg>
      <div className="beams-core">
        <span className="beams-pulse" />
        <span className="beams-pulse" style={{ animationDelay: '1.4s' }} />
        <LogoMark size={Math.round(size * 0.17)} />
      </div>
      {nodes.map((n, i) => (
        <span
          key={n.label}
          className="beams-node"
          data-side={pts[i].x < c - 2 ? 'left' : pts[i].x > c + 2 ? 'right' : 'mid'}
          style={{ left: `${(pts[i].x / size) * 100}%`, top: `${(pts[i].y / size) * 100}%`, '--tone': n.tone, '--i': i } as CSSProperties}
        >
          {n.icon}
          <em>{n.label}</em>
        </span>
      ))}
    </div>
  );
}

/** Small line icons for tools and capabilities. */
export const ICON_PATHS: Record<string, string> = {
  chat: 'M4 5h16v11H9l-5 4z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  docs: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  code: 'M9 7 4 12l5 5M15 7l5 5-5 5',
  vision: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  voice: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4',
  shield: 'M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6l-7-3zM9 12l2 2 4-4',
  cloud: 'M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9H7z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 9h17M3.5 15h17M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.5 15h9',
  code2: 'M4 5h16v14H4zM8 10l2 2-2 2M12 14h4',
  building: 'M4 21V7l8-4 8 4v14M9 21v-5h6v5M8 10h.01M12 10h.01M16 10h.01',
  landmark: 'M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M2 10l10-6 10 6',
  cap: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
  rocket: 'M5 15c-1 1-1.5 4-1.5 4s3-.5 4-1.5M9 15l-3-3c1.5-4 5-8 12-8 0 7-4 10.5-8 12zM14 10a1 1 0 1 0 0-.01',
  layers: 'M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 17l10 5 10-5',
  cpu: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  pin: 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  book: 'M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3',
};
export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
