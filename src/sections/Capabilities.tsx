import { useEffect, useRef, useState, Fragment } from 'react';
import { useFormation, useScene } from '../gl/Scene';
import { Lines, Kicker } from '../components/Reveal';
import { CAPABILITIES, CAPABILITY_GROUPS } from '../content';

const PER_GROUP = 5;

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

const Icon = ({ i, size = 22 }: { i: number; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONS[i]} />
  </svg>
);

function CapabilityGrid({ group }: { group: number }) {
  const items = CAPABILITIES.slice(group * PER_GROUP, (group + 1) * PER_GROUP);
  return (
    <div className="caps-grid" role="tabpanel" key={`caps-grid-${group}`}>
      {items.map((c, i) => {
        const idx = group * PER_GROUP + i;
        return (
          <article className="cap-card" key={c.name} style={{ animationDelay: `${i * 70}ms` }}>
            <span className="cap-icon">
              <Icon i={idx} />
            </span>
            <h4>{c.name}</h4>
            <p>{c.body}</p>
          </article>
        );
      })}
    </div>
  );
}

export function Capabilities() {
  const ref = useRef<HTMLElement>(null);
  const { scrollTo } = useScene();
  const [pinned, setPinned] = useState(true);
  const [group, setGroup] = useState(0);
  const [progress, setProgress] = useState(0);

  useFormation(ref, { key: 'field', params: { alpha: 0 } });

  useEffect(() => {
    const check = () => setPinned(window.innerWidth > 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!pinned) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const total = Math.max(1, r.height - window.innerHeight);
        const p = Math.min(1, Math.max(0, -r.top / total));
        const g = Math.min(CAPABILITY_GROUPS.length - 1, Math.floor(p * CAPABILITY_GROUPS.length));
        setGroup(g);
        setProgress(p);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [pinned]);

  const jump = (g: number) => {
    setGroup(g);
    const el = ref.current;
    if (!el || !pinned) return;
    const total = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollTo(top + ((g + 0.3) / CAPABILITY_GROUPS.length) * total);
  };

  const progressFor = (i: number) => Math.min(1, Math.max(0, progress * CAPABILITY_GROUPS.length - i));

  return (
    <section
      id="capabilities"
      ref={ref}
      className={`section caps ${pinned ? 'is-pinned' : ''}`}
      data-chapter="Capabilities"
      style={pinned ? { height: `calc(100svh + ${CAPABILITY_GROUPS.length * 45}svh)` } : undefined}
    >
      <div className={pinned ? 'steps-stage' : ''}>
        <div className="wrap">
          <header className="caps-head">
            <div>
              <Kicker index="03">Capabilities</Kicker>
              <Lines className="h2" lines={['One intelligence.', <span className="accent">Infinite capabilities.</span>]} />
            </div>
            {pinned && (
              <div className="caps-groups" role="tablist" aria-label="Capability groups">
                {CAPABILITY_GROUPS.map((g, i) => (
                  <button
                    key={g}
                    role="tab"
                    aria-selected={i === group}
                    onClick={() => jump(i)}
                  >
                    <span>{g}</span>
                    <i style={{ transform: `scaleX(${progressFor(i)})` }} />
                  </button>
                ))}
              </div>
            )}
          </header>

          {pinned ? (
            <Fragment key={`group-view-${group}`}>
              <div className="caps-line">
                <span className="caps-big">0{group + 1}</span>
                <p className="lede">{GROUP_LINES[group]}</p>
              </div>
              <CapabilityGrid group={group} />
            </Fragment>
          ) : (
            CAPABILITY_GROUPS.map((g, i) => (
              <div key={g} className="caps-block">
                <div className="caps-line">
                  <span className="caps-big">0{i + 1}</span>
                  <div>
                    <h3 className="caps-name">{g}</h3>
                    <p className="lede">{GROUP_LINES[i]}</p>
                  </div>
                </div>
                <CapabilityGrid group={i} />
              </div>
            ))
          )}

          <div className="caps-base">
            <span>Every capability draws on the same</span>
            <b>memory</b>
            <b>reasoning</b>
            <b>security</b>
          </div>
        </div>
      </div>
    </section>
  );
}
