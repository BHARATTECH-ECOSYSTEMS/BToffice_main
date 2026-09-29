import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useScene } from '../gl/Scene';

interface Chapter {
  id: string;
  label: string;
}

/** A thin rail of chapters down the right edge: shows where you are in the story and jumps between chapters. */
export function ChapterRail() {
  const { pathname } = useLocation();
  const { scrollTo } = useScene();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [active, setActive] = useState(0);
  const [fill, setFill] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      const els = [...document.querySelectorAll<HTMLElement>('main section[data-chapter][id]')];
      setChapters(els.map((e) => ({ id: e.id, label: e.dataset.chapter! })));
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
      chapters.forEach((c, i) => {
        const el = document.getElementById(c.id);
        if (el && el.getBoundingClientRect().top <= mid) idx = i;
      });
      setActive(idx);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setFill(max > 0 ? window.scrollY / max : 0);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
    };
  }, [chapters]);

  if (chapters.length < 4) return null;
  return (
    <nav className="rail" aria-label="Chapters">
      <span className="rail-line" aria-hidden="true">
        <i style={{ transform: `scaleY(${fill})` }} />
      </span>
      <ol>
        {chapters.map((c, i) => (
          <li key={c.id} className={`${i === active ? 'is-active' : ''} ${i < active ? 'is-past' : ''}`}>
            <button onClick={() => scrollTo(document.getElementById(c.id)!)} aria-current={i === active ? 'step' : undefined}>
              <span className="rail-label">{c.label}</span>
              <span className="rail-dot" />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
