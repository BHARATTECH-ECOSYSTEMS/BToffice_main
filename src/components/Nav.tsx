import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { Brand } from './LogoMark';
import { Arrow } from './Reveal';
import { EMPLOYEE_LOGIN_URL, EMAIL } from '../content';
import { useScene } from '../gl/Scene';
import { NavGlance, type GlanceKey } from './NavGlance';
import { playCurtain } from './PageCurtain';

const LINKS: { label: string; to: string; section?: string; glance?: GlanceKey }[] = [
  { label: 'Research', to: '/research', glance: 'research' },
  { label: 'Publications', to: '/publications', glance: 'publications' },
  { label: 'Capabilities', to: '/', section: 'capabilities', glance: 'capabilities' },
  { label: 'Career', to: '/careers', glance: 'careers' },
  { label: 'About', to: '/about', glance: 'about' },
  { label: 'Contact', to: '/contact', glance: 'contact' },
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

  // A section of the home page plays the same curtain as a page: it covers, the page jumps there, it lifts.
  const toSection = (section: string, label: string) => {
    playCurtain(label, () => {
      const el = document.getElementById(section);
      if (pathname === '/' && el) scrollTo(el, true);
      else navigate('/', { state: { scrollTo: section } });
    });
  };
  const go = (l: (typeof LINKS)[number]) => (e: React.MouseEvent) => {
    if (!l.section) return;
    e.preventDefault();
    setOpen(false);
    toSection(l.section, l.label);
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
                  onHover(e);
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
                onClick={(e) => {
                  shutGlance();
                  onHover(e);
                }}
                className="nav-link"
              >
                {l.label}
              </NavLink>
            ),
          )}
          <a className="nav-cta" href={EMPLOYEE_LOGIN_URL} target="_blank" rel="noopener noreferrer">
            Employee login <Arrow dir="up-right" size={11} />
          </a>
        </nav>
        <div className="nav-mobile">
          <button className="nav-menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="sheet">
            {open ? 'Close' : 'Menu'} <span className="burger" />
          </button>
        </div>
      </div>

      <div onMouseEnter={() => clearTimeout(glanceTimer.current)}>
        <NavGlance
          which={glance}
          open={glanceOpen && !hidden}
          onGo={shutGlance}
          onCapabilities={() => {
            shutGlance();
            toSection('capabilities', 'Capabilities');
          }}
          onSection={(section, label) => {
            shutGlance();
            toSection(section, label);
          }}
        />
      </div>

      <div className="sheet" id="sheet" aria-hidden={!open}>
        <nav className="sheet-links" aria-label="Mobile">
          <Link to="/" className="sheet-link" onClick={home} tabIndex={open ? 0 : -1}>
            Home
          </Link>
          {LINKS.map((l) => (
            <Link key={l.label} to={l.to} onClick={go(l)} className="sheet-link" tabIndex={open ? 0 : -1} data-section={l.section}>
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
