import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { Brand } from './LogoMark';
import { Arrow } from './Reveal';
import { EMPLOYEE_LOGIN_URL, EMAIL } from '../content';
import { useScene } from '../gl/Scene';
import { useTheme } from '../theme';
import { NavGlance, type GlanceKey } from './NavGlance';

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

const LINKS: { label: string; to: string; section?: string; glance?: GlanceKey }[] = [
  { label: 'About', to: '/about', glance: 'about' },
  { label: 'Capabilities', to: '/', section: 'capabilities', glance: 'capabilities' },
  { label: 'How it works', to: '/', section: 'how' },
  { label: 'Research', to: '/research', glance: 'research' },
  { label: 'Careers', to: '/careers', glance: 'careers' },
  { label: 'Publications', to: '/publications', glance: 'publications' },
  { label: 'Contact', to: '/contact' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const hovering = useRef(false);
  const [glance, setGlance] = useState<GlanceKey | null>(null);
  const [glanceOpen, setGlanceOpen] = useState(false);
  const glanceTimer = useRef(0);
  const quietUntil = useRef(0); // just after a page change the cursor is still on the link it clicked
  const openGlance = (k?: GlanceKey) => {
    clearTimeout(glanceTimer.current);
    if (k && performance.now() < quietUntil.current) return;
    if (!k) {
      glanceTimer.current = window.setTimeout(() => setGlanceOpen(false), 120);
      return;
    }
    setGlance(k);
    glanceTimer.current = window.setTimeout(() => setGlanceOpen(true), glanceOpen ? 0 : 90);
  };
  const closeGlance = () => {
    clearTimeout(glanceTimer.current);
    glanceTimer.current = window.setTimeout(() => setGlanceOpen(false), 160);
  };
  const shutGlance = () => {
    clearTimeout(glanceTimer.current);
    quietUntil.current = performance.now() + 2200;
    setGlanceOpen(false);
  };
  const linksRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [pill, setPill] = useState({ x: 0, w: 0, on: false });
  const navRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { scrollTo } = useScene();

  useEffect(() => {
    let raf = 0;
    let lastY = window.scrollY;
    const onScroll = () => {
      raf = 0;
      const scrollY = window.scrollY;
      setScrolled(scrollY > 20);
      // tucks away while reading down the page, comes back the moment you scroll up
      if (Math.abs(scrollY - lastY) > 4) {
        setHidden(scrollY > 400 && scrollY > lastY);
        if (scrollY > lastY) setGlanceOpen(false);
        lastY = scrollY;
      }

      // Compute scroll progress (0 to 1) and set --p property on header
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0;
      if (navRef.current) {
        navRef.current.style.setProperty('--p', String(progress));
      }

      const mid = window.innerHeight / 2;
      const active = LINKS.find((l) => {
        if (!l.section) return false;
        const el = document.getElementById(l.section);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top <= mid && r.bottom >= mid;
      });
      setActiveSection(active?.section ?? null);
    };

    const handleScroll = () => {
      if (!raf) raf = requestAnimationFrame(onScroll);
    };

    onScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
    shutGlance();
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const onHover = (e: React.MouseEvent<HTMLElement>) => {
    hovering.current = true;
    const el = e.currentTarget;
    setPill({ x: el.offsetLeft, w: el.offsetWidth, on: true });
  };

  // With nothing hovered, the pill rests on the page (or home section) you are in.
  const rest = () => {
    const cur = linksRef.current?.querySelector<HTMLElement>('.nav-link.is-current, .nav-link.active');
    setPill(cur ? { x: cur.offsetLeft, w: cur.offsetWidth, on: true } : (p) => ({ ...p, on: false }));
  };
  useEffect(() => {
    if (hovering.current) return;
    const id = requestAnimationFrame(rest);
    window.addEventListener('resize', rest);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', rest);
    };
  }, [pathname, activeSection]);

  // Already home: a link to "/" changes nothing, so the brand and "Home" scroll back to the top themselves.
  const home = (e: React.MouseEvent) => {
    setOpen(false);
    if (pathname !== '/') return;
    e.preventDefault();
    scrollTo(0);
  };

  const go = (l: (typeof LINKS)[number]) => (e: React.MouseEvent) => {
    if (!l.section) return;
    e.preventDefault();
    setOpen(false);
    const el = document.getElementById(l.section);
    if (pathname === '/' && el) scrollTo(el);
    else navigate('/', { state: { scrollTo: l.section } });
  };

  return (
    <header
      ref={navRef}
      className={`nav ${scrolled ? 'is-scrolled' : ''} ${hidden && !open ? 'is-hidden' : ''} ${open ? 'menu-open' : ''}`}
      style={{ '--p': 0 } as CSSProperties}
      onMouseLeave={closeGlance}
    >
      <div className="nav-inner">
        <Link to="/" className="brand" aria-label="Bharattech Origin home" onClick={home}>
          <Brand />
        </Link>
        <nav
          ref={linksRef}
          className="nav-links"
          aria-label="Primary"
          onMouseLeave={() => {
            hovering.current = false;
            rest();
          }}
        >
          <span
            className="nav-pill"
            aria-hidden="true"
            style={{
              transform: `translateX(${pill.x}px)`,
              width: `${pill.w}px`,
              opacity: pill.on ? 1 : 0,
            }}
          />
          {LINKS.map((l) =>
            l.section ? (
              <a
                key={l.label}
                href={`#/`}
                data-section={l.section}
                onClick={(e) => {
                  shutGlance();
                  go(l)(e);
                }}
                onMouseEnter={(e) => {
                  onHover(e);
                  openGlance(l.glance);
                }}
                className={`nav-link ${pathname === '/' && activeSection === l.section ? 'is-current' : ''}`}
              >
                {l.label}
              </a>
            ) : (
              <NavLink
                key={l.label}
                to={l.to}
                onMouseEnter={(e) => {
                  onHover(e);
                  openGlance(l.glance);
                }}
                onClick={shutGlance}
                className="nav-link"
              >
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

      <div onMouseEnter={() => clearTimeout(glanceTimer.current)}>
        <NavGlance
          which={glance}
          open={glanceOpen && !hidden}
          onGo={shutGlance}
          onCapabilities={() => {
            shutGlance();
            const el = document.getElementById('capabilities');
            if (pathname === '/' && el) scrollTo(el);
            else navigate('/', { state: { scrollTo: 'capabilities' } });
          }}
        />
      </div>

      <div className="sheet" id="sheet" aria-hidden={!open}>
        <nav className="sheet-links" aria-label="Mobile">
          <Link to="/" className="sheet-link" onClick={home} tabIndex={open ? 0 : -1}>
            <span className="mono">00</span>Home
          </Link>
          {LINKS.map((l, i) => (
            <Link key={l.label} to={l.to} onClick={go(l)} className="sheet-link" tabIndex={open ? 0 : -1} data-section={l.section}>
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
