import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { Arrow, Brand, toneStyle, BtnText, ThreadMark } from './ui';
import { CHAPTERS, EMAIL, EMAIL_HREF } from '../content';
import { useOpenLogin } from './Login';
import { useScene } from '../gl/Scene';
import { NavPeek, type PeekId } from './NavPeek';
import type { HueName } from '../gl/palette';
import { pageScroll, trackBox } from './trackBox';
import { useGlassTilt } from './useGlassTilt';
import { useNavBubble } from './useNavBubble';

/* Each link has its own hover effect (`fx`, styled by `[data-fx]` in base.css):
   drop = the liquid glass drop wraps it (useNavBubble), sweep = a band of light crosses the glass,
   tilt = it leans to the cursor and a shine follows (useGlassTilt), ripple = a ring spreads from where the cursor
   came in, roll = the label rolls up and a copy rolls in, magnet = the key is drawn towards the cursor. */
type LinkFx = 'drop' | 'sweep' | 'tilt' | 'ripple' | 'roll' | 'magnet';
const LINKS: { label: string; to: string; section?: string; tone: HueName; peek?: PeekId; fx: LinkFx }[] = [
  { label: 'Research', to: '/research', tone: 'saffron', peek: 'research', fx: 'drop' },
  { label: 'Services', to: '/services', tone: 'violet', peek: 'services', fx: 'sweep' },
  { label: 'Capabilities', to: '/', section: 'capabilities', tone: 'tangerine', peek: 'capabilities', fx: 'tilt' },
  { label: 'Careers', to: '/careers', tone: 'saffron', peek: 'careers', fx: 'ripple' },
  { label: 'About', to: '/about', tone: 'violet', peek: 'about', fx: 'roll' },
  { label: 'Contact', to: '/contact', tone: 'tangerine', peek: 'contact', fx: 'magnet' },
];

/** Per-key pointer effects: where the cursor came in (ripple) and the magnet pull. The key's box is read once on
 *  entry, never per move, and the values go on that key's own style only. */
function keyPointer(fx: LinkFx) {
  if (fx !== 'ripple' && fx !== 'magnet') return {};
  let box: DOMRect | null = null;
  const at = (e: React.PointerEvent<HTMLElement>) => {
    box ??= e.currentTarget.getBoundingClientRect();
    return [(e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height] as const;
  };
  if (fx === 'ripple')
    return {
      onPointerOver: (e: React.PointerEvent<HTMLElement>) => {
        if (e.pointerType !== 'mouse' || e.currentTarget.contains(e.relatedTarget as Node)) return;
        box = null;
        const [x, y] = at(e);
        e.currentTarget.style.setProperty('--px', `${(x * 100).toFixed(1)}%`);
        e.currentTarget.style.setProperty('--py', `${(y * 100).toFixed(1)}%`);
      },
    };
  return {
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse' || !fine()) return;
      const [x, y] = at(e);
      // -1..1 from the key's centre
      e.currentTarget.style.setProperty('--mg-x', ((x - 0.5) * 2).toFixed(3));
      e.currentTarget.style.setProperty('--mg-y', ((y - 0.5) * 2).toFixed(3));
    },
    onPointerOut: (e: React.PointerEvent<HTMLElement>) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      box = null;
      e.currentTarget.style.removeProperty('--mg-x');
      e.currentTarget.style.removeProperty('--mg-y');
    },
  };
}

/** The link's label; the roll key carries the site's button roll markup. */
function KeyLabel({ label, fx }: { label: string; fx: LinkFx }) {
  if (fx === 'roll') return <BtnText>{label}</BtnText>;
  if (fx === 'magnet') return <span className="nav-key-label">{label}</span>;
  return <>{label}</>;
}

/* The opening: the bar's glass unfolds out of a narrow capsule at the centre, then the brand and the login button
   fades in (the links and the login button follow with their own CSS stagger, `navItem` in base.css). Only the glass
   scales; the brand gets opacity alone, because its `transform` belongs to the glass tilt (useGlassTilt), which
   Motion would overwrite. */
// an even ease in and out (the site's --ease-io), so the stretch reads across the whole bar instead of jumping
// to full width in the first frames
const EASE_IO = [0.65, 0, 0.35, 1] as const;
const OPENING: Record<'glass' | 'brand', Variants> = {
  // one `transform` string rather than scaleX/scaleY: Motion can then hand it to the browser's own animation
  // engine, which keeps running while the main thread is busy loading the page. As separate values it was
  // driven frame by frame from JavaScript and skipped straight to the end during the load.
  glass: {
    closed: { opacity: 0, transform: 'scale(0.12, 0.75)' },
    open: {
      opacity: 1,
      transform: 'scale(1, 1)',
      // the short delay lets the page's first paint land before the stretch starts, so its beginning is seen
      transition: { duration: 0.9, delay: 0.15, ease: EASE_IO, opacity: { duration: 0.2, delay: 0.15 } },
    },
  },
  brand: {
    closed: { opacity: 0 },
    open: { opacity: 1, transition: { duration: 0.4, delay: 0.75 } },
  },
};
const MotionLink = motion.create(Link);

// the glass keys that lean towards the cursor (useGlassTilt): among the links only the tilt one
const GLASS_KEYS = '.nav-brand, .nav-links > [data-fx="tilt"], .nav-cta';

const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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
 * Where the reader is in the home story: the chapter holding the middle of the screen, and how far through each
 * chapter they are. The fills are drawn straight onto the progress bars in `bars`, so scrolling only re-renders
 * the nav when the current chapter changes; positions come from cached boxes, so it never forces a layout.
 */
function useChapterProgress(enabled: boolean, bars: RefObject<HTMLDivElement>) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const tracked = CHAPTERS.map((c) => document.getElementById(c.id)).map((el) => (el ? trackBox(el) : null));
    const footer = document.querySelector('.footer');
    const end = footer ? trackBox(footer) : null;
    let raf = 0;

    const measure = () => {
      raf = 0;
      const mid = pageScroll() + window.innerHeight * 0.5;
      let current = 0;
      const fills = bars.current?.querySelectorAll<HTMLElement>(':scope > button > span');
      tracked.forEach((t, i) => {
        if (!t) return;
        const s = t.box.top;
        const e = i < tracked.length - 1 ? (tracked[i + 1]?.box.top ?? Infinity) : (end?.box.top ?? document.body.scrollHeight);
        if (mid >= s) current = i;
        const fill = Math.min(1, Math.max(0, (mid - s) / Math.max(1, e - s)));
        const bar = fills?.[i];
        const next = `scaleX(${fill.toFixed(3)})`;
        if (bar && bar.style.transform !== next) bar.style.transform = next;
      });
      setIndex((p) => (p === current ? p : current));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      tracked.forEach((t) => t?.release());
      end?.release();
    };
  }, [enabled, bars]);
  return index;
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
  useNavBubble(linksRef, bubbleRef);
  const [hl, setHl] = useState<{ x: number; w: number; glide: boolean; tone?: HueName }>({ x: 0, w: 0, glide: false });
  const progressRef = useRef<HTMLDivElement>(null);
  const chapter = useChapterProgress(home, progressRef);
  const { peek, open: openPeek, close: closePeek, hold } = usePeek();
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

  // The highlight glides between links. When it comes back after fading out it appears in place instead of
  // sliding over from wherever it was last; a quick return, before the fade has finished, still glides.
  const litBefore = useRef(-1);
  const hidAt = useRef(-Infinity);
  useLayoutEffect(() => {
    const b = linksRef.current?.querySelectorAll<HTMLElement>('a, button')[lit];
    if (b) {
      const glide = litBefore.current >= 0 || performance.now() - hidAt.current < 200;
      setHl({ x: b.offsetLeft, w: b.offsetWidth, glide, tone: LINKS[lit].tone });
      const r = b.getBoundingClientRect();
      setCaret(r.left + r.width / 2);
    } else if (litBefore.current >= 0) hidAt.current = performance.now();
    litBefore.current = lit;
  }, [lit]);
  // The links change width when the web font arrives, after the highlight was first placed; follow them.
  useEffect(() => {
    const el = linksRef.current;
    const b = el?.querySelectorAll<HTMLElement>('a, button')[lit];
    if (!el || !b) return;
    const ro = new ResizeObserver(() =>
      setHl((p) => (p.x === b.offsetLeft && p.w === b.offsetWidth ? p : { ...p, x: b.offsetLeft, w: b.offsetWidth, glide: false })),
    );
    ro.observe(el);
    ro.observe(b);
    return () => ro.disconnect();
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
    <header className="nav" data-peek={peek || undefined} data-hidden={(hidden && !open && !peek) || undefined} data-compact={compact || open || undefined} data-open={open || undefined}>
      {/* with reduced motion the bar is simply there: `initial={false}` starts it at its open state */}
      <motion.div className="nav-bar" ref={barRef} initial={reduceMotion ? false : 'closed'} animate="open">
        <motion.span className="nav-glass" aria-hidden="true" variants={OPENING.glass} />
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
          {/* the liquid glass drop that wraps the drop key (useNavBubble) */}
          <span className="nav-bubble" ref={bubbleRef} aria-hidden="true" />
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

      <NavPeek peek={peek} caret={caret} onEnter={hold} onLeave={() => closePeek()} onGo={fromPeek} />

      {home && (
        <div className="nav-progress" ref={progressRef} aria-hidden="true">
          {CHAPTERS.map((c, i) => (
            <button key={c.id} tabIndex={-1} style={toneStyle(c.tone)} onClick={() => toChapter(c.id)} title={c.label} data-on={i === chapter || undefined}>
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
