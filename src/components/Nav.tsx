import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Arrow, Brand, toneStyle } from './ui';
import { CHAPTERS, EMAIL, EMAIL_HREF, EMPLOYEE_LOGIN_URL } from '../content';
import { useScene } from '../gl/Scene';
import { NavPeek, type PeekId } from './NavPeek';
import type { HueName } from '../gl/palette';
import { pageScroll, trackBox } from './trackBox';

const LINKS: { label: string; to: string; section?: string; tone: HueName; peek?: PeekId }[] = [
  { label: 'Research', to: '/research', tone: 'saffron', peek: 'research' },
  { label: 'Services', to: '/services', tone: 'violet', peek: 'services' },
  { label: 'Capabilities', to: '/', section: 'capabilities', tone: 'tangerine', peek: 'capabilities' },
  { label: 'Careers', to: '/careers', tone: 'saffron', peek: 'careers' },
  { label: 'About', to: '/about', tone: 'violet', peek: 'about' },
  { label: 'Contact', to: '/contact', tone: 'tangerine', peek: 'contact' },
];

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
  const [hover, setHover] = useState(-1);
  const [inCaps, setInCaps] = useState(false);
  const linksRef = useRef<HTMLDivElement>(null);
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
      // a short glide in, not the whole way: gliding through every pinned film in between stuttered
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
      <div className="nav-bar">
        <span className="nav-glass" aria-hidden="true" />
        <Link to="/" className="nav-brand" aria-label="Bharattech Origin, home" onClick={() => home && scrollTo(0)}>
          <Brand />
        </Link>

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
              <button key={l.label} style={toneStyle(l.tone, { '--i': i } as CSSProperties)} {...peekProps(l, i)} onClick={() => go(l)} aria-current={i === active || undefined}>
                <i aria-hidden="true" />
                {l.label}
              </button>
            ) : (
              <Link key={l.label} to={l.to} style={toneStyle(l.tone, { '--i': i } as CSSProperties)} {...peekProps(l, i)} aria-current={i === active ? 'page' : undefined}>
                <i aria-hidden="true" />
                {l.label}
              </Link>
            ),
          )}
        </nav>

        <div className="nav-end">
          <a href={EMPLOYEE_LOGIN_URL} className="nav-cta" target="_blank" rel="noopener noreferrer">
            <span>Employee login</span>
            <span className="nav-cta-icon">
              <Arrow dir="up-right" size={13} />
            </span>
          </a>
          <button className="nav-burger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="nav-sheet" aria-label={open ? 'Close menu' : 'Open menu'}>
            <span />
            <span />
          </button>
        </div>
      </div>

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
          <a href={EMPLOYEE_LOGIN_URL} className="btn btn-primary" tabIndex={open ? 0 : -1} target="_blank" rel="noopener noreferrer">
            Employee login <Arrow />
          </a>
          <a href={EMAIL_HREF} target="_blank" rel="noopener noreferrer" className="nav-sheet-mail" tabIndex={open ? 0 : -1}>
            {EMAIL}
          </a>
        </div>
      </div>
      <button className="nav-scrim" aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)} />
    </header>
  );
}
