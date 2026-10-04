import { useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { Sparkles, Network, Cpu, MapPinned, Shield, Smartphone, type LucideIcon } from 'lucide-react';
import { useAnchors } from '../gl/useAnchors';
import { Arrow } from '../components/Reveal';
import { DOMAINS } from '../content';
import { isCompact, useFormation, useScene } from '../gl/Scene';
import { ChapterHead, InfoCard, StepList, fitTo, type Step } from '../components/Chapter';

const ICONS: LucideIcon[] = [Sparkles, Network, Cpu, MapPinned, Shield, Smartphone];

/**
 * Six research domains as six segments of one helix, stood upright and pinned. Scrolling climbs down it: the active
 * segment lights and the card on its side says what the domain is working on.
 */
export function Laboratory() {
  const ref = useRef<HTMLElement>(null);
  const visRef = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const lead = useRef<SVGPathElement>(null);
  const [scrolled, setScrolled] = useState(0);
  const [stepP, setStepP] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? scrolled;
  const activeRef = useRef(active);
  activeRef.current = active;
  const owns = useRef(false);
  const { scrollTo } = useScene();

  useFormation(
    ref,
    () => {
      const compact = isCompact();
      // lying across the stage, low enough for the card to stand above the lit segment
      const f = fitTo(visRef.current, 10.6, compact ? 1.8 : 3.4, compact ? 0.6 : 0.74, compact ? 0.5 : 0.78);
      return {
        key: 'helix',
        pose: { x: f.x, y: f.y, s: f.s, rz: 0 },
        mobilePose: { x: f.x, y: f.y, s: f.s, rz: 0 },
        params: { highlight: activeRef.current },
        follow: 14,
        exact: true,
      };
    },
    (p, isActive) => {
      owns.current = isActive;
      if (!isActive) return;
      const n = DOMAINS.length;
      const i = Math.min(n - 1, Math.floor(p * n));
      setScrolled((v) => (v === i ? v : i));
      const sp = Math.round(Math.min(1, p * n - i) * 40) / 40;
      setStepP((v) => (v === sp ? v : sp));
    },
  );

  // the card stands beside the lit segment, joined to it by a leader
  useAnchors(['helix'], (pts, settle) => {
    const el = card.current;
    const path = lead.current;
    if (!el || !path) return;
    const a = pts?.[activeRef.current];
    const on = a && owns.current ? settle : 0;
    el.style.opacity = path.style.opacity = String(on);
    if (!a) return;
    // centred above the lit segment, on a short stem
    const x = Math.max(16, Math.min(window.innerWidth - el.offsetWidth - 16, a.x - el.offsetWidth / 2));
    const y = Math.max(84, a.y - 28 - el.offsetHeight);
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    path.setAttribute('d', isCompact() ? '' : `M${a.x} ${a.y} V${y + el.offsetHeight}`);
  });

  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollTo(top + ((i + 0.2) / DOMAINS.length) * (el.offsetHeight - window.innerHeight));
  };

  const steps: Step[] = DOMAINS.map((d, i) => ({ key: d.id, title: d.name, sub: d.field, icon: ICONS[i], tone: 'violet' }));
  const d = DOMAINS[active];

  return (
    <section id="laboratory" ref={ref} className="ch-pin lab-ch" style={{ '--steps': DOMAINS.length, '--step-h': '45svh' } as CSSProperties} data-chapter="Laboratory">
      <div className="ch-stage">
        <svg className="ch-lead" data-tone="violet" aria-hidden="true">
          <path ref={lead} />
        </svg>
        <div className="wrap ch-grid">
          <div className="ch-copy">
            <ChapterHead
              index="07"
              label="Laboratory"
              title={['Six domains.', <span className="accent">One programme.</span>]}
              lede="One strand of research, six fields along it. Each domain feeds what it learns back into the same intelligence."
            />
            <StepList steps={steps} active={active} progress={hovered === null ? stepP : 1} onHover={setHovered} onPick={jump} dense />
            <Link to="/research" className="link ch-more">
              Enter the lab <Arrow size={13} />
            </Link>
          </div>
          <div ref={visRef} className="ch-visual" aria-hidden="true" />
        </div>
        <InfoCard
          ref={card}
          className="is-floating"
          tone="violet"
          icon={ICONS[active]}
          kicker={d.field}
          aside={`${String(active + 1).padStart(2, '0')} / 06`}
          title={d.name}
          body={d.body}
        />
      </div>
    </section>
  );
}
