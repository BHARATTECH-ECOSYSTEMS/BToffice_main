import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScene, type Entry } from '../gl/Scene';

const POOL = 16; // enough labels for the busiest formation (15 capabilities)

/**
 * The right-hand half of the split layout: one sticky panel the particle mark lives in for the whole page.
 * Each section registers its formation with useStage; the panel names it, labels its parts on the live
 * particles, and hands the chapter's palette to the particles. Everything per-frame is written straight to the DOM.
 */
export function StagePanel() {
  const { engine, setPanel, current, staged } = useScene();
  const box = useRef<HTMLDivElement>(null);
  const fig = useRef<HTMLSpanElement>(null);
  const chapter = useRef<HTMLSpanElement>(null);
  const name = useRef<HTMLSpanElement>(null);
  const cap = useRef<HTMLParagraphElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const [atmos, setAtmos] = useState<HTMLElement | null>(null);
  const [chapters, setChapters] = useState<Entry[]>([]);

  useEffect(() => {
    setPanel(box.current);
    setAtmos(document.querySelector<HTMLElement>('.atmos'));
    const t = setTimeout(() => setChapters(staged()), 80);
    return () => {
      clearTimeout(t);
      setPanel(null);
    };
  }, [setPanel, staged]);

  useEffect(() => {
    if (!engine || !chapters.length) return;
    const pool = [...layer.current!.children] as HTMLElement[];
    let shownEntry: Entry | null | undefined;
    let shownCap = '';
    return engine.onFrame(() => {
      const b = box.current;
      if (!b) return;
      // the card surface lives under the particle canvas, so it follows the panel frame by frame
      const bd = backdrop.current;
      if (bd) {
        const r = b.getBoundingClientRect();
        bd.style.transform = `translate(${r.left}px, ${r.top}px)`;
        bd.style.width = `${r.width}px`;
        bd.style.height = `${r.height}px`;
      }
      const e = current();
      const here = e?.meta && e.stage?.() === b ? e : null;
      engine.setTone((e?.meta && e.el.dataset.room) || 'violet'); // outside the chapters the mark is always violet
      if (here !== shownEntry && here?.meta) {
        shownEntry = here;
        fig.current!.textContent = `Fig. ${here.meta.fig}`;
        chapter.current!.textContent = here.el.dataset.chapter ?? '';
        name.current!.textContent = here.meta.name;
        const tone = here.el.dataset.room ?? 'violet';
        const tone2 = here.el.dataset.room2 ?? tone;
        b.dataset.tone = tone;
        b.dataset.tone2 = tone2;
        if (bd) {
          bd.dataset.tone = tone;
          bd.dataset.tone2 = tone2;
        }
      }
      const c = here?.meta ? (here.meta.caption as () => string)() : shownCap;
      if (c !== shownCap) {
        shownCap = c;
        cap.current!.textContent = c;
      }

      const pts = here?.key ? engine.anchors(here.key) : null;
      const labels = here?.meta?.labels?.() ?? [];
      const br = b.getBoundingClientRect();
      const settle = pts ? Math.min(1, Math.max(0, (engine.settled - 0.55) / 0.45)) : 0;
      // place every label at its anchor, then push apart any tags that would overlap (top to bottom)
      const placed: { el: HTMLElement; x0: number; x1: number; y: number; dy: number }[] = [];
      pool.forEach((el, i) => {
        const l = labels[i];
        const p = pts?.[i];
        if (!l || !p || settle <= 0) {
          el.style.opacity = '0';
          return;
        }
        const tag = el.lastElementChild as HTMLElement;
        if (el.dataset.text !== l.text) {
          el.dataset.text = l.text;
          tag.textContent = l.text;
          el.dataset.w = String(tag.offsetWidth);
        }
        const x = p.x - br.left;
        const y = p.y - br.top;
        const side = l.side ?? (x > br.width * 0.62 ? 'left' : 'right');
        const w = Number(el.dataset.w) || 80;
        el.dataset.side = side;
        el.classList.toggle('is-hot', !!l.hot);
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        // on the globe a place turning away takes its tag with it
        const away = here!.key === 'globe' ? Math.min(1, Math.max(0, (p.depth + 0.12) / 0.12)) : p.depth < -0.3 ? 0.55 : 1;
        el.style.opacity = (settle * away).toFixed(2);
        if (away < 0.01) return;
        const [x0, x1] = side === 'left' ? [x - 10 - w, x - 10] : side === 'right' ? [x + 10, x + 10 + w] : [x - w / 2, x + w / 2];
        placed.push({ el, x0, x1, y: side === 'below' ? y + 20 : side === 'above' ? y - 20 : y, dy: 0 });
      });
      placed.sort((a, b) => a.y - b.y);
      placed.forEach((a, i) => {
        for (let j = 0; j < i; j++) {
          const b = placed[j];
          const gap = b.y + b.dy + 24 - (a.y + a.dy);
          if (gap > 0 && a.x0 < b.x1 && b.x0 < a.x1) a.dy += gap;
        }
        (a.el.lastElementChild as HTMLElement).style.marginTop = a.dy ? `${a.dy.toFixed(1)}px` : '';
      });
    });
  }, [engine, current, chapters]);

  return (
    <aside className="folio-side">
      {atmos && createPortal(<div ref={backdrop} className="panel-backdrop" />, atmos)}
      <div className="panel" ref={box} data-inset="64 36 150 36" data-fit="0.9">
        <div className="panel-rings" aria-hidden="true" />
        <header className="panel-top">
          <span ref={fig} className="panel-fig" />
          <span ref={chapter} className="panel-chapter" />
          <span ref={name} className="panel-name" />
        </header>
        <div className="panel-labels" ref={layer} aria-hidden="true">
          {Array.from({ length: POOL }, (_, i) => (
            <span key={i} className="plabel">
              <i />
              <b />
            </span>
          ))}
        </div>
        <footer className="panel-foot">
          <p ref={cap} className="panel-cap" aria-live="polite" />
        </footer>
      </div>
    </aside>
  );
}
