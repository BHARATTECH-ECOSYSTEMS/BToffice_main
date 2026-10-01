import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation } from 'react-router';
import { useScene } from '../gl/Scene';

interface Chapter {
  id: string;
  label: string;
  tone: string;
}

/**
 * The story's progress down the right edge: one dot per chapter on a single straight track inside a glass capsule.
 * The track fills as you read, the current dot takes its chapter's colour, and hovering a dot names it.
 */
export function ChapterRail() {
  const { pathname } = useLocation();
  const { scrollTo } = useScene();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [active, setActive] = useState(0);
  const fill = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const els = [...document.querySelectorAll<HTMLElement>('main section[data-chapter][id]')];
      setChapters(els.map((e) => ({ id: e.id, label: e.dataset.chapter!, tone: e.dataset.room ?? 'violet' })));
    }, 50);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    if (!chapters.length) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const mid = window.innerHeight * 0.5;
      let idx = 0;
      let within = 0;
      chapters.forEach((c, i) => {
        const el = document.getElementById(c.id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top <= mid) {
          idx = i;
          within = Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height)));
        }
      });
      setActive(idx);
      // the fill runs from dot to dot: it reaches the next dot as its chapter reaches the middle of the screen
      const n = chapters.length - 1;
      if (fill.current) fill.current.style.transform = `scaleY(${n > 0 ? Math.min(1, (idx + within) / n) : 0})`;
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, [chapters]);

  if (chapters.length < 4) return null;
  return (
    <nav className="rail" aria-label="Chapters" style={{ '--n': chapters.length } as CSSProperties}>
      <span className="rail-count mono" aria-hidden="true">
        {String(active + 1).padStart(2, '0')}
      </span>
      <ol>
        <li className="rail-track" aria-hidden="true">
          <span ref={fill} />
        </li>
        {chapters.map((c, i) => (
          <li key={c.id} data-tone={c.tone} className={`${i === active ? 'is-active' : ''} ${i < active ? 'is-past' : ''}`}>
            <button onClick={() => scrollTo(document.getElementById(c.id)!)} aria-current={i === active ? 'step' : undefined} aria-label={c.label}>
              <span className="rail-label">{c.label}</span>
              <span className="rail-dot" />
            </button>
          </li>
        ))}
      </ol>
      <span className="rail-count rail-total mono" aria-hidden="true">
        {String(chapters.length).padStart(2, '0')}
      </span>
    </nav>
  );
}
