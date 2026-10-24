import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Arrow, BtnText } from '../ui';
import { trackBox, pageScroll } from '../trackBox';
import { useQuiet, useScene } from '../../gl/Scene';
import { mountSwarm, type Swarm } from '../../gl/research/swarm';
import { LAST, sideOf } from '../../gl/research/path';
import { PixelReveal } from './PixelReveal';
import { DOMAINS, TECHNOLOGY } from '../../content';

const LEDE = 'Six connected research domains. One shared ambition: intelligence that learns, remembers and reasons across the digital and physical world.';
// a stop's copy rises in once its screen is a little under half way up the window
const COPY_LEAD = 0.6;
const WHERE_WE_WORK = DOMAINS.length + 2;

// The team's figures under the opening (e.g. { value: '40+', label: 'researchers and engineers' }). Empty until the
// company gives real ones: the earlier three were made up, and the row only shows when there are figures.
const PROOF: { value: string; label: string }[] = [];

/** Which side of the stage a stop's copy takes, so the stage can darken the swarm behind it. */
const copySide = (stop: number) => (stop === 0 || stop === LAST ? 'none' : stop === 1 || stop === WHERE_WE_WORK ? 'both' : sideOf(stop) > 0 ? 'left' : 'right');

/** Each domain's headline: a line on what it is for, its distinctive words in the accent colour. */
const DOMAIN_LINES: ReactNode[][] = [
  [<>An intelligence</>, <>that keeps <em>learning.</em></>],
  [<>Many systems.</>, <>One <em>intelligence.</em></>],
  [<>Beyond the screen.</>, <>Into the <em>physical world.</em></>],
  [<>Understanding Earth,</>, <>one <em>signal</em> at a time.</>],
  [<><em>Trust,</em> built into</>, <>every decision.</>],
  [<>A smaller footprint.</>, <>A <em>wider reach.</em></>],
];

/** Lines that rise into view through a mask; `--i` staggers them. */
function Lines({ lines }: { lines: ReactNode[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className="ra-line" style={{ '--i': i } as CSSProperties}>
          <span>{line}</span>
          {i < lines.length - 1 && ' '}
        </span>
      ))}
    </>
  );
}

type Phase = 'on' | 'next';

/** One stop's screen of copy: its lines rise in as it arrives, and it then scrolls away with the page. */
function Scene({ phase, className, children }: { phase: Phase; className: string; children: ReactNode }) {
  return (
    <div className={`ra-scene ${className}`} data-phase={phase}>
      {children}
    </div>
  );
}

/**
 * The Research page on desktop: one swarm of points that is the intelligence itself (gl/research/swarm.ts). It is the
 * hero's 3D word, then re-forms as each domain's object as the visitor scrolls. The stage is pinned and the copy
 * scrolls over it, a screen per stop (the hero, our research, one per domain, where we work, the closer); the scroll
 * through those screens is the one value the camera and the swarm follow.
 */
export function ResearchStory({ onFail }: { onFail: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const startsAt = useRef<number[]>([]);
  const { engine, scrollTo } = useScene();
  useQuiet(sectionRef);
  const [stop, setStop] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const canvas = canvasRef.current;
    if (!section || !pin || !canvas) return;
    // Arriving from another page, the scene is built once the nav's page-change sweep has played and the page is
    // idle, as on Services. Opened directly, it builds at once.
    let stopAll: (() => void) | undefined;
    let idle = 0;
    let left = false;
    const sweeping = !!document.querySelector('.route-sweep.is-running');
    const fail = (error: unknown) => {
      console.warn('Research swarm unavailable; showing the plain Research page.', error);
      onFail();
    };
    const build = () => {
      let swarm: Swarm;
      try {
        swarm = mountSwarm({ canvas, stage: pin, lite: document.documentElement.classList.contains('lite') });
      } catch (error) {
        return fail(error);
      }
      stopAll = () => swarm.destroy();
      // the shaders link in the background, so the page keeps scrolling while they do
      swarm
        .warm()
        .then(() => {
          if (left) return;
          stopAll = start(section, canvas, swarm);
        })
        .catch((error) => {
          swarm.destroy();
          if (!left) fail(error);
        });
    };
    const soon = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(build, { timeout: 400 });
      else build();
    }, sweeping ? 700 : 0);
    return () => {
      left = true;
      window.clearTimeout(soon);
      if (idle) window.cancelIdleCallback(idle);
      stopAll?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  const start = (section: HTMLElement, canvas: HTMLCanvasElement, swarm: Swarm) => {
    // The first draw uses the shaders, and a GPU that can't compile them throws here. It is drawn before anything is
    // registered, so a failure leaves nothing behind: once left on the engine's frame loop, the failing frame threw
    // on every frame after, which stopped the loop and with it the smooth scroll on every page from then on.
    swarm.frame(performance.now(), 0);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      onFail();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    // where each stop's screen begins, in page scroll; measured on resize, never per frame
    let tracked: { top: number } | null = null;
    let heights: number[] = [];
    const measure = () => {
      const screens = flowRef.current?.children;
      if (!tracked || !screens) return;
      const top = tracked.top;
      startsAt.current = Array.from(screens, (el) => top + (el as HTMLElement).offsetTop);
      heights = Array.from(screens, (el) => (el as HTMLElement).offsetHeight);
    };
    const { box, release } = trackBox(section, measure);
    tracked = box;
    measure();

    const stopAt = (scroll: number) => {
      const a = startsAt.current;
      if (!a.length || scroll <= a[0]) return 0;
      // by the screens actually on the page, so a stop without its screen yet never makes the story jump
      for (let i = 0; i < a.length - 1; i++) if (scroll < a[i + 1]) return i + (scroll - a[i]) / Math.max(1, heights[i]);
      return Math.min(LAST, a.length - 1 + (scroll - a[a.length - 1]) / Math.max(1, heights[a.length - 1]));
    };

    let shownStop = -1;
    let shownReady = false;
    let shownRing = -1;
    let shownOut = -1;
    let onScreen = true;
    let visible = true;
    const tick = () => {
      if (!visible) return;
      const s = stopAt(pageScroll());
      swarm.frame(performance.now(), s);
      const current = Math.min(LAST, Math.floor(s + COPY_LEAD));
      if (current !== shownStop) {
        shownStop = current;
        setStop(current);
      }
      // The hero's copy gives way as the camera starts its flight into the word: scrolling up at the page's pace, it
      // would otherwise cross the growing letters (research.css, .ra-hero).
      // Set on the hero's own screen, not the section, so each step restyles only the hero.
      const x = Math.min(1, Math.max(0, s / 0.1));
      const out = Math.round(x * x * (3 - 2 * x) * 100) / 100;
      const hero = flowRef.current?.firstElementChild as HTMLElement | null | undefined;
      if (hero && out !== shownOut) {
        shownOut = out;
        hero.style.setProperty('--hero-out', String(out));
        hero.toggleAttribute('data-gone', out > 0.5);
      }
      if (!shownReady && swarm.ready()) {
        shownReady = true;
        setReady(true);
      }
      // the section ring fills as the story goes
      const ring = Math.round((s / LAST) * 200) / 200;
      if (ring !== shownRing && ringRef.current) {
        shownRing = ring;
        ringRef.current.style.strokeDashoffset = String(1 - ring);
      }
    };

    let raf = 0;
    const own = () => {
      tick();
      raf = requestAnimationFrame(own);
    };
    const off = engine ? engine.onFrame(tick) : ((raf = requestAnimationFrame(own)), () => cancelAnimationFrame(raf));
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      visible = onScreen && !document.hidden;
    });
    io.observe(section);
    const onVisibility = () => (visible = onScreen && !document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    tick();

    return () => {
      off();
      io.disconnect();
      release();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      swarm.destroy();
    };
  };

  // also on focus: the actions stay in the tab order, and a keyboard visitor's focus brings their screen into view
  const goTo = (i: number) => {
    const a = startsAt.current[i];
    if (a !== undefined) scrollTo(a);
  };

  // the hero's copy waits for the first frame of the stage; every other screen's copy rises in as it arrives
  const phaseOf = (i: number): Phase => (i > stop || (i === 0 && !ready) ? 'next' : 'on');
  const where = stop === 0 ? 'Scroll down' : stop === 1 ? 'Our research' : stop - 2 < DOMAINS.length ? DOMAINS[stop - 2].name : stop === WHERE_WE_WORK ? 'Where we work' : 'Collaborate';

  return (
    <section ref={sectionRef} className="ra" aria-label="Research" data-ready={ready || undefined}>
      <div ref={pinRef} className="ra__pin" data-copy={copySide(stop)}>
        <canvas ref={canvasRef} className="ra__gl" aria-hidden="true" />
        {/* a soft vignette and a fine, still grain over the stage, as a lens and a print would add */}
        <div className="ra__finish" aria-hidden="true" />

        {/* where you are: the section's name and a ring that fills through the story */}
        <div className="ra-where" aria-hidden="true" data-opening={stop === 0 || undefined}>
          <svg className="ra-where__ring" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" pathLength={1} />
            <circle ref={ringRef} cx="12" cy="12" r="10" pathLength={1} />
          </svg>
          <span key={where} className="ra-where__label">
            {where}
          </span>
        </div>
      </div>

      {/* the page's copy, one screen per stop, scrolling over the pinned stage as in the reference */}
      <div ref={flowRef} className="ra__flow">
        <Scene phase={phaseOf(0)} className="ra-hero">
          <h1 className="ra-title ra-title--hero">
            <Lines lines={[<>Researching the <em>next</em></>, <><em>generation</em> of</>]} />
            <span className="sr-only"> intelligence.</span>
          </h1>
          <div className="ra-actions">
            <button type="button" className="btn btn-primary ra-hot" onClick={() => goTo(1)} onFocus={() => goTo(0)}>
              <BtnText>Explore our research</BtnText>
              <span className="ra-hot__arrow">
                <Arrow />
              </span>
            </button>
            <Link to="/contact" className="btn btn-ghost ra-soft" onFocus={() => goTo(0)}>
              <BtnText>Collaborate</BtnText>
            </Link>
          </div>
          <p className="ra-note ra-hero__note">{LEDE}</p>
        </Scene>

        <Scene phase={phaseOf(1)} className="ra-section ra-statement">
          <div className="ra-section__lead">
            <h2 className="ra-title ra-title--statement">
              <PixelReveal active={phaseOf(1) === 'on'}>
                <Lines lines={[
                  <>Intelligence should do</>,
                  <>more than respond.</>,
                  <>It should <em>learn.</em></>,
                  <><em>Remember.</em> Reason.</>,
                  <>And grow with the world.</>,
                ]} />
              </PixelReveal>
            </h2>
          </div>
          <div className="ra-section__side">
            <p className="ra-note">Our programmes explore different parts of the same question. How can specialised systems share knowledge, preserve context and work as one?</p>
            <button type="button" className="ra-text-link" onClick={() => goTo(2)} onFocus={() => goTo(1)}>
              Explore the six domains <Arrow />
            </button>
            {PROOF.length > 0 && (
              <ul className="ra-proof">
                {PROOF.map((p, i) => (
                  <li key={p.label} style={{ '--i': i } as CSSProperties}>
                    <strong>{p.value}</strong>
                    <span>{p.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Scene>

        {DOMAINS.map((d, i) => (
          <Scene key={d.id} phase={phaseOf(i + 2)} className={`ra-section ra-domain ra-domain--${sideOf(i + 2) > 0 ? 'left' : 'right'}`}>
            <div className="ra-copy">
              <h2 className="ra-title">
                <PixelReveal active={phaseOf(i + 2) === 'on'}>
                  <Lines lines={DOMAIN_LINES[i]} />
                </PixelReveal>
              </h2>
              <p className="ra-byline">
                <strong>{d.name}</strong>
                <span>{d.field}</span>
              </p>
              <p className="ra-note">{d.body}</p>
              <ul className="ra-list" aria-label={`${d.name} research focus`}>
                {d.focus.map((f, k) => (
                  <li key={f} style={{ '--i': k } as CSSProperties}>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </Scene>
        ))}

        <Scene phase={phaseOf(WHERE_WE_WORK)} className="ra-section ra-end">
          <div className="ra-section__lead">
            <h2 className="ra-title">
              <PixelReveal active={phaseOf(WHERE_WE_WORK) === 'on'}>
                <Lines lines={[<>Different fields.</>, <><em>Shared</em> possibilities.</>]} />
              </PixelReveal>
            </h2>
          </div>
          <div className="ra-section__side">
            <p className="ra-note">From foundational models to the systems around us. Explore the fields that connect our research.</p>
            <ul className="ra-list ra-list--fields" aria-label="Fields of research">
              {TECHNOLOGY.map((t, i) => (
                <li key={t} style={{ '--i': i } as CSSProperties}>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </Scene>

        {/* the closer: the hero's line again, closing the story, above the one thing to do next */}
        <Scene phase={phaseOf(LAST)} className="ra-closer">
          <h2 className="ra-title ra-closer__line">
            <PixelReveal active={phaseOf(LAST) === 'on'}>
              <Lines lines={[<>Researching the <em>next</em></>, <><em>generation</em> of intelligence.</>]} />
            </PixelReveal>
          </h2>
          <Link to="/contact" className="btn btn-primary ra-hot ra-cta" onFocus={() => goTo(LAST)}>
            <BtnText>Propose a collaboration</BtnText>
            <span className="ra-hot__arrow">
              <Arrow />
            </span>
          </Link>
        </Scene>
      </div>
    </section>
  );
}
