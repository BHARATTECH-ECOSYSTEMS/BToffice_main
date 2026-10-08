import { useEffect, useRef, type CSSProperties } from 'react';
import type { HueName } from '../gl/palette';
import '../styles/research-constellation.css';

const PAPERS = [
  { label: 'LIT REVIEW', x: 62, y: 64, angle: -8 },
  { label: 'EXPERIMENTS', x: 290, y: 62, angle: 7 },
  { label: 'SURVEY NOTES', x: 68, y: 144, angle: -5 },
  { label: 'HYPOTHESIS v2', x: 288, y: 142, angle: 9 },
];

export function ResearchConstellation({ tone = 'violet' }: { tone?: HueName }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = false;
    const update = () => {
      el.dataset.playing = String(visible && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <svg
      ref={ref}
      className="research-constellation"
      viewBox="0 0 360 206"
      role="img"
      aria-label="Research sources connect to a hypothesis with persistent context across experiments."
      data-playing="true"
      data-tone={tone}
    >
      {/* Orbital reference grid */}
      <ellipse cx="180" cy="107" rx="146" ry="72" className="rc-orbit" />
      <ellipse cx="180" cy="107" rx="104" ry="48" className="rc-orbit rc-orbit-inner" />

      {/* Star constellation nodes */}
      {[
        [36, 100], [116, 40], [226, 34], [330, 116], [206, 168], [128, 168],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" className="rc-star" />
      ))}

      {/* Top micro header */}
      <text x="18" y="20" className="rc-label">RESEARCH, REMEMBERED</text>

      {/* Network connection threads & live streaming signals */}
      <g className="rc-network">
        {PAPERS.map(({ x, y }, i) => (
          <g key={i}>
            <path
              id={`rc-path-${i}`}
              d={`M${x} ${y} Q${(x + 180) / 2} ${y + (i < 2 ? 14 : -14)} 180 107`}
              className="rc-thread"
            />
            {/* Continuous stream of data signals */}
            <circle r="3" className="rc-signal" style={{ animationDelay: `${i * 0.4}s` } as CSSProperties}>
              <animateMotion
                dur="2.8s"
                repeatCount="indefinite"
                path={`M${x} ${y} Q${(x + 180) / 2} ${y + (i < 2 ? 14 : -14)} 180 107`}
                begin={`${i * 0.55}s`}
              />
            </circle>
          </g>
        ))}
        {/* Crosslink evidence paths */}
        <path d="M62 64 Q150 18 290 62" className="rc-crosslinks" />
        <path d="M62 64 Q24 104 68 144" className="rc-crosslinks" />
        <path d="M68 144 Q178 174 288 142" className="rc-crosslinks" />
      </g>

      {/* Floating research paper cards (always visible with subtle floating physics) */}
      {PAPERS.map(({ label, x, y, angle }, i) => (
        <g
          key={i}
          transform={`translate(${x} ${y})`}
          className={`rc-paper-anchor rc-paper-${i}`}
          style={{ '--angle': `${angle}deg`, '--delay': `${i * 0.25}s` } as CSSProperties}
        >
          <g className="rc-paper">
            <rect x="-20" y="-24" width="40" height="48" rx="6" className="rc-paper-shadow" />
            <rect x="-20" y="-24" width="40" height="48" rx="6" className="rc-sheet" />
            <rect x="-14" y="-18" width="16" height="3" rx="1.5" className="rc-paper-tab" />
            <path d="M-14 -8H12 M-14 -2H8 M-14 4H12 M-14 10H4" className="rc-paper-ink" />
            <path d="M-14 -2H8" className="rc-evidence" />
            <text x="0" y="20" textAnchor="middle" className="rc-paper-tag">{label}</text>
          </g>
        </g>
      ))}

      {/* Central Hypothesis & Preserved Context Core */}
      <g className="rc-hypothesis">
        <circle cx="180" cy="104" r="36" className="rc-halo" />
        <circle cx="180" cy="104" r="28" className="rc-halo-pulse" />
        <circle cx="180" cy="104" r="22" className="rc-core" />
        {/* Verified insight checkmark */}
        <path d="m170 104 7 7 14 -16" className="rc-proof" />
        <text x="180" y="146" className="rc-center-label">Hypothesis verified</text>
        <text x="180" y="159" className="rc-sublabel">Context preserved</text>
      </g>

      {/* Bottom context caption */}
      <text x="180" y="190" className="rc-caption">
        Connect the evidence. Remember the detour. Next question starts ahead.
      </text>
    </svg>
  );
}
