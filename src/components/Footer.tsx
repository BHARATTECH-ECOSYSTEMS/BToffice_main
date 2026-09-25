import { Link } from 'react-router';
import { Brand } from './LogoMark';
import { EMAIL, EMPLOYEE_LOGIN_URL } from '../content';
import { useScene } from '../gl/Scene';

const COLS: { title: string; links: { label: string; to?: string; href?: string }[] }[] = [
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Research', to: '/research' },
      { label: 'Careers', to: '/careers' },
      { label: 'Journal', to: '/blog' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Products',
    links: [
      { label: 'Rivinity', to: '/research' },
      { label: 'Collegecue', href: '#' },
      { label: 'RECAG', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
      { label: 'Employee login', href: EMPLOYEE_LOGIN_URL },
    ],
  },
];

export function Footer() {
  const { scrollTo } = useScene();
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-lead">
            <Link to="/" className="brand" style={{ paddingLeft: 0 }} aria-label="Bharattech Origin home">
              <Brand />
            </Link>
            <p className="footer-statement">Building the operating system for intelligence.</p>
            <a className="link" href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
          </div>
          {COLS.map((c) => (
            <div className="footer-col" key={c.title}>
              <h4 className="mono">{c.title}</h4>
              <ul>
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link to={l.to}>{l.label}</Link>
                    ) : (
                      <a href={l.href} {...(l.href?.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-base mono">
          <span>© {new Date().getFullYear()} Bharattech Origin · Built in Bharat</span>
          <button className="to-origin mono" onClick={() => scrollTo(0)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" />
              <circle cx="8" cy="8" r="1.6" fill="currentColor" />
            </svg>
            Return to origin
          </button>
        </div>
      </div>
    </footer>
  );
}
