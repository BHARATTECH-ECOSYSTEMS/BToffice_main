import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { Arrow, Brand, toneStyle, BtnText, ThreadMark } from './ui';
import { CHAPTERS, EMAIL, EMAIL_HREF } from '../content';
import { useOpenLogin } from './Login';
import { useScene } from '../gl/Scene';
import { NavPeek, type PeekId } from './NavPeek';
import type { HueName } from '../gl/palette';
import { pageScroll, trackBox } from './trackBox';
import { useGlassTilt } from './useGlassTilt';
import { useNavBubble } from './useNavBubble';
import { fine, keyAt, KeyLabel, keyPointer, MotionLink, OPENING, useKeyHighlight, type LinkFx } from './navKeys';

const LINKS: { label: string; to: string; section?: string; tone: HueName; peek?: PeekId; fx: LinkFx }[] = [
  { label: 'Research', to: '/research', tone: 'saffron', peek: 'research', fx: 'drop' },
  { label: 'Services', to: '/services', tone: 'violet', peek: 'services', fx: 'sweep' },
  { label: 'Capabilities', to: '/', section: 'capabilities', tone: 'tangerine', peek: 'capabilities', fx: 'tilt' },
  { label: 'Careers', to: '/careers', tone: 'saffron', peek: 'careers', fx: 'ripple' },
  { label: 'Blog', to: '/blog', tone: 'tangerine', fx: 'sweep' },
  { label: 'About', to: '/about', tone: 'violet', peek: 'about', fx: 'roll' },
  { label: 'Contact', to: '/contact', tone: 'tangerine', peek: 'contact', fx: 'magnet' },
];

// the glass keys that lean towards the cursor (useGlassTilt): among the links only the tilt one
const GLASS_KEYS = '.nav-brand, .nav-links > [data-fx="tilt"]';
// every button of the bar, for the liquid drop: the brand, the links and the login button
const BAR_BUTTONS = '.nav-brand, .nav-links > a, .nav-links > button, .nav-cta';

/** Hover intent: a short wait before the first glance opens, none between links, and a grace period on
 *  leaving so the pointer can travel down into the panel. */
function usePeek() {
  const [peek, setPeek] = useState<PeekId | null>(null);
  const timer = useRef(0);
  const current = useRef<PeekId | null>(null);
  const set = useCallback((id: PeekId | null) => {
    current.current = id;
    setPeek(id);
  }, []);
  const open = useCallback(
    (id: PeekId) => {
      window.clearTimeout(timer.current);
      if (current.current) set(id);
      else timer.current = window.setTimeout(() => set(id), 40);
    },
    [set],
  );
  const close = useCallback(
    (now = false) => {
      window.clearTimeout(timer.current);
      if (now) set(null);
      else timer.current = window.setTimeout(() => set(null), 140);
    },
    [set],
  );
  const hold = useCallback(() => window.clearTimeout(timer.current), []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { peek, open, close, hold };
}

/**
 * How far through each chapter of the home story the reader is, measured at the middle of the screen. The fills
 * are drawn straight onto the progress bars in `bars`, so scrolling never re-renders the nav; positions come from
 * cached boxes, so it never forces a layout.
 */
function useChapterProgress(enabled: boolean, bars: RefObject<HTMLDivElement>) {
  useEffect(() => {
    if (!enabled) return;
    const tracked = CHAPTERS.map((c) => document.getElementById(c.id)).map((el) => (el ? trackBox(el) : null));
    const footer = document.querySelector('.footer');
    const end = footer ? trackBox(footer) : null;
    // the bars render under the same condition as `enabled`, so they are already mounted and never change
    const fills = bars.current?.querySelectorAll<HTMLElement>(':scope > button > span');
    let vh = window.innerHeight;
    let raf = 0;

    const measure = () => {
      raf = 0;
      const mid = pageScroll() + vh * 0.5;
      tracked.forEach((t, i) => {
        if (!t) return;
        const s = t.box.top;
        const e = i < tracked.length - 1 ? (tracked[i + 1]?.box.top ?? Infinity) : (end?.box.top ?? document.body.scrollHeight);
        const fill = Math.min(1, Math.max(0, (mid - s) / Math.max(1, e - s)));
        const bar = fills?.[i];
        const next = `scaleX(${fill.toFixed(3)})`;
        if (bar && bar.style.transform !== next) bar.style.transform = next;
      });
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    const onResize = () => {
      vh = window.innerHeight;
      on();
    };
    measure();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', onResize);
      tracked.forEach((t) => t?.release());
      end?.release();
    };
  }, [enabled, bars]);
}

export function Nav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { scrollTo, glideTo, lenis } = useScene();
  const home = pathname === '/';
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const openLogin = useOpenLogin();
  const reduceMotion = useReducedMotion();
  const [hover, setHover] = useState(-1);
  const [inCaps, setInCaps] = useState(false);
  const linksRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useGlassTilt(barRef, GLASS_KEYS);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  // one liquid drop glides along the whole bar and wraps whichever button the pointer is on
  useNavBubble(barRef, bubbleRef, BAR_BUTTONS);
  const progressRef = useRef<HTMLDivElement>(null);
  useChapterProgress(home, progressRef);
  const { peek, open: openPeek, close: closePeek, hold } = usePeek();
  const leavePeek = useCallback(() => closePeek(), [closePeek]);
  const [caret, setCaret] = useState(0);

  // compact once the page moves; tucked away while reading down, back the moment you scroll up
  useEffect(() => {
    let lastY = window.scrollY;
    let raf = 0;
    const on = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = pageScroll();
        const isCompact = y > 24;
        setCompact((p) => (p !== isCompact ? isCompact : p));

        if (Math.abs(y - lastY) > 24) {
          const shouldHide = y > 400 && y > lastY;
          setHidden((p) => (p !== shouldHide ? shouldHide : p));
          lastY = y;
        }
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
    };
  }, []);

  // Capabilities observer without forced layout on scroll
  useEffect(() => {
    if (!home) return;
    const el = document.getElementById('capabilities');
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]) setInCaps(entries[0].isIntersecting);
      },
      { rootMargin: '-20% 0px -20% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [home]);

  useEffect(() => {
    setOpen(false);
    closePeek(true);
  }, [pathname, closePeek]);

  // a glance closes on Escape, on a press outside the nav, or once the page has moved on under it
  useEffect(() => {
    if (!peek) return;
    const y0 = window.scrollY;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePeek(true);
    const onDown = (e: PointerEvent) => !(e.target as Element).closest('.nav') && closePeek(true);
    const onScroll = () => Math.abs(pageScroll() - y0) > 80 && closePeek(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll);
    };
  }, [peek, closePeek]);
  useEffect(() => {
    if (hidden) closePeek(true);
  }, [hidden, closePeek]);
  useEffect(() => {
    if (open) lenis?.stop();
    else lenis?.start();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, lenis]);

  const active = LINKS.findIndex((l) => (l.section ? home && inCaps : l.to !== '/' && pathname.startsWith(l.to)));
  const openIdx = peek ? LINKS.findIndex((l) => l.peek === peek) : -1;
  const lit = hover >= 0 ? hover : openIdx >= 0 ? openIdx : active;

  const hl = useKeyHighlight(linksRef, lit, lit >= 0 ? LINKS[lit].tone : undefined);
  // the glance's caret points at the lit link
  useLayoutEffect(() => {
    const b = keyAt(linksRef.current, lit);
    if (!b) return;
    const r = b.getBoundingClientRect();
    setCaret(r.left + r.width / 2);
  }, [lit]);

  const go = useCallback(
    (l: (typeof LINKS)[number]) => {
      setOpen(false);
      if (!l.section) return;
      // straight to the section: travelling through the pinned films in between read as lag
      if (home) {
        const el = document.getElementById(l.section);
        if (el) glideTo(el);
      } else navigate('/', { state: { scrollTo: l.section } });
    },
    [home, navigate, glideTo],
  );

  const fromPeek = useCallback(
    (to: string, section?: string) => {
      closePeek(true);
      if (to === pathname && section) {
        const el = document.getElementById(section);
        if (el) glideTo(el);
      } else if (to === pathname) glideTo(0);
      else navigate(to, section ? { state: { scrollTo: section } } : undefined);
    },
    [closePeek, navigate, pathname, glideTo],
  );

  const toChapter = (id: string) => {
    const el = document.getElementById(id);
    if (el) scrollTo(el);
  };

  const peekProps = (l: (typeof LINKS)[number], i: number) => ({
    onPointerEnter: (e: React.PointerEvent) => {
      setHover(i);
      if (l.peek && e.pointerType === 'mouse' && fine()) openPeek(l.peek);
      else if (!l.peek) closePeek();
    },
    onFocus: () => setHover(i),
    onBlur: () => setHover(-1),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (!l.peek || e.key !== 'ArrowDown') return;
      e.preventDefault();
      openPeek(l.peek);
      window.setTimeout(() => document.querySelector<HTMLElement>(`#peek-${l.peek} button`)?.focus(), 160);
    },
    'aria-expanded': l.peek ? peek === l.peek : undefined,
    'aria-controls': l.peek ? `peek-${l.peek}` : undefined,
  });

  return (
    <header className="nav" data-hidden={(hidden && !open && !peek) || undefined} data-compact={compact || open || undefined} data-open={open || undefined}>
      {/* with reduced motion the bar is simply there: `initial={false}` starts it at its open state */}
      <motion.div className="nav-bar" ref={barRef} initial={reduceMotion ? false : 'closed'} animate="open">
        <motion.span className="nav-glass" aria-hidden="true" variants={OPENING.glass} />
        {/* the liquid glass drop that wraps the button under the pointer (useNavBubble) */}
        <span className="nav-bubble" ref={bubbleRef} aria-hidden="true" />
        <MotionLink to="/" className="nav-brand" aria-label="Bharattech Origin, home" onClick={() => home && scrollTo(0)} variants={OPENING.brand}>
          <Brand
            mark={
              <span className="nav-orb">
                <ThreadMark />
              </span>
            }
          />
        </MotionLink>

        <nav
          className="nav-links"
          ref={linksRef}
          aria-label="Primary"
          onPointerLeave={() => {
            setHover(-1);
            closePeek();
          }}
        >
          <span
            className="nav-hl"
            aria-hidden="true"
            data-show={lit >= 0 || undefined}
            data-glide={hl.glide || undefined}
            // keeps the last link's tone while it fades out, instead of snapping to the fallback colour
            style={{ transform: `translateX(${hl.x}px)`, width: hl.w, ...(hl.tone ? toneStyle(hl.tone) : {}) }}
          />
          {LINKS.map((l, i) =>
            l.section ? (
              <button key={l.label} style={toneStyle(l.tone, { '--i': i } as CSSProperties)} {...peekProps(l, i)} {...keyPointer(l.fx)} data-fx={l.fx} data-lit={i === lit || undefined} onClick={() => go(l)} aria-current={i === active || undefined}>
                <i aria-hidden="true" />
                <KeyLabel label={l.label} fx={l.fx} />
              </button>
            ) : (
              <Link key={l.label} to={l.to} style={toneStyle(l.tone, { '--i': i } as CSSProperties)} {...peekProps(l, i)} {...keyPointer(l.fx)} data-fx={l.fx} data-lit={i === lit || undefined} aria-current={i === active ? 'page' : undefined}>
                <i aria-hidden="true" />
                <KeyLabel label={l.label} fx={l.fx} />
              </Link>
            ),
          )}
        </nav>

        <div className="nav-end">
          <button type="button" className="nav-cta" onClick={openLogin} aria-haspopup="dialog">
            <BtnText>Employee login</BtnText>
            <span className="nav-cta-icon">
              <Arrow dir="up-right" size={13} />
            </span>
          </button>
          <button className="nav-burger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="nav-sheet" aria-label={open ? 'Close menu' : 'Open menu'}>
            <span />
            <span />
          </button>
        </div>
      </motion.div>

      <NavPeek peek={peek} caret={caret} onEnter={hold} onLeave={leavePeek} onGo={fromPeek} />

      {home && (
        <div className="nav-progress" ref={progressRef} aria-hidden="true">
          {CHAPTERS.map((c) => (
            <button key={c.id} tabIndex={-1} style={toneStyle(c.tone)} onClick={() => toChapter(c.id)} title={c.label}>
              <span />
            </button>
          ))}
        </div>
      )}

      <div className="nav-sheet" id="nav-sheet" aria-hidden={!open}>
        <ul>
          {LINKS.map((l, i) => (
            <li key={l.label} style={toneStyle(l.tone, { '--i': i } as CSSProperties)}>
              {l.section ? (
                <button onClick={() => go(l)} tabIndex={open ? 0 : -1}>
                  <i aria-hidden="true" />
                  {l.label}
                  <Arrow />
                </button>
              ) : (
                <Link to={l.to} tabIndex={open ? 0 : -1}>
                  <i aria-hidden="true" />
                  {l.label}
                  <Arrow />
                </Link>
              )}
            </li>
          ))}
        </ul>
        <div className="nav-sheet-foot" style={{ '--i': LINKS.length } as CSSProperties}>
          <button
            type="button"
            className="btn btn-primary"
            tabIndex={open ? 0 : -1}
            aria-haspopup="dialog"
            onClick={() => {
              setOpen(false);
              openLogin();
            }}
          >
            <BtnText>Employee login</BtnText> <Arrow />
          </button>
          <a href={EMAIL_HREF} target="_blank" rel="noopener noreferrer" className="nav-sheet-mail" tabIndex={open ? 0 : -1}>
            {EMAIL}
          </a>
        </div>
      </div>
      <button className="nav-scrim" aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)} />
    </header>
  );
}
