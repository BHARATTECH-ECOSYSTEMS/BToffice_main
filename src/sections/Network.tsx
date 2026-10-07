import { useRef, useState, type CSSProperties } from 'react';
import { ShieldCheck, Cloud, Globe, MoveHorizontal } from 'lucide-react';
import { useFormation, useScene } from '../gl/Scene';
import { useAnchors } from '../gl/useAnchors';
import { GLOBE_LABELS } from '../gl/geo';
import { ChapterHead, StepList, fitTo, type Step } from '../components/Chapter';

/** Each pillar points at the part of the globe it is about. */
const PILLARS = [
  {
    title: 'Sovereign by design',
    body: 'The core lives in India. Data and intelligence stay under the control of those they serve.',
    icon: ShieldCheck,
    tone: 'violet' as const,
    anchor: 0, // India
  },
  {
    title: 'Cloud to edge',
    body: 'The same intelligence runs in national data centres and on the phone in your hand.',
    icon: Cloud,
    tone: 'teal' as const,
    anchor: 5, // Southeast Asia
  },
  {
    title: 'Open to the world',
    body: 'Conceived in Bharat, engineered to connect to every region and every language.',
    icon: Globe,
    tone: 'steel' as const,
    anchor: 1, // Europe
  },
];

/**
 * The network, pinned. Scrolling turns the globe outwards from India through three pillars; the region each one is
 * about is tagged on the globe.
 */
export function Network() {
  const ref = useRef<HTMLElement>(null);
  const visRef = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const [phase, setPhase] = useState(0);
  const [stepP, setStepP] = useState(0);
  const phaseRef = useRef(0);
  phaseRef.current = phase;
  const spin = useRef(0);
  const owns = useRef(false);
  const { scrollTo } = useScene();

  useFormation(
    ref,
    () => {
      const f = fitTo(visRef.current, 3.9, 3.9, 0.95, 0.5);
      return {
        key: 'globe',
        pose: { x: f.x, y: f.y, s: f.s },
        mobilePose: { x: f.x, y: f.y, s: f.s },
        params: { highlight: 0, cull: 1, body: 1, dot: 1.55, drag: 1, spinY: spin.current },
        follow: 16,
        exact: true,
      };
    },
    (p, isActive) => {
      owns.current = isActive;
      spin.current = -0.15 + p * 1.1;
      if (!isActive) return;
      const n = PILLARS.length;
      const ph = Math.min(n - 1, Math.floor(p * n));
      setPhase((v) => (v === ph ? v : ph));
      const sp = Math.round(Math.min(1, p * n - ph) * 40) / 40;
      setStepP((v) => (v === sp ? v : sp));
    },
  );

  useAnchors(['globe'], (pts, settle) => {
    labels.current.forEach((el, i) => {
      if (!el) return;
      const p = pts?.[i];
      if (!p || !owns.current) {
        el.style.opacity = '0';
        return;
      }
      const facing = Math.min(1, Math.max(0, (p.depth - 0.05) / 0.35));
      const focus = i === PILLARS[phaseRef.current].anchor ? 0 : 1;
      el.style.opacity = String(settle * facing * focus);
      el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)${GLOBE_LABELS[i].side === 'left' ? ' translateX(-100%)' : ''}`;
    });
    const t = tag.current;
    if (!t) return;
    const a = pts?.[PILLARS[phaseRef.current].anchor];
    const on = a && owns.current ? settle * Math.min(1, Math.max(0, (a.depth + 0.1) / 0.3)) : 0;
    t.style.opacity = String(on);
    if (a) t.style.transform = `translate3d(${a.x}px, ${a.y}px, 0)`;
  });

  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollTo(top + ((i + 0.2) / PILLARS.length) * (el.offsetHeight - window.innerHeight));
  };

  const steps: Step[] = PILLARS.map((p) => ({ key: p.title, title: p.title, sub: p.body, icon: p.icon, tone: p.tone }));
  const P = PILLARS[phase];

  return (
    <section id="network" ref={ref} className="ch-pin net-ch is-draggable" style={{ '--steps': PILLARS.length, '--step-h': '70svh' } as CSSProperties} data-chapter="Network">
      <div className="ch-stage">
        <div className="wrap ch-grid">
          <div className="ch-copy">
            <ChapterHead
              title={['Built in Bharat.', <span className="accent">For the world.</span>]}
              lede="An intelligence network conceived in India and engineered to run anywhere. Every node shares what it learns with the rest."
            />
            <StepList steps={steps} active={phase} progress={stepP} onPick={jump} caption />
            <p className="ch-hint">
              <MoveHorizontal size={15} strokeWidth={1.75} aria-hidden="true" /> Drag the globe to turn it
            </p>
          </div>
          <div ref={visRef} className="ch-visual" aria-hidden="true" />
        </div>
      </div>
      <div className="globe-labels" aria-hidden="true">
        {GLOBE_LABELS.map((g, i) => (
          <div key={g.name} ref={(el) => (labels.current[i] = el)} className={`globe-label is-${g.side} ${g.home ? 'is-home' : ''}`}>
            <i />
            <span>{g.name}</span>
          </div>
        ))}
      </div>
      <div ref={tag} className="ch-tag" data-tone={P.tone} aria-hidden="true">
        <i />
        <span>
          <b>{GLOBE_LABELS[P.anchor].name}</b>
          <small>{P.title}</small>
        </span>
      </div>
    </section>
  );
}
