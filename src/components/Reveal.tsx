import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';

export function useInView<T extends Element>(options: { once?: boolean; margin?: string } = {}) {
  const { once = true, margin = '0px 0px -12% 0px' } = options;
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
    io.observe(el);
    return () => io.disconnect();
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
    <Fade as="p" className="kicker mono">
      {index && <b>{index}</b>}
      {children}
    </Fade>
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
