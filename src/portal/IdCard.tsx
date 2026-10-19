import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { encode } from 'uqr';
import { LogoMark } from '../components/ui';
import { HQ } from '../content';
import { PERSON_STATUS_LABEL, ROLE_LABEL, STREAM_LABEL, type Person, type PersonRole } from './data';
import { formatDate } from './store';
import { initials } from './ui';
import '../styles/id-card.css';

// Assumed until HR says otherwise: a card is good for three years from joining, and is renewed for three more each time.
const CARD_VALID_YEARS = 3;

// the card's own size; on short screens the whole card scales down to fit
const CARD_W = 300;
const CARD_H = 476;
// how far above the top of the screen the lanyard is tied
const ANCHOR_Y = -40;
// how long the card takes to lift away before the dialog unmounts
const CLOSE_MS = 460;
// further than this from its resting place, a drag meets more and more resistance
const DRAG_REACH = 240;
const STRAP_TEXT = 'BHARATTECH ORIGIN  ·  '.repeat(6);

/**
 * A spring in Apple's terms: `response` is roughly the seconds it takes to get there, `damping` 1 settles without
 * overshoot and lower values bounce. Stepped by hand each frame (semi-implicit Euler), so it always continues from
 * where the value is now, with the velocity it has now: the card can be grabbed mid-swing.
 */
interface Spring {
  x: number;
  v: number;
  to: number;
  response: number;
  damping: number;
}
const spring = (x: number, response: number, damping: number): Spring => ({ x, v: 0, to: x, response, damping });
function step(s: Spring, dt: number) {
  const k = (2 * Math.PI / s.response) ** 2;
  const c = (4 * Math.PI * s.damping) / s.response;
  s.v += (-k * (s.x - s.to) - c * s.v) * dt;
  s.x += s.v * dt;
}
const atRest = (s: Spring, eps = 0.01) => Math.abs(s.x - s.to) < eps && Math.abs(s.v) < eps;
// the further past the reach, the less the card follows: it slows before it stops, it never hits a wall
const rubberband = (d: number, reach = DRAG_REACH) => {
  const over = Math.abs(d) - reach;
  if (over <= 0) return d;
  return Math.sign(d) * (reach + (over * reach * 0.55) / (reach + 0.55 * over));
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The date the card in hand runs out: the first three-year anniversary of joining that is still ahead. */
function cardExpiry(joined: string) {
  const end = new Date(`${joined}T00:00:00`);
  const now = new Date();
  do end.setFullYear(end.getFullYear() + CARD_VALID_YEARS);
  while (end <= now);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
}
// Assumed until HR keeps contract types: interns are interns, everyone else is full-time.
const employeeType = (role: PersonRole) => (role === 'intern' ? 'Intern' : 'Full-time');
// built once, as in formatDate; the guard keeps toLocaleDateString's "Invalid Date" where format() would throw
const MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });
const monthYear = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? 'Invalid Date' : MONTH_YEAR.format(d);
};

/**
 * The person as a MECARD, the short contact format phone cameras offer to save as a contact. It carries only what
 * the card already shows in print, and leaves out the office (the same for everyone): less data means fewer, larger
 * QR squares that a camera reads more easily. Once there is a public verification page, point the QR at that.
 */
function contactCard(person: Person) {
  // MECARD reserves these characters; a backslash before one keeps it as text
  const esc = (v: string) => v.replace(/([\\;,:"])/g, '\\$1');
  const fields = [
    `N:${esc(person.name)}`,
    'ORG:Bharattech Origin',
    `TITLE:${esc(ROLE_LABEL[person.role])}`,
    `EMAIL:${esc(person.email)}`,
    person.phone && `TEL:${esc(person.phone)}`,
    `NOTE:${esc(`Employee ID ${person.id}`)}`,
  ];
  return `MECARD:${fields.filter(Boolean).join(';')};;`;
}

/** A real, scannable QR code drawn as one SVG path, one square per dark module, on a white tile with a quiet zone. */
function QrCode({ text }: { text: string }) {
  const { d, size } = useMemo(() => {
    // the smallest code that fits, then as much error correction as that size allows: larger squares read easier
    const qr = encode(text, { ecc: 'L', boostEcc: true, border: 0 });
    let path = '';
    qr.data.forEach((row, y) => row.forEach((dark, x) => dark && (path += `M${x} ${y}h1v1h-1z`)));
    return { d: path, size: qr.size };
  }, [text]);
  return (
    <svg className="idc-qr" viewBox={`-3 -3 ${size + 6} ${size + 6}`} shapeRendering="crispEdges" role="img" aria-label="QR code with this person's contact details">
      <rect x="-3" y="-3" width={size + 6} height={size + 6} fill="#fff" />
      <path d={d} fill="#17142b" />
    </svg>
  );
}

/**
 * The person's company ID card, opened from their profile card on the dashboard. It drops in on a lanyard tied
 * above the screen and settles with a little bounce; it can be dragged and thrown, and it swings on the lanyard
 * with the speed it was let go at; it leans towards the pointer; a tap (or Flip) turns it
 * over. Closing lifts it back up the way it came. All motion is springs written straight to the elements each
 * frame, so React doesn't re-render. With reduced motion it simply fades in, still, and the flip is a cross-fade.
 */
export function IdCardDialog({ person, photo, onClose }: { person: Person; photo?: string; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const strapRef = useRef<SVGPathElement>(null);
  const strap2Ref = useRef<SVGPathElement>(null);
  const flipBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [flipped, setFlipped] = useState(false);
  const [closing, setClosing] = useState(false);
  const reduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;

  // every moving value, as springs; refs so the frame loop and the pointer handlers share them without re-rendering
  const motion = useRef({
    x: spring(0, 0.55, 0.62),
    y: spring(0, 0.55, 0.62),
    rot: spring(0, 0.8, 0.36),
    flip: spring(0, 0.5, 0.78),
    tiltX: spring(0, 0.3, 1),
    tiltY: spring(0, 0.3, 1),
    dragging: false,
    closing: false,
  }).current;
  // starts the frame loop again after it stopped at rest; stays null with reduced motion, where nothing loops
  const wake = useRef<(() => void) | null>(null);
  const drag = useRef<{ id: number; grabX: number; grabY: number; startX: number; startY: number; t0: number; moved: number; history: { x: number; y: number; t: number }[] } | null>(null);

  // the card's resting place and size, from the window
  const layout = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(1, (vh - 190) / CARD_H, (vw - 32) / CARD_W);
    const restY = Math.max(64, (vh - CARD_H * scale) / 2 - 28);
    return { vw, vh, scale, restX: vw / 2, restY };
  };
  // read once and on resize, not every frame
  const view = useRef(layout());
  const offscreenY = () => -(view.current.restY + CARD_H + 160);

  // start above the screen, then fall onto the lanyard
  useLayoutEffect(() => {
    if (reduced) return;
    motion.y.x = offscreenY();
    motion.y.v = 900;
    motion.rot.x = -6;
  }, []);

  // the frame loop: step the springs, then write the card, its tilt and the lanyard
  useEffect(() => {
    if (reduced) {
      paint();
      return;
    }
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      if (!motion.dragging) {
        step(motion.x, dt);
        step(motion.y, dt);
      }
      // a hanging card lines up with its lanyard, and lags behind the way it's moving
      const { restX, restY } = view.current;
      const theta = Math.atan2(motion.x.x, restY + motion.y.x - ANCHOR_Y);
      motion.rot.to = clamp((-theta * 180) / Math.PI + motion.x.v * 0.012, -38, 38);
      step(motion.rot, dt);
      step(motion.flip, dt);
      step(motion.tiltX, dt);
      step(motion.tiltY, dt);
      paint(restX, restY);
      // stop once everything has settled, so a still card costs nothing; flip is 0..1 and scaled by 180deg, hence its finer tolerance
      if (!motion.dragging && atRest(motion.x) && atRest(motion.y) && atRest(motion.rot) && atRest(motion.flip, 0.01 / 180) && atRest(motion.tiltX) && atRest(motion.tiltY)) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    wake.current = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      wake.current = null;
    };
  }, []);

  function paint(restX = view.current.restX, restY = view.current.restY) {
    const { scale } = view.current;
    const cx = restX + motion.x.x;
    const cy = restY + motion.y.x;
    const card = cardRef.current;
    if (card) {
      card.style.transform = `translate3d(${cx - CARD_W / 2}px, ${cy}px, 0) rotate(${motion.rot.x}deg) scale(${scale})`;
    }
    if (flipRef.current) flipRef.current.style.transform = `rotateX(${motion.tiltX.x}deg) rotateY(${motion.tiltY.x + motion.flip.x * 180}deg)`;
    // two straps from the knot above the screen to the clip; they bow a little against the way the card moves
    const bow = clamp(-motion.x.v * 0.04, -40, 40);
    const midY = (ANCHOR_Y + cy) / 2;
    for (const [ref, side] of [
      [strapRef, -1],
      [strap2Ref, 1],
    ] as const) {
      ref.current?.setAttribute('d', `M ${restX + side * 16} ${ANCHOR_Y} Q ${(restX + cx) / 2 + side * 10 + bow} ${midY} ${cx + side * 5} ${cy + 8 * scale}`);
    }
  }

  // flipping is a spring too; with reduced motion the faces cross-fade instead (see id-card.css)
  useEffect(() => {
    motion.flip.to = flipped ? 1 : 0;
    if (reduced) {
      motion.flip.x = motion.flip.to;
      paint();
    } else wake.current?.();
  }, [flipped]);

  const close = () => {
    if (motion.closing) return;
    motion.closing = true;
    setClosing(true);
    if (!reduced) {
      // back up the way it came, without a bounce
      motion.y.response = 0.45;
      motion.y.damping = 1;
      motion.y.to = offscreenY();
      motion.x.to = 0;
      wake.current?.();
    }
    window.setTimeout(onClose, reduced ? 180 : CLOSE_MS);
  };

  // focus moves into the dialog and comes back to the opener; Escape closes; Tab stays inside
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    flipBtnRef.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const order = [flipBtnRef.current, closeBtnRef.current];
        const at = order.indexOf(document.activeElement as HTMLButtonElement);
        e.preventDefault();
        order[(at + (e.shiftKey ? order.length - 1 : 1)) % order.length]?.focus();
      }
    };
    const relayout = () => {
      view.current = layout();
      if (reduced) paint();
      else wake.current?.();
    };
    document.addEventListener('keydown', key);
    window.addEventListener('resize', relayout);
    return () => {
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', relayout);
      opener?.focus({ preventScroll: true });
    };
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduced || motion.closing || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { restX, restY } = view.current;
    // hold the card where it was grabbed, not by its centre
    drag.current = {
      id: e.pointerId,
      grabX: e.clientX - (restX + motion.x.x),
      grabY: e.clientY - (restY + motion.y.x),
      startX: e.clientX,
      startY: e.clientY,
      t0: performance.now(),
      moved: 0,
      history: [{ x: e.clientX, y: e.clientY, t: performance.now() }],
    };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.startX, e.clientY - d.startY));
      // a few pixels of slack first, so a tap with a shaky hand still counts as a tap
      if (d.moved < 6) return;
      motion.dragging = true;
      wake.current?.();
      const { restX, restY } = view.current;
      const now = performance.now();
      d.history.push({ x: e.clientX, y: e.clientY, t: now });
      while (d.history.length > 2 && now - d.history[0].t > 90) d.history.shift();
      motion.x.x = rubberband(e.clientX - d.grabX - restX);
      // it can be lifted only a little: the lanyard is above it
      motion.y.x = clamp(rubberband(e.clientY - d.grabY - restY), -restY * 0.6, Infinity);
      return;
    }
    if (reduced || motion.dragging || e.pointerType !== 'mouse') return;
    // leaning towards the pointer: up to 10° each way
    const r = e.currentTarget.getBoundingClientRect();
    const nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    const ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    motion.tiltY.to = nx * 10;
    motion.tiltX.to = -ny * 8;
    wake.current?.();
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!motion.dragging) {
      // a tap turns the card over
      if (performance.now() - d.t0 < 450) setFlipped((f) => !f);
      return;
    }
    motion.dragging = false;
    // let go at the pointer's own speed, so there's no seam between dragging and swinging
    const first = d.history[0];
    const lastP = d.history[d.history.length - 1];
    const dt = Math.max(16, lastP.t - first.t) / 1000;
    motion.x.v = clamp((lastP.x - first.x) / dt, -4000, 4000);
    motion.y.v = clamp((lastP.y - first.y) / dt, -4000, 4000);
    motion.x.to = 0;
    motion.y.to = 0;
    wake.current?.();
  };
  const onPointerLeave = () => {
    if (motion.dragging) return;
    motion.tiltX.to = 0;
    motion.tiltY.to = 0;
    wake.current?.();
  };

  const active = person.status === 'active';
  const office = person.office ?? HQ;
  const officeShort = office.split(',')[0];
  const expiry = person.joined ? cardExpiry(person.joined) : undefined;
  // the name set in two lines, first name over the rest; a long one drops a size so it stays on the card
  const [first, ...others] = person.name.trim().split(/\s+/);
  const rest = others.join(' ');
  const longName = Math.max(first.length, rest.length) > 11;

  return createPortal(
    <div className="idc-layer" data-closing={closing || undefined} data-reduced={reduced || undefined} data-lenis-prevent>
      <div className="idc-scrim" onClick={close} aria-hidden="true" />
      <div className="idc-dialog" role="dialog" aria-modal="true" aria-labelledby="idc-name" aria-describedby="idc-desc">
        <svg className="idc-lanyard" aria-hidden="true">
          <defs>
            <linearGradient id="idc-strap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3b2bb0" />
              <stop offset="1" stopColor="#6e58f5" />
            </linearGradient>
          </defs>
          <path ref={strapRef} id="idc-strap-a" className="idc-strap" />
          <path ref={strap2Ref} id="idc-strap-b" className="idc-strap" />
          {/* the company name woven along both straps */}
          {['idc-strap-a', 'idc-strap-b'].map((id) => (
            <text key={id} className="idc-strap-text">
              <textPath href={`#${id}`}>{STRAP_TEXT}</textPath>
            </text>
          ))}
        </svg>

        <div
          ref={cardRef}
          className="idc-card"
          style={{ width: CARD_W, height: CARD_H }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerLeave}
        >
          {/* the metal clip the lanyard holds, and the slot it goes through */}
          <span className="idc-clip" aria-hidden="true" />
          <div ref={flipRef} className="idc-flip" data-flipped={flipped || undefined}>
            <div className="idc-face idc-front" aria-hidden={flipped || undefined}>
              <span className="idc-slot" aria-hidden="true" />
              <header className="idc-brand">
                <LogoMark size={28} />
                <strong>Bharattech Origin</strong>
              </header>
              <div className="idc-photo">{photo ? <img src={photo} alt="" /> : <span aria-hidden="true">{initials(person.name)}</span>}</div>
              <h2 id="idc-name" className={longName ? 'idc-name is-long' : 'idc-name'} title={person.name}>
                <span>{first}</span>
                {rest && <span>{rest}</span>}
              </h2>
              <p className="idc-role">
                {ROLE_LABEL[person.role]}, {STREAM_LABEL[person.stream]} stream
              </p>
              <span className={active ? 'idc-status is-active' : 'idc-status is-inactive'}>{PERSON_STATUS_LABEL[person.status]}</span>
              <dl className="idc-facts">
                <div>
                  <dt>Employee ID</dt>
                  <dd className="is-code">{person.id}</dd>
                </div>
                <div>
                  <dt>Joined</dt>
                  <dd>{person.joined ? monthYear(person.joined) : 'Not yet'}</dd>
                </div>
                <div>
                  <dt>Employee type</dt>
                  <dd>{employeeType(person.role)}</dd>
                </div>
                <div>
                  <dt>Valid until</dt>
                  <dd>{expiry ? formatDate(expiry) : 'On joining'}</dd>
                </div>
              </dl>
            </div>

            <div className="idc-face idc-back" aria-hidden={!flipped || undefined}>
              <span className="idc-slot" aria-hidden="true" />
              <div className="idc-scan">
                <QrCode text={contactCard(person)} />
                <p>
                  <strong>Scan to save this contact</strong>
                  Any phone camera can read it.
                </p>
              </div>
              <dl className="idc-back-facts">
                <div>
                  <dt>Email</dt>
                  <dd>{person.email}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd className={person.phone ? undefined : 'is-empty'}>{person.phone || 'Not on file'}</dd>
                </div>
                <div>
                  <dt>Office</dt>
                  <dd>{office}</dd>
                </div>
              </dl>
              <p className="idc-return">If found, please return it to the HR team at Bharattech Origin, {officeShort}.</p>
              <span className="idc-back-mark" aria-hidden="true">
                <LogoMark size={56} />
              </span>
            </div>
          </div>
        </div>

        <p id="idc-desc" className="idc-hint">
          {reduced ? 'Your company ID card' : 'Drag to swing it, or tap to flip it'}
        </p>
        <div className="idc-actions">
          <button ref={flipBtnRef} type="button" className="idc-btn" onClick={() => setFlipped((f) => !f)}>
            {flipped ? 'Show front' : 'Flip card'}
          </button>
          <button ref={closeBtnRef} type="button" className="idc-btn is-quiet" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
