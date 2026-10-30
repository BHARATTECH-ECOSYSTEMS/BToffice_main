import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuiet } from '../gl/Scene';
import type { HueName } from '../gl/palette';
import { Headline } from './ui';

/**
 * Every inner page opens the same way: a two-line headline, a lede, and on the right an optional drawn visual
 * (`visual`). The shared 3D scene stays folded away behind it.
 */
export function PageHero({
  tone,
  title,
  lede,
  visual,
  children,
}: {
  tone: HueName;
  title: [ReactNode, ReactNode];
  lede: ReactNode;
  visual?: ReactNode;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);
  useQuiet(ref);
  return (
    <section ref={ref} className={`page-hero ${visual ? 'has-side' : ''}`}>
      <div className="hero-grid-bg" aria-hidden="true" />
      <div className="wrap page-hero-grid">
        <div className="page-hero-copy">
          <Headline as="h1" className="h1" tone={tone} lines={title} show={ready} />
          <p className="lede page-hero-lede">{lede}</p>
          {children}
        </div>
        {visual && <div className="page-hero-visual">{visual}</div>}
      </div>
    </section>
  );
}

/** A plain section on an inner page; any object folds away while it is read. */
export function Quiet({ id, className = 'section', children }: { id?: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);
  return (
    <section id={id} ref={ref} className={className}>
      {children}
    </section>
  );
}
