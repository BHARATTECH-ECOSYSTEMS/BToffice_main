import { Link } from 'react-router';
import { Arrow, Brand } from './ui';
import { EMAIL, EMPLOYEE_LOGIN_URL, HQ } from '../content';

const COLS: { title: string; links: { label: string; to?: string; href?: string }[] }[] = [
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Research', to: '/research' },
      { label: 'Careers', to: '/careers' },
      { label: 'Publications', to: '/publications' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Work',
    links: [
      { label: 'Rivinity', to: '/research' },
      { label: 'CollegeCue', href: '#' },
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
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-lead">
            <Link to="/" aria-label="Bharattech Origin, home">
              <Brand size={32} />
            </Link>
            <p>Building the operating system for intelligence. Made in Bharat.</p>
            <a className="footer-mail" href={`mailto:${EMAIL}`}>
              {EMAIL} <Arrow dir="up-right" size={13} />
            </a>
          </div>
          {COLS.map((c) => (
            <div className="footer-col" key={c.title}>
              <h4>{c.title}</h4>
              <ul>
                {c.links.map((l) => (
                  <li key={l.label}>{l.to ? <Link to={l.to}>{l.label}</Link> : <a href={l.href}>{l.label}</a>}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-base">
          <span>© {new Date().getFullYear()} Bharattech Origin</span>
          <span>{HQ}</span>
        </div>
      </div>
    </footer>
  );
}
