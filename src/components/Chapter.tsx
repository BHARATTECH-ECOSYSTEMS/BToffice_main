import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { useScene } from '../gl/Scene';
import type { HueName } from '../gl/palette';
import { toneStyle } from './ui';
import { pageScroll, trackBox } from './trackBox';

/**
 * A pinned chapter: the section is several screens tall, its frame stays on screen, and scrolling walks
 * through `n` steps. `step` changes once per step; `progress` (0…1 through the whole chapter) is kept in a
 * ref and in the `--p` custom property, so 3D poses and CSS can follow the scroll without re-rendering.
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
    let raf = 0;
    let shown = '';
    const measure = () => {
      raf = 0;
      const run = Math.max(1, box.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, (pageScroll() - box.top) / run));
      progress.current = p;
      const s = Math.min(n - 1, Math.floor(p * n));
      const local = (p * n - s).toFixed(4);
      // off-screen the values stop changing, so there is nothing to write
      const next = `${p.toFixed(4)} ${local}`;
      if (next !== shown) {
        shown = next;
        el.style.setProperty('--p', p.toFixed(4));
        el.style.setProperty('--local', local);
      }
      setStep((prev) => (prev === s ? prev : s));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      cancelAnimationFrame(raf);
      release();
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
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
  screens = 0.8,
  tone,
  className = '',
  children,
}: {
  id: string;
  innerRef: RefObject<HTMLElement>;
  n: number;
  screens?: number;
  tone: HueName;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} ref={innerRef} className={`chapter ${className}`} style={toneStyle(tone, { '--n': n, '--screens': screens } as CSSProperties)}>
      <div className="chapter-pin">{children}</div>
    </section>
  );
}

/** Numbered tabs that fill as their step is read; pressing one scrolls to it. */
export function StepTabs({ labels, step, goTo, tones, className = '' }: { labels: string[]; step: number; goTo: (i: number) => void; tones?: HueName[]; className?: string }) {
  return (
    <div className={`step-tabs ${className}`} role="tablist" aria-label="Steps">
      {labels.map((l, i) => (
        <button
          key={l}
          role="tab"
          aria-selected={i === step}
          data-done={i < step || undefined}
          onClick={() => goTo(i)}
          style={tones ? toneStyle(tones[i]) : undefined}
        >
          <span className="step-tab-bar" aria-hidden="true">
            <span />
          </span>
          <b>{l}</b>
        </button>
      ))}
    </div>
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
