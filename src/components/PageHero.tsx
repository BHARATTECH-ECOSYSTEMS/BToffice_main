import { useEffect, useRef, useState, type ReactNode } from 'react';
import { fitTo, useFormation, useQuiet } from '../gl/Scene';
import { GLOBE_SIZE, MARK_SIZE } from '../gl/Engine';
import type { HueName } from '../gl/palette';
import { Eyebrow, Headline } from './ui';
import { Aurora } from './fx';

/**
 * Every inner page opens the same way: a label, a two-line headline, a lede, and on the right either one of
 * the 3D objects (`object`) or a drawn visual (`visual`).
 */
export function PageHero({
  eyebrow,
  tone,
  title,
  lede,
  object,
  visual,
  children,
}: {
  eyebrow: string;
  tone: HueName;
  title: [ReactNode, ReactNode];
  lede: ReactNode;
  object?: 'mark' | 'globe';
  visual?: ReactNode;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);
  useFormation(ref, () =>
    object
      ? { key: object, pose: fitTo(stageRef.current, object === 'mark' ? MARK_SIZE : GLOBE_SIZE, object === 'mark' ? 0.9 : 1), follow: 28 }
      : { key: 'none' },
  );
  const side = object || visual;
  return (
    <section ref={ref} className={`page-hero ${side ? 'has-side' : ''}`} data-ready={ready || undefined}>
      <Aurora className="is-page" />
      <div className="hero-grid-bg" aria-hidden="true" />
      <div className="wrap page-hero-grid">
        <div className="page-hero-copy">
          <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
          <Headline as="h1" className="h1" tone={tone} lines={title} show={ready} />
          <p className="lede page-hero-lede">{lede}</p>
          {children}
        </div>
        {object && <div className="page-hero-stage" ref={stageRef} aria-hidden="true" />}
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
