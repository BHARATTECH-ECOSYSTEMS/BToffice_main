import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useScene } from '../gl/Scene';

const wide = () => typeof window !== 'undefined' && window.innerWidth > 900 && !matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Scrollytelling for one section: on wide screens the section gets `n × stepVh` of extra scroll and a sticky
 * stage, and scrolling walks through `n` steps. `progress` is continuous (0…1) for things that should glide.
 * On phones and with reduced motion nothing is pinned and the section lays out every step.
 */
export function useScrollSteps<T extends HTMLElement>(n: number, stepVh = 70) {
  const ref = useRef<T>(null);
  const { scrollTo } = useScene();
  const [pinned, setPinned] = useState(wide);
  const [state, setState] = useState({ i: 0, p: 0 });

  useEffect(() => {
    const onResize = () => setPinned(wide());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!pinned) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / total));
      const i = Math.min(n - 1, Math.floor(p * n));
      setState((s) => (s.i === i && Math.abs(s.p - p) < 0.001 ? s : { i, p }));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, [pinned, n]);

  const jump = (i: number) => {
    const el = ref.current;
    if (!el || !pinned) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const total = el.offsetHeight - window.innerHeight;
    scrollTo(top + ((i + 0.5) / n) * total);
  };

  const style: CSSProperties | undefined = pinned ? { height: `calc(100svh + ${n * stepVh}svh)` } : undefined;
  return { ref, active: state.i, progress: state.p, pinned, jump, style };
}
