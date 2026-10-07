import { useRef, useState } from 'react';
import { pinLift, useFormation, useScene } from '../gl/Scene';
import { useAnchors } from '../gl/useAnchors';
import type { FormationKey } from '../gl/Engine';
import { Eraser, Puzzle, Snowflake, Unlink } from 'lucide-react';
import { ChapterHead, StepList, type Step } from '../components/Chapter';
import { PROBLEMS, SILOS } from '../content';

const STEP_ICONS = [Eraser, Puzzle, Snowflake, Unlink];
const STEP_KEYS: FormationKey[] = ['logo', 'silos', 'frozen', 'alone'];
// the seven neighbouring pairs in the 3 × 2 grid
const LINKS: [number, number][] = [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5]];

const ChatIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <circle cx="8.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="11.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10.5" cy="10.5" r="7" />
    <path d="M15.5 15.5L21 21" />
  </svg>
);

const DocsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="14" y2="17" />
  </svg>
);

const CodeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="7 8 3 12 7 16" />
    <line x1="14" y1="5" x2="10" y2="19" />
    <polyline points="17 8 21 12 17 16" />
  </svg>
);

const VisionIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3.5" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

const VoiceIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="10" rx="3" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
);

const TOOL_ICONS: Record<string, () => JSX.Element> = {
  Chat: ChatIcon,
  Search: SearchIcon,
  Docs: DocsIcon,
  Code: CodeIcon,
  Vision: VisionIcon,
  Voice: VoiceIcon,
};

/**
 * Four problems, pinned. One visual acts each of them out:
 * the mark forgets (dissolves), splits into six silos, freezes into rigid cubes,
 * then reaches for its neighbours and never connects.
 */
export function Problem() {
  const ref = useRef<HTMLElement>(null);
  const { scrollTo } = useScene();
  const [step, setStep] = useState(0);
  const [stepP, setStepP] = useState(0);
  const [hoveredSilo, setHoveredSilo] = useState<number | null>(null);
  const stepRef = useRef(0);
  const local = useRef(0);
  const bars = useRef<(HTMLElement | null)[]>([]);
  const labels = useRef<(HTMLElement | null)[]>([]);
  const symbols = useRef<(HTMLElement | null)[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const overlaySvgRef = useRef<SVGSVGElement>(null);
  const owns = useRef(false);
  const retainedAmt = useRef(1);
  // Size of one tool symbol in px, measured from the live grid spacing so every overlay scales with the screen.
  const sym = useRef(96);
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
      // when the pin releases, the objects leave with the page instead of hanging on screen
      const lift = pinLift(ref.current);
      return {
        key: STEP_KEYS[s],
        pose: { x: 1.6, y: -0.08 + lift, s: s === 0 ? 0.82 : 0.86 },
        mobilePose: { y: 0.78 + lift, s: s === 0 ? 0.46 : Math.min(0.6, window.innerWidth / 760) },
        follow: lift > 0 ? 30 : undefined,
        params: {
          decay: s === 0 ? local.current * 0.85 : 0,
          drift: s >= 2 ? 0 : 1,
          alpha: 1,
        },
      };
    },
    (p, isActive) => {
      owns.current = isActive;

      // Evenly distribute 4 problem steps across the full scroll progress (0..1)
      const t = Math.min(0.9999, Math.max(0, p)) * PROBLEMS.length;
      const s = Math.min(PROBLEMS.length - 1, Math.floor(t));
      local.current = t - s;
      if (s !== stepRef.current) {
        stepRef.current = s;
        setStep(s);
      }

      bars.current.forEach((b, i) => b?.style.setProperty('--p', String(i < s ? 1 : i === s ? local.current : 0)));
      const sp = Math.round(local.current * 40) / 40;
      setStepP((v) => (v === sp ? v : sp));
      retainedAmt.current = s === 0 ? 1 - local.current * 0.85 : 0.15;
      const pct = `${Math.round(retainedAmt.current * 100)}%`;
      const g = ov.gaugeLabel.current?.querySelector('b');
      if (g) g.textContent = pct;
    },
  );

  useAnchors(['silos', 'frozen', 'alone'], (pts, settle) => {
    const r = ref.current?.getBoundingClientRect();
    const onScreen = r ? r.bottom > 0 && r.top < window.innerHeight : false;

    let unpinY = 0;
    let fade = 1;
    if (r && r.bottom < window.innerHeight) {
      unpinY = r.bottom - window.innerHeight;
      fade = Math.max(0, Math.min(1, (r.bottom - window.innerHeight * 0.1) / (window.innerHeight * 0.35)));
    }
    const finalOpacity = settle * fade;

    if (!onScreen || !pts || finalOpacity <= 0.01) {
      labels.current.forEach((el) => { if (el) { el.style.opacity = '0'; el.style.visibility = 'hidden'; } });
      symbols.current.forEach((el) => { if (el) { el.style.opacity = '0'; el.style.visibility = 'hidden'; } });
      return;
    }

    labels.current.forEach((el, i) => {
      if (!el) return;
      el.style.visibility = 'visible';
      el.style.opacity = String(finalOpacity);
      el.style.transform = `translate3d(${pts[i].x}px, ${pts[i].y + unpinY}px, 0) translate(-50%, -50%)`;
    });

    const C = pts && pts.length >= 12 ? pts.slice(6) : null;
    if (C) sym.current = Math.round(Math.max(44, Math.min(96, (C[1].x - C[0].x) * 0.5)));
    symbols.current.forEach((el, i) => {
      if (!el) return;
      if (!C || !C[i]) {
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
        return;
      }
      el.style.visibility = 'visible';
      el.style.opacity = String(finalOpacity);
      el.style.width = `${sym.current}px`;
      el.style.transform = `translate3d(${C[i].x}px, ${C[i].y + unpinY}px, 0) translate(-50%, -50%)`;
    });
  });

  // Annotations drawn on top of the particles, so each shape says what it means.
  useAnchors(['logo', 'silos', 'frozen', 'alone'], (pts, settle) => {
    const r = ref.current?.getBoundingClientRect();
    const onScreen = r ? r.bottom > 0 && r.top < window.innerHeight : false;

    const hideAll = () => {
      [ov.gauge.current, ov.gaugeLabel.current, ov.walls.current, ov.wallTag.current, ov.time.current, ov.links.current].forEach((el) => {
        if (el) {
          (el as HTMLElement).style.opacity = '0';
          (el as HTMLElement).style.visibility = 'hidden';
        }
      });
      if (overlaySvgRef.current) {
        overlaySvgRef.current.style.visibility = 'hidden';
      }
    };

    let unpinY = 0;
    let fade = 1;
    if (r && r.bottom < window.innerHeight) {
      unpinY = r.bottom - window.innerHeight;
      fade = Math.max(0, Math.min(1, (r.bottom - window.innerHeight * 0.1) / (window.innerHeight * 0.35)));
    }
    const finalOpacity = settle * fade;

    if (!onScreen || !pts || finalOpacity <= 0.01) {
      hideAll();
      return;
    }

    if (overlaySvgRef.current) {
      overlaySvgRef.current.style.visibility = 'visible';
      overlaySvgRef.current.style.transform = unpinY !== 0 ? `translate3d(0, ${unpinY}px, 0)` : '';
    }

    const st = stepRef.current;
    const show = (el: Element | null, on: boolean) => {
      if (!el) return;
      const htmlEl = el as HTMLElement;
      if (on && finalOpacity > 0.01) {
        htmlEl.style.visibility = 'visible';
        htmlEl.style.opacity = String(finalOpacity);
        if (unpinY !== 0 && htmlEl.tagName === 'DIV') {
          htmlEl.style.transform = `translate3d(0, ${unpinY}px, 0)`;
        } else if (htmlEl.tagName === 'DIV') {
          htmlEl.style.transform = '';
        }
      } else {
        htmlEl.style.opacity = '0';
        htmlEl.style.visibility = 'hidden';
      }
    };

    show(ov.gauge.current, st === 0);
    show(ov.gaugeLabel.current, st === 0);
    show(ov.walls.current, st === 1);
    show(ov.wallTag.current, st === 1);
    show(ov.time.current, st === 2);
    show(ov.links.current, st === 3);
    if (finalOpacity <= 0.01 || !pts) return;

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
    const half = sym.current / 2; // a symbol's half-size

    if (st === 1) {
      // walls between every tool
      const top = L[0].y - 24;
      const bottom = C[3].y + half + 12;
      const left = C[0].x - (C[1].x - C[0].x) * 0.62;
      const right = C[2].x + (C[2].x - C[1].x) * 0.62;
      // Position the horizontal dividing wall cleanly in the open channel between Row 0 symbols and Row 1 badges
      const row0Bottom = C[0].y + half * 0.8;
      const row1Top = L[3].y - 18;
      const midY = (row0Bottom + row1Top) / 2;
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
      if (ov.wallTag.current) ov.wallTag.current.style.transform = `translate3d(${C[1].x}px, ${midY}px, 0) translate(-50%, -50%)`;
    }

    if (st === 2 && ov.time.current) {
      // a timeline: knowledge stops at training, the world keeps going
      const y = C[3].y + half + 14;
      const x0 = Math.max(20, C[0].x - (C[1].x - C[0].x) * 0.5);
      const x1 = Math.min(window.innerWidth - 20, C[2].x + (C[2].x - C[1].x) * 0.5);
      ov.time.current.setAttribute('transform', `translate(${x0} ${y}) scale(${(x1 - x0) / 600} 1)`);
    }

    if (st === 3) {
      LINKS.forEach(([a, b], i) => {
        const line = ov.linkLines.current[i];
        const mark = ov.linkMarks.current[i];
        const isVertical = i >= 4; // [0,3], [1,4], [2,5]

        if (isVertical) {
          // Vertical connection: between Row 0 symbol bottom and Row 1 badge top
          // This avoids overlapping or cutting through Code, Vision, or Voice badges!
          const topSym = C[a];
          const btmBadge = L[b];
          const startY = topSym.y + half * 0.85;
          const endY = btmBadge.y - 18;
          const midY = (startY + endY) / 2;
          const x = topSym.x;

          line?.setAttribute('x1', String(x));
          line?.setAttribute('y1', String(startY));
          line?.setAttribute('x2', String(x));
          line?.setAttribute('y2', String(endY));
          mark?.setAttribute('transform', `translate(${x} ${midY})`);
        } else {
          // Horizontal connection: between neighbouring symbols in the same row
          const A = C[a];
          const B = C[b];
          const startX = A.x + half + 6;
          const endX = B.x - half - 6;
          const midX = (A.x + B.x) / 2;
          const y = A.y;

          line?.setAttribute('x1', String(startX));
          line?.setAttribute('y1', String(y));
          line?.setAttribute('x2', String(endX));
          line?.setAttribute('y2', String(y));
          mark?.setAttribute('transform', `translate(${midX} ${y})`);
        }
      });
    }
  });

  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const targetP = (i + 0.35) / PROBLEMS.length;
    scrollTo(top + targetP * (el.offsetHeight - window.innerHeight));
  };

  return (
    <section id="mission" ref={ref} className={`pin problem step-${step}`} data-chapter="The problem">
      <div className="pin-stage">
        <svg ref={overlaySvgRef} className="problem-overlay" aria-hidden="true">
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
          {SILOS.map((s, i) => {
            const Icon = TOOL_ICONS[s];
            const isHov = hoveredSilo === i;
            return (
              <span
                key={s}
                ref={(el) => (labels.current[i] = el)}
                className={`silo-label step-${step} ${isHov ? 'is-hovered' : ''}`}
                onMouseEnter={() => setHoveredSilo(i)}
                onMouseLeave={() => setHoveredSilo(null)}
              >
                <span className="silo-label-inner" style={{ animationDelay: `${i * 0.18}s` }}>
                  {Icon && <Icon />}
                  <span>{s}</span>
                </span>
              </span>
            );
          })}
        </div>
        <div className="silo-symbols" aria-hidden="true">
          {SILOS.map((s, i) => {
            const isHov = hoveredSilo === i;
            return (
              <div
                key={s}
                ref={(el) => (symbols.current[i] = el)}
                className={`silo-symbol step-${step} ${isHov ? 'is-hovered' : ''}`}
                onMouseEnter={() => setHoveredSilo(i)}
                onMouseLeave={() => setHoveredSilo(null)}
              >
                <img
                  src={`/symbol_${s.toLowerCase()}_alpha.png?v=2`}
                  alt={s}
                  className="silo-symbol-img"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              </div>
            );
          })}
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
        <div ref={stageRef} className="wrap problem-stage">
          <div className="problem-copy">
            <ChapterHead title={['Powerful,', <span className="accent">but incomplete.</span>]} />
            <div className="problem-statement" key={step} aria-live="polite">
              <h3 className="problem-big">{PROBLEMS[step].title}</h3>
              {step > 0 && (
                <p className="problem-caption">
                  <span className="dot" />
                  <span>{PROBLEMS[step].caption}</span>
                </p>
              )}
            </div>
            <StepList
              steps={PROBLEMS.map((pr, i): Step => ({ key: pr.title, title: pr.title, sub: pr.body, icon: STEP_ICONS[i], tone: 'violet' }))}
              active={step}
              progress={stepP}
              onPick={jump}
              dense
            />
          </div>
        </div>
      </div>
    </section>
  );
}
