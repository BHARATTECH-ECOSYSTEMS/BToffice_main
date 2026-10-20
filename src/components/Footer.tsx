import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Brand } from './ui';
import { useOpenLogin } from './Login';
import { EMAIL_HREF, INSTAGRAM_URL, LINKEDIN_URL } from '../content';
import { VerifyRequestButton } from './VerifyRequest';

const COLS: { title: string; links: { label: string; to?: string; login?: boolean }[] }[] = [
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Research', to: '/research' },
      { label: 'Careers', to: '/careers' },
      { label: 'Blog', to: '/blog' },
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

const LINKEDIN_ICON = <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />;

// The CONNECT pill's icons (.footer-connect in base.css), in the reel's order; each glows in its own colour on
// hover (data-net). Only those with an `href` are links: GitHub, X, YouTube and Discord are shown as icons only
// until the company has accounts there.
type Social = { net: string; label: string; href?: string; icon: ReactNode };
const SOCIALS: Social[] = [
  {
    net: 'github',
    label: 'GitHub',
    icon: <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />,
  },
  {
    net: 'x',
    label: 'X',
    icon: <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z" />,
  },
  {
    net: 'linkedin',
    label: 'LinkedIn',
    href: LINKEDIN_URL,
    icon: LINKEDIN_ICON,
  },
  {
    net: 'instagram',
    label: 'Instagram',
    href: INSTAGRAM_URL,
    icon: (
      <>
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4.3" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.6" cy="6.4" r="1.3" />
      </>
    ),
  },
  {
    net: 'youtube',
    label: 'YouTube',
    icon: <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />,
  },
  {
    net: 'email',
    label: 'Email',
    href: EMAIL_HREF,
    icon: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M3.5 7l8.5 6.2L20.5 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    net: 'discord',
    label: 'Discord',
    icon: <path d="M20.32 4.37A19.8 19.8 0 0 0 15.4 2.8l-.62 1.27a18.3 18.3 0 0 0-5.5 0L8.66 2.8a19.7 19.7 0 0 0-4.93 1.53C.6 9.04-.25 13.6.17 18.1a19.9 19.9 0 0 0 6.03 3.05l1.3-1.77a12.9 12.9 0 0 1-2.04-.98l.5-.39a14.2 14.2 0 0 0 12.1 0l.5.39c-.65.39-1.33.71-2.05.98l1.3 1.77a19.8 19.8 0 0 0 6.04-3.05c.5-5.24-.84-9.75-3.53-13.73zM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.95-2.42 2.16-2.42c1.2 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z" />,
  },
];

const CONNECT = 'CONNECT';

/** True once the footer has come into view, so its entrance plays once. */
function useFooterSeen() {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setSeen(true);
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return { ref, seen };
}

export function Footer() {
  const openLogin = useOpenLogin();
  const { ref, seen } = useFooterSeen();
  return (
    // its parts rise in one after another when it comes into view (base.css)
    <footer ref={ref} className="footer" data-in={seen || undefined}>
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-lead">
            <Link to="/" aria-label="Bharattech Origin, home">
              <Brand size={34} />
            </Link>
            <p>Building the operating system for intelligence. Made in Bharat.</p>
            {/* The reel's "connect" pill: it spells CONNECT; hovering it flips the letters one after another into the
                icons, and back on leave (base.css). Touch screens, which can't hover, always show the icons. */}
            <nav className="footer-connect" aria-label="Follow and contact us">
              {[...CONNECT].map((ch, i) => {
                const s = SOCIALS[i];
                const inner = (
                  <>
                    <span className="footer-connect-flip" aria-hidden="true">
                      <span className="footer-connect-face">{ch}</span>
                      <span className="footer-connect-face is-icon">
                        <svg viewBox="0 0 24 24">{s.icon}</svg>
                      </span>
                    </span>
                    {/* the name that pops up above the icon; on a link it is also the accessible name */}
                    <span className="footer-connect-tip">
                      {s.label}
                      {s.href && <span className="sr-only"> (opens in a new tab)</span>}
                    </span>
                  </>
                );
                const style = { '--k': i } as CSSProperties;
                return s.href ? (
                  <a key={s.net} className="footer-connect-slot" style={style} data-net={s.net} href={s.href} target="_blank" rel="noopener noreferrer">
                    {inner}
                  </a>
                ) : (
                  // not a link yet: an icon only, kept out of the tab order and away from screen readers
                  <span key={s.net} className="footer-connect-slot is-icon-only" style={style} data-net={s.net} aria-hidden="true">
                    {inner}
                  </span>
                );
              })}
            </nav>
            <VerifyRequestButton />
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
