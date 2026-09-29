import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { Brand } from './LogoMark';
import { Arrow } from './Reveal';
import { EMPLOYEE_LOGIN_URL, EMAIL } from '../content';
import { useScene } from '../gl/Scene';
import { useTheme } from '../theme';

function ThemeToggle({ className = '', tabIndex }: { className?: string; tabIndex?: number }) {
  const [theme, toggle] = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button className={`theme-toggle ${className}`} onClick={toggle} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`} tabIndex={tabIndex}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === 'dark' ? (
          <path d="M12 4V2M12 22v-2M4.9 4.9L3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        )}
      </svg>
    </button>
  );
}

const LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Capabilities', to: '/', section: 'capabilities' },
  { label: 'How it works', to: '/', section: 'how' },
  { label: 'Research', to: '/research' },
  { label: 'Careers', to: '/careers' },
  { label: 'Journal', to: '/blog' },
  { label: 'Contact', to: '/contact' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const [pill, setPill] = useState<{ x: number; w: number; on: boolean }>({ x: 0, w: 0, on: false });
  const bar = useRef<HTMLElement>(null);
  const links = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { scrollTo } = useScene();

  // Hide while reading downwards, come back on the way up; track progress and the section in view.
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 40);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 480);
        last = y;
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.current?.style.setProperty('--p', String(max > 0 ? y / max : 0));
      const mid = window.innerHeight / 2;
      const found = LINKS.find((l) => {
        const el = l.section && document.getElementById(l.section);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top <= mid && r.bottom >= mid;
      });
      setSection(found?.section ?? null);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
    };
  }, [pathname]);

  const hover = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    setPill({ x: el.offsetLeft, w: el.offsetWidth, on: true });
  };

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (l: (typeof LINKS)[number]) => (e: React.MouseEvent) => {
    if (!l.section) return;
    e.preventDefault();
    setOpen(false);
    const el = document.getElementById(l.section);
    if (pathname === '/' && el) scrollTo(el);
    else navigate('/', { state: { scrollTo: l.section } });
  };

  return (
    <header ref={bar} className={`nav ${scrolled ? 'is-scrolled' : ''} ${hidden && !open ? 'is-hidden' : ''} ${open ? 'menu-open' : ''}`}>
      <div className="nav-inner">
        <Link to="/" className="brand" aria-label="Bharattech Origin home">
          <Brand />
        </Link>
        <nav ref={links} className="nav-links" aria-label="Primary" onMouseLeave={() => setPill((p) => ({ ...p, on: false }))}>
          <span className="nav-pill" aria-hidden="true" style={{ transform: `translateX(${pill.x}px)`, width: pill.w, opacity: pill.on ? 1 : 0 }} />
          {LINKS.map((l) =>
            l.section ? (
              <a key={l.label} href={`#/`} onClick={go(l)} onMouseEnter={hover} className={`nav-link ${pathname === '/' && section === l.section ? 'is-current' : ''}`}>
                {l.label}
              </a>
            ) : (
              <NavLink key={l.label} to={l.to} onMouseEnter={hover} className="nav-link">
                {l.label}
              </NavLink>
            ),
          )}
          <ThemeToggle />
          <a className="nav-cta" href={EMPLOYEE_LOGIN_URL} target="_blank" rel="noopener noreferrer">
            Employee login <Arrow dir="up-right" size={11} />
          </a>
        </nav>
        <div className="nav-mobile">
          <ThemeToggle />
          <button className="nav-menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="sheet">
          {open ? 'Close' : 'Menu'} <span className="burger" />
          </button>
        </div>
        <span className="nav-progress" aria-hidden="true" />
      </div>

      <div className="sheet" id="sheet" aria-hidden={!open}>
        <nav className="sheet-links" aria-label="Mobile">
          <Link to="/" className="sheet-link" tabIndex={open ? 0 : -1}>
            <span className="mono">00</span>Home
          </Link>
          {LINKS.map((l, i) => (
            <Link key={l.label} to={l.to} onClick={go(l)} className="sheet-link" tabIndex={open ? 0 : -1}>
              <span className="mono">{String(i + 1).padStart(2, '0')}</span>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="sheet-foot">
          <a href={`mailto:${EMAIL}`} className="link muted" tabIndex={open ? 0 : -1}>
            {EMAIL}
          </a>
          <a className="btn btn-solid" href={EMPLOYEE_LOGIN_URL} target="_blank" rel="noopener noreferrer" tabIndex={open ? 0 : -1}>
            Employee login <Arrow dir="up-right" />
          </a>
        </div>
      </div>
    </header>
  );
}
