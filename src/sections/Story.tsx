import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { isCompact, useQuiet, useScene } from '../gl/Scene';
import { BEATS, Studio } from '../gl/Studio';
import { Arrow, BtnText } from '../components/ui';
import { StoryOpening } from '../components/StoryOpening';
import { pageScroll, trackBox } from '../components/trackBox';
import { PILLARS_PLAIN, PROBLEMS } from '../content';

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
  { act: 1, title: ['It stops', 'learning.'], body: PROBLEMS[2].body, fact: PROBLEMS[2].caption },
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
  const [gl, setGl] = useState(true);
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

  useEffect(() => {
    const cv = canvas.current!;
    const compact = isCompact;
    let studio: Studio | null = null;
    try {
      studio = new Studio(cv, { compact: compact() });
      studio.setReveal(reveal.current.grow, reveal.current.draw);
      studioRef.current = studio;
    } catch {
      setGl(false);
    }
    let raf = 0;
    // the section's cached position, so the per-frame update never forces a layout
    const { box, release } = trackBox(ref.current!);
    let lastP = -1;
    const measure = (force = false) => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const run = Math.max(1, box.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, (pageScroll() - box.top) / run));
      // past the film the progress stays pinned at 0 or 1: nothing to redraw
      if (p === lastP && !force) return;
      lastP = p;
      // the veil rides as if fixed to the section's bottom edge, so it rises into the frame over the last stretch
      if (veil.current) veil.current.style.transform = `translate3d(0, ${Math.min(window.innerHeight, (1 - p) * run).toFixed(1)}px, 0)`;
      const b = p * BEATS;
      studio?.setBeat(b);
      beats.current.forEach((node, i) => {
        if (!node) return;
        // The first headline is at rest until the scroll begins. The last one stays settled once it arrives and
        // leaves by scrolling away with the page: fading it here left it stuck half-faded as the frame let go.
        const d = i === 0 ? Math.max(0, b - 0.5) : i === BEATS - 1 ? Math.min(0, b - (i + 0.5)) : b - (i + 0.5);
        // fully set for most of the beat, then out quickly at the edges
        const v = 1 - Math.min(1, Math.max(0, (Math.abs(d) - 0.3) / 0.2));
        node.style.setProperty('--d', Math.max(-1, Math.min(1, d)).toFixed(4));
        node.style.setProperty('--v', v.toFixed(4));
        node.style.visibility = v > 0.001 ? 'visible' : 'hidden';
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
    // only run the film while it is on screen
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? studio?.start() : studio?.stop()), { rootMargin: '10% 0px' });
    io.observe(cv);
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      io.disconnect();
      release();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      studio?.destroy();
      studioRef.current = null;
    };
  }, []);

  return (
    <section id="top" ref={ref} className="story" data-gl={gl || undefined} style={{ '--beats': BEATS, '--pace': PACE } as CSSProperties}>
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
