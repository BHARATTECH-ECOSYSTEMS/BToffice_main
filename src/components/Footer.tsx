import { Link } from 'react-router';
import { Brand } from './ui';
import { useOpenLogin } from './Login';
import { LINKEDIN_URL } from '../content';
import { VerifyRequestBand } from './VerifyRequest';

const COLS: { title: string; links: { label: string; to?: string; login?: boolean }[] }[] = [
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Research', to: '/research' },
      { label: 'Careers', to: '/careers' },
      { label: 'Services', to: '/services' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Products',
    links: [
      { label: 'Rivinity', to: '/research' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
      { label: 'Employee login', login: true },
    ],
  },
];

export function Footer() {
  const openLogin = useOpenLogin();
  return (
    <footer className="footer">
      <div className="wrap">
        <VerifyRequestBand />
        <div className="footer-top">
          <div className="footer-lead">
            <Link to="/" aria-label="Bharattech Origin, home">
              <Brand size={34} />
            </Link>
            <p>Building the operating system for intelligence. Made in Bharat.</p>
            <a className="footer-social" href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
              </svg>
              LinkedIn
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
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
                      <button type="button" onClick={openLogin} aria-haspopup="dialog">
                        {l.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-base">
          <span>© {new Date().getFullYear()} Bharattech Origin</span>
        </div>
        <div className="footer-origin" aria-hidden="true">ORIGIN</div>
      </div>
    </footer>
  );
}
