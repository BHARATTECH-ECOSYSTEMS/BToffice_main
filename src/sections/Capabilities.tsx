import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Microscope,
  Search,
  Database,
  Eye,
  AudioLines,
  Bot,
  Workflow,
  SlidersHorizontal,
  Code2,
  Rocket,
  LayoutDashboard,
  Globe,
  Building2,
  ShieldCheck,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { useFormation, useScene } from '../gl/Scene';
import { useAnchors } from '../gl/useAnchors';
import { ChapterHead, StepList, TIER_TONES, fitTo, type Step } from '../components/Chapter';
import { CAPABILITIES, CAPABILITY_GROUPS } from '../content';

const PER_GROUP = 5;

const GROUP_LINES = [
  'Perceive the world: language, images, sound and the open web.',
  'Turn intelligence into working things: agents, workflows, models.',
  'Run it safely at scale, across an organisation and its partners.',
];

const ICONS: LucideIcon[] = [Microscope, Search, Database, Eye, AudioLines, Bot, Workflow, SlidersHorizontal, Code2, Rocket, LayoutDashboard, Globe, Building2, ShieldCheck, Store];

/**
 * Fifteen capabilities, read five at a time. The chapter is pinned: scrolling moves through the three families
 * (Understand, Build, Operate), each one a ring of the orbit. The family's five capabilities are listed beside it,
 * and the one in focus lights its satellite with its name pinned on it.
 */
export function Capabilities() {
  const ref = useRef<HTMLElement>(null);
  const visRef = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const [group, setGroup] = useState(0);
  const [stepP, setStepP] = useState(0);
  const [pick, setPick] = useState(0); // within the family
  const [hover, setHover] = useState<number | null>(null);
  const owns = useRef(false);
  const { scrollTo } = useScene();
  const local = hover ?? pick;
  const active = group * PER_GROUP + local;
  const activeRef = useRef(active);
  activeRef.current = active;

  useFormation(
    ref,
    () => {
      const f = fitTo(visRef.current, 4.7, 3.3, 1, 0.46);
      return {
        key: 'orbit15',
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
      const n = CAPABILITY_GROUPS.length;
      const g = Math.min(n - 1, Math.floor(p * n));
      setGroup((v) => (v === g ? v : g));
      const sp = Math.round(Math.min(1, p * n - g) * 50) / 50;
      setStepP((v) => (v === sp ? v : sp));
    },
  );

  // a new family starts at its first capability
  useEffect(() => setPick(0), [group]);

  // while nobody is pointing, focus walks the family's five satellites
  useEffect(() => {
    if (hover !== null) return;
    const t = setInterval(() => owns.current && setPick((a) => (a + 1) % PER_GROUP), 2800);
    return () => clearInterval(t);
  }, [hover, group]);

  useAnchors(['orbit15'], (pts, settle) => {
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

  const jump = (g: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollTo(top + ((g + 0.15) / CAPABILITY_GROUPS.length) * (el.offsetHeight - window.innerHeight));
  };

  const steps: Step[] = CAPABILITIES.slice(group * PER_GROUP, (group + 1) * PER_GROUP).map((c, i) => ({
    key: c.name,
    title: c.name,
    sub: c.body,
    icon: ICONS[group * PER_GROUP + i],
    tone: TIER_TONES[group],
  }));
  const cap = CAPABILITIES[active];

  return (
    <section id="capabilities" ref={ref} className="ch-pin caps-ch" style={{ '--steps': 3, '--step-h': '75svh' } as CSSProperties} data-chapter="Capabilities">
      <div className="ch-stage">
        <div className="wrap ch-grid">
          <div className="ch-copy">
            <ChapterHead
              index="03"
              label="Capabilities"
              title={['One intelligence.', <span className="accent">Fifteen capabilities.</span>]}
              lede="Three families, fifteen satellites of the same core. They share one memory, one way of reasoning and one set of controls."
            />
            <div className="ch-tabs" role="tablist" aria-label="Capability families">
              {CAPABILITY_GROUPS.map((g, i) => (
                <button key={g} type="button" role="tab" aria-selected={i === group} className={i === group ? 'is-active' : i < group ? 'is-past' : ''} data-tone={TIER_TONES[i]} onClick={() => jump(i)} style={{ '--sp': i === group ? stepP : i < group ? 1 : 0 } as CSSProperties}>
                  <i />
                  {g}
                  <small>0{i + 1}</small>
                </button>
              ))}
            </div>
            <p className="ch-tabline" key={group}>
              {GROUP_LINES[group]}
            </p>
            <StepList
              steps={steps}
              active={local}
              progress={1}
              onHover={setHover}
              onPick={setPick}
              dense
            />
          </div>
          <div ref={visRef} className="ch-visual" aria-hidden="true" />
        </div>
      </div>
      <div ref={tag} className="ch-tag" data-tone={TIER_TONES[group]} aria-hidden="true">
        <i />
        <span>
          <b>{cap.name}</b>
          <small>{CAPABILITY_GROUPS[group]}</small>
        </span>
      </div>
    </section>
  );
}
