import { useEffect, useRef, type CSSProperties } from 'react';
import { fitTo, poseAt, useFormation, useScene, WIDE_QUERY } from '../gl/Scene';
import { GLOBE_SIZE, type Target } from '../gl/Engine';
import { headingPoints } from '../gl/headingPoints';
import { clamp01, smooth01 as smooth } from '../gl/ink';
import { Headline, Reveal } from '../components/ui';
import { Icon, type IconName } from '../components/fx';
import { pageScroll, trackBox } from '../components/trackBox';
import { warmWhenQuiet } from '../components/warmQueue';
import { NETWORK } from '../content';

const ICONS: IconName[] = ['shield', 'cloud', 'globe'];

/*
 * The globe's ride, as shares of it: 0 when the globe reaches the middle of the screen, 1 when the next
 * heading does. It holds whole, its body dissolves to leave its dots, the dots pour into the heading's letters
 * as the heading rises, and at the end hand over to the real heading.
 */
const HOLD = 0.28;
const BREAK = 0.12;
const SETTLED = 0.92;

/** Centres in page pixels, measured on layout changes only: each frame places everything from scroll alone. */
interface Ride {
  stageX: number;
  stageY: number;
  stagePx: number;
  headX: number;
  headY: number;
  riding: boolean;
}

const progressOf = (r: Ride, y: number) => clamp01((y + window.innerHeight / 2 - r.stageY) / (r.headY - r.stageY));

/**
 * The mark becomes a planet: India in violet, routes of light out to the world. Scrolling on, the globe comes
 * apart into its dots, which pour into the next heading (`landOn`) and become its letters.
 *
 * The globe and its dots are drawn by the shared scene, which the page's frame loop runs after the smooth scroll
 * has moved the page. Every pose here is computed from that frame's scroll and placed exactly, and the dots'
 * flight is worked out on the GPU from a handful of numbers, so the animation and the page move as one.
 */
export function Network({ landOn }: { landOn?: string }) {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const spin = useRef(0);
  const ride = useRef<Ride | null>(null);
  const head = useRef<HTMLElement | null>(null);
  const shown = useRef('');
  const { engine } = useScene();
  // the globe's light and shaders, built at a quiet moment ahead of the deck's worlds, as the globe arrives first
  useEffect(() => (engine ? warmWhenQuiet(() => void engine.warm(), true) : undefined), [engine]);

  // the real heading stays hidden while the dots are its letters, and takes over as they finish
  const showHeading = (r: Ride | null) => {
    const el = head.current;
    if (!el) return;
    const value = r?.riding ? smooth(clamp01((progressOf(r, pageScroll()) - SETTLED) / (1 - SETTLED))).toFixed(3) : '';
    if (value === shown.current) return;
    shown.current = value;
    el.style.opacity = value;
  };

  const where = (): Target => {
    const r = ride.current;
    if (!r) return { key: 'globe', pose: fitTo(stage.current, GLOBE_SIZE, 0.95), spin: spin.current, follow: Infinity };
    const y = pageScroll();
    const onStage = r.stageY - y;
    if (!r.riding) return { key: 'globe', pose: poseAt(r.stageX, onStage, r.stagePx, GLOBE_SIZE, 0.95), spin: spin.current, follow: Infinity };
    const p = progressOf(r, y);
    const broken = smooth(clamp01((p - HOLD) / BREAK));
    const merged = smooth(clamp01((p - SETTLED) / (1 - SETTLED)));
    return {
      key: 'globe',
      // it scrolls in like the page, then holds at the middle of the screen while it comes apart
      pose: poseAt(r.stageX, Math.max(onStage, window.innerHeight / 2), r.stagePx, GLOBE_SIZE, 0.95),
      spin: spin.current,
      labels: 1 - smooth(clamp01(p / HOLD)),
      shadow: 1 - broken,
      fade: 1 - broken,
      dust: { progress: clamp01((p - HOLD) / (SETTLED - HOLD)), at: [r.headX, r.headY - y], break: broken, show: 1 - merged },
      follow: Infinity,
    };
  };
  useFormation(ref, where, (p) => {
    spin.current = -0.4 + p * 1.2;
  });
  // the ride runs below the section: this keeps the globe the scene's subject until the heading has its letters.
  // Every registered element hears every scroll, so the heading's own fade is kept in step from here too.
  useFormation(track, where, () => showHeading(ride.current));

  useEffect(() => {
    const stageEl = stage.current;
    const trackEl = track.current;
    if (!stageEl || !trackEl) return;
    const headEl = landOn ? document.querySelector<HTMLElement>(landOn) : null;
    head.current = headEl;
    // desktop only: stacked on a phone the globe keeps to its own place
    const wide = window.matchMedia(WIDE_QUERY);
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    let onStage: ReturnType<typeof trackBox> | null = null;
    let onHead: ReturnType<typeof trackBox> | null = null;
    let fontsReady = false;
    let sampledFor = '';

    // the letters the dots settle into, from the heading as it is actually set (sampled again if it reflows)
    const sample = () => {
      const r = ride.current;
      if (!engine || !headEl || !r?.riding || !fontsReady) return;
      const key = `${r.headX}|${headEl.offsetWidth}|${headEl.offsetHeight}`;
      if (key === sampledFor) return;
      const pts = headingPoints(headEl);
      if (!pts) return;
      sampledFor = key;
      engine.setDust(pts.to, pts.color, pts.size);
    };

    const measure = () => {
      if (!onStage) return;
      const s = stageEl.getBoundingClientRect();
      const h = headEl?.getBoundingClientRect();
      const riding = !!onHead && !!h && wide.matches && !calm.matches;
      const r: Ride = {
        stageX: s.left + s.width / 2,
        stageY: onStage.box.top + onStage.box.height / 2,
        stagePx: Math.min(s.width, s.height),
        headX: h ? h.left + h.width / 2 : 0,
        headY: onHead ? onHead.box.top + onHead.box.height / 2 : 0,
        riding,
      };
      ride.current = r;
      trackEl.style.height = riding ? `${r.headY + window.innerHeight * 0.1 - onStage.box.top}px` : '0px';
      showHeading(r);
      sample();
    };
    onStage = trackBox(stageEl, measure);
    if (headEl) onHead = trackBox(headEl, measure);
    measure();
    let live = true;
    document.fonts.ready.then(() => {
      if (!live) return;
      fontsReady = true;
      sample();
    });
    wide.addEventListener('change', measure);
    calm.addEventListener('change', measure);
    return () => {
      live = false;
      onStage?.release();
      onHead?.release();
      wide.removeEventListener('change', measure);
      calm.removeEventListener('change', measure);
      ride.current = null;
      if (headEl) headEl.style.opacity = '';
      shown.current = '';
    };
  }, [landOn, engine]);

  return (
    <section id="network" ref={ref} className="section">
      <div className="wrap network-grid">
        <div className="network-visual">
          <div className="network-stage" ref={stage} aria-hidden="true" />
          <div className="network-ride" ref={track} aria-hidden="true" />
        </div>
        <div>
          <Headline tone="saffron" lines={['Built in Bharat.', 'For the world.']} />
          <Reveal as="p" className="lede" delay={100}>
            The core of Origin lives in India, and reaches every region it serves: from national data centres to the devices people carry.
          </Reveal>
          <div className="network-cells">
            {NETWORK.map((n, i) => (
              <Reveal key={n.title} className="cell cell-row" style={{ '--tone': `var(--${n.tone})` } as CSSProperties} delay={140 + i * 80}>
                <span className="icon-tile">
                  <Icon name={ICONS[i]} />
                </span>
                <div>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
