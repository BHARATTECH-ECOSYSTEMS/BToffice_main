import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Studio } from '../gl/Studio';

/**
 * The mark as the same piece of violet glass the home film is made of, sitting in a page. Falls back to
 * nothing when WebGL is unavailable; the page reads fine without it.
 * With `entrance`, the glass grows out of a point and draws its threads in, as in the home opening.
 * With `bounce`, it hops on its floor like the home hero's logo instead of drifting.
 */
export function LogoGlass({
  background = '#F8F7F3',
  className = '',
  entrance = false,
  bounce = false,
}: {
  background?: string;
  className?: string;
  entrance?: boolean;
  bounce?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [gl, setGl] = useState(true);

  useEffect(() => {
    const cv = canvas.current!;
    let studio: Studio | null = null;
    try {
      studio = new Studio(cv, {
        shapes: [0],
        shots: [{ yaw: 0, pitch: 6 }],
        anchor: { wide: [0.5, 0.46], narrow: [0.5, 0.46] },
        bare: background,
        fill: 0.62,
      });
    } catch {
      setGl(false);
      return;
    }
    const s = studio;
    // the studio bounces the logo at beat 0 (the hero) and eases into a drift by beat 0.6
    s.setBeat(bounce ? 0 : 0.5);
    const animate = entrance && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const logo = { grow: 0, draw: 0 };
    const sync = () => s.setReveal(logo.grow, logo.draw);
    if (animate) sync();
    // an entrance plays alongside other motion, so it waits for the shaders to link off the main thread
    // rather than freezing that motion for its first frame
    const ready = entrance ? s.warm() : Promise.resolve();
    let warmed = !entrance;
    let visible = false;
    let dead = false;
    let intro: gsap.core.Timeline | null = null;
    void ready.then(() => {
      if (dead) return;
      warmed = true;
      if (visible) s.start();
      // the home opening's curves, shortened to suit a pop-up
      if (animate)
        intro = gsap
          .timeline()
          .to(logo, { grow: 1, duration: 0.95, ease: 'back.out(1.35)', onUpdate: sync })
          .to(logo, { draw: 1, duration: 1.1, ease: 'power2.inOut', onUpdate: sync }, 0.3);
    });
    const ro = new ResizeObserver(() => s.resize());
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (!visible) s.stop();
      else if (warmed) s.start();
    });
    io.observe(cv);
    return () => {
      dead = true;
      intro?.kill();
      ro.disconnect();
      io.disconnect();
      s.destroy();
    };
  }, [background, entrance, bounce]);

  return gl ? <canvas ref={canvas} className={`logo-glass ${className}`} aria-hidden="true" /> : null;
}
