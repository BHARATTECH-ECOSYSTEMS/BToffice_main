import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { Brand } from './LogoMark';
import { Arrow } from './Reveal';
import { EMPLOYEE_LOGIN_URL, EMAIL } from '../content';
import { useScene } from '../gl/Scene';

const LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Capabilities', to: '/', section: 'capabilities' },
  { label: 'Research', to: '/research' },
  { label: 'Careers', to: '/careers' },
  { label: 'Journal', to: '/blog' },
  { label: 'Contact', to: '/contact' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { scrollTo } = useScene();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    <header className={`nav ${scrolled ? 'is-scrolled' : ''} ${open ? 'menu-open' : ''}`}>
      <div className="nav-inner">
        <Link to="/" className="brand" aria-label="Bharattech Origin home">
          <Brand />
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((l) =>
            l.section ? (
              <a key={l.label} href={`#/`} onClick={go(l)} className="nav-link">
                {l.label}
              </a>
            ) : (
              <NavLink key={l.label} to={l.to} className="nav-link">
                {l.label}
              </NavLink>
            ),
          )}
          <a className="nav-cta" href={EMPLOYEE_LOGIN_URL} target="_blank" rel="noopener noreferrer">
            Employee login <Arrow dir="up-right" size={11} />
          </a>
        </nav>
        <button className="nav-menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="sheet">
          {open ? 'Close' : 'Menu'} <span className="burger" />
        </button>
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
