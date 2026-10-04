import { useRef, useState, type CSSProperties } from 'react';
import { AppWindow, Brain, Database, Network, Microscope, ShieldCheck, Workflow, Cpu, Cloud, type LucideIcon } from 'lucide-react';
import { LAYERS, LAYER_FAMILIES } from '../content';
import { isCompact, useFormation, useScene } from '../gl/Scene';
import { useAnchors } from '../gl/useAnchors';
import { ChapterHead, InfoCard, StepList, TIER_TONES, fitTo, type Step } from '../components/Chapter';

const ICONS: LucideIcon[] = [AppWindow, Brain, Database, Network, Microscope, ShieldCheck, Workflow, Cpu, Cloud];
const familyOf = (i: number) => LAYER_FAMILIES.findIndex((f) => i >= f.from && i <= f.to);

/**
 * Nine layers, pinned. Scrolling takes the groundwater request down through the stack: the active wafer slides out
 * like a drawer, its number and name engraved on it, and the card on its edge says what that layer did.
 */
export function Architecture() {
  const sectionRef = useRef<HTMLElement>(null);
  const visRef = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const lead = useRef<SVGPathElement>(null);
  const tags = useRef<(HTMLButtonElement | null)[]>([]);
  const [scrolled, setScrolled] = useState(0);
  const [stepP, setStepP] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? scrolled;
  const activeRef = useRef(active);
  activeRef.current = active;
  const owns = useRef(false);
  const { scrollTo } = useScene();

  useFormation(
    sectionRef,
    () => {
      // the exploded stack is ~2.6 wide and ~4 tall once the drawer is out
      const f = fitTo(visRef.current, 3.6, 5.3, 0.8, 0.53);
      return {
        key: 'layers',
        pose: { x: f.x - 0.1 * f.s, y: f.y, s: f.s },
        mobilePose: { x: f.x, y: f.y, s: f.s },
        params: { highlight: activeRef.current, explode: 1, drift: 0.4 },
        follow: 16,
        exact: true,
      };
    },
    (p, isActive) => {
      owns.current = isActive;
      if (!isActive) return;
      const n = LAYERS.length;
      const idx = Math.min(n - 1, Math.floor(p * n));
      setScrolled((v) => (v === idx ? v : idx));
      const sp = Math.round(Math.min(1, p * n - idx) * 40) / 40;
      setStepP((v) => (v === sp ? v : sp));
    },
  );

  // the card hangs off the active wafer's right edge, joined to it by a short leader
  useAnchors(['layers'], (pts, settle) => {
    const el = card.current;
    const path = lead.current;
    if (!el || !path) return;
    // every other wafer is named by a tag at its front-left corner
    tags.current.forEach((t, i) => {
      if (!t) return;
      const c = pts?.[LAYERS.length + i];
      const show = c && owns.current && i !== activeRef.current && !isCompact() ? settle : 0;
      t.style.opacity = String(show);
      t.style.pointerEvents = show > 0.5 ? 'auto' : 'none';
      if (c) t.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) translate(calc(-100% - 10px), -50%)`;
    });
    const a = pts?.[activeRef.current];
    const on = a && owns.current ? settle : 0;
    el.style.opacity = String(on);
    path.style.opacity = String(on);
    if (!a) return;
    const compact = isCompact();
    const x = compact ? Math.max(16, Math.min(window.innerWidth - el.offsetWidth - 16, a.x - el.offsetWidth / 2)) : Math.min(a.x + 48, window.innerWidth - el.offsetWidth - 24);
    const y = compact ? a.y + 22 : Math.max(90, Math.min(window.innerHeight - el.offsetHeight - 80, a.y - el.offsetHeight / 2));
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    path.setAttribute('d', compact ? '' : `M${a.x} ${a.y} C${a.x + 24} ${a.y}, ${x - 24} ${y + el.offsetHeight / 2}, ${x} ${y + el.offsetHeight / 2}`);
  });

  const jump = (i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollTo(top + ((i + 0.2) / LAYERS.length) * (el.offsetHeight - window.innerHeight));
  };

  const steps: Step[] = LAYERS.map((l, i) => ({
    key: l.name,
    title: l.name,
    sub: l.body,
    icon: ICONS[i],
    tone: TIER_TONES[familyOf(i)],
    group: LAYER_FAMILIES[familyOf(i)].name,
  }));
  const L = LAYERS[active];
  const tone = TIER_TONES[familyOf(active)];

  return (
    <section id="architecture" ref={sectionRef} className="ch-pin arch-ch" style={{ '--steps': LAYERS.length, '--step-h': '34svh' } as CSSProperties} data-chapter="Architecture">
      <div className="ch-stage">
        <svg className="ch-lead" data-tone={tone} aria-hidden="true">
          <path ref={lead} />
        </svg>
        <div className="wrap ch-grid">
          <div className="ch-copy">
            <ChapterHead
              index="05"
              label="Architecture"
              title={['An operating system,', <span className="accent">not an application.</span>]}
              lede="Nine layers in three families. Scroll to follow one request from the app the team uses down to sovereign compute."
            />
            <StepList steps={steps} active={active} progress={hovered === null ? stepP : 1} onHover={setHovered} onPick={jump} dense />
          </div>
          <div ref={visRef} className="ch-visual" aria-hidden="true" />
        </div>
        <div className="slab-tags">
          {LAYERS.map((l, i) => (
            <button
              key={l.name}
              ref={(el) => (tags.current[i] = el)}
              type="button"
              className={`slab-tag ${i < active ? 'is-above' : ''}`}
              data-tone={TIER_TONES[familyOf(i)]}
              onClick={() => jump(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              tabIndex={-1}
            >
              <b>{String(i + 1).padStart(2, '0')}</b>
              {l.name}
              <i />
            </button>
          ))}
        </div>
        <InfoCard
          ref={card}
          className="is-floating"
          tone={tone}
          icon={ICONS[active]}
          kicker={`Layer ${String(active + 1).padStart(2, '0')} / ${LAYERS.length} · ${LAYER_FAMILIES[familyOf(active)].name}`}
          title={L.name}
          body={L.body}
          trace={L.trace}
        />
      </div>
    </section>
  );
}
