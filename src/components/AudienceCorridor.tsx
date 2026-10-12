import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { HueName } from '../gl/palette';
import { toneStyle } from './ui';

/** How many cards deep the corridor is: more on wide stages, fewer on narrow ones so cards don't pile up. */
const DEPTH = 10;
const DEPTH_NARROW = 7;
const NARROW = 640;
/** How far past the near edge a card slides as it passes you, so it leaves off-stage. */
const OVERSHOOT = 0.16;
/** How far each wall's cards turn toward the vanishing point. */
const WALL_ANGLE = 68;
/** How quickly the corridor catches up with the scroll; lower glides more. */
const FOLLOW = 7;
/** While you stay put the corridor keeps gliding forward and back by up to this many cards, and each card bobs. A
 * one-way drift would carry the next audience's cards in while the panel still names the current one. */
const DRIFT = 0.5;
const DRIFT_SPEED = 0.6;
const BOB = 5;
const LOOKS = ['is-solid', 'is-ink', 'is-paper'] as const;

export interface CorridorAudience {
  name: string;
  uses: string[];
  tone: HueName;
}

interface AudienceCorridorProps {
  audiences: CorridorAudience[];
  /** 0…1 through the pinned section, written by the section's scroll handler. */
  progress: RefObject<number>;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = (a: number, b: number, rate: number, dt: number) => a + (b - a) * (1 - Math.exp(-rate * dt));

/**
 * Every audience's use cases as one corridor of cards, flown through by scrolling. Cards alternate walls and
 * come toward the viewer as the section scrolls; each audience's cards surround the viewer during its step,
 * while the next audience's are already arriving from the vanishing point. Decorative: the section lists the
 * active audience's use cases for screen readers.
 */
export function AudienceCorridor({ audiences, progress }: AudienceCorridorProps) {
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const perAudience = audiences[0]?.uses.length ?? 0;
  const total = audiences.length * perAudience;

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el || total === 0) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    // position along the corridor, in cards: card k is beside the viewer when pos === k. It stops half an
    // audience short of the end, so the last audience is still around the viewer as the section unpins.
    const target = () => Math.min((progress.current ?? 0) * total, total - perAudience / 2);
    let pos = target();
    let last = performance.now();
    let raf = 0;
    let time = 0;

    const place = () => {
      const drift = reduced ? 0 : DRIFT * Math.sin(time * DRIFT_SPEED);
      const p = width * 0.95;
      const depthCards = width < NARROW ? DEPTH_NARROW : DEPTH;
      cards.current.forEach((card, k) => {
        if (!card) return;
        // 0 beside the viewer, 1 at the far end; below 0 the card is sliding out past the edge
        const q = (k - pos - drift) / depthCards;
        const showing = q > -OVERSHOOT && q < 1;
        card.hidden = !showing;
        if (!showing) return;
        const side = k % 2 === 0 ? -1 : 1;
        // spacing widens with depth so cards that have turned toward the viewer don't stack on each other
        const depth = q > 0 ? q * q : 0;
        const z = p * (0.18 - 6 * depth);
        // the walls close in and the cards turn toward the viewer at the far end, so the walls meet in the middle
        const x = side * width * (q > 0 ? 0.33 - 0.18 * q : 0.33 - q * 1.6);
        const turn = WALL_ANGLE * (1 - 0.3 * Math.max(0, q));
        const y = reduced ? 0 : BOB * Math.sin(time * 1.1 + k * 1.7);
        card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${(-side * turn).toFixed(2)}deg)`;
        // cards arrive out of the dark at the far end and dim with distance
        const haze = 1 - 0.5 * smooth(0.15, 0.9, q);
        card.style.opacity = (haze * (1 - smooth(0.82, 0.99, q))).toFixed(3);
      });
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      time += dt;
      const goal = target();
      // Under reduced motion the corridor only moves with the scroll, so it can rest once it has caught up.
      if (reduced && Math.abs(goal - pos) < 0.0005) return;
      pos = reduced ? goal : damp(pos, goal, FOLLOW, dt);
      place();
    };

    const resize = () => {
      width = el.clientWidth;
      el.style.perspective = `${(width * 0.95).toFixed(0)}px`;
      // cards size from the width as well as the height, or a narrow stage crowds them together
      el.style.setProperty('--card-h', `${Math.min(el.clientHeight * 0.62, width * 0.36).toFixed(0)}px`);
      place();
    };

    // only follow the scroll while the corridor is on screen
    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      if (entry.isIntersecting) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    const ro = new ResizeObserver(resize);
    resize();
    io.observe(el);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [progress, total, perAudience]);

  return (
    <div className="svc-corridor" ref={stage} aria-hidden="true">
      <div className="svc-corridor__scene">
        {audiences.flatMap((a, ai) =>
          a.uses.map((use, ui) => {
            const k = ai * perAudience + ui;
            return (
              <div
                key={k}
                ref={(n) => (cards.current[k] = n)}
                className={`svc-corridor__card ${LOOKS[k % LOOKS.length]}`}
                data-tone={a.tone}
                style={toneStyle(a.tone)}
              >
                <div className="svc-corridor__top">
                  <b>{String(ui + 1).padStart(2, '0')}</b>
                  <span>{a.name}</span>
                </div>
                <p>{use}</p>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
