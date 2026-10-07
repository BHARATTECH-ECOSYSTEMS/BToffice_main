import { opening, introPlanned, reloadedDocument } from '../opening';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormation } from '../gl/Scene';
import type { Target } from '../gl/Engine';
import { Lines } from './Reveal';

export function PageHero({
  title,
  lede,
  meta,
  target,
  children,
}: {
  title: ReactNode[];
  lede: ReactNode;
  meta?: ReactNode;
  target: Target | (() => Target);
  children?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  // A reload should paint complete copy immediately. The entrance remains for
  // first visits and client-side navigation, where there is no partial stale frame.
  const [ready, setReady] = useState(() => !introPlanned && reloadedDocument());
  useFormation(ref, target);
  useEffect(() => {
    if (ready) return;
    let live = true;
    let t = 0;
    opening.then(() => {
      if (live) t = window.setTimeout(() => setReady(true), introPlanned ? 120 : 200);
    });
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [ready]);

  return (
    <section ref={ref} className="page-hero">
      <div className="wrap">
        <Lines as="h1" className="h1" lines={title} show={ready} delay={100} />
        <div className={`fade ${ready ? 'is-in' : ''}`} style={{ '--d': '600ms' } as React.CSSProperties}>
          {meta && <p className="page-hero-meta">{meta}</p>}
          <p className="lede">{lede}</p>
          {children}
        </div>
      </div>
    </section>
  );
}

/** Registers a formation for an arbitrary block of a page. */
export function Zone({ target, className, children, id }: { target: Target | (() => Target); className?: string; children: ReactNode; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  useFormation(ref, target);
  return (
    <section ref={ref} className={className} id={id}>
      {children}
    </section>
  );
}
