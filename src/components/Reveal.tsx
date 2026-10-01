import { opening } from '../opening';
import { ScrubText } from './Rooms';
import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';

export function useInView<T extends Element>(options: { once?: boolean; margin?: string } = {}) {
  const { once = true, margin = '0px 0px -6% 0px' } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) setInView(false);
      },
      { rootMargin: margin },
    );
    let live = true;
    opening.then(() => live && io.observe(el)); // nothing reveals behind the opening
    return () => {
      live = false;
      io.disconnect();
    };
  }, [once, margin]);
  return [ref, inView] as const;
}

/** Headline set line by line, each growing up out of its baseline. */
export function Lines({
  lines,
  as: Tag = 'h2',
  className,
  delay = 0,
  show,
}: {
  lines: ReactNode[];
  as?: ElementType;
  className?: string;
  delay?: number;
  show?: boolean;
}) {
  const [ref, inView] = useInView<HTMLElement>();
  const on = show ?? inView;
  return (
    <Tag ref={ref} className={`lines ${className ?? ''} ${on ? 'is-in' : ''}`} style={{ '--d': `${delay}ms` } as CSSProperties}>
      {lines.map((l, i) => (
        <span className="line" key={i}>
          <span style={{ '--i': i } as CSSProperties}>{l}</span>
        </span>
      ))}
    </Tag>
  );
}

export function Fade({
  children,
  as: Tag = 'div',
  className,
  delay = 0,
  ...rest
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
} & Record<string, unknown>) {
  const [ref, inView] = useInView<HTMLElement>();
  return (
    <Tag ref={ref} className={`fade ${className ?? ''} ${inView ? 'is-in' : ''}`} style={{ '--d': `${delay}ms` } as CSSProperties} {...rest}>
      {children}
    </Tag>
  );
}

export function Kicker({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <Fade as="p" className="kicker">
      {index && <span className="kicker-num">{index}</span>}
      <span>{children}</span>
    </Fade>
  );
}

/** The one header every content section uses: label on the left, statement on a 12-column grid. */
export function SectionHead({
  index,
  label,
  title,
  lede,
  aside,
  scrub,
  stage,
}: {
  index: string;
  label: string;
  title: ReactNode[];
  lede?: ReactNode;
  aside?: ReactNode;
  scrub?: boolean;
  /** A <Stage> card: the section's particle figure, beside the title. */
  stage?: ReactNode;
}) {
  return (
    <header className={`sec-head ${stage ? 'has-stage' : ''}`}>
      <Kicker index={index}>{label}</Kicker>
      <div className="sec-head-main">
        <Lines className="h2" lines={title} />
        {lede && scrub && typeof lede === 'string' ? (
          <ScrubText text={lede} className="lede lede-scrub" />
        ) : (
          lede && (
            <Fade as="p" className="lede" delay={120}>
              {lede}
            </Fade>
          )
        )}
      </div>
      {stage}
      {aside && (
        <Fade className="sec-head-aside" delay={160}>
          {aside}
        </Fade>
      )}
    </header>
  );
}

export function Arrow({ dir = 'right', size = 14 }: { dir?: 'right' | 'down' | 'up-right' | 'up'; size?: number }) {
  const rot = { right: 0, down: 90, 'up-right': -45, up: -90 }[dir];
  return (
    <svg className="arrow" width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: `rotate(${rot}deg)` }}>
      <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
