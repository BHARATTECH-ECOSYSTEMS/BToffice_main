import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { isCompact, useQuiet, useScene } from '../gl/Scene';
import { BEATS, Studio } from '../gl/Studio';
import { beatUpdates } from './storyBeats';
import { Arrow, BtnText } from '../components/ui';
import { StoryOpening } from '../components/StoryOpening';
import { pageScroll, trackBox, viewHeight } from '../components/trackBox';
import { holdWarmUntil } from '../components/warmQueue';
import { isPageCovered, onPageCover } from '../components/pageCover';
import { PILLARS_PLAIN, PROBLEMS } from '../content';
import { useDocumentTheme } from '../theme';

// screens of scroll per beat (cut by a third from 1: long pins made visitors feel stuck)
const PACE = 0.67;

interface Beat {
  act: 0 | 1 | 2;
  title: string[];
  body: string;
  fact: string;
}

const BEAT_COPY: Beat[] = [
  { act: 0, title: ['Intelligence', 'should never', 'forget.'], body: 'We are building the operating system for intelligence: one shared layer that lets AI remember, connect and keep learning.', fact: '' },
  { act: 1, title: ['It forgets.'], body: PROBLEMS[0].body, fact: 'Week 3 · the 7 flagged districts are gone' },
  { act: 1, title: ['It is', 'fragmented.'], body: PROBLEMS[1].body, fact: 'Three tools · nothing shared' },
  { act: 1, title: ['It stops', 'learning.'], body: PROBLEMS[2].body, fact: 'Frozen at training time' },
  { act: 1, title: ['It works', 'alone.'], body: PROBLEMS[3].body, fact: '0 of 3 connections made' },
  { act: 2, title: ['It', 'remembers.'], body: PILLARS_PLAIN[0].body, fact: 'The memory thread returns, whole' },
  { act: 2, title: ['It', 'connects.'], body: PILLARS_PLAIN[1].body, fact: 'Three tools · one shared memory' },
  { act: 2, title: ['It keeps', 'learning.'], body: PILLARS_PLAIN[2].body, fact: 'Every use feeds the origin' },
];

/**
 * The opening of the home page: one continuous film of the logo, scrubbed by scroll. Each beat has one
 * headline that slides in from one side and leaves by the other while the scene changes behind it.
 */
export function Story() {
  const ref = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const beats = useRef<(HTMLElement | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const { scrollTo } = useScene();
  useQuiet(ref);
  // the opening runs before the studio exists, so its hold on the logo is kept here and handed over on creation
  const studioRef = useRef<Studio | null>(null);
  const reveal = useRef({ grow: 1, draw: 1 });
  const onReveal = useCallback((grow: number, draw: number) => {
    reveal.current = { grow, draw };
    studioRef.current?.setReveal(grow, draw);
  }, []);
  const hero = useCallback(() => beats.current[0], []);
  const theme = useDocumentTheme();

  useEffect(() => {
    const cv = canvas.current!;
    const compact = isCompact;
    let studio: Studio | null = null;
    try {
      studio = new Studio(cv, { compact: compact() });
      studio.setReveal(reveal.current.grow, reveal.current.draw);
      studioRef.current = studio;
    } catch {
      /* no WebGL: the DOM headlines still carry the film */
    }
    let raf = 0;
    // the section's cached position, so the per-frame update never forces a layout
    const { box, release } = trackBox(ref.current!);
    let lastP = -1;
    const shown: (boolean | undefined)[] = [];
    const measure = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const run = Math.max(1, box.height - viewHeight());
      const p = Math.min(1, Math.max(0, (pageScroll() - box.top) / run));
      // past the film the progress stays pinned at 0 or 1: nothing to redraw
      if (p === lastP) return;
      lastP = p;
      // the veil rides as if fixed to the section's bottom edge, so it rises into the frame over the last stretch
      if (veil.current) veil.current.style.transform = `translate3d(0, ${Math.min(viewHeight(), (1 - p) * run).toFixed(1)}px, 0)`;
      const b = p * BEATS;
      studio?.setBeat(b);
      // only the headlines on screen (or just leaving it) are restyled: all eight each frame cost ~8 ms
      beatUpdates(b, BEATS, shown).forEach(({ i, d, v, visible }) => {
        const node = beats.current[i];
        if (!node) return;
        node.style.setProperty('--d', d.toFixed(4));
        node.style.setProperty('--v', v.toFixed(4));
        node.style.visibility = visible ? 'visible' : 'hidden';
      });
      const cur = Math.min(BEATS - 1, Math.floor(b));
      setCurrent((c) => (c === cur ? c : cur));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(() => measure());
    };
    const onResize = () => {
      studio?.setCompact(compact());
      studio?.resize();
      onScroll();
    };
    // only run the film while it is on screen, and once its shaders have linked off the main thread: linked on the
    // first frame, the glass froze the page for seconds while the opening played. The canvas fades in when ready.
    let visible = false;
    let warmed = false;
    let dead = false;
    // ...and not while a window (the sign-in pop-up) covers the page: drawing behind it held that window's own glass
    // logo at ~30 fps
    const play = () => {
      if (visible && warmed && !isPageCovered()) studio?.start();
      else studio?.stop();
    };
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        play();
      },
      { rootMargin: '10% 0px' }
    );
    io.observe(cv);
    const offCover = onPageCover(play);
    const warming = studio?.warm().then(() => {
      if (dead) return;
      warmed = true;
      cv.dataset.ready = '';
      play();
    });
    // the page's other 3D builds wait their turn, so the hero's shaders get the compile threads to themselves
    if (warming) holdWarmUntil(warming);
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      dead = true;
      io.disconnect();
      offCover();
      release();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      studio?.destroy();
      studioRef.current = null;
    };
    // the studio reads the theme once when built, so a theme change builds it again
  }, [theme]);

  return (
    <section id="top" ref={ref} className="story" style={{ '--beats': BEATS, '--pace': PACE } as CSSProperties}>
      {/* anchors for the nav: each sits where its chapter starts */}
      <span id="problem" className="story-anchor" style={{ '--at': 1 } as CSSProperties} />
      <span id="promise" className="story-anchor" style={{ '--at': 5 } as CSSProperties} />

      <div className="story-pin">
        <canvas ref={canvas} className="story-canvas" aria-hidden="true" />
        <div ref={veil} className="story-veil" aria-hidden="true" />

        <div className="story-copy">
          {BEAT_COPY.map((c, i) => {
            const Tag = i === 0 ? 'h1' : 'h2';
            return (
              <article key={i} ref={(n) => (beats.current[i] = n)} className={`beat is-act-${c.act}${i === 0 ? ' is-hero' : ''}`} aria-hidden={current !== i || undefined}>
                <Tag className="beat-title">
                  {c.title.map((line, k) => (
                    <span key={k} className="beat-line" style={{ '--k': k } as CSSProperties}>
                      <span>{line}</span>
                    </span>
                  ))}
                </Tag>
                <p className="beat-body">{c.body}</p>
                {c.fact && (
                  <p className="beat-fact">
                    <b />
                    {c.fact}
                  </p>
                )}
                {i === 0 && (
                  <div className="beat-actions">
                    <Link to="/contact" className="btn btn-primary btn-lg">
                      <BtnText>Start a conversation</BtnText> <Arrow />
                    </Link>
                    <Link to="/research" className="btn btn-ghost btn-lg">
                      <BtnText>Explore research</BtnText>
                    </Link>
                  </div>
                )}
                {i === BEATS - 1 && (
                  <div className="beat-actions">
                    <a href="#how" className="btn btn-ghost" onClick={(e) => (e.preventDefault(), scrollTo(document.getElementById('how') ?? 0))}>
                      <BtnText>See how it works</BtnText> <Arrow />
                    </a>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* after the copy, so the hero's elements (and their refs) exist when the opening takes hold of them */}
        <StoryOpening hero={hero} onReveal={onReveal} />
      </div>
    </section>
  );
}
