import { useEffect, useRef, useState, type ReactNode } from 'react';
import { fitTo, useFormation, useQuiet } from '../gl/Scene';
import { GLOBE_SIZE } from '../gl/Engine';
import type { HueName } from '../gl/palette';
import { Headline } from './ui';
import { LogoGlass } from './LogoGlass';

/**
 * Every inner page opens the same way: a two-line headline, a lede, and on the right either one of
 * the 3D objects (`object`) or a drawn visual (`visual`).
 */
export function PageHero({
  tone,
  title,
  lede,
  object,
  visual,
  children,
  align,
}: {
  tone: HueName;
  title: [ReactNode, ReactNode];
  lede: ReactNode;
  object?: 'mark' | 'globe';
  visual?: ReactNode;
  children?: ReactNode;
  align?: 'left' | 'center';
}) {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);
  // the globe is drawn by the shared particle scene; the mark is its own piece of glass, as on the home page
  useFormation(ref, () => (object === 'globe' ? { key: 'globe', pose: fitTo(stageRef.current, GLOBE_SIZE, 1), follow: 28 } : { key: 'none' }));
  const side = object || visual;
  return (
    <section ref={ref} className={`page-hero ${side ? 'has-side' : ''} ${align === 'center' ? 'is-center' : ''}`} data-ready={ready || undefined}>
      <div className="hero-grid-bg" aria-hidden="true" />
      <div className="wrap page-hero-grid">
        <div className="page-hero-copy">
          <Headline as="h1" className="h1" tone={tone} lines={title} show={ready} />
          <p className="lede page-hero-lede">{lede}</p>
          {children}
        </div>
        {object === 'globe' && <div className="page-hero-stage" ref={stageRef} aria-hidden="true" />}
        {object === 'mark' && (
          <div className="page-hero-stage" aria-hidden="true">
            <LogoGlass />
          </div>
        )}
        {!object && visual && <div className="page-hero-visual">{visual}</div>}
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
