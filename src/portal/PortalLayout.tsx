import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Brand } from '../components/ui';
import { usePointerBloom } from '../components/usePointerBloom';
import { TOOLS, type PortalIconName } from './data';
import { didSignOut, endSession, setRole, useSession, type Role } from './session';
import { PortalDataProvider } from './store';
import { initials, PIcon } from './ui';
import '../styles/portal.css';

interface NavItem {
  to: string;
  label: string;
  icon: PortalIconName;
  adminOnly?: boolean;
  /** An external tool's address: the link opens the tool itself, in a new tab. */
  href?: string;
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Navigation',
    items: [
      { to: '/portal', label: 'Dashboard', icon: 'grid' },
      { to: '/portal/people', label: 'People', icon: 'users' },
    ],
  },
  { label: 'Learning', items: [{ to: '/portal/lms', label: 'LMS Platform', icon: 'cap' }] },
  {
    label: 'Resources',
    items: [
      { to: '/portal/resources', label: 'Resources', icon: 'book' },
      // A tool with an address opens directly; until then its own page says it isn't connected yet.
      ...TOOLS.filter((t) => t.inNav).map((t) => ({ to: `/portal/tools/${t.id}`, href: t.url || undefined, label: t.navLabel ?? t.name, icon: t.icon, adminOnly: t.adminOnly })),
      { to: '/portal/certificates', label: 'Certificates', icon: 'award' },
    ],
  },
  { label: 'Organisation', items: [{ to: '/portal/policy', label: 'Policy & Compliance', icon: 'file' }] },
  { label: 'Interview', items: [{ to: '/portal/tests', label: 'Tests', icon: 'clipboard', adminOnly: true }] },
];

/**
 * The signed-in shell: sidebar, top bar and the page. Without a session it sends the visitor back to the site
 * with the login open. It is not inside the marketing Layout, so the site's nav, footer and page effects stay out.
 */
export function PortalLayout() {
  const session = useSession();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  usePointerBloom();

  // each page starts at the top, and the phone menu closes once a page is picked
  useEffect(() => {
    window.scrollTo(0, 0);
    setMenuOpen(false);
  }, [pathname]);

  if (!session) return <Navigate to="/" replace state={didSignOut() ? undefined : { openLogin: true }} />;

  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || session.role === 'admin') })).filter((g) => g.items.length);

  return (
    <PortalDataProvider session={session}>
      <div className="portal" data-menu={menuOpen || undefined}>
        <a className="skip" href="#portal-main" onClick={(e) => (e.preventDefault(), document.getElementById('portal-main')?.focus())}>
          Skip to content
        </a>
        {/* data-lenis-prevent: the site's smooth scroll takes every wheel event for the page; without it this list could never scroll */}
        <aside className="p-side" id="portal-nav" aria-label="Portal" data-lenis-prevent>
          <Link to="/portal" className="p-brand" aria-label="Bharattech Origin portal, dashboard">
            <Brand size={26} />
          </Link>
          <nav className="p-nav">
            {groups.map((g) => (
              <div key={g.label} className="p-nav-group">
                <p className="p-nav-label">{g.label}</p>
                <ul>
                  {g.items.map((i) => (
                    <li key={i.to}>
                      {i.href ? (
                        <a href={i.href} target="_blank" rel="noreferrer" className="p-nav-link">
                          <PIcon name={i.icon} />
                          <span>{i.label}</span>
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        <NavLink to={i.to} end={i.to === '/portal'} className="p-nav-link">
                          <PIcon name={i.icon} />
                          <span>{i.label}</span>
                        </NavLink>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <Link to="/" className="p-nav-link p-nav-home">
            <PIcon name="home" />
            <span>Back to website</span>
          </Link>
        </aside>
        <button type="button" className="p-scrim" aria-label="Close menu" tabIndex={-1} onClick={() => setMenuOpen(false)} />

        <div className="p-body">
          <header className="p-top">
            <button
              type="button"
              className="p-icon-btn p-menu-btn"
              aria-expanded={menuOpen}
              aria-controls="portal-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <PIcon name={menuOpen ? 'close' : 'menu'} />
            </button>
            <RoleSwitch role={session.role} />
            <UserMenu name={session.name} email={session.email} role={session.role} />
          </header>
          <main id="portal-main" className="p-main" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>
    </PortalDataProvider>
  );
}

/** Demo only: shows the admin or employee version of every page. Remove once roles come from the real sign-in. */
function RoleSwitch({ role }: { role: Role }) {
  return (
    <div className="p-role" role="group" aria-label="View the portal as">
      <span className="p-role-label">View as</span>
      {(['employee', 'admin'] as Role[]).map((r) => (
        <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)}>
          {r === 'admin' ? 'Admin' : 'Employee'}
        </button>
      ))}
    </div>
  );
}

function UserMenu({ name, email, role }: { name: string; email: string; role: Role }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="p-user" ref={ref}>
      <button type="button" className="p-user-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        <span className="p-avatar" aria-hidden="true">
          {initials(name)}
        </span>
        <span className="p-user-name">{name}</span>
        <PIcon name="chevron" size={14} />
      </button>
      {open && (
        <div className="p-user-menu">
          <p className="p-user-meta">
            <strong>{name}</strong>
            <span>{email}</span>
            <span className="p-user-role">{role === 'admin' ? 'Admin' : 'Employee'}</span>
          </p>
          <Link to="/" className="p-user-item">
            <PIcon name="home" /> Back to website
          </Link>
          <button
            type="button"
            className="p-user-item"
            onClick={() => {
              endSession();
              navigate('/', { replace: true });
            }}
          >
            <PIcon name="logout" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
