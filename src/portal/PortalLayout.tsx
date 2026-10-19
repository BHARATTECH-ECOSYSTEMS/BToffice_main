import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { Arrow, Brand, BtnText, ThreadMark, toneStyle } from '../components/ui';
import { keyAt, KeyLabel, keyPointer, MotionLink, OPENING, useKeyHighlight, type LinkFx } from '../components/navKeys';
import { useGlassTilt } from '../components/useGlassTilt';
import { useNavBubble } from '../components/useNavBubble';
import { usePointerBloom } from '../components/usePointerBloom';
import type { HueName } from '../gl/palette';
import { CERTIFICATE_TYPES, TOOLS, type PortalIconName } from './data';
import { didSignOut, endSession, managesPortal, NOTIFICATION_KINDS, ROLE_NAME, setMutedNotifications, setRole, useSession, type NotificationKind, type Role } from './session';
import { HelpModal } from './Help';
import { formatDate, PortalDataProvider, usePortal } from './store';
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

/** A top-bar key: either a page, or a menu of pages grouped under small headings. Like the site nav's links, each
 *  key has a colour and its own hover effect. */
type TopKey = { key: string; label: string; tone: HueName; fx: LinkFx; adminOnly?: boolean };
type TopItem = (TopKey & { to: string }) | (TopKey & { sections: { heading: string; links: MenuLink[] }[] });

const TOP: TopItem[] = [
  { key: 'overview', label: 'Overview', to: '/portal', tone: 'saffron', fx: 'drop' },
  { key: 'people', label: 'People', to: '/portal/people', tone: 'violet', fx: 'sweep' },
  { key: 'learning', label: 'Learning', to: '/portal/lms', tone: 'tangerine', fx: 'tilt' },
  {
    key: 'resources',
    label: 'Resources',
    tone: 'saffron',
    fx: 'ripple',
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
    tone: 'violet',
    fx: 'roll',
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
  // former colleagues and the openings offered to them: everyone sees it, only admins run it (Community.tsx)
  { key: 'community', label: 'Community', to: '/portal/community', tone: 'tangerine', fx: 'magnet' },
];

// every button of the top bar, for the liquid drop: the brand, the page keys, the bell and the profile button
const TOP_BUTTONS = '.nav-brand, .nav-links > a, .nav-links > button, .p-bell-btn, .p-user-btn';

// hover intent for the top bar's menus: a short wait before opening, and a grace period on leaving so the
// pointer can travel from the button down into the menu
const HOVER_OPEN_MS = 60;
const HOVER_CLOSE_MS = 180;

/** Runs the latest of a series of hover changes after its delay; each new one cancels the one still waiting. */
function useHoverIntent() {
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return useCallback((change: () => void, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(change, ms);
  }, []);
}

/**
 * Opens a menu while a mouse rests on it (`wrap` goes on the element holding both button and menu). Touch and
 * keyboard still open it with a click; this only adds the hover.
 */
function useHoverOpen(setOpen: (open: boolean) => void) {
  const later = useHoverIntent();
  return {
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === 'mouse' && later(() => setOpen(true), HOVER_OPEN_MS),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === 'mouse' && later(() => setOpen(false), HOVER_CLOSE_MS),
  };
}

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
  const topRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  usePointerBloom();
  // the brand, the tilt key, the bell and the profile button lean towards the cursor, as on the site's nav
  useGlassTilt(topRef, '.nav-brand, .nav-links > [data-fx="tilt"]');
  // one liquid drop glides along the whole bar and wraps whichever button the pointer is on
  const bubbleRef = useRef<HTMLSpanElement>(null);
  useNavBubble(topRef, bubbleRef, TOP_BUTTONS);

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
          {/* The site's nav, in the frame: its glass unfolds from a capsule, then the brand fades in and the keys and the
              user follow (OPENING in navKeys.tsx, navItem in base.css). It plays once each time the portal opens. */}
          <motion.header className="p-top" ref={topRef} initial={reduceMotion ? false : 'closed'} animate="open">
            <motion.span className="nav-glass p-glass" aria-hidden="true" variants={OPENING.glass} />
            <span className="nav-bubble" ref={bubbleRef} aria-hidden="true" />
            {/* the same glass brand as the site's nav (styles under .nav-brand in base.css), so it reads as one product */}
            <MotionLink to="/portal" className="p-brand nav-brand" aria-label="Bharattech Origin portal, overview" variants={OPENING.brand}>
              <Brand
                mark={
                  <span className="nav-orb">
                    <ThreadMark />
                  </span>
                }
              />
            </MotionLink>
            <TopNav items={items} active={activeKey(items, pathname)} />
            <div className="p-top-end">
              <UserMenu name={session.name} email={session.email} role={session.role} photo={session.photo} onHelp={() => setHelpOpen(true)} onSignOut={signOut} />
              <NotifyMenu muted={session.mutedNotifications ?? []} />
            </div>
          </motion.header>
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
 * The page keys: the site nav's glass keys (`.nav-links` and `[data-fx]` in base.css), each with its own hover
 * effect, the colour pool gliding beneath the lit one and the liquid drop. The keys must be the row's own
 * children for those styles, so the Resources and HR OPS menus are rendered beside the row, not inside their key.
 */
function TopNav({ items, active }: { items: TopItem[]; active?: string }) {
  const linksRef = useRef<HTMLElement>(null);
  const [hover, setHover] = useState(-1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { pathname } = useLocation();
  const later = useHoverIntent();

  useEffect(() => setOpenMenu(null), [pathname]);
  // closing one menu never closes another: a late close from the menu the pointer just left must not shut the next
  const setMenu = useCallback((key: string, open: boolean) => setOpenMenu((cur) => (open ? key : cur === key ? null : cur)), []);
  // one timer for the key and its menu, so moving from one to the other cancels the pending close
  const hoverMenu = (key: string) => ({
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === 'mouse' && later(() => setMenu(key, true), HOVER_OPEN_MS),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === 'mouse' && later(() => setMenu(key, false), HOVER_CLOSE_MS),
  });

  const activeIdx = items.findIndex((i) => i.key === active);
  const openIdx = items.findIndex((i) => i.key === openMenu);
  const lit = hover >= 0 ? hover : openIdx >= 0 ? openIdx : activeIdx;
  const hl = useKeyHighlight(linksRef, lit, lit >= 0 ? items[lit].tone : undefined);

  return (
    <>
      <nav className="nav-links" ref={linksRef} aria-label="Portal" onPointerLeave={() => setHover(-1)}>
        <span
          className="nav-hl"
          aria-hidden="true"
          data-show={lit >= 0 || undefined}
          data-glide={hl.glide || undefined}
          style={{ transform: `translateX(${hl.x}px)`, width: hl.w, ...(hl.tone ? toneStyle(hl.tone) : {}) }}
        />
        {items.map((i, n) => {
          const key = {
            style: toneStyle(i.tone, { '--i': n } as CSSProperties),
            'data-fx': i.fx,
            'data-lit': n === lit || undefined,
            onFocus: () => setHover(n),
            onBlur: () => setHover(-1),
            ...keyPointer(i.fx),
          };
          const label = (
            <>
              <i aria-hidden="true" />
              <KeyLabel label={i.label} fx={i.fx} />
            </>
          );
          if ('to' in i)
            return (
              <NavLink key={i.key} to={i.to} end={i.to === '/portal'} {...key} onPointerEnter={() => setHover(n)}>
                {label}
              </NavLink>
            );
          const menu = hoverMenu(i.key);
          return (
            <button
              key={i.key}
              type="button"
              {...key}
              onPointerEnter={(e) => (setHover(n), menu.onPointerEnter(e))}
              onPointerLeave={menu.onPointerLeave}
              aria-current={active === i.key || undefined}
              aria-expanded={openMenu === i.key}
              aria-controls={`menu-${i.key}`}
              onClick={() => setMenu(i.key, openMenu !== i.key)}
            >
              {label}
            </button>
          );
        })}
      </nav>
      {items.map((i, n) =>
        'sections' in i ? (
          <PillMenu key={i.key} item={i} open={openMenu === i.key} setOpen={(o) => setMenu(i.key, o)} hover={hoverMenu(i.key)} links={linksRef} index={n} />
        ) : null,
      )}
    </>
  );
}

function PillMenu({
  item,
  open,
  setOpen,
  hover,
  links,
  index,
}: {
  item: Extract<TopItem, { sections: unknown }>;
  open: boolean;
  setOpen: (o: boolean) => void;
  hover: Pick<React.HTMLAttributes<HTMLElement>, 'onPointerEnter' | 'onPointerLeave'>;
  /** the top bar row and this menu's key in it */
  links: RefObject<HTMLElement>;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // the menu hangs from the top bar, so it is lined up under its key here (read once per opening)
  useLayoutEffect(() => {
    const menu = ref.current;
    const key = keyAt(links.current, index);
    const bar = menu?.offsetParent;
    if (!open || !menu || !key || !bar) return;
    const k = key.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    menu.style.setProperty('--key-l', `${k.left - b.left}px`);
    menu.style.setProperty('--key-r', `${b.right - k.right}px`);
  }, [open, links, index]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && !keyAt(links.current, index)?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      keyAt(links.current, index)?.focus();
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open, setOpen, links, index]);

  return (
    // always mounted, so it can animate closed too; while closed it is hidden from pointer, keyboard and screen
    // readers. data-lenis-prevent: the site's smooth scroll takes every wheel event; a long menu needs its own
    <div className="p-menu" ref={ref} id={`menu-${item.key}`} data-open={open || undefined} data-lenis-prevent {...hover}>
      {item.sections.map((s, g) => (
        <div key={s.heading} className="p-menu-group">
          <p className="p-menu-label">{s.heading}</p>
          <ul>
            {s.links.map((l, k) => (
              // each link falls in a beat after the one above it, the second group a beat after the first
              <li key={l.to} style={{ '--k': k + g * 2 } as CSSProperties}>
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

// how long the sign-out button's walk-out plays before the session actually ends (the CSS timeline is 1.5s)
const LEAVE_MS = 1500;

/**
 * Sign out as the "walk out the door" button: a figure walks through a door that swings open, drops out of the
 * bottom as the button tips, and the door bangs shut; then the session ends. Hovering, the figure takes a step and
 * the door eases ajar. With reduced motion it signs out at once.
 */
function SignOutButton({ onSignOut, onLeaving }: { onSignOut: () => void; onLeaving: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const go = () => {
    if (leaving) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onSignOut();
    setLeaving(true);
    onLeaving();
    timer.current = window.setTimeout(onSignOut, LEAVE_MS);
  };
  return (
    <button type="button" className="p-logout" data-leaving={leaving || undefined} onClick={go} aria-disabled={leaving || undefined}>
      <span>Sign out</span>
      <span className="p-logout-scene" aria-hidden="true">
        <span className="p-logout-doorway" />
        <span className="p-logout-bang">
          <i />
          <i />
          <i />
        </span>
        <svg className="p-logout-fig" viewBox="0 0 24 24">
          <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
        </svg>
        <span className="p-logout-door" />
      </span>
      <span className="sr-only" role="status">
        {leaving ? 'Signing out' : ''}
      </span>
    </button>
  );
}

/** Closes a top-bar menu on a press outside it (`wrap` holds both its button and the menu) or on Escape. */
function useCloseOnOutside(wrap: RefObject<HTMLElement | null>, open: boolean, setOpen: (open: boolean) => void) {
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [wrap, open, setOpen]);
}

interface PortalNote {
  id: string;
  icon: PortalIconName;
  title: string;
  detail: string;
  to: string;
}

/**
 * What the signed-in person has been sent, worked out from the portal's own records: open tasks assigned to them,
 * certificates issued to them and, for employees and interns, policies they still have to accept. A policy drops off
 * once it's accepted. Course updates have no source yet. When the backend arrives, this becomes its notifications API.
 */
function useMyNotes(): PortalNote[] {
  const { me, tasks, certificates, policies, acceptances } = usePortal();
  const role = useSession()!.role;
  return useMemo(
    () => [
      ...tasks
        .filter((t) => t.assigneeId === me.id && t.status !== 'done')
        .map((t) => ({ id: `task:${t.id}`, icon: 'clipboard' as const, title: `New task: ${t.title}`, detail: `Due ${formatDate(t.due)}`, to: '/portal' })),
      ...certificates
        .filter((c) => c.recipientId === me.id)
        .map((c) => ({
          id: `cert:${c.id}`,
          icon: 'award' as const,
          title: `${CERTIFICATE_TYPES.find((t) => t.id === c.type)?.name ?? 'Certificate'} issued to you`,
          detail: `By ${c.issuedBy} · ${formatDate(c.date)}`,
          to: '/portal/certificates',
        })),
      ...(managesPortal(role)
        ? []
        : policies
            .filter((d) => !acceptances.some((a) => a.docId === d.id && a.personId === me.id))
            .map((d) => ({ id: `policy:${d.id}`, icon: 'file' as const, title: `Policy to review: ${d.name}`, detail: `${d.pages} pages`, to: '/portal/policy' }))),
    ],
    [me.id, tasks, certificates, policies, acceptances, role],
  );
}

/**
 * The bell after the profile button. A badge counts what's unread; when something new arrives the badge pops and the
 * bell rings. Its menu lists the notifications (opening one marks it read) and, behind the gear, the email switches,
 * saved with the session in this browser. What's been read is kept until the page reloads, like the rest of the
 * sample data.
 */
function NotifyMenu({ muted }: { muted: NotificationKind[] }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'inbox' | 'email'>('inbox');
  // set once the view has been switched while open, so the new rows animate in (see .p-top-menu[data-swapped])
  const [swapped, setSwapped] = useState(false);
  const show = (next: 'inbox' | 'email') => (setView(next), setSwapped(true));
  const [read, setRead] = useState<ReadonlySet<string>>(() => new Set());
  const ref = useRef<HTMLDivElement>(null);
  const hover = useHoverOpen(setOpen);
  useCloseOnOutside(ref, open, setOpen);
  const notes = useMyNotes();
  const unread = notes.filter((n) => !read.has(n.id)).length;

  // a rise in the unread count is an arrival: bump `arrivals` to replay the badge pop and the ring
  const [arrivals, setArrivals] = useState(0);
  const lastUnread = useRef(unread);
  useEffect(() => {
    if (unread > lastUnread.current) setArrivals((n) => n + 1);
    lastUnread.current = unread;
  }, [unread]);
  // the menu always opens on the list
  useEffect(() => {
    if (!open) return;
    setView('inbox');
    setSwapped(false);
  }, [open]);

  const markRead = (ids: string[]) => setRead((r) => new Set([...r, ...ids]));
  const toggle = (kind: NotificationKind, on: boolean) => setMutedNotifications(on ? muted.filter((k) => k !== kind) : [...muted, kind]);

  return (
    <div className="p-notify" ref={ref} {...hover}>
      <button
        type="button"
        className="nav-cta p-bell-btn"
        data-ring={arrivals || undefined}
        aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        aria-expanded={open}
        aria-controls="p-notify-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="p-bell" viewBox="0 0 24 24" aria-hidden="true">
          {/* re-keyed on each arrival so its ring plays again */}
          <g key={arrivals} className="p-bell-body">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path className="p-bell-clapper" d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </g>
        </svg>
      </button>
      {unread > 0 && (
        // outside the button, whose glass clips anything poking past its edge
        <span key={arrivals} className={arrivals ? 'p-bell-badge is-new' : 'p-bell-badge'} aria-hidden="true">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
      {/* always mounted so it can close with motion too; hidden from everyone while closed */}
      <div id="p-notify-menu" className="p-top-menu p-notify-menu" data-open={open || undefined} data-swapped={swapped || undefined} data-lenis-prevent role="group" aria-labelledby="p-notify-title">
        {view === 'inbox' ? (
          <>
            <div key="inbox-head" className="p-notify-head is-row">
              <span>
                <strong id="p-notify-title">Notifications</strong>
                <span>{unread ? `${unread} new` : "You're up to date"}</span>
              </span>
              <span className="p-notify-actions">
                {unread > 0 && (
                  <button type="button" className="p-text-btn" onClick={() => markRead(notes.map((n) => n.id))}>
                    Mark all read
                  </button>
                )}
                <button type="button" className="p-icon-btn" aria-label="Email settings" title="Email settings" onClick={() => show('email')}>
                  <PIcon name="settings" size={16} />
                </button>
              </span>
            </div>
            {notes.length ? (
              notes.map((n) => (
                <Link key={n.id} to={n.to} className="p-note" data-unread={!read.has(n.id) || undefined} onClick={() => (markRead([n.id]), setOpen(false))}>
                  <span className="p-note-icon">
                    <PIcon name={n.icon} size={16} />
                  </span>
                  <span className="p-note-text">
                    <strong>{n.title}</strong>
                    <small>{n.detail}</small>
                  </span>
                  {!read.has(n.id) && (
                    <span className="p-note-dot">
                      <span className="sr-only">Unread</span>
                    </span>
                  )}
                </Link>
              ))
            ) : (
              <p key="empty" className="p-notify-empty">
                <strong>Nothing new</strong>
                Tasks, certificates and policies sent to you show up here.
              </p>
            )}
          </>
        ) : (
          <>
            <div key="email-head" className="p-notify-head is-row">
              <span>
                <strong id="p-notify-title">Email notifications</strong>
                <span>Choose what you want to hear about.</span>
              </span>
              <button type="button" className="p-icon-btn" aria-label="Back to notifications" title="Back" onClick={() => show('inbox')}>
                <Arrow dir="left" />
              </button>
            </div>
            {NOTIFICATION_KINDS.map((k) => (
              <label key={k.id} className="p-notify-row">
                <span>
                  <strong>{k.label}</strong>
                  <small>{k.hint}</small>
                </span>
                <input type="checkbox" role="switch" className="p-switch" checked={!muted.includes(k.id)} onChange={(e) => toggle(k.id, e.target.checked)} />
              </label>
            ))}
            <p key="email-foot" className="p-notify-foot">
              Saved in this browser. Emails aren't connected yet, so none are sent for now.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function UserMenu({ name, email, role, photo, onHelp, onSignOut }: { name: string; email: string; role: Role; photo?: string; onHelp: () => void; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  // while the sign-out walk plays, the menu stays open even if the pointer leaves it
  const [leaving, setLeaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hover = useHoverOpen(setOpen);
  useCloseOnOutside(ref, open, setOpen);

  return (
    <div className="p-user" ref={ref} {...hover}>
      {/* the site's violet glass button (.nav-cta), in the spot where the site's "Employee login" sits */}
      <button type="button" className="nav-cta p-user-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        {/* the avatar as a glass orb, like the brand's logo; its ring draws once on hover */}
        <span className="nav-orb p-user-orb" aria-hidden="true">
          <span className="p-avatar">{photo ? <img src={photo} alt="" /> : initials(name)}</span>
          <svg className="p-user-ring" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="19" pathLength="1" />
          </svg>
        </span>
        <span className="p-user-name">
          <BtnText>{name}</BtnText>
        </span>
      </button>
      {/* always mounted so it can swing closed as well as open; hidden from everyone while closed */}
      <div className="p-top-menu p-user-menu" data-open={open || leaving || undefined}>
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
        <SignOutButton onSignOut={onSignOut} onLeaving={() => setLeaving(true)} />
      </div>
    </div>
  );
}
