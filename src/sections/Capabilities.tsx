import { Fragment, useEffect, useRef, useState } from 'react';
import { isCompact, useFormation, useScene } from '../gl/Scene';
import { Lines, Kicker } from '../components/Reveal';
import { CAPABILITIES, CAPABILITY_GROUPS } from '../content';

const PER_GROUP = CAPABILITIES.length / CAPABILITY_GROUPS.length;

const GROUP_LINES = [
  'Perceive and make sense of the world: language, images, sound and the open web.',
  'Turn intelligence into working things: agents, workflows, models and interfaces.',
  'Run it safely at scale, across an organisation and the ecosystem around it.',
];

const ICONS = [
  'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5L21 21M7.5 10.5h6M10.5 7.5v6',
  'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l5 5M8 11l2 2 4-4',
  'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4',
  'M8 8h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3zM12 4v4M9.5 13h.01M14.5 13h.01M2 13v2M22 13v2',
  'M5 4h4v4H5zM15 16h4v4h-4zM7 8v4a2 2 0 0 0 2 2h6a2 2 0 0 1 2 2',
  'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 4v4M10 10v4M18 16v4',
  'M9 4H8a2 2 0 0 0-2 2v4l-2 2 2 2v4a2 2 0 0 0 2 2h1M15 4h1a2 2 0 0 1 2 2v4l2 2-2 2v4a2 2 0 0 1-2 2h-1',
  'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  'M3 5h18v14H3zM3 9h18M9 9v10',
  'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z',
  'M4 21V5l8-2v18M12 8l8 2v11M3 21h18M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2',
  'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3zM9 12l2 2 4-4',
  'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
];

const Icon = ({ i, size = 24 }: { i: number; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={size > 40 ? 0.6 : 1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONS[i]} />
  </svg>
);

/**
 * Fifteen capabilities as a horizontal gallery in three chapters. Vertical scroll drives the
 * track; the orbit behind it lights whichever capability is in focus.
 */
export function Capabilities() {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const [height, setHeight] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const spin = useRef(0);
  const { scrollTo } = useScene();

  // The section is as tall as the track is wide, so one pixel of scroll moves the track one pixel.
  useEffect(() => {
    const measure = () => {
      const t = track.current;
      if (!t) return;
      const wide = window.innerWidth > 900;
      if (!wide) t.style.transform = '';
      setHeight(wide ? t.scrollWidth - window.innerWidth + window.innerHeight * 1.15 : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useFormation(
    ref,
    () => ({
      key: 'orbit15',
      pose: { x: 0, y: 0.05, s: 0.95 },
      params: { highlight: activeRef.current, spinY: spin.current, alpha: isCompact() ? 0 : 0.55 },
    }),
    (p) => {
      spin.current = -0.8 + p * 1.6;
      const t = track.current;
      if (!t || window.innerWidth <= 900) return;
      const travel = t.scrollWidth - window.innerWidth;
      const x = -Math.max(0, Math.min(1, p)) * travel;
      t.style.transform = `translate3d(${x}px, 0, 0)`;
      // the capability nearest the centre of the screen is in focus
      const mid = window.innerWidth * 0.5 - x;
      let best = 0;
      let bd = Infinity;
      cards.current.forEach((c, i) => {
        if (!c) return;
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      if (best !== activeRef.current) {
        activeRef.current = best;
        setActive(best);
      }
    },
  );

  const group = Math.floor(active / PER_GROUP);
  const viewport = useRef<HTMLDivElement>(null);

  // Phones swipe the gallery natively; focus follows the swipe instead of the page.
  const onSwipe = () => {
    const v = viewport.current;
    if (!v || window.innerWidth > 900) return;
    const mid = v.scrollLeft + v.clientWidth / 2;
    let best = 0;
    let bd = Infinity;
    cards.current.forEach((c, i) => {
      if (!c) return;
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    if (best !== activeRef.current) {
      activeRef.current = best;
      setActive(best);
    }
  };

  const jumpToGroup = (g: number) => {
    const el = ref.current;
    const t = track.current;
    const card = cards.current[g * PER_GROUP];
    if (!el || !t || !card) return;
    if (window.innerWidth <= 900) {
      viewport.current?.scrollTo({ left: card.offsetLeft - 20, behavior: 'smooth' });
      return;
    }
    const travel = t.scrollWidth - window.innerWidth;
    const p = Math.max(0, (card.offsetLeft + card.offsetWidth / 2 - window.innerWidth / 2) / travel);
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollTo(top + p * (el.offsetHeight - window.innerHeight));
  };

  return (
    <section id="capabilities" ref={ref} className="pin caps" data-chapter="Capabilities" style={height ? { height } : undefined}>
      <div className="pin-stage">
        <div className="caps-inner">
          <div className="wrap caps-top">
            <div>
              <Kicker index="03">Capabilities</Kicker>
              <Lines className="h2" lines={['One intelligence.', <span className="accent">Infinite capabilities.</span>]} />
            </div>
            <div className="caps-nav">
              <div className="caps-groups" role="tablist" aria-label="Capability groups">
                {CAPABILITY_GROUPS.map((g, i) => (
                  <button key={g} role="tab" aria-selected={i === group} onClick={() => jumpToGroup(i)}>
                    {g}
                  </button>
                ))}
              </div>
              <p className="caps-count">
                <b>{String(active + 1).padStart(2, '0')}</b>
                <span>/ {CAPABILITIES.length}</span>
              </p>
            </div>
          </div>

          <div ref={viewport} className="caps-viewport" onScroll={onSwipe}>
            <div ref={track} className="caps-track">
              {CAPABILITY_GROUPS.map((g, gi) => (
                <Fragment key={g}>
                  <article className="cap-intro">
                    <span className="cap-intro-num">0{gi + 1}</span>
                    <h3>{g}</h3>
                    <p>{GROUP_LINES[gi]}</p>
                    <span className="cap-intro-count">{PER_GROUP} capabilities →</span>
                  </article>
                  {CAPABILITIES.slice(gi * PER_GROUP, (gi + 1) * PER_GROUP).map((c, j) => {
                    const i = gi * PER_GROUP + j;
                    return (
                      <article key={c.name} ref={(el) => (cards.current[i] = el)} className={`cap-card ${i === active ? 'is-active' : ''}`}>
                        <div className="cap-card-top">
                          <span className="cap-icon">
                            <Icon i={i} />
                          </span>
                          <span className="cap-card-num">{String(i + 1).padStart(2, '0')}</span>
                        </div>
                        <span className="cap-watermark" aria-hidden="true">
                          <Icon i={i} size={190} />
                        </span>
                        <div className="cap-card-text">
                          <span className="cap-card-group">{g}</span>
                          <h4>{c.name}</h4>
                          <p>{c.body}</p>
                        </div>
                      </article>
                    );
                  })}
                </Fragment>
              ))}
              <div className="cap-end" aria-hidden="true" />
            </div>
          </div>

          <div className="wrap caps-bottom">
            <span className="caps-rail">
              <i style={{ transform: `scaleX(${(active + 1) / CAPABILITIES.length})` }} />
            </span>
            <span className="caps-hint">Every capability draws on the same memory, reasoning and security.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
