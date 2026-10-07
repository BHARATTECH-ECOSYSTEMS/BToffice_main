import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useScene } from '../gl/Scene';

export function Rail() {
  const { pathname } = useLocation();
  const { scrollTo } = useScene();
  const [chapters, setChapters] = useState<{ id: string; label: string }[]>([]);
  const [active, setActive] = useState(0);
  const [fill, setFill] = useState(0);
  const [shown, setShown] = useState(false);
  const [flash, setFlash] = useState(false);

  // the new chapter's name shows for a moment, then steps out of the way of the page
  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1600);
    return () => clearTimeout(t);
  }, [active]);

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
      // how far through the current chapter, for the filling dash
      const el = document.getElementById(chapters[cur].id);
      if (el) {
        const r = el.getBoundingClientRect();
        setFill(Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height))));
      }
      // out of the way on the hero and once the footer arrives
      const foot = document.querySelector('footer')?.getBoundingClientRect().top ?? Infinity;
      setShown(window.scrollY > window.innerHeight * 0.6 && foot > window.innerHeight * 0.9);
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

  // A dotted rail on the right edge: one dot per chapter, the current one a violet pill filling as you read it.
  return (
    <nav className={`side-rail ${shown ? 'is-shown' : ''} ${flash ? 'is-flash' : ''}`} aria-label="Chapters">
      <ol>
        {chapters.map((ch, idx) => (
          <li key={ch.id} className={`${idx === active ? 'is-active' : ''} ${idx < active ? 'is-past' : ''}`}>
            <button
              type="button"
              onClick={() => {
                const target = document.getElementById(ch.id);
                if (target) scrollTo(target);
              }}
              aria-current={idx === active ? 'step' : undefined}
              aria-label={ch.label}
            >
              <span className="side-rail-label">
                {ch.label}
              </span>
              <span className="side-rail-dot">
                <i style={idx === active ? { transform: `scaleY(${Math.max(0.15, fill)})` } : undefined} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
