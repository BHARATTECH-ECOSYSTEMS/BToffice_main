import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type { HueName } from '../gl/palette';

/** How many cards deep the corridor is: more on wide stages, fewer on narrow ones so cards don't pile up. */
const DEPTH = 10;
const DEPTH_NARROW = 7;
const NARROW = 640;
/** How far past the near edge a card slides as it passes you, so it leaves off-stage. */
const OVERSHOOT = 0.16;
/** How far each wall's cards turn toward the vanishing point. */
const WALL_ANGLE = 68;
/** Stiffness of the spring that carries the corridor to the scroll; lower glides more. A spring rather than a
 * plain ease-out, so the rush to a new audience gathers speed instead of lurching off at full speed. */
const SPRING = 5;
/** Cards per second the corridor flies forward on its own, so it keeps moving while you stay put. */
const FLOW = 0.55;
/** Pointing at the corridor slows it to this, so a card can be read as it passes. */
const FLOW_HOVER = 0.12;
/** How far the vanishing point leans toward the pointer, as a share of the stage. */
const PARALLAX = 0.08;
/** Card elements reused along the corridor. A card that passes you is moved to the far end and given the
 * active audience's next use case, so the corridor never runs out. It spans the whole visible depth plus the
 * overshoot, and is even so the cards keep alternating walls when they wrap. */
const RING = 14;
/** Where the ring starts, in cards behind the viewer: just past where cards leave off-stage. */
const RING_START = -2;
const BOB = 5;
const LOOKS = ['is-solid', 'is-ink', 'is-paper'] as const;

export interface CorridorAudience {
  name: string;
  uses: string[];
  tone: HueName;
}

interface AudienceCorridorProps {
  audiences: CorridorAudience[];
  /** The audience the section is on. Only its use cases fly down the corridor. */
  active: number;
  /** 0…1 through the pinned section, written by the section's scroll handler. */
  progress: RefObject<number>;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = (a: number, b: number, rate: number, dt: number) => a + (b - a) * (1 - Math.exp(-rate * dt));
const mod = (a: number, n: number) => ((a % n) + n) % n;

/**
 * The active audience's use cases as an endless corridor of cards. Cards alternate walls and fly toward the
 * viewer on their own, looping through the audience's use cases; scrolling pushes them along faster, and
 * pointing at the corridor slows it down and leans the view toward the pointer. When the
 * section moves to another audience the corridor rushes forward a full ring, so every card on stage is
 * replaced by the new audience's. Decorative: the section lists the active audience's use cases for screen
 * readers.
 */
export function AudienceCorridor({ audiences, active, progress }: AudienceCorridorProps) {
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const activeRef = useRef(active);
  // extra cards to fly on top of the scroll, added each time the section switches audience
  const rush = useRef(0);
  const total = audiences.length * (audiences[0]?.uses.length ?? 0);

  useEffect(() => {
    if (active === activeRef.current) return;
    rush.current += active > activeRef.current ? RING : -RING;
    activeRef.current = active;
  }, [active]);

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el || total === 0) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let flow = 0;
    let speed = FLOW;
    let velocity = 0;
    let hovering = false;
    // vanishing point, 0.5 0.5 is the middle; it leans toward the pointer
    let lookX = 0.5;
    let lookY = 0.5;
    let aimX = 0.5;
    let aimY = 0.5;
    const target = () => flow + (progress.current ?? 0) * total + rush.current;
    let pos = target();
    let last = performance.now();
    let raf = 0;
    let time = 0;
    // which corridor position each card element is showing, so its content changes only when it wraps
    const shown: number[] = [];

    const fill = (card: HTMLDivElement, n: number) => {
      const a = audiences[activeRef.current] ?? audiences[0];
      const u = mod(n, a.uses.length);
      card.className = `svc-corridor__card ${LOOKS[mod(n, LOOKS.length)]}`;
      card.dataset.tone = a.tone;
      card.style.setProperty('--tone', `var(--${a.tone})`);
      const [name, use] = card.querySelectorAll('span, p');
      name.textContent = a.name;
      use.textContent = a.uses[u];
    };

    const place = () => {
      const p = width * 0.95;
      const depthCards = width < NARROW ? DEPTH_NARROW : DEPTH;
      cards.current.forEach((card, i) => {
        if (!card) return;
        // the corridor position this element stands in: the one in the ring's window that is `i` modulo RING
        const n = i + RING * Math.ceil((pos + RING_START - i) / RING);
        if (shown[i] !== n) {
          shown[i] = n;
          fill(card, n);
        }
        // 0 beside the viewer, 1 at the far end; below 0 the card is sliding out past the edge
        const q = (n - pos) / depthCards;
        const showing = q > -OVERSHOOT && q < 1;
        card.hidden = !showing;
        if (!showing) return;
        const side = mod(n, 2) === 0 ? -1 : 1;
        // spacing widens with depth so cards that have turned toward the viewer don't stack on each other
        const depth = q > 0 ? q * q : 0;
        const z = p * (0.18 - 6 * depth);
        // the walls close in and the cards turn toward the viewer at the far end, so the walls meet in the middle
        const x = side * width * (q > 0 ? 0.33 - 0.18 * q : 0.33 - q * 1.6);
        const turn = WALL_ANGLE * (1 - 0.3 * Math.max(0, q));
        // a slow swell that stays put while the cards travel through it, so neighbours rise and fall together
        const y = reduced ? 0 : BOB * Math.sin(time * 0.9 - (n - pos) * 0.55);
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
      if (reduced) {
        if (Math.abs(goal - pos) < 0.0005) return;
        pos = goal;
      } else {
        speed = damp(speed, hovering ? FLOW_HOVER : FLOW, 3, dt);
        flow += speed * dt;
        // critically damped: starts gently, never overshoots back toward the previous audience
        velocity += (SPRING * SPRING * (goal - pos) - 2 * SPRING * velocity) * dt;
        pos += velocity * dt;
        lookX = damp(lookX, aimX, 3, dt);
        lookY = damp(lookY, aimY, 3, dt);
        el.style.perspectiveOrigin = `${(lookX * 100).toFixed(2)}% ${(lookY * 100).toFixed(2)}%`;
      }
      place();
    };

    const resize = () => {
      width = el.clientWidth;
      el.style.perspective = `${(width * 0.95).toFixed(0)}px`;
      // cards size from the width as well as the height, or a narrow stage crowds them together
      el.style.setProperty('--card-h', `${Math.min(el.clientHeight * 0.62, width * 0.36).toFixed(0)}px`);
      place();
    };

    // only animate while the corridor is on screen
    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      if (entry.isIntersecting) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    const ro = new ResizeObserver(resize);
    // measured once per visit, not on every move, so pointing never forces a layout
    let r = el.getBoundingClientRect();
    const enter = () => {
      r = el.getBoundingClientRect();
    };
    const point = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      hovering = true;
      aimX = 0.5 + PARALLAX * ((e.clientX - r.left) / r.width - 0.5) * 2;
      aimY = 0.5 + PARALLAX * ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const leave = () => {
      hovering = false;
      aimX = 0.5;
      aimY = 0.5;
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointermove', point);
    el.addEventListener('pointerleave', leave);
    resize();
    io.observe(el);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointermove', point);
      el.removeEventListener('pointerleave', leave);
    };
  }, [audiences, progress, total]);

  // Content is written by the animation loop as cards wrap, so React renders only the empty shells.
  return (
    <div className="svc-corridor" ref={stage} aria-hidden="true">
      <div className="svc-corridor__scene">
        {Array.from({ length: RING }, (_, i) => (
          <div key={i} ref={(n) => (cards.current[i] = n)} className="svc-corridor__card" hidden>
            <div className="svc-corridor__top">
              <span />
            </div>
            <p />
          </div>
        ))}
      </div>
    </div>
  );
}
