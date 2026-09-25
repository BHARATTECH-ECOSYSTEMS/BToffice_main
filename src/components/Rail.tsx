import { useEffect, useRef, useState } from 'react';
import { useScene } from '../gl/Scene';
import type { FormationKey } from '../gl/Engine';

const NAMES: Record<FormationKey, string> = {
  logo: 'The mark',
  fragments: 'Fragmentation',
  silos: 'Silos',
  frozen: 'Frozen',
  alone: 'Isolated',
  orbit15: 'Orbit',
  orbit6: 'Orbit',
  layers: 'Stack',
  globe: 'Network',
  helix: 'Helix',
  field: 'Field',
};

/** Mission-control chrome for the home page: chapter index + live formation readout. */
export function Rail() {
  const { engine, scrollTo } = useScene();
  const [chapters, setChapters] = useState<{ id: string; label: string }[]>([]);
  const [active, setActive] = useState(0);
  const readout = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
    setChapters(els.map((el) => ({ id: el.id, label: el.dataset.chapter! })));
    const onScroll = () => {
      const mid = window.innerHeight / 2;
      let idx = 0;
      els.forEach((el, i) => {
        if (el.getBoundingClientRect().top <= mid) idx = i;
      });
      setActive(idx);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!engine) return;
    let last = '';
    return engine.onFrame(() => {
      const k = engine.currentKey;
      if (k !== last && readout.current) {
        last = k;
        readout.current.textContent = NAMES[k];
      }
    });
  }, [engine]);

  return (
    <>
      <nav className="rail" aria-label="Chapters">
        {chapters.map((c, i) => (
          <button key={c.id} className={`rail-item mono ${i === active ? 'is-active' : ''}`} onClick={() => scrollTo(document.getElementById(c.id)!)}>
            <span className="rail-tick" />
            <span className="rail-label">
              {String(i + 1).padStart(2, '0')} {c.label}
            </span>
          </button>
        ))}
      </nav>
      {engine && (
        <div className="readout mono" aria-hidden="true">
          <span>
            <i className="dot" />
            {Math.round(engine.count / 1000)}K · <span ref={readout}>The mark</span>
          </span>
        </div>
      )}
    </>
  );
}
