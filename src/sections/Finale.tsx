import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useQuiet } from '../gl/Scene';
import { Studio } from '../gl/Studio';
import { Arrow } from '../components/ui';
import { EMAIL, HQ } from '../content';

/** The story closes where it began: the lit mark settles back into the origin. */
export function Finale() {
  const ref = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [gl, setGl] = useState(true);
  useQuiet(ref);

  useEffect(() => {
    const cv = canvas.current!;
    const compact = () => window.innerWidth <= 900;
    let studio: Studio | null = null;
    try {
      studio = new Studio(cv, {
        compact: compact(),
        shapes: [7, 0],
        shots: [
          { yaw: 4, pitch: 20 },
          { yaw: 0, pitch: 6 },
        ],
        anchor: { wide: [0.5, 0.36], narrow: [0.5, 0.3] },
      });
    } catch {
      setGl(false);
    }
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      studio?.setBeat(0.5 + p * 1.5);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    const onResize = () => {
      studio?.setCompact(compact());
      studio?.resize();
      on();
    };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? studio?.start() : studio?.stop()), { rootMargin: '10% 0px' });
    io.observe(cv);
    measure();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', onResize);
      studio?.destroy();
    };
  }, []);

  return (
    <section id="next" ref={ref} className="finale-film" data-gl={gl || undefined}>
      <div className="finale-pin">
        <canvas ref={canvas} className="story-canvas" aria-hidden="true" />
        <div className="wrap finale-copy">
          <h2 className="finale-title">
            The next era of intelligence <span>begins here.</span>
          </h2>
          <p className="finale-lede">Direct access to our research and engineering teams: joint research, fellowships and foundational deployments.</p>
          <div className="beat-actions finale-actions">
            <Link to="/contact" className="btn btn-primary btn-lg">
              Start a conversation <Arrow />
            </Link>
            <a href={`mailto:${EMAIL}`} className="btn btn-ghost btn-lg">
              {EMAIL}
            </a>
          </div>
          <p className="finale-meta">{HQ} · Made in Bharat</p>
        </div>
      </div>
    </section>
  );
}
