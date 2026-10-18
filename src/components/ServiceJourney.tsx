import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './fx';
import { Arrow, BtnText } from './ui';
import { trackBox, pageScroll } from './trackBox';
import { useScene } from '../gl/Scene';
import { chapterAt, mountJourney, PHASES, STOPS, type Journey } from '../gl/journeyScene';
import type { ServiceCard, ServiceKind } from '../content';

/** Where a card sat on screen when it was opened, so the pop-up can fly out of that spot and back into it. */
export interface CardOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
  /** how far the card was turned away from the viewer, in degrees */
  turn: number;
}

export interface JourneyChapter {
  /** the index's name for this formation */
  label: string;
  content: ReactNode;
}

export const KIND_LABEL: Record<ServiceKind, string> = { service: 'Service', approach: 'How we work', sector: 'Who it is for' };
const GROUPS: { kind: ServiceKind; label: string }[] = [
  { kind: 'service', label: 'Services' },
  { kind: 'approach', label: 'How we work' },
  { kind: 'sector', label: 'Who it is for' },
];

/**
 * The Services journey (gl/journeyScene.ts does the 3D): a tall section whose three chapters of copy scroll by in
 * the normal flow while the cards travel down the page with them, from a corridor at the top, down a vertical
 * helix, into a ring at the bottom. The 3D stage sits in a full-screen layer behind the copy; its camera descends
 * as the page scrolls, so each formation arrives with its chapter. Two things stay on screen throughout: an index
 * that names the formations and jumps between them, and a focus panel that says, in plain readable type, which
 * card is in front of you and lets a visitor go straight to a group. Any card opens through `onOpen`. Under
 * reduced motion the stage holds the ring still while the copy scrolls.
 */
export const ServiceJourney = forwardRef<
  HTMLElement,
  {
    items: ServiceCard[];
    chapters: JourneyChapter[];
    openId?: string;
    onOpen: (card: ServiceCard, from: CardOrigin) => void;
  }
>(function ServiceJourney({ items, chapters, openId, onOpen }, outerRef) {
  const sectionRef = useRef<HTMLElement>(null);
  useImperativeHandle(outerRef, () => sectionRef.current!);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);
  const ringCopyRef = useRef<HTMLDivElement>(null);
  const { engine, scrollTo } = useScene();
  // one host element per card: three.js moves it in 3D, React renders the card into it through a portal
  const [hosts] = useState(() =>
    items.map(() => {
      const el = document.createElement('div');
      el.className = 'svc-card-host';
      return el;
    }),
  );
  const [focus, setFocus] = useState(0);
  const [chapter, setChapter] = useState(0);
  const [overPanel, setOverPanel] = useState(false);
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const journey = useRef<Journey | null>(null);
  const progress = useRef(0);
  // the scene holds still while a card is open, or while the visitor is reading the focus panel
  const held = !!openId || overPanel;
  useEffect(() => journey.current?.hold(held), [held]);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const stage = stageRef.current;
    const canvas = glRef.current;
    if (!section || !pin || !stage || !canvas) return;
    const j = mountJourney({ stage, canvas, hosts, reduced, onFocusCard: setFocus });
    journey.current = j;

    // The stage is stuck from the section's top until its bottom meets the section's bottom. The journey itself runs
    // until the tail: over the tail the ring holds while the page colour rises into the frame (the veil), as at the
    // end of the home hero, so the scene leaves by fading into the page instead of stopping at an edge.
    let pinH = 0;
    let tailH = 0;
    const { box, release } = trackBox(section, () => {
      pinH = pin.offsetHeight;
      tailH = tailRef.current?.offsetHeight ?? 0;
    });
    let shownVeil = -1;
    let shownSide = -1;
    let shownCopy = -1;

    let visible = true;
    let shownChapter = -1;
    const tick = () => {
      if (!visible) return;
      const scroll = pageScroll();
      const run = Math.max(1, box.height - pinH - tailH);
      const p = reduced ? 1 : Math.min(1, Math.max(0, (scroll - box.top) / run));
      progress.current = p;
      j.frame(performance.now(), p);
      // the veil rides as if fixed to the section's bottom edge, so it rises into the frame over the tail
      const left = Math.round(Math.min(pinH, Math.max(0, box.top + box.height - (scroll + pinH))));
      if (left !== shownVeil) {
        shownVeil = left;
        if (veilRef.current) veilRef.current.style.transform = `translate3d(0, ${left}px, 0)`;
      }
      // the index and focus panel step back as the veil comes up, rather than sitting on the page colour
      const side = Math.round(Math.min(1, left / Math.max(1, tailH)) * 100) / 100;
      if (side !== shownSide && sideRef.current) {
        shownSide = side;
        sideRef.current.style.opacity = String(side);
        sideRef.current.style.visibility = side < 0.02 ? 'hidden' : '';
      }
      // The closing copy scrolls up with the page over the tail, toward the ring; it is gone over the first fifth of
      // the tail, before it can cross the cards.
      const copy = Math.round(Math.min(1, Math.max(0, (left / Math.max(1, tailH) - 0.8) / 0.2)) * 100) / 100;
      if (copy !== shownCopy && ringCopyRef.current) {
        shownCopy = copy;
        ringCopyRef.current.style.opacity = String(copy);
      }
      const now = chapterAt(p);
      if (now !== shownChapter) {
        shownChapter = now;
        setChapter(now);
      }
    };

    // Drawn from the site's frame loop when there is one, right after the smooth scroll has moved the page, so the
    // scene and the page never disagree by a frame. Without WebGL the site has no loop, so it runs its own.
    let raf = 0;
    const own = () => {
      tick();
      raf = requestAnimationFrame(own);
    };
    const off = engine ? engine.onFrame(tick) : ((raf = requestAnimationFrame(own)), () => cancelAnimationFrame(raf));

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden;
    });
    io.observe(section);
    const onVisibility = () => (visible = !document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    tick();

    return () => {
      off();
      io.disconnect();
      release();
      document.removeEventListener('visibilitychange', onVisibility);
      j.destroy();
      journey.current = null;
    };
  }, [hosts, engine, reduced]);

  /** Scrolls the page to a formation (0…1 through the journey). */
  const goTo = (stop: number) => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    scrollTo(top + (section.offsetHeight - pin.offsetHeight - (tailRef.current?.offsetHeight ?? 0)) * stop);
  };

  /** Takes the visitor to the ring with card `i` at its front. */
  const bringToFront = (i: number) => {
    if (!reduced && progress.current < PHASES.onRing) goTo(1);
    journey.current?.focus(i);
  };

  const openCard = (i: number, el: HTMLElement, turn = 0) => {
    const r = el.getBoundingClientRect();
    onOpen(items[i], { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, height: r.height, turn });
  };

  const onCardClick = (i: number, button: HTMLElement) => {
    if (journey.current?.dragged()) return;
    openCard(i, button, journey.current?.turnOf(i) ?? 0);
  };

  // a keyboard visitor lands on the ring, where every card can be brought to the front and read; a mouse press
  // also focuses the card, but that click opens it where it is
  const onCardFocus = (i: number, el: HTMLElement) => {
    if (el.matches(':focus-visible')) bringToFront(i);
  };

  // the cards are memoised, so they get stable callbacks that always reach the latest handlers
  const handlers = useRef({ onCardClick, onCardFocus });
  handlers.current = { onCardClick, onCardFocus };
  const cardClick = useCallback((i: number, el: HTMLElement) => handlers.current.onCardClick(i, el), []);
  const cardFocus = useCallback((i: number, el: HTMLElement) => handlers.current.onCardFocus(i, el), []);

  const card = items[focus] ?? items[0];

  return (
    <section ref={sectionRef} className="svc-journey" data-reduced={reduced || undefined} aria-label="Services">
      <div ref={pinRef} className="svc-journey__pin">
        <div ref={stageRef} className={`svc-journey__stage ${chapter === 2 ? 'is-ring' : ''}`}>
          <canvas ref={glRef} className="svc-journey-gl" aria-hidden="true" />
        </div>
        <div className="svc-journey__shade" aria-hidden="true" />
        <div ref={veilRef} className="svc-veil" aria-hidden="true" />

        <div ref={sideRef} className="svc-side">
          {!reduced && (
            <nav className="svc-index" aria-label="Journey">
              {chapters.map((c, i) => (
                <button key={c.label} type="button" className="svc-index__stop" aria-current={chapter === i ? 'step' : undefined} onClick={() => goTo(STOPS[i])}>
                  <span className="svc-index__dot" aria-hidden="true" />
                  {c.label}
                </button>
              ))}
            </nav>
          )}

          <aside
            className="svc-focus"
            aria-label="Card in focus"
            onPointerEnter={() => setOverPanel(true)}
            onPointerLeave={() => setOverPanel(false)}
          >
            <div className="svc-focus__groups" role="group" aria-label="Go to a group">
              {GROUPS.map((g) => (
                <button
                  key={g.kind}
                  type="button"
                  className={`svc-chip is-${g.kind}`}
                  aria-pressed={card.kind === g.kind}
                  onClick={() => bringToFront(items.findIndex((s) => s.kind === g.kind))}
                >
                  <span className="svc-chip__dot" aria-hidden="true" />
                  {g.label}
                </button>
              ))}
            </div>
            <div key={card.id} className={`svc-focus__card is-${card.kind}`}>
              <h3 className="svc-focus__title">
                <span className="svc-focus__icon" aria-hidden="true">
                  <Icon name={card.icon} size={16} />
                </span>
                {card.title}
              </h3>
              <p className="svc-focus__line">{card.line}</p>
              <button type="button" className="btn btn-light svc-focus__open" onClick={(e) => openCard(focus, e.currentTarget.closest<HTMLElement>('.svc-focus__card') ?? e.currentTarget)}>
                <BtnText>Read more</BtnText> <Arrow />
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* the copy scrolls in the normal flow, over the stage; each chapter is as tall as its formation's stretch */}
      <div className="svc-chapters">
        {chapters.map((c, i) => (
          <div key={c.label} ref={i === 2 ? ringCopyRef : undefined} className={`svc-chapter is-${['tunnel', 'spiral', 'ring'][i]}`}>
            {c.content}
          </div>
        ))}
        <div ref={tailRef} className="svc-chapter is-tail" aria-hidden="true" />
      </div>

      {hosts.map((host, i) =>
        createPortal(
          <JourneyCard
            card={items[i]}
            index={i}
            lit={i === focus}
            away={items[i].id === openId}
            onClick={cardClick}
            onFocus={cardFocus}
          />,
          host,
          items[i].id,
        ),
      )}
    </section>
  );
});

/** One card in the journey. Memoised: when the focus moves, only the card losing it and the card gaining it render. */
const JourneyCard = memo(function JourneyCard({
  card,
  index,
  lit,
  away,
  onClick,
  onFocus,
}: {
  card: ServiceCard;
  index: number;
  lit: boolean;
  away: boolean;
  onClick: (i: number, el: HTMLElement) => void;
  onFocus: (i: number, el: HTMLElement) => void;
}) {
  return (
    <div className={`svc-card is-${card.kind} ${lit ? 'is-front' : ''} ${away ? 'is-away' : ''}`} style={{ '--i': index } as CSSProperties}>
      <button type="button" className="svc-card__face" onClick={(e) => onClick(index, e.currentTarget)} onFocus={(e) => onFocus(index, e.currentTarget)}>
        <CardFace card={card} />
      </button>
      <span className="svc-card__back" aria-hidden="true" />
    </div>
  );
});

/** The front of a card: in the journey, and as the front of the pop-up before it turns over. */
export function CardFace({ card }: { card: ServiceCard }) {
  return (
    <>
      <span className="svc-card__top">
        <span className="svc-card__icon" aria-hidden="true">
          <Icon name={card.icon} size={17} />
        </span>
        <span className="svc-card__kind">{KIND_LABEL[card.kind]}</span>
      </span>
      <span className="svc-card__title">{card.title}</span>
      <span className="svc-card__line">{card.line}</span>
    </>
  );
}
