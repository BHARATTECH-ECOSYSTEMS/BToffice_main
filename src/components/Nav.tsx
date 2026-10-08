import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Arrow, Brand, toneStyle } from './ui';
import { CHAPTERS, EMAIL } from '../content';
import { useScene } from '../gl/Scene';
import { NavPeek, type PeekId } from './NavPeek';
import type { HueName } from '../gl/palette';

const LINKS: { label: string; to: string; section?: string; tone: HueName; peek: PeekId }[] = [
  { label: 'Research', to: '/research', tone: 'emerald', peek: 'research' },
  { label: 'Capabilities', to: '/', section: 'capabilities', tone: 'cobalt', peek: 'capabilities' },
  { label: 'Publications', to: '/publications', tone: 'violet', peek: 'publications' },
  { label: 'Careers', to: '/careers', tone: 'tangerine', peek: 'careers' },
  { label: 'About', to: '/about', tone: 'pink', peek: 'about' },
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
      else timer.current = window.setTimeout(() => set(id), 90);
    },
    [set],
  );
  const close = useCallback(
    (now = false) => {
      window.clearTimeout(timer.current);
      if (now) set(null);
      else timer.current = window.setTimeout(() => set(null), 220);
    },
    [set],
  );
  const hold = useCallback(() => window.clearTimeout(timer.current), []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { peek, open, close, hold };
}

/** Where the reader is in the home story: the chapter holding the middle of the screen, and how far through it. */
function useChapterProgress(enabled: boolean) {
  const [state, setState] = useState({ index: 0, fills: CHAPTERS.map(() => 0) });
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const mid = window.scrollY + window.innerHeight * 0.5;
      const starts = CHAPTERS.map((c) => {
        const el = document.getElementById(c.id);
        return el ? el.getBoundingClientRect().top + window.scrollY : Infinity;
      });
      const end = (document.querySelector('.footer') as HTMLElement | null)?.offsetTop ?? document.body.scrollHeight;
      let index = 0;
      const fills = starts.map((s, i) => {
        const e = i < starts.length - 1 ? starts[i + 1] : end;
        if (mid >= s) index = i;
        return Math.min(1, Math.max(0, (mid - s) / Math.max(1, e - s)));
      });
      setState((p) => (p.index === index && p.fills.every((f, i) => Math.abs(f - fills[i]) < 0.004) ? p : { index, fills }));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, [enabled]);
  return state;
}

export function Nav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { scrollTo, lenis } = useScene();
  const home = pathname === '/';
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(-1);
  const [inCaps, setInCaps] = useState(false);
  const linksRef = useRef<HTMLDivElement>(null);
  const [hl, setHl] = useState({ x: 0, w: 0, glide: false });
  const { index: chapter, fills } = useChapterProgress(home);
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
        const y = window.scrollY;
        setCompact(y > 24);
        if (Math.abs(y - lastY) > 6) {
          setHidden(y > 640 && y > lastY);
          lastY = y;
        }
        const caps = document.getElementById('capabilities')?.getBoundingClientRect();
        setInCaps(!!caps && caps.top < window.innerHeight * 0.5 && caps.bottom > window.innerHeight * 0.5);
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
    };
  }, []);

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
    const onScroll = () => Math.abs(window.scrollY - y0) > 80 && closePeek(true);
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

  // the highlight glides between links; the first time it appears it fades in place instead of sliding from 0
  useLayoutEffect(() => {
    const b = linksRef.current?.querySelectorAll<HTMLElement>('a, button')[lit];
    if (b) {
      setHl((p) => ({ x: b.offsetLeft, w: b.offsetWidth, glide: p.w > 0 }));
      const r = b.getBoundingClientRect();
      setCaret(r.left + r.width / 2);
    }
  }, [lit]);

  const go = useCallback(
    (l: (typeof LINKS)[number]) => {
      setOpen(false);
      if (!l.section) return;
      if (home) {
        const el = document.getElementById(l.section);
        if (el) scrollTo(el);
      } else navigate('/', { state: { scrollTo: l.section } });
    },
    [home, navigate, scrollTo],
  );

  const fromPeek = useCallback(
    (to: string, section?: string) => {
      closePeek(true);
      if (to === pathname && section) {
        const el = document.getElementById(section);
        if (el) scrollTo(el);
      } else if (to === pathname) scrollTo(0);
      else navigate(to, section ? { state: { scrollTo: section } } : undefined);
    },
    [closePeek, navigate, pathname, scrollTo],
  );

  const toChapter = (id: string) => {
    const el = document.getElementById(id);
    if (el) scrollTo(el);
  };

  const peekProps = (l: (typeof LINKS)[number], i: number) => ({
    onPointerEnter: (e: React.PointerEvent) => {
      setHover(i);
      if (e.pointerType === 'mouse' && fine()) openPeek(l.peek);
    },
    onFocus: () => setHover(i),
    onBlur: () => setHover(-1),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== 'ArrowDown') return;
      e.preventDefault();
      openPeek(l.peek);
      window.setTimeout(() => document.querySelector<HTMLElement>(`#peek-${l.peek} button`)?.focus(), 160);
    },
    'aria-expanded': peek === l.peek,
    'aria-controls': `peek-${l.peek}`,
  });

  const current = CHAPTERS[chapter];
  const ring = 2 * Math.PI * 6.5;

  return (
    <header className="nav" data-peek={peek || undefined} data-hidden={(hidden && !open && !peek) || undefined} data-compact={compact || open || undefined} data-open={open || undefined}>
      <div className="nav-bar">
        <span className="nav-glass" aria-hidden="true" />
        <Link to="/" className="nav-brand" aria-label="Bharattech Origin, home" onClick={() => home && scrollTo(0)}>
          <Brand />
        </Link>

        {home && (
          <button className="nav-readout" style={toneStyle(current.tone)} onClick={() => toChapter(current.id)} aria-label={`Chapter ${chapter + 1}: ${current.label}`}>
            <svg className="nav-ring" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" className="nav-ring-track" />
              <circle cx="8" cy="8" r="6.5" className="nav-ring-fill" style={{ strokeDasharray: ring, strokeDashoffset: ring * (1 - fills[chapter]) }} />
            </svg>
            <span className="nav-readout-num">{String(chapter + 1).padStart(2, '0')}</span>
            <span className="nav-readout-label" key={current.id}>
              {current.label}
            </span>
          </button>
        )}

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
            style={{ transform: `translateX(${hl.x}px)`, width: hl.w, ...(lit >= 0 ? toneStyle(LINKS[lit].tone) : {}) }}
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
          <Link to="/contact" className="nav-cta">
            <span>Get in touch</span>
            <span className="nav-cta-icon">
              <Arrow dir="up-right" size={13} />
            </span>
          </Link>
          <button className="nav-burger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="nav-sheet" aria-label={open ? 'Close menu' : 'Open menu'}>
            <span />
            <span />
          </button>
        </div>
      </div>

      <NavPeek peek={peek} caret={caret} onEnter={hold} onLeave={() => closePeek()} onGo={fromPeek} />

      {home && (
        <div className="nav-progress" aria-hidden="true">
          {CHAPTERS.map((c, i) => (
            <button key={c.id} tabIndex={-1} style={toneStyle(c.tone)} onClick={() => toChapter(c.id)} title={c.label} data-on={i === chapter || undefined}>
              <span style={{ transform: `scaleX(${fills[i]})` }} />
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
          <Link to="/contact" className="btn btn-primary" tabIndex={open ? 0 : -1}>
            Get in touch <Arrow />
          </Link>
          <a href={`mailto:${EMAIL}`} className="nav-sheet-mail" tabIndex={open ? 0 : -1}>
            {EMAIL}
          </a>
        </div>
      </div>
      <button className="nav-scrim" aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)} />
    </header>
  );
}
