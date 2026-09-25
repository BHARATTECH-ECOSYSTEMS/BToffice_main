import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormation } from '../gl/Scene';
import type { Target } from '../gl/Engine';
import { Lines } from './Reveal';

export function PageHero({ index, label, title, lede, target, children }: {
  index: string;
  label: string;
  title: ReactNode[];
  lede: ReactNode;
  target: Target | (() => Target);
  children?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  useFormation(ref, target);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, []);
  return (
    <section ref={ref} className="page-hero">
      <div className="wrap">
        <p className={`kicker mono fade ${ready ? 'is-in' : ''}`}>
          <b>{index}</b>
          {label}
        </p>
        <Lines as="h1" className="h1" lines={title} show={ready} delay={100} />
        <div className={`fade ${ready ? 'is-in' : ''}`} style={{ '--d': '600ms' } as React.CSSProperties}>
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
