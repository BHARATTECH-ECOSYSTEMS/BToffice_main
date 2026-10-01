import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useScene } from '../gl/Scene';

export function Rail() {
  const { pathname } = useLocation();
  const { scrollTo } = useScene();
  const [chapters, setChapters] = useState<{ id: string; label: string }[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (pathname !== '/') return;
    const t = setTimeout(() => {
      const els = [...document.querySelectorAll<HTMLElement>('main section[data-chapter][id]')];
      setChapters(els.map((x) => ({ id: x.id, label: x.dataset.chapter || '' })));
    }, 80);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== '/' || !chapters.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const mid = window.innerHeight * 0.45;
      let cur = 0;
      chapters.forEach((ch, idx) => {
        const el = document.getElementById(ch.id);
        if (el && el.getBoundingClientRect().top <= mid) {
          cur = idx;
        }
      });
      setActive(cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [chapters, pathname]);

  if (pathname !== '/' || chapters.length < 3) return null;

  return (
    <nav className="rail" aria-label="Chapters">
      <ol>
        {chapters.map((ch, idx) => (
          <li
            key={ch.id}
            data-tone={idx % 2 === 0 ? 'tango' : 'violet'}
            className={`${idx === active ? 'is-active' : ''} ${idx < active ? 'is-past' : ''}`}
          >
            <button
              type="button"
              onClick={() => {
                const target = document.getElementById(ch.id);
                if (target) scrollTo(target);
              }}
              aria-current={idx === active ? 'step' : undefined}
              aria-label={ch.label}
            >
              <span className="rail-label">{ch.label}</span>
              <span className="rail-dot" />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
