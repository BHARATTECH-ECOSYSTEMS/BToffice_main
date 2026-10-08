import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuiet, useScene } from '../gl/Scene';
import { BEATS, Studio } from '../gl/Studio';
import { Arrow } from '../components/ui';
import { PILLARS_PLAIN, PROBLEMS } from '../content';

/** Screens of scroll per beat. */
const PACE = 1;

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

const ACTS = [
  { label: 'Origin', from: 0, to: 1 },
  { label: 'The problem', from: 1, to: 5 },
  { label: 'The answer', from: 5, to: 8 },
];

/**
 * The opening of the home page: one continuous film of the logo, scrubbed by scroll. Each beat has one
 * headline that slides in from one side and leaves by the other while the scene changes behind it.
 */
export function Story() {
  const ref = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const beats = useRef<(HTMLElement | null)[]>([]);
  const rail = useRef<HTMLDivElement>(null);
  const [gl, setGl] = useState(true);
  const [current, setCurrent] = useState(0);
  const { scrollTo } = useScene();
  useQuiet(ref);

  useEffect(() => {
    const cv = canvas.current!;
    const compact = () => window.innerWidth <= 900;
    let studio: Studio | null = null;
    try {
      studio = new Studio(cv, { compact: compact() });
    } catch {
      setGl(false);
    }
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const run = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / run));
      const b = p * BEATS;
      studio?.setBeat(b);
      el.style.setProperty('--p', p.toFixed(4));
      beats.current.forEach((node, i) => {
        if (!node) return;
        // the first headline is at rest until the scroll begins
        const d = i === 0 ? Math.max(0, b - 0.5) : b - (i + 0.5);
        // fully set for most of the beat, then out quickly at the edges
        const v = i === 0 && d < 0 ? 1 : i === BEATS - 1 && d > 0 ? Math.min(1, Math.max(0, 1 - (d - 0.3) / 0.25)) : 1 - Math.min(1, Math.max(0, (Math.abs(d) - 0.3) / 0.2));
        node.style.setProperty('--d', Math.max(-1, Math.min(1, d)).toFixed(4));
        node.style.setProperty('--v', v.toFixed(4));
        node.style.visibility = v > 0.001 ? 'visible' : 'hidden';
      });
      const cur = Math.min(BEATS - 1, Math.floor(b));
      setCurrent((c) => (c === cur ? c : cur));
      if (rail.current) {
        ACTS.forEach((a, i) => rail.current!.style.setProperty(`--a${i}`, Math.min(1, Math.max(0, (b - a.from) / (a.to - a.from))).toFixed(4)));
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
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
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      studio?.destroy();
    };
  }, []);

  const jump = (beat: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollTo(top + ((beat + 0.5) / BEATS) * (el.offsetHeight - window.innerHeight));
  };

  return (
    <section id="top" ref={ref} className="story" data-gl={gl || undefined} style={{ '--beats': BEATS, '--pace': PACE } as CSSProperties}>
      {/* anchors for the nav: each sits where its chapter starts */}
      <span id="problem" className="story-anchor" style={{ '--at': 1 } as CSSProperties} />
      <span id="promise" className="story-anchor" style={{ '--at': 5 } as CSSProperties} />

      <div className="story-pin">
        <canvas ref={canvas} className="story-canvas" aria-hidden="true" />

        <div className="story-copy">
          {BEAT_COPY.map((c, i) => {
            const Tag = i === 0 ? 'h1' : 'h2';
            return (
              <article key={i} ref={(n) => (beats.current[i] = n)} className={`beat is-act-${c.act}${i === 0 ? ' is-hero' : ''}`} aria-hidden={current !== i || undefined}>
                <p className="beat-eyebrow">
                  <i />
                  {c.act === 0 ? 'Bharattech Origin · Research lab, India' : `${ACTS[c.act].label} · ${String(c.act === 1 ? i : i - 4).padStart(2, '0')}`}
                </p>
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
                      Start a conversation <Arrow />
                    </Link>
                    <Link to="/research" className="btn btn-ghost btn-lg">
                      Explore research
                    </Link>
                  </div>
                )}
                {i === BEATS - 1 && (
                  <div className="beat-actions">
                    <a href="#how" className="btn btn-ghost" onClick={(e) => (e.preventDefault(), scrollTo(document.getElementById('how') ?? 0))}>
                      See how it works <Arrow />
                    </a>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="story-cue" aria-hidden="true">
          <span>Scroll to watch it forget</span>
          <i />
        </div>

        <nav className="story-rail" ref={rail} aria-label="Story">
          {ACTS.map((a, i) => (
            <button key={a.label} type="button" className="story-act" data-on={(current >= a.from && current < a.to) || undefined} style={{ '--fill': `var(--a${i})` } as CSSProperties} onClick={() => jump(a.from)}>
              <span>{a.label}</span>
              <i />
            </button>
          ))}
          <span className="story-count">
            {String(current + 1).padStart(2, '0')} <em>/ {String(BEATS).padStart(2, '0')}</em>
          </span>
        </nav>
      </div>
    </section>
  );
}
