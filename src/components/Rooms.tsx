import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Drives the rooms (see .room in global.css): each unfolds from an inset, rounded shape to full width as its top
 * travels from the bottom of the screen to 35% down, and the page's glow takes the colour of the room in view.
 * Statements marked [data-scrub] brighten word by word as they pass up the screen.
 */
export function useRooms() {
  const { pathname } = useLocation();
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight;
      let room: string | null = null;
      document.querySelectorAll<HTMLElement>('.room').forEach((el) => {
        const r = el.getBoundingClientRect();
        const p = reduced ? 1 : Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.65)));
        el.style.setProperty('--room-p', p.toFixed(3));
        if (r.top < vh * 0.7 && r.bottom > vh * 0.3) room = el.dataset.room ?? null;
      });
      if (room) document.documentElement.dataset.room = room;
      else delete document.documentElement.dataset.room;

      document.querySelectorAll<HTMLElement>('[data-scrub]').forEach((el) => {
        const r = el.getBoundingClientRect();
        const p = reduced ? 1 : Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.85 - vh * 0.45 + r.height)));
        const words = el.querySelectorAll<HTMLElement>('.sw');
        words.forEach((w, i) => {
          const local = Math.min(1, Math.max(0, p * words.length * 1.15 - i));
          w.style.setProperty('--o', (0.18 + 0.82 * local).toFixed(2));
        });
      });
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const t = setTimeout(on, 60);
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      delete document.documentElement.dataset.room;
    };
  }, [pathname]);
}

/** A statement whose words brighten as you read down. */
export function ScrubText({ text, className, as: Tag = 'p' }: { text: string; className?: string; as?: 'p' | 'h2' | 'h3' }) {
  return (
    <Tag className={className} data-scrub="" aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="sw" aria-hidden="true">
          {w}{' '}
        </span>
      ))}
    </Tag>
  );
}
