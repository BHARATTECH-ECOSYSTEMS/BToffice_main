import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Microscope, Code2, Building2, Landmark, GraduationCap, Rocket, Check, type LucideIcon } from 'lucide-react';
import { useFormation, useScene } from '../gl/Scene';
import { useAnchors } from '../gl/useAnchors';
import { ChapterHead, StepList, fitTo, type Step } from '../components/Chapter';
import { AUDIENCE_DETAIL } from '../content';

const ICONS: LucideIcon[] = [Microscope, Code2, Building2, Landmark, GraduationCap, Rocket];

/**
 * One core, six satellites: each kind of person the same intelligence serves. Pinned; scrolling brings each one into
 * focus, its satellite lights in the orbit and what it gets from Origin opens in the list.
 */
export function Audiences() {
  const ref = useRef<HTMLElement>(null);
  const visRef = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(0);
  const [auto, setAuto] = useState(0);
  const [stepP, setStepP] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? auto;
  const activeRef = useRef(active);
  activeRef.current = active;
  const owns = useRef(false);
  const lastScrollStep = useRef(0);
  const { scrollTo } = useScene();

  useEffect(() => {
    if (hovered !== null) return;
    const timer = window.setInterval(() => {
      if (owns.current) setAuto((i) => (i + 1) % AUDIENCE_DETAIL.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [hovered]);

  useFormation(
    ref,
    () => {
      const f = fitTo(visRef.current, 4.6, 3.3, 0.95, 0.46);
      return {
        key: 'orbit6',
        pose: { x: f.x, y: f.y, s: f.s, rx: 0.12 },
        mobilePose: { x: f.x, y: f.y, s: f.s },
        params: { highlight: activeRef.current },
        follow: 16,
        exact: true,
      };
    },
    (p, isActive) => {
      owns.current = isActive;
      if (!isActive) return;
      const n = AUDIENCE_DETAIL.length;
      const i = Math.min(n - 1, Math.floor(p * n));
      setScrolled((v) => (v === i ? v : i));
      if (i !== lastScrollStep.current) {
        lastScrollStep.current = i;
        setAuto(i);
      }
      const sp = Math.round(Math.min(1, p * n - i) * 40) / 40;
      setStepP((v) => (v === sp ? v : sp));
    },
  );

  useAnchors(['orbit6'], (pts, settle) => {
    const el = tag.current;
    if (!el) return;
    const p = pts?.[activeRef.current];
    const on = p && owns.current ? settle : 0;
    el.style.opacity = String(on);
    if (!p) return;
    const left = p.x > window.innerWidth * 0.78;
    el.classList.toggle('is-left', left);
    el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)${left ? ' translateX(-100%)' : ''}`;
  });

  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    setHovered(null);
    setAuto(i);
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollTo(top + ((i + 0.2) / AUDIENCE_DETAIL.length) * (el.offsetHeight - window.innerHeight));
  };

  const steps: Step[] = AUDIENCE_DETAIL.map((a, i) => ({
    key: a.name,
    title: a.name,
    sub: a.line,
    icon: ICONS[i],
    tone: 'violet',
    body: (
      <span className="ch-uses">
        {a.uses.map((u) => (
          <span key={u}>
            <Check size={13} strokeWidth={2.2} aria-hidden="true" /> {u}
          </span>
        ))}
      </span>
    ),
  }));
  const a = AUDIENCE_DETAIL[active];

  return (
    <section id="audiences" ref={ref} className="ch-pin aud-ch" style={{ '--steps': AUDIENCE_DETAIL.length, '--step-h': '42svh' } as CSSProperties} data-chapter="Who it’s for">
      <div className="ch-stage">
        <div className="wrap ch-grid">
          <div className="ch-copy">
            <ChapterHead title={['One intelligence,', <span className="accent">shaped for your work.</span>]} />
            <StepList steps={steps} active={active} progress={hovered === null && active === scrolled ? stepP : 1} onHover={setHovered} onPick={jump} dense caption />
          </div>
          <div ref={visRef} className="ch-visual" aria-hidden="true" />
        </div>
      </div>
      <div ref={tag} className="ch-tag" data-tone="violet" aria-hidden="true">
        <i />
        <span>
          <b>{a.name}</b>
        </span>
      </div>
    </section>
  );
}
