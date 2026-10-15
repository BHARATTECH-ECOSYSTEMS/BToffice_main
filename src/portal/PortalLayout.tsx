import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Brand } from '../components/ui';
import { usePointerBloom } from '../components/usePointerBloom';
import { TOOLS, type PortalIconName } from './data';
import { didSignOut, endSession, ROLE_NAME, setRole, useSession, type Role } from './session';
import { HelpModal } from './Help';
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
  /** Sub-pages listed under this item; the item itself then opens and closes them. */
  children?: { to: string; label: string }[];
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
  {
    label: 'HR OPS',
    items: [
      { to: '/portal/interview', label: 'Interview', icon: 'clipboard', adminOnly: true },
      {
        to: '/portal/verification',
        label: 'Verification',
        icon: 'shield',
        adminOnly: true,
        children: [
          { to: '/portal/verification/company', label: 'Company Verification' },
          { to: '/portal/verification/employee', label: 'Employee Verification' },
        ],
      },
    ],
  },
];

/**
 * The signed-in shell: sidebar, top bar and the page. Without a session it sends the visitor back to the site
 * with the login open. It is not inside the marketing Layout, so the site's nav, footer and page effects stay out.
 */
export function PortalLayout() {
  const session = useSession();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const signOut = useSignOut();
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
                      {i.children ? (
                        <NavGroup item={i} />
                      ) : i.href ? (
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
          <div className="p-side-foot">
            <NavLink to="/portal/settings" className="p-nav-link">
              <PIcon name="settings" />
              <span>Settings</span>
            </NavLink>
            {/* icon only; the name shows as a tip on hover or keyboard focus, and stays the button's accessible name */}
            <button type="button" className="p-nav-link p-signout" onClick={signOut} aria-label="Sign out" data-tip="Sign out">
              <PIcon name="logout" />
            </button>
          </div>
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
            <UserMenu name={session.name} email={session.email} role={session.role} photo={session.photo} onHelp={() => setHelpOpen(true)} onSignOut={signOut} />
          </header>
          {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
          <main id="portal-main" className="p-main" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>
    </PortalDataProvider>
  );
}

/**
 * Demo only, while the pages are being built: switches between the admin, sub admin and employee versions.
 * Remove it once roles come from the real sign-in, so people only see the role they logged in with.
 */
function RoleSwitch({ role }: { role: Role }) {
  return (
    <div className="p-role" role="group" aria-label="View the portal as">
      <span className="p-role-label">View as</span>
      {(['admin', 'subadmin', 'employee'] as Role[]).map((r) => (
        <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)}>
          {ROLE_NAME[r]}
        </button>
      ))}
    </div>
  );
}

/** A sidebar item with sub-pages. It starts open while one of them is showing. */
function NavGroup({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const inside = pathname.startsWith(item.to);
  const [open, setOpen] = useState(inside);
  useEffect(() => {
    if (inside) setOpen(true);
  }, [inside]);
  return (
    <>
      <button type="button" className={`p-nav-link p-nav-parent${inside ? ' is-inside' : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <PIcon name={item.icon} />
        <span>{item.label}</span>
        <PIcon name="chevron" size={14} />
      </button>
      {open && (
        <ul className="p-nav-sub">
          {item.children!.map((c) => (
            <li key={c.to}>
              <NavLink to={c.to} className="p-nav-link">
                <span>{c.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function useSignOut() {
  const navigate = useNavigate();
  return () => {
    endSession();
    navigate('/', { replace: true });
  };
}

function UserMenu({ name, email, role, photo, onHelp, onSignOut }: { name: string; email: string; role: Role; photo?: string; onHelp: () => void; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
          {photo ? <img src={photo} alt="" /> : initials(name)}
        </span>
        <span className="p-user-name">{name}</span>
        <PIcon name="chevron" size={14} />
      </button>
      {open && (
        <div className="p-user-menu">
          <p className="p-user-meta">
            <strong>{name}</strong>
            <span>{email}</span>
            <span className="p-user-role">{ROLE_NAME[role]}</span>
          </p>
          <button type="button" className="p-user-item" aria-haspopup="dialog" onClick={() => (setOpen(false), onHelp())}>
            <PIcon name="help" /> Help
          </button>
          <button type="button" className="p-user-item" onClick={onSignOut}>
            <PIcon name="logout" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
