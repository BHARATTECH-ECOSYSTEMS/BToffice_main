import { useEffect, useState } from 'react';
import { useInView } from './Reveal';

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Counts up to `to` the first time it scrolls into view. */
export function CountUp({ to, pad = 0, ms = 1400 }: { to: number; pad?: number; ms?: number }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [n, setN] = useState(reduced() ? to : 0);
  useEffect(() => {
    if (!inView || reduced()) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, ms]);
  return <span ref={ref}>{String(n).padStart(pad, '0')}</span>;
}
