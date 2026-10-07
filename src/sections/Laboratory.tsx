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
      // upright on wide screens (~10 units tall); lying down in the band on phones
      const f = compact ? fitTo(visRef.current, 10.4, 1.8, 0.6) : fitTo(visRef.current, 2.6, 10.4, 0.85, 0.5);
      return {
        key: 'helix',
        pose: { x: f.x - (compact ? 0 : 0.6 * f.s), y: f.y, s: f.s, rz: compact ? 0 : -Math.PI / 2 },
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
    const compact = isCompact();
    const x = compact ? Math.max(16, Math.min(window.innerWidth - el.offsetWidth - 16, a.x - el.offsetWidth / 2)) : Math.min(a.x + 70, window.innerWidth - el.offsetWidth - 24);
    const y = compact ? a.y + 26 : Math.max(90, Math.min(window.innerHeight - el.offsetHeight - 70, a.y - el.offsetHeight / 2));
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    path.setAttribute('d', compact ? '' : `M${a.x} ${a.y} C${a.x + 30} ${a.y}, ${x - 30} ${y + el.offsetHeight / 2}, ${x} ${y + el.offsetHeight / 2}`);
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
          title={d.name}
          body={d.body}
          chips={d.focus.slice(0, 3)}
        />
      </div>
    </section>
  );
}
