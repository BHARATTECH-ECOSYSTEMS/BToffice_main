import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion, type Transition } from 'motion/react';
import { CardFace, type CardOrigin } from './ServiceJourney';
import { Arrow, BtnText } from './ui';
import { useScene } from '../gl/Scene';
import type { ServiceCard } from '../content';

/** The reading panel's width; the card starts at its own width, so it is scaled from that. */
const PANEL_W = 680;
// the card turns over while it is still travelling, so it lands already open
const FLY: Transition = { type: 'spring', duration: 0.85, bounce: 0.16 };
const TURN: Transition = { type: 'spring', duration: 0.6, bounce: 0.12 };
const BACK: Transition = { type: 'spring', duration: 0.5, bounce: 0 };

/**
 * A service, opened from the ring: the card leaves its place, flies to the middle of the screen growing as it
 * comes, and turns over to show the full description on its back. Closing plays the same path in reverse and
 * drops it back into its slot. A modal <dialog> brings Esc, a focus trap and an inert page; the page stops
 * scrolling behind it. Under reduced motion the panel simply fades in place.
 */
export function ServiceDialog({ card, from, onClose }: { card: ServiceCard; from: CardOrigin; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [closing, setClosing] = useState(false);
  const reduce = useReducedMotion();
  const { lenis } = useScene();

  useEffect(() => {
    const d = dialog.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    d.showModal();
    closeBtn.current?.focus({ preventScroll: true });
    lenis?.stop();
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = overflow;
      lenis?.start();
      if (d.open) d.close();
      opener?.focus({ preventScroll: true });
    };
  }, [lenis]);

  const close = () => setClosing(true);

  // the panel sits in the middle of the screen; it starts where the card was, at the card's size and turn
  const scale = Math.min(1, from.width / Math.min(PANEL_W, window.innerWidth * 0.92));
  const away = `translate(${from.x - window.innerWidth / 2}px, ${from.y - window.innerHeight / 2}px) scale(${scale})`;
  const home = 'translate(0px, 0px) scale(1)';
  const cardTurn = `rotateY(${from.turn}deg)`;

  return (
    <dialog
      ref={dialog}
      className="svc-dialog"
      aria-labelledby={`svc-${card.id}-title`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
      // Esc closes through the same animation; without this the browser may close the dialog at once
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
        }
      }}
    >
      <motion.div
        className="svc-dialog__scrim"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: closing ? 0.3 : 0.4, ease: [0.23, 1, 0.32, 1] }}
        onClick={close}
      />
      <motion.div
        className={`svc-dialog__fly is-${card.kind}`}
        // the card face inside is drawn at the panel's size, so its type grows by the inverse of the start scale
        style={{ '--up': 1 / scale } as CSSProperties}
        initial={reduce ? { opacity: 0, transform: 'scale(0.97)' } : { transform: away }}
        animate={reduce ? { opacity: closing ? 0 : 1, transform: 'scale(1)' } : { transform: closing ? away : home }}
        transition={reduce ? { duration: 0.2, ease: [0.23, 1, 0.32, 1] } : closing ? BACK : FLY}
        onAnimationComplete={() => closing && onClose()}
      >
        <motion.div
          className="svc-dialog__turn"
          initial={reduce ? false : { transform: cardTurn }}
          animate={reduce ? undefined : { transform: closing ? cardTurn : 'rotateY(180deg)' }}
          transition={closing ? BACK : TURN}
        >
          {!reduce && (
            <div className={`svc-dialog__front svc-card is-${card.kind} is-front`} aria-hidden="true">
              <span className="svc-card__face">
                <CardFace card={card} />
              </span>
            </div>
          )}
          <div className={`svc-dialog__back ${reduce ? 'is-flat' : ''}`}>
            <motion.div
              className="svc-dialog__body"
              initial="out"
              animate={closing ? 'out' : 'in'}
              variants={{
                in: { transition: { staggerChildren: 0.05, delayChildren: reduce ? 0 : 0.42 } },
                out: { transition: { duration: 0.1 } },
              }}
            >
              <Rise>
                <h2 id={`svc-${card.id}-title`} className="svc-dialog__title">
                  {card.title}
                </h2>
                <p className={`svc-dialog__kind is-${card.kind}`}>{card.kind === 'service' ? 'Service' : card.kind === 'approach' ? 'How we work' : 'Who it is for'}</p>
              </Rise>
              <Rise>
                <p className="svc-dialog__summary">{card.summary}</p>
              </Rise>
              <Rise>
                <h3 className="svc-dialog__label">{card.kind === 'sector' ? 'Services that fit' : card.kind === 'approach' ? 'What that means' : 'What you get'}</h3>
                <ul className="svc-dialog__points">
                  {card.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </Rise>
              {card.steps && (
                <Rise>
                  <h3 className="svc-dialog__label">How it runs</h3>
                  <ol className="svc-dialog__steps">
                    {card.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </Rise>
              )}
              <Rise className="svc-dialog__actions">
                <Link to="/contact" className="btn btn-primary" onClick={close}>
                  <BtnText>Talk to us about this</BtnText> <Arrow />
                </Link>
              </Rise>
            </motion.div>
            <button ref={closeBtn} type="button" className="svc-dialog__close" onClick={close} aria-label="Close">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </dialog>
  );
}

/** One block of the panel's content, rising in after the card has turned over. */
function Rise({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        out: { opacity: 0, transform: 'translateY(12px)' },
        in: { opacity: 1, transform: 'translateY(0px)', transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}
