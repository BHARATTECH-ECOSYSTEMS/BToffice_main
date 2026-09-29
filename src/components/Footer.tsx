import { Link } from 'react-router';
import { Brand } from './LogoMark';
import { EMAIL, EMPLOYEE_LOGIN_URL } from '../content';
import { useScene } from '../gl/Scene';
import { Arrow } from './Reveal';

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
        <div className="footer-cta">
          <div>
            <p className="footer-kicker mono">Start a conversation</p>
            <h2 className="footer-title">
              Build what comes next <span className="accent">with us.</span>
            </h2>
          </div>
          <div className="footer-cta-actions">
            <Link to="/contact" className="btn btn-solid">
              Get in touch <Arrow size={13} />
            </Link>
            <a className="footer-mail" href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
          </div>
        </div>

        <div className="footer-grid">
          <div className="footer-lead">
            <Link to="/" className="brand" style={{ paddingLeft: 0 }} aria-label="Bharattech Origin home">
              <Brand />
            </Link>
            <p className="footer-statement">Building the operating system for intelligence. Made in Bharat.</p>
          </div>
          {COLS.map((c) => (
            <div className="footer-col" key={c.title}>
              <h4>{c.title}</h4>
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

        <div className="footer-base">
          <span>© {new Date().getFullYear()} Bharattech Origin</span>
          <button className="to-origin" onClick={() => scrollTo(0)}>
            Back to top <Arrow dir="up" size={12} />
          </button>
        </div>
      </div>
      <p className="footer-word" aria-hidden="true">
        ORIGIN
      </p>
    </footer>
  );
}
