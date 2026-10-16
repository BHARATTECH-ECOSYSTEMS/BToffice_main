import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Brand } from '../components/ui';
import { usePointerBloom } from '../components/usePointerBloom';
import { TOOLS, type PortalIconName } from './data';
import { didSignOut, endSession, ROLE_NAME, setRole, useSession, type Role } from './session';
import { HelpModal } from './Help';
import { PortalDataProvider } from './store';
import { initials, PIcon } from './ui';
import '../styles/portal.css';

interface MenuLink {
  to: string;
  label: string;
  icon: PortalIconName;
  adminOnly?: boolean;
  /** An external tool's address: the link opens the tool itself, in a new tab. */
  href?: string;
}

/** A top-bar pill: either a page, or a menu of pages grouped under small headings. */
type TopItem =
  | { key: string; label: string; to: string; adminOnly?: boolean }
  | { key: string; label: string; sections: { heading: string; links: MenuLink[] }[]; adminOnly?: boolean };

const TOP: TopItem[] = [
  { key: 'overview', label: 'Overview', to: '/portal' },
  { key: 'people', label: 'People', to: '/portal/people' },
  { key: 'learning', label: 'Learning', to: '/portal/lms' },
  {
    key: 'resources',
    label: 'Resources',
    sections: [
      {
        heading: 'Library',
        links: [
          { to: '/portal/resources', label: 'Resources', icon: 'book' },
          { to: '/portal/certificates', label: 'Certificates', icon: 'award' },
          { to: '/portal/policy', label: 'Policy & Compliance', icon: 'file' },
        ],
      },
      {
        heading: 'Tools',
        // A tool with an address opens directly; until then its own page says it isn't connected yet.
        links: TOOLS.filter((t) => t.inNav).map((t) => ({ to: `/portal/tools/${t.id}`, href: t.url || undefined, label: t.navLabel ?? t.name, icon: t.icon, adminOnly: t.adminOnly })),
      },
    ],
  },
  {
    key: 'hrops',
    label: 'HR OPS',
    adminOnly: true,
    sections: [
      {
        heading: 'Hiring',
        links: [
          { to: '/portal/interview', label: 'Interview', icon: 'clipboard' },
          { to: '/portal/verification/company', label: 'Company Verification', icon: 'shield' },
          { to: '/portal/verification/employee', label: 'Employee Verification', icon: 'users' },
          { to: '/portal/verification/requests', label: 'Verification Requests', icon: 'check' },
        ],
      },
    ],
  },
  { key: 'community', label: 'Community', to: '/portal/community' },
];

/** Which top pill the current page belongs to; none for pages outside them, like Settings. */
function activeKey(items: TopItem[], pathname: string) {
  const under = (to: string) => pathname === to || pathname.startsWith(`${to}/`);
  return items.find((i) => ('to' in i ? (i.to === '/portal' ? pathname.replace(/\/$/, '') === '/portal' : under(i.to)) : i.sections.some((s) => s.links.some((l) => under(l.to)))))?.key;
}

/**
 * The signed-in shell: a top bar of pills over the page, all inside one rounded frame. Without a session it sends
 * the visitor back to the site with the login open. It is not inside the marketing Layout, so the site's nav,
 * footer and page effects stay out.
 */
export function PortalLayout() {
  const session = useSession();
  const { pathname } = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const signOut = useSignOut();
  usePointerBloom();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!session) return <Navigate to="/" replace state={didSignOut() ? undefined : { openLogin: true }} />;

  const isAdmin = session.role === 'admin';
  const items = TOP.filter((i) => !i.adminOnly || isAdmin)
    .map((i) => ('sections' in i ? { ...i, sections: i.sections.map((s) => ({ ...s, links: s.links.filter((l) => !l.adminOnly || isAdmin) })) } : i));

  return (
    <PortalDataProvider session={session}>
      <div className="portal">
        <a className="skip" href="#portal-main" onClick={(e) => (e.preventDefault(), document.getElementById('portal-main')?.focus())}>
          Skip to content
        </a>
        <div className="p-frame">
          <header className="p-top">
            <Link to="/portal" className="p-brand" aria-label="Bharattech Origin portal, overview">
              <Brand size={22} />
            </Link>
            <TopNav items={items} active={activeKey(items, pathname)} />
            <div className="p-top-end">
              <UserMenu name={session.name} email={session.email} role={session.role} photo={session.photo} onHelp={() => setHelpOpen(true)} onSignOut={signOut} />
            </div>
          </header>
          {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
          <main id="portal-main" className="p-main" tabIndex={-1}>
            {/* keyed by page, so each page's cards rise in again when it opens */}
            <div className="p-page" key={pathname}>
              <Outlet />
            </div>
          </main>
        </div>
        <RoleSwitch role={session.role} />
      </div>
    </PortalDataProvider>
  );
}

/**
 * The pill bar. One dark pill sits behind the active item and slides to the next one: it is a single full-width
 * shape clipped to the active item, so only clip-path animates and nothing is laid out again.
 */
function TopNav({ items, active }: { items: TopItem[]; active?: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [clip, setClip] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { pathname } = useLocation();

  useEffect(() => setOpenMenu(null), [pathname]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const li = active ? list.querySelector<HTMLElement>(`[data-key="${active}"]`) : null;
      if (!li) return setClip(null);
      const right = list.clientWidth - li.offsetLeft - li.offsetWidth;
      setClip(`inset(0 ${right}px 0 ${li.offsetLeft}px round 999px)`);
    };
    measure();
    // labels change width once the web font arrives
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [active, items.length]);

  // the first position is placed without a slide; only later changes glide
  useEffect(() => {
    if (clip && !ready) requestAnimationFrame(() => setReady(true));
  }, [clip, ready]);

  return (
    <nav className="p-pills" aria-label="Portal">
      <ul ref={listRef}>
        {items.map((i) => (
          <li key={i.key} data-key={i.key}>
            {'to' in i ? (
              <NavLink to={i.to} end={i.to === '/portal'} className={`p-pill${active === i.key ? ' is-on' : ''}`}>
                {i.label}
              </NavLink>
            ) : (
              <PillMenu item={i} on={active === i.key} open={openMenu === i.key} setOpen={(o) => setOpenMenu(o ? i.key : null)} />
            )}
          </li>
        ))}
      </ul>
      {/* The dark pill carries its own light copy of every label, clipped to the same shape. While it slides, whatever it
          passes over reads light on dark, so it never looks like it is covering the labels it crosses. */}
      <span className="p-pill-glide" aria-hidden="true" data-ready={ready || undefined} style={{ clipPath: clip ?? undefined, opacity: clip ? 1 : 0 }}>
        <span className="p-pill-row">
          {items.map((i) => (
            <span key={i.key} className="p-pill" data-open={openMenu === i.key || undefined}>
              {i.label}
              {'sections' in i && <PIcon name="chevron" size={13} />}
            </span>
          ))}
        </span>
      </span>
    </nav>
  );
}

function PillMenu({ item, on, open, setOpen }: { item: Extract<TopItem, { sections: unknown }>; on: boolean; open: boolean; setOpen: (o: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const id = `menu-${item.key}`;

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      btnRef.current?.focus();
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open, setOpen]);

  return (
    <div className="p-pill-wrap" ref={ref}>
      <button ref={btnRef} type="button" className={`p-pill${on ? ' is-on' : ''}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {item.label}
        <PIcon name="chevron" size={13} />
      </button>
      {open && (
        // data-lenis-prevent: the site's smooth scroll takes every wheel event; a long menu still needs its own
        <div className="p-menu" id={id} data-lenis-prevent>
          {item.sections.map((s) => (
            <div key={s.heading} className="p-menu-group">
              <p className="p-menu-label">{s.heading}</p>
              <ul>
                {s.links.map((l) => (
                  <li key={l.to}>
                    {l.href ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className="p-menu-link">
                        <PIcon name={l.icon} size={16} />
                        <span>{l.label}</span>
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <NavLink to={l.to} className="p-menu-link">
                        <PIcon name={l.icon} size={16} />
                        <span>{l.label}</span>
                      </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Demo only, while the pages are being built: switches between the admin, sub admin and employee versions.
 * Remove it once roles come from the real sign-in, so people only see the role they logged in with.
 */
function RoleSwitch({ role }: { role: Role }) {
  return (
    <div className="p-role" role="group" aria-label="Demo: view the portal as">
      <span className="p-role-label">
        <span className="p-role-dot" aria-hidden="true" /> View as
      </span>
      {(['admin', 'subadmin', 'employee'] as Role[]).map((r) => (
        <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)}>
          {ROLE_NAME[r]}
        </button>
      ))}
    </div>
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
          <Link to="/portal/profile" className="p-user-meta" onClick={() => setOpen(false)}>
            <strong>{name}</strong>
            <span>{email}</span>
            <span className="p-user-role">{ROLE_NAME[role]}</span>
            <span className="p-user-view">View profile</span>
          </Link>
          <Link to="/portal/settings" className="p-user-item" onClick={() => setOpen(false)}>
            <PIcon name="settings" /> Settings
          </Link>
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
