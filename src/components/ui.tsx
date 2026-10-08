import { useEffect, useId, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { threadPaths } from '../gl/threads';
import type { HueName } from '../gl/palette';

const PATHS = threadPaths();

/** A tone as a CSS custom property, for components that colour themselves from their chapter. */
export const toneStyle = (tone: HueName, extra?: CSSProperties) => ({ '--tone': `var(--${tone})`, ...extra }) as CSSProperties;

/** The Origin mark, as it has always been drawn: a violet sphere with the three threads in white. */
export function LogoMark({ size = 28 }: { size?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="-1 -1 2 2" aria-hidden="true" className="logo-mark">
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

export function Brand({ size = 28 }: { size?: number }) {
  return (
    <span className="brand">
      <LogoMark size={size} />
      <span className="brand-word">
        Bharattech<span>Origin</span>
      </span>
    </span>
  );
}

export function Arrow({ dir = 'right', size = 14 }: { dir?: 'right' | 'down' | 'up-right' | 'left'; size?: number }) {
  const rot = { right: 0, down: 90, left: 180, 'up-right': -45 }[dir];
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: `rotate(${rot}deg)` }} className="arrow">
      <path d="M2.5 8h10.5M9 3.5 13.5 8 9 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Mono label with a diamond in the chapter's colour. */
export function Eyebrow({ tone, children, className = '' }: { tone: HueName; children: ReactNode; className?: string }) {
  return (
    <p className={`eyebrow ${className}`} style={toneStyle(tone)}>
      <i aria-hidden="true" />
      {children}
    </p>
  );
}

/** Fires once when the element comes into view. */
export function useInView<T extends Element>(margin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, margin]);
  return [ref, inView] as const;
}

/** Rises and sharpens into place the first time it is seen. */
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  className = '',
  style,
  children,
  ...rest
}: { as?: ElementType; delay?: number; className?: string; style?: CSSProperties; children?: ReactNode } & Record<string, unknown>) {
  const [ref, inView] = useInView<HTMLElement>();
  return (
    <Tag ref={ref} className={`reveal ${className}`} data-in={inView || undefined} style={{ '--d': `${delay}ms`, ...style } as CSSProperties} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * A headline set line by line; each line rises out of its own mask. The accented line takes the chapter colour.
 * `accent` is the index of the line drawn in colour (-1 for none).
 */
export function Headline({
  lines,
  as: Tag = 'h2',
  className = 'h2',
  tone,
  accent = lines.length - 1,
  show,
}: {
  lines: ReactNode[];
  as?: ElementType;
  className?: string;
  tone?: HueName;
  accent?: number;
  show?: boolean;
}) {
  const [ref, inView] = useInView<HTMLElement>('0px 0px -8% 0px');
  const on = show ?? inView;
  return (
    <Tag ref={ref} className={`headline ${className}`} data-in={on || undefined} style={tone ? toneStyle(tone) : undefined}>
      {lines.map((l, i) => (
        <span key={i} className={`line ${i === accent ? 'is-accent' : ''}`}>
          <span style={{ '--i': i } as CSSProperties}>{l}</span>
        </span>
      ))}
    </Tag>
  );
}

export function Chip({ tone, children, className = '' }: { tone?: HueName; children: ReactNode; className?: string }) {
  return (
    <span className={`chip ${className}`} style={tone ? toneStyle(tone) : undefined}>
      {tone && <i aria-hidden="true" />}
      {children}
    </span>
  );
}
