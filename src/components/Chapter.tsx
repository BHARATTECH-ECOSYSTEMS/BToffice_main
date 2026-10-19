import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { useScene } from '../gl/Scene';
import type { HueName } from '../gl/palette';
import { toneStyle } from './ui';
import { pageScroll, trackBox } from './trackBox';

/**
 * A pinned chapter: the section is several screens tall, its frame stays on screen, and scrolling walks
 * through `n` steps. `step` changes once per step; `progress` (0…1 through the whole chapter) is kept in a
 * ref, so 3D poses can follow the scroll without re-rendering. Progress through the current step goes to
 * `--local` on the elements marked `data-local` only: custom properties inherit, so writing it on the section
 * made the browser restyle the whole section every frame.
 */
export function usePinned(ref: RefObject<HTMLElement>, n: number) {
  const [step, setStep] = useState(0);
  const progress = useRef(0);
  const { scrollTo } = useScene();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // positions come from the cached box, so scrolling never forces the browser to recalculate layout
    const { box, release } = trackBox(el);
    // queried once: the marked elements render unconditionally, and walking the section every frame is costly
    const locals = el.querySelectorAll<HTMLElement>('[data-local]');
    let vh = window.innerHeight;
    let raf = 0;
    let shown = -1;
    const measure = () => {
      raf = 0;
      const run = Math.max(1, box.height - vh);
      const p = Math.min(1, Math.max(0, (pageScroll() - box.top) / run));
      progress.current = p;
      const s = Math.min(n - 1, Math.floor(p * n));
      const local = Math.round((p * n - s) * 1e4) / 1e4;
      // off-screen the value stops changing, so there is nothing to write
      if (local !== shown) {
        shown = local;
        locals.forEach((m) => m.style.setProperty('--local', String(local)));
      }
      setStep((prev) => (prev === s ? prev : s));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    const onResize = () => {
      vh = window.innerHeight;
      on();
    };
    measure();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      release();
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', onResize);
    };
  }, [ref, n]);

  /** Scrolls to the middle of step `i`. */
  const goTo = useCallback(
    (i: number) => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const run = el.offsetHeight - window.innerHeight;
      scrollTo(top + ((i + 0.35) / n) * run);
    },
    [ref, n, scrollTo],
  );

  return { step, progress, goTo };
}

/** The section shell: tall outside, a pinned frame inside. `screens` is how many screens of scroll each step gets. */
export function Chapter({
  id,
  innerRef,
  n,
  screens,
  tone,
  className,
  children,
}: {
  id: string;
  innerRef: RefObject<HTMLElement>;
  n: number;
  screens: number;
  tone: HueName;
  className: string;
  children: ReactNode;
}) {
  return (
    <section id={id} ref={innerRef} className={`chapter ${className}`} style={toneStyle(tone, { '--n': n, '--screens': screens } as CSSProperties)}>
      <div className="chapter-pin">{children}</div>
    </section>
  );
}

/** Stacks every step in one place and shows the current one; the others wait above or below it. */
export function Steps({ step, className = '', children }: { step: number; className?: string; children: ReactNode[] }) {
  return (
    <div className={`steps ${className}`}>
      {children.map((c, i) => (
        <div key={i} className="step" data-on={i === step || undefined} data-pos={i < step ? 'before' : i > step ? 'after' : undefined} aria-hidden={i !== step}>
          {c}
        </div>
      ))}
    </div>
  );
}
