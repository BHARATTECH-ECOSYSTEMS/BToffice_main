import { useRef, useState } from 'react';
import { useFormation, useScene } from '../gl/Scene';
import { useAnchors } from '../gl/useAnchors';
import type { FormationKey } from '../gl/Engine';
import { Lines, Kicker } from '../components/Reveal';
import { PROBLEMS, SILOS } from '../content';

const STEP_KEYS: FormationKey[] = ['logo', 'silos', 'frozen', 'alone'];
// the seven neighbouring pairs in the 3 × 2 grid
const LINKS: [number, number][] = [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5]];

const Snow = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <path d="M6 1v10M1.7 3.5l8.6 5M1.7 8.5l8.6-5M4.5 1.8L6 3l1.5-1.2M4.5 10.2L6 9l1.5 1.2" />
  </svg>
);
const Unlinked = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <path d="M5 3.5l1-1a2.1 2.1 0 0 1 3 3l-1 1M7 8.5l-1 1a2.1 2.1 0 0 1-3-3l1-1M2 2l1.2 1.2M10 10l-1.2-1.2" />
  </svg>
);

/**
 * Four problems, pinned. One visual acts each of them out:
 * the mark forgets (dissolves), splits into six silos, freezes into rigid cubes,
 * then reaches for its neighbours and never connects.
 */
export function Problem() {
  const ref = useRef<HTMLElement>(null);
  const { scrollTo } = useScene();
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const local = useRef(0);
  const bars = useRef<(HTMLElement | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const owns = useRef(false);
  const retainedAmt = useRef(1);
  const ov = {
    gauge: useRef<SVGGElement>(null),
    track: useRef<SVGCircleElement>(null),
    arc: useRef<SVGCircleElement>(null),
    gaugeLabel: useRef<HTMLDivElement>(null),
    walls: useRef<SVGGElement>(null),
    wallLines: useRef<(SVGLineElement | null)[]>([]),
    wallTag: useRef<HTMLDivElement>(null),
    time: useRef<SVGGElement>(null),
    links: useRef<SVGGElement>(null),
    linkLines: useRef<(SVGLineElement | null)[]>([]),
    linkMarks: useRef<(SVGGElement | null)[]>([]),
  };

  useFormation(
    ref,
    () => {
      const s = stepRef.current;
      return {
        key: STEP_KEYS[s],
        pose: { x: 1.6, s: s === 0 ? 0.84 : 0.92 },
        mobilePose: { y: 0.72, s: s === 0 ? 0.46 : 0.54 },
        params: { decay: s === 0 ? local.current * 0.85 : 0, drift: s >= 2 ? 0 : 1 },
      };
    },
    (p, isActive) => {
      owns.current = isActive;
      const t = Math.min(0.9999, p) * PROBLEMS.length;
      const s = Math.floor(t);
      local.current = t - s;
      if (s !== stepRef.current) {
        stepRef.current = s;
        setStep(s);
      }
      bars.current.forEach((b, i) => b?.style.setProperty('--p', String(i < s ? 1 : i === s ? local.current : 0)));
      retainedAmt.current = s === 0 ? 1 - local.current * 0.85 : 0.15;
      const pct = `${Math.round(retainedAmt.current * 100)}%`;
      const g = ov.gaugeLabel.current?.querySelector('b');
      if (g) g.textContent = pct;
    },
  );

  useAnchors(['silos', 'frozen', 'alone'], (pts, settle) => {
    labels.current.forEach((el, i) => {
      if (!el) return;
      if (!pts) {
        el.style.opacity = '0';
        return;
      }
      el.style.opacity = String(settle);
      el.style.transform = `translate3d(${pts[i].x}px, ${pts[i].y}px, 0) translate(-50%, -50%)`;
    });
  });

  // Annotations drawn on top of the particles, so each shape says what it means.
  useAnchors(['logo', 'silos', 'frozen', 'alone'], (pts, settle) => {
    const st = stepRef.current;
    const show = (el: Element | null, on: boolean) => el && ((el as HTMLElement).style.opacity = on ? String(settle) : '0');
    const live = owns.current && !!pts;
    show(ov.gauge.current, live && st === 0);
    show(ov.gaugeLabel.current, live && st === 0);
    show(ov.walls.current, live && st === 1);
    show(ov.wallTag.current, live && st === 1);
    show(ov.time.current, live && st === 2);
    show(ov.links.current, live && st === 3);
    if (!live || !pts) return;

    if (st === 0 && pts.length === 2) {
      const [c, rim] = pts;
      const r = Math.hypot(rim.x - c.x, rim.y - c.y) * 1.14;
      const len = 2 * Math.PI * r;
      for (const el of [ov.track.current, ov.arc.current]) {
        el?.setAttribute('cx', String(c.x));
        el?.setAttribute('cy', String(c.y));
        el?.setAttribute('r', String(r));
      }
      ov.arc.current?.setAttribute('stroke-dasharray', `${len * retainedAmt.current} ${len}`);
      ov.arc.current?.setAttribute('transform', `rotate(-90 ${c.x} ${c.y})`);
      if (ov.gaugeLabel.current) ov.gaugeLabel.current.style.transform = `translate3d(${c.x - r * 0.74}px, ${c.y - r * 0.74}px, 0) translate(-100%, -50%)`;
      return;
    }
    if (pts.length < 12) return;
    const C = pts.slice(6); // silo centres: 0 1 2 / 3 4 5
    const L = pts.slice(0, 6);

    if (st === 1) {
      // walls between every tool
      const top = L[0].y - 14;
      const bottom = L[3].y + 14;
      const left = C[0].x - (C[1].x - C[0].x) * 0.62;
      const right = C[2].x + (C[2].x - C[1].x) * 0.62;
      const midY = (C[0].y + C[3].y) / 2;
      const xs = [(C[0].x + C[1].x) / 2, (C[1].x + C[2].x) / 2];
      const lines = ov.wallLines.current;
      xs.forEach((x, i) => {
        lines[i]?.setAttribute('x1', String(x));
        lines[i]?.setAttribute('x2', String(x));
        lines[i]?.setAttribute('y1', String(top));
        lines[i]?.setAttribute('y2', String(bottom));
      });
      lines[2]?.setAttribute('x1', String(left));
      lines[2]?.setAttribute('x2', String(right));
      lines[2]?.setAttribute('y1', String(midY));
      lines[2]?.setAttribute('y2', String(midY));
      if (ov.wallTag.current) ov.wallTag.current.style.transform = `translate3d(${xs[0]}px, ${midY}px, 0) translate(-50%, -50%)`;
    }

    if (st === 2 && ov.time.current) {
      // a timeline: knowledge stops at training, the world keeps going
      const y = L[3].y + 56;
      const x0 = C[0].x - (C[1].x - C[0].x) * 0.5;
      const x1 = C[2].x + (C[2].x - C[1].x) * 0.5;
      ov.time.current.setAttribute('transform', `translate(${x0} ${y}) scale(${(x1 - x0) / 600} 1)`);
    }

    if (st === 3) {
      LINKS.forEach(([a, b], i) => {
        const A = C[a];
        const B = C[b];
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const line = ov.linkLines.current[i];
        line?.setAttribute('x1', String(A.x + dx * 0.24));
        line?.setAttribute('y1', String(A.y + dy * 0.24));
        line?.setAttribute('x2', String(A.x + dx * 0.76));
        line?.setAttribute('y2', String(A.y + dy * 0.76));
        ov.linkMarks.current[i]?.setAttribute('transform', `translate(${A.x + dx / 2} ${A.y + dy / 2})`);
      });
    }
  });

  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollTo(top + ((i + 0.35) / PROBLEMS.length) * (el.offsetHeight - window.innerHeight));
  };

  return (
    <section id="mission" ref={ref} className="pin problem" data-chapter="The problem">
      <div className="pin-stage">
        <svg className="problem-overlay" aria-hidden="true">
          <g ref={ov.gauge} className="ov-gauge">
            <circle ref={ov.track} className="ov-track" fill="none" />
            <circle ref={ov.arc} className="ov-arc" fill="none" />
          </g>
          <g ref={ov.walls} className="ov-walls">
            {[0, 1, 2].map((i) => (
              <line key={i} ref={(el) => (ov.wallLines.current[i] = el)} />
            ))}
          </g>
          <g ref={ov.time} className="ov-time">
            <line x1="0" x2="220" y1="0" y2="0" className="ov-time-solid" />
            <line x1="220" x2="600" y1="0" y2="0" className="ov-time-dash" />
            <circle cx="220" cy="0" r="5" className="ov-time-dot" />
            <circle cx="600" cy="0" r="3" className="ov-time-end" />
          </g>
          <g ref={ov.links} className="ov-links">
            {LINKS.map((_, i) => (
              <g key={i}>
                <line ref={(el) => (ov.linkLines.current[i] = el)} />
                <g ref={(el) => (ov.linkMarks.current[i] = el)} className="ov-x">
                  <circle r="9" />
                  <path d="M-3 -3L3 3M3 -3L-3 3" />
                </g>
              </g>
            ))}
          </g>
        </svg>
        <div ref={ov.gaugeLabel} className="ov-label ov-gauge-label" aria-hidden="true">
          <span>Context retained</span>
          <b>100%</b>
        </div>
        <div ref={ov.wallTag} className="ov-label ov-wall-tag" aria-hidden="true">
          No shared memory
        </div>
        <div className="silo-labels" aria-hidden="true">
          {SILOS.map((s, i) => (
            <span key={s} ref={(el) => (labels.current[i] = el)} className={`silo-label step-${step}`}>
              {step === 2 && <Snow />}
              {step === 3 && <Unlinked />}
              {s}
            </span>
          ))}
        </div>
        <div className={`ov-legend ${step === 2 ? 'is-on' : ''}`} aria-hidden="true">
          <span>
            <i className="solid" />
            Learned during training
          </span>
          <span>
            <i className="dash" />
            The world after: never learned
          </span>
        </div>
        <div className="wrap problem-stage">
          <header className="problem-head">
            <Kicker index="02">The problem with AI today</Kicker>
            <Lines className="h2" lines={['Powerful, but incomplete.']} />
          </header>

          <div className="problem-statement" key={step} aria-live="polite">
            <span className="problem-big-num">{String(step + 1).padStart(2, '0')}</span>
            <h3 className="problem-big">{PROBLEMS[step].title}</h3>
            <p className="problem-say">{PROBLEMS[step].body}</p>
            {step > 0 && (
              <p className="problem-caption">
                <span className="dot" />
                <span>{PROBLEMS[step].caption}</span>
              </p>
            )}
          </div>

          <ol className="problem-timeline">
            {PROBLEMS.map((pr, i) => (
              <li key={pr.title} className={i === step ? 'is-active' : i < step ? 'is-past' : ''}>
                <button onClick={() => jump(i)} aria-current={i === step}>
                  <span className="problem-track">
                    <i className="problem-bar" ref={(el) => (bars.current[i] = el)} />
                  </span>
                  <span className="problem-seg">
                    <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    {pr.title}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
