import { forwardRef, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Lines, Fade } from './Reveal';
import { worldYOf } from '../gl/Scene';

/**
 * The chapter kit. Every chapter with an object in it is built from the same parts, so the page reads as one system:
 *
 *   ┌ copy column ───────────────┐ ┌ visual column ──────────────┐
 *   │ 05 · ARCHITECTURE  (pill)  │ │                             │
 *   │ Headline,                  │ │        the 3D object        │
 *   │ accent second line.        │ │     + one InfoCard on it    │
 *   │ Lede                       │ │                             │
 *   │ ─ StepList ─────────────── │ │                             │
 *   └────────────────────────────┘ └─────────────────────────────┘
 *
 * Tones carry one meaning site-wide: the three tiers of anything (capability groups, architecture families) are
 * violet → teal → steel; amber is India; coral is a problem.
 */

export type Tone = 'violet' | 'teal' | 'steel' | 'amber' | 'coral';
export const TIER_TONES: Tone[] = ['violet', 'teal', 'steel'];

export function ChapterHead({ index, label, title, lede, center }: { index: string; label: string; title: ReactNode[]; lede?: ReactNode; center?: boolean }) {
  return (
    <header className={`ch-head ${center ? 'is-center' : ''}`}>
      <Fade as="p" className="ch-pill">
        <span className="ch-pill-num">{index}</span>
        <span>{label}</span>
      </Fade>
      <Lines className="h2 ch-title" lines={title} />
      {lede && (
        <Fade as="p" className="ch-lede" delay={120}>
          {lede}
        </Fade>
      )}
    </header>
  );
}

export function IconTile({ icon: Icon, tone = 'violet', size = 'md' }: { icon: LucideIcon; tone?: Tone; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`ch-tile is-${size}`} data-tone={tone}>
      <Icon strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

export interface Step {
  key: string;
  title: string;
  sub?: string;
  body?: ReactNode;
  icon: LucideIcon;
  tone: Tone;
  group?: string;
}

/** The chapter's index. The active row opens into a card; a hairline under it fills as you scroll through the step. */
export function StepList({
  steps,
  active,
  onPick,
  onHover,
  progress = 0,
  dense,
  caption,
}: {
  steps: Step[];
  active: number;
  onPick?: (i: number) => void;
  onHover?: (i: number | null) => void;
  progress?: number;
  dense?: boolean;
  /** Also say the active step's detail in a caption under the row (the centred stage shows steps as chips). */
  caption?: boolean;
}) {
  const rows: ReactNode[] = [];
  let group: string | undefined;
  steps.forEach((s, i) => {
    if (s.group && s.group !== group) {
      group = s.group;
      rows.push(
        <li key={`g-${s.group}`} className="ch-group" data-tone={s.tone}>
          <i />
          {s.group}
        </li>,
      );
    }
    const on = i === active;
    rows.push(
      <li key={s.key}>
        <button
          type="button"
          className={`ch-step ${on ? 'is-active' : ''} ${i < active ? 'is-past' : ''}`}
          data-tone={s.tone}
          aria-current={on ? 'step' : undefined}
          onClick={() => onPick?.(i)}
          onMouseEnter={() => onHover?.(i)}
          onFocus={() => onHover?.(i)}
          style={{ '--sp': on ? progress : i < active ? 1 : 0 } as CSSProperties}
        >
          <IconTile icon={s.icon} tone={s.tone} size="sm" />
          <span className="ch-step-main">
            <span className="ch-step-title">
              <span className="ch-step-num">{String(i + 1).padStart(2, '0')}</span>
              {s.title}
            </span>
            {s.sub && (
              <span className="ch-step-sub">
                <span>{s.sub}</span>
              </span>
            )}
            {s.body && (
              <span className="ch-step-body">
                <span>{s.body}</span>
              </span>
            )}
          </span>
          <i className="ch-step-bar" />
        </button>
      </li>,
    );
  });
  // The spine: a line through the icon tiles that fills to the active step and on toward the next as you read.
  // Tile positions are measured only when the active step changes (its row opens); scrolling just moves the fill.
  const listRef = useRef<HTMLOListElement>(null);
  const centres = useRef<number[]>([]);
  const fill = () => {
    const ol = listRef.current;
    const c = centres.current;
    if (!ol || c.length < 2) return;
    const a = c[Math.min(active, c.length - 1)];
    const b = active + 1 < c.length ? c[active + 1] : a;
    ol.style.setProperty('--spine-fill', `${Math.max(0, a + (b - a) * Math.min(1, progress) - c[0])}px`);
  };
  useLayoutEffect(() => {
    const ol = listRef.current;
    if (!ol) return;
    const measure = () => {
      const top = ol.getBoundingClientRect().top;
      centres.current = Array.from(ol.querySelectorAll<HTMLElement>('.ch-step .ch-tile')).map((t) => {
        const r = t.getBoundingClientRect();
        return r.top + r.height / 2 - top;
      });
      const c = centres.current;
      if (c.length < 2) return;
      ol.style.setProperty('--spine-top', `${c[0]}px`);
      ol.style.setProperty('--spine-h', `${c[c.length - 1] - c[0]}px`);
      fill();
    };
    measure();
    // the active row opens over ~0.45s; measure again once it has
    const t = window.setTimeout(measure, 480);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, steps.length]);
  useLayoutEffect(fill, [progress]); // eslint-disable-line react-hooks/exhaustive-deps

  const cur = steps[active];
  return (
    <>
      <ol ref={listRef} className={`ch-steps has-spine ${dense ? 'is-dense' : ''}`} onMouseLeave={() => onHover?.(null)} data-tone={cur?.tone}>
        {rows}
      </ol>
      {caption && cur && (
        <div className="ch-caption" key={cur.key} data-tone={cur.tone}>
          {cur.sub && <p>{cur.sub}</p>}
          {cur.body}
        </div>
      )}
    </>
  );
}

/** The one card that hangs off an object in the scene. Positioned by its chapter every frame. */
export const InfoCard = forwardRef<
  HTMLDivElement,
  { tone: Tone; kicker: ReactNode; aside?: ReactNode; title: string; body?: ReactNode; trace?: ReactNode; chips?: string[]; icon?: LucideIcon; className?: string }
>(function InfoCard({ tone, kicker, aside, title, body, trace, chips, icon, className }, ref) {
  return (
    <div ref={ref} className={`ch-card ${className ?? ''}`} data-tone={tone} aria-live="polite">
      <p className="ch-card-kicker">
        <span>
          <i />
          {kicker}
        </span>
        {aside && <span className="ch-card-aside">{aside}</span>}
      </p>
      <div className="ch-card-title" key={title}>
        {icon && <IconTile icon={icon} tone={tone} size="md" />}
        <h3>{title}</h3>
      </div>
      {body && (
        <p className="ch-card-body" key={`b-${title}`}>
          {body}
        </p>
      )}
      {chips && (
        <ul className="ch-card-chips" key={`c-${title}`}>
          {chips.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
      {trace && (
        <p className="ch-card-trace" key={`t-${title}`}>
          <i />
          {trace}
        </p>
      )}
    </div>
  );
});

/**
 * World pose that centres an object of `w` × `h` world units in an element's box, as large as it fits
 * (never above `max`). Measured live, so a pinned stage that scrolls away takes its object with it.
 */
export function fitTo(el: HTMLElement | null, w: number, h: number, max = 1, oy = 0.5) {
  if (!el) return { x: 0, y: 0, s: max };
  const r = el.getBoundingClientRect();
  const perPx = worldYOf(el, 0) - worldYOf(el, 1);
  const s = Math.max(0.28, Math.min(max, (r.height * perPx) / h, (r.width * perPx) / w));
  const x = (r.left + r.width / 2 - window.innerWidth / 2) * perPx;
  return { x, y: worldYOf(el, r.height * oy), s };
}
