import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { ORIGIN_POINT, threadPaths } from '../gl/threads';
import type { HueName } from '../gl/palette';
import { onPageClock } from './logoClock';

const PATHS = threadPaths();

/** A tone as a CSS custom property, for components that colour themselves from their chapter. */
export const toneStyle = (tone: HueName, extra?: CSSProperties) => ({ '--tone': `var(--${tone})`, ...extra }) as CSSProperties;

/** The Origin mark: a violet sphere with the three threads in white. */
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

/**
 * The live logo, used wherever the brand shows: the mark drawn flat, its three threads drawing in, meeting at the
 * origin and letting go again (the loop is in story.css, .faq-mark-*). `size` in px; without it the CSS sizes it.
 */
export function ThreadMark({ size }: { size?: number }) {
  // the mark appears many times on a page, so each copy needs its own clip id
  const clip = `mark-disc-${useId().replace(/:/g, '')}`;
  // every copy shows the same moment of the loop (logoClock.ts); the browser restarts a loop when its copy is shown
  // again after being hidden, and onAnimationStart pins it back
  const ref = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    if (ref.current) onPageClock(ref.current);
  }, []);
  return (
    <svg ref={ref} className="faq-mark" viewBox="-1.1 -1.1 2.2 2.2" aria-hidden="true" style={size ? { width: size, height: size } : undefined} onAnimationStart={(e) => onPageClock(e.currentTarget)}>
      <clipPath id={clip}>
        <circle r="1" />
      </clipPath>
      <circle r="1" className="faq-mark-disc" />
      <g clipPath={`url(#${clip})`}>
        {PATHS.map((d, i) => (
          <path key={i} d={d} pathLength={1} className="faq-mark-thread" style={{ '--k': i } as CSSProperties} />
        ))}
      </g>
      <circle cx={ORIGIN_POINT[0]} cy={-ORIGIN_POINT[1]} r="0.07" className="faq-mark-origin" />
    </svg>
  );
}

/** The logo and the wordmark. The logo is the live ThreadMark; `mark` swaps in another, such as the nav's glass orb. */
export function Brand({ size, mark }: { size?: number; mark?: ReactNode }) {
  return (
    <span className="brand">
      {mark ?? <ThreadMark size={size} />}
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
      {/* the same arrow one frame to the left, outside the icon's box (so hidden): on a button's hover both slide
          right, the first one out and this one in */}
      <path className="arrow-next" d="M-13.5 8h10.5M-7 3.5-2.5 8-7 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A button's label, set up for the hover roll (see .btn-text in base.css): it rolls up and an identical copy rolls in. */
export function BtnText({ children }: { children: ReactNode }) {
  return (
    <span className="btn-text">
      <span>{children}</span>
    </span>
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

/**
 * True when `value` changed less than 250 ms after its previous change: someone is scrolling quickly
 * through a list, and replaying an entrance on every item would only flash.
 */
export function useQuickChange(value: unknown) {
  const last = useRef({ value, at: 0, quick: false });
  if (last.current.value !== value) {
    const now = performance.now();
    last.current = { value, at: now, quick: now - last.current.at < 250 };
  }
  return last.current.quick;
}

/** Rises into place the first time it is seen. */
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  className = '',
  style,
  children,
  ...rest
}: { as?: ElementType; delay?: number; className?: string; style?: CSSProperties; children?: ReactNode } & Record<string, unknown>) {
  const [ref, inView] = useInView<HTMLElement>();
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!inView) return;
    // the entrance is over once its delay and the 0.7s reveal have run
    const t = window.setTimeout(() => setSettled(true), delay + 800);
    return () => window.clearTimeout(t);
  }, [inView, delay]);
  return (
    <Tag ref={ref} className={`reveal ${className}`} data-in={inView || undefined} data-settled={settled || undefined} style={{ '--d': `${delay}ms`, ...style } as CSSProperties} {...rest}>
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
