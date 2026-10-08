import { useEffect, useRef, useState } from 'react';
import { Studio } from '../gl/Studio';

/**
 * The mark as the same piece of violet glass the home film is made of, sitting in a page. Falls back to
 * nothing when WebGL is unavailable; the page reads fine without it.
 */
export function LogoGlass({ background = '#F8F7F3', className = '' }: { background?: string; className?: string }) {
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
    studio.setBeat(0.5);
    const ro = new ResizeObserver(() => studio?.resize());
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? studio?.start() : studio?.stop()));
    io.observe(cv);
    return () => {
      ro.disconnect();
      io.disconnect();
      studio?.destroy();
    };
  }, [background]);

  return gl ? <canvas ref={canvas} className={`logo-glass ${className}`} aria-hidden="true" /> : null;
}
