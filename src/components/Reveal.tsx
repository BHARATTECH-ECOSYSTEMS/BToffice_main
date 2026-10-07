import { opening } from '../opening';
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

export function ScrubText({ text, className, as: Component = 'p' }: { text: string; className?: string; as?: ElementType }) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(' ');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const h = window.innerHeight;
      const p = Math.min(1, Math.max(0, (h * 0.85 - rect.top) / (h * 0.85 - h * 0.45 + rect.height)));
      const spans = el.querySelectorAll<HTMLElement>('.sw');
      spans.forEach((span, i) => {
        const s = Math.min(1, Math.max(0, p * spans.length * 1.15 - i));
        span.style.setProperty('--o', (0.18 + 0.82 * s).toFixed(2));
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <Component ref={ref} className={`${className || ''} lede-scrub`} data-scrub="" aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="sw" aria-hidden="true" style={{ '--o': '0.18' } as CSSProperties}>
          {w}{' '}
        </span>
      ))}
    </Component>
  );
}

/** The one header every content section uses: label on the left, statement on a 12-column grid. */
export function SectionHead({
  title,
  lede,
  aside,
  scrub,
}: {
  title: ReactNode[];
  lede?: ReactNode;
  aside?: ReactNode;
  scrub?: boolean;
}) {
  return (
    <header className="sec-head">
      <div className="sec-head-main">
        <Lines className="h2" lines={title} />
        {lede && (
          typeof lede === 'string' && scrub ? (
            <ScrubText className="lede" text={lede} />
          ) : (
            <Fade as="p" className="lede" delay={120}>
              {lede}
            </Fade>
          )
        )}
      </div>
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
    <svg
      className={`arrow arrow-${dir}`}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ transform: `rotate(${rot}deg)`, '--rot': `${rot}deg` } as React.CSSProperties}
    >
      <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
