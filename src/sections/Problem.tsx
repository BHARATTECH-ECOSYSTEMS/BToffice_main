import { useRef, useState } from 'react';
import { useFormation, useScene } from '../gl/Scene';
import { useAnchors } from '../gl/useAnchors';
import type { FormationKey } from '../gl/Engine';
import { Lines, Kicker } from '../components/Reveal';
import { PROBLEMS, SILOS } from '../content';

const STEP_KEYS: FormationKey[] = ['logo', 'silos', 'frozen', 'alone'];

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
  const retained = useRef<HTMLSpanElement>(null);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);

  useFormation(
    ref,
    () => {
      const s = stepRef.current;
      return {
        key: STEP_KEYS[s],
        pose: { x: 1.75 },
        mobilePose: { y: 1.15, s: s === 0 ? 0.52 : 0.62 },
        params: { decay: s === 0 ? local.current * 0.85 : 0, drift: s >= 2 ? 0 : 1 },
      };
    },
    (p) => {
      const t = Math.min(0.9999, p) * PROBLEMS.length;
      const s = Math.floor(t);
      local.current = t - s;
      if (s !== stepRef.current) {
        stepRef.current = s;
        setStep(s);
      }
      bars.current.forEach((b, i) => b?.style.setProperty('--p', String(i < s ? 1 : i === s ? local.current : 0)));
      if (retained.current && s === 0) retained.current.textContent = `${Math.round(100 - local.current * 85)}%`;
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

  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollTo(top + ((i + 0.35) / PROBLEMS.length) * (el.offsetHeight - window.innerHeight));
  };

  return (
    <section id="mission" ref={ref} className="pin problem" data-chapter="The problem">
      <div className="pin-stage">
        <div className="silo-labels" aria-hidden="true">
          {SILOS.map((s, i) => (
            <span key={s} ref={(el) => (labels.current[i] = el)} className={`silo-label ${step === 3 ? 'is-cut' : ''}`}>
              {s}
            </span>
          ))}
        </div>
        <div className="wrap problem-grid">
          <div className="problem-copy">
            <Kicker index="01">The problem with AI today</Kicker>
            <Lines className="h2" lines={['Powerful,', 'but incomplete.']} />
            <ol className="problem-list">
              {PROBLEMS.map((pr, i) => (
                <li key={pr.title} className={i === step ? 'is-active' : i < step ? 'is-past' : ''}>
                  <button onClick={() => jump(i)} aria-current={i === step}>
                    <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="problem-title">{pr.title}</span>
                  </button>
                  <div className="problem-body">
                    <p>{pr.body}</p>
                  </div>
                  <i className="problem-bar" ref={(el) => (bars.current[i] = el)} />
                </li>
              ))}
            </ol>
            <p className="problem-caption" aria-live="polite">
              <span className="dot" />
              <span>{PROBLEMS[step].caption}</span>
              {step === 0 && (
                <span ref={retained} className="problem-value">
                  100%
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
