import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { SearchPill } from '../components/SearchPill';
import { Arrow, BtnText, LogoMark } from '../components/ui';
import { api } from './api';
import { reelPlayed } from './reel';
import type { PortalIconName } from './data';

const PATHS: Record<PortalIconName, string> = {
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  cap: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
  book: 'M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z',
  code: 'M9 7 4 12l5 5M15 7l5 5-5 5',
  transfer: 'M7 7h13l-4-4M17 17H4l4 4',
  kanban: 'M4 4h16v16H4zM9 4v16M15 4v16M6 8h1M11 8h2M17 8h1',
  shield: 'M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6l-7-3z',
  chat: 'M4 5h16v11H9l-5 4z',
  screen: 'M3 4h18v12H3zM8 20h8M12 16v4',
  invoice: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  award: 'M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM8.5 14 7 21l5-3 5 3-1.5-7',
  file: 'M7 3h7l4 4v14H7zM14 3v4h4',
  clipboard: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M9 13l2 2 4-4',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  pen: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  layers: 'M12 3 2 8l10 5 10-5zM2 13l10 5 10-5',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  check: 'M5 12.5 10 17l9-10',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 12h.01',
  key: 'M8 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM11 11l9 0M17 11v3M20 11v2',
  calendar: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4',
  chevron: 'M9 6l6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  home: 'M4 11 12 4l8 7M6 9.5V20h12V9.5',
  alert: 'M12 4 2.5 20h19zM12 10v4M12 17h.01',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  refresh: 'M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  play: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM10 8.5v7l6-3.5z',
  lock: 'M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
};

/**
 * Each icon's colour from the site's three (base.css): violet for people, places and the system, saffron for time,
 * progress and achievement, tangerine for documents and the things you do to them. It tints the glass body, and in
 * the dark theme it lights the icon (.p-icon in portal.css).
 */
const HUE_OF: Record<PortalIconName, 'violet' | 'saffron' | 'tangerine'> = {
  grid: 'violet',
  users: 'violet',
  cap: 'saffron',
  book: 'violet',
  code: 'violet',
  transfer: 'tangerine',
  kanban: 'tangerine',
  shield: 'violet',
  chat: 'tangerine',
  screen: 'violet',
  invoice: 'tangerine',
  award: 'saffron',
  file: 'tangerine',
  clipboard: 'tangerine',
  spark: 'saffron',
  pen: 'tangerine',
  layers: 'violet',
  plus: 'violet',
  search: 'violet',
  external: 'violet',
  check: 'violet',
  clock: 'saffron',
  target: 'saffron',
  key: 'violet',
  calendar: 'saffron',
  chevron: 'violet',
  close: 'violet',
  logout: 'tangerine',
  upload: 'tangerine',
  link: 'violet',
  home: 'violet',
  alert: 'tangerine',
  eye: 'violet',
  download: 'tangerine',
  share: 'violet',
  refresh: 'tangerine',
  filter: 'violet',
  edit: 'tangerine',
  chart: 'saffron',
  play: 'saffron',
  lock: 'violet',
  settings: 'violet',
  help: 'violet',
};

/** The closed parts of an icon that hold its glass body; line-only icons (arrows, ticks, crosses) have none. */
const GLASS: Partial<Record<PortalIconName, string>> = {
  grid: PATHS.grid,
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1z',
  cap: 'M2 9l10-5 10 5-10 5z',
  book: PATHS.book,
  kanban: 'M4 4h16v16H4z',
  shield: PATHS.shield,
  chat: PATHS.chat,
  screen: 'M3 4h18v12H3z',
  invoice: 'M6 3h12v18l-3-2-3 2-3-2-3 2z',
  award: 'M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12z',
  file: 'M7 3h7l4 4v14H7z',
  clipboard: 'M5 5h14v16H5z',
  pen: 'M4 20h4L19 9l-4-4L4 16z',
  layers: 'M12 3 2 8l10 5 10-5z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  key: 'M8 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8z',
  calendar: 'M4 5h16v16H4z',
  home: 'M6 9.5 12 4.5l6 5V20H6z',
  alert: 'M12 4 2.5 20h19z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  filter: PATHS.filter,
  edit: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  play: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  lock: 'M6 11h12v10H6z',
  // the gear's ring, with its centre left clear (evenodd)
  settings: PATHS.settings,
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
};

/**
 * A portal icon as a small glass bead: a crisp line in the colour of where it sits, and in its closed parts a glass
 * body tinted with its own colour under a white sheen, resting on a fine ledge of shadow (.p-icon in portal.css). In
 * the dark theme the glass glows in its colour. The glass is drawn inside the line, never beside it: at 16px an
 * offset highlight doubled the outline.
 */
export function PIcon({ name, size = 18 }: { name: PortalIconName; size?: number }) {
  const id = useId().replace(/:/g, '');
  const glass = GLASS[name];
  return (
    <svg
      className="p-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ '--icon-hue': `var(--${HUE_OF[name]})` } as CSSProperties}
    >
      {glass && (
        <>
          <defs>
            <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
              <stop className="p-icon-body-top" offset="0" />
              <stop className="p-icon-body-end" offset="1" />
            </linearGradient>
            <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
              <stop className="p-icon-sheen-top" offset="0" />
              <stop className="p-icon-sheen-end" offset="0.6" />
            </linearGradient>
          </defs>
          <path d={glass} fill={`url(#${id}-body)`} fillRule="evenodd" />
          <path d={glass} fill={`url(#${id}-sheen)`} fillRule="evenodd" />
        </>
      )}
      <path d={PATHS[name]} stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

type BtnVariant = 'primary' | 'ghost' | 'light';

/**
 * The site's own button classes (base.css): the label rolls up on hover, the arrow slides out and back in, and a
 * purple bloom grows from where the cursor came in. Portal buttons use these so they behave like the rest of the site.
 */
export const btnClass = (variant: BtnVariant = 'ghost', { small = false, wide = false } = {}) =>
  ['btn', variant === 'primary' ? 'btn-primary' : variant === 'light' ? 'btn-light' : 'btn-ghost', 'p-btn-site', small && 'is-small', wide && 'is-wide']
    .filter(Boolean)
    .join(' ');

/** A button's inside: an optional leading icon, the rolling label, and an optional trailing arrow. */
export function BtnLabel({ icon, arrow, children }: { icon?: PortalIconName; arrow?: 'right' | 'left' | 'up-right'; children: ReactNode }) {
  return (
    <>
      {icon && <PIcon name={icon} size={16} />}
      {arrow === 'left' && <Arrow dir="left" />}
      <BtnText>{children}</BtnText>
      {arrow && arrow !== 'left' && <Arrow dir={arrow} />}
    </>
  );
}

/** Opens a self-hosted tool, or says plainly that its address hasn't been set up yet. */
export function ToolButton({
  url,
  label,
  name,
  icon,
  variant = 'primary',
  wide = true,
}: {
  url: string;
  label: string;
  /** The tool's name, for screen readers when the label alone ("Open") doesn't say which tool. */
  name: string;
  icon?: PortalIconName;
  variant?: 'primary' | 'ghost';
  wide?: boolean;
}) {
  if (url) {
    // a web address opens in a new tab; an app link (bharattech://) only asks the computer to open the app
    const web = /^https?:/i.test(url);
    return (
      <a className={btnClass(variant, { wide })} href={url} {...(web && { target: '_blank', rel: 'noreferrer' })}>
        <BtnLabel icon={icon} arrow={icon ? undefined : 'up-right'}>
          {label}
        </BtnLabel>
        <span className="sr-only">{web ? `${name} (opens in a new tab)` : `${name} (opens the installed app)`}</span>
      </a>
    );
  }
  return (
    // the label stays visible so a card's two buttons can still be told apart; the card says it isn't connected yet
    <span className={`p-btn is-disabled ${wide ? 'is-wide' : ''}`} aria-disabled="true" title="Not connected yet: its address hasn't been set up">
      {icon && <PIcon name={icon} size={16} />}
      {label}
      <span className="sr-only"> for {name}, not connected yet</span>
    </span>
  );
}

/** Shown once on a card whose tool has no address yet (aria-hidden: each button already says so to screen readers). */
export function NotConnected() {
  return (
    <p className="p-not-connected" aria-hidden="true">
      <PIcon name="alert" size={14} /> Not connected yet
    </p>
  );
}

/**
 * Marks a page that still runs on the demo's made-up records while the rest of the portal is on the company backend.
 * Shows nothing in the demo, where every page is sample data. Each one goes when its page is connected.
 */
export function SampleDataBar({ children }: { children?: ReactNode }) {
  if (!api) return null;
  return (
    <p className="p-sample" role="note">
      <PIcon name="alert" size={16} />
      <span>
        <strong>Sample data:</strong>{' '}
        {children ?? 'this page isn’t connected to the company system yet. The people and records here are made up, and changes are lost on reload.'}
      </span>
    </p>
  );
}

/** Every portal page opens with the same header: a small label, the title, one line on what the page is for, and its actions. */
export function PageHead({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
  return (
    <header className="p-head">
      <div>
        <h1 className="p-title">{title}</h1>
        <p className="p-sub">{sub}</p>
      </div>
      {children && <div className="p-head-actions">{children}</div>}
    </header>
  );
}

export function Stat({
  icon,
  label,
  value,
  hint,
  tone = 'violet',
}: {
  icon: PortalIconName;
  label: string;
  value: ReactNode;
  /** An optional line saying what the number counts. */
  hint?: string;
  tone?: 'violet' | 'tangerine' | 'saffron' | 'ink';
}) {
  return (
    <div className="p-stat" style={{ '--tone': `var(--${tone})` } as CSSProperties}>
      <span className="p-stat-icon">
        <PIcon name={icon} />
      </span>
      <span className="p-stat-value">{value}</span>
      <span className="p-stat-label">{label}</span>
      {hint && <span className="p-stat-hint">{hint}</span>}
    </div>
  );
}

export function Empty({ icon = 'file', title, children }: { icon?: PortalIconName; title: string; children?: ReactNode }) {
  return (
    <div className="p-empty">
      <span className="p-empty-icon">
        <PIcon name={icon} size={22} />
      </span>
      <p className="p-empty-title">{title}</p>
      {children && <p className="p-empty-body">{children}</p>}
    </div>
  );
}

export function PortalNotFound() {
  return (
    <section className="p-card">
      <Empty icon="alert" title="This page doesn't exist">
        <Link to="/portal">Go to the dashboard</Link>
      </Empty>
    </section>
  );
}

export function Badge({ kind, children }: { kind: string; children: ReactNode }) {
  return <span className={`p-badge is-${kind}`}>{children}</span>;
}

/** The portal's search box: the shared site-wide search pill (components/SearchPill.tsx), opening from the right. */
export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  showLabel = false,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
  /** Print the label above the box instead of keeping it for screen readers only. */
  showLabel?: boolean;
}) {
  return <SearchPill value={value} onChange={onChange} label={label} placeholder={placeholder} showLabel={showLabel} />;
}

/**
 * A modal pop-up on the native <dialog>: Esc, focus trapping and an inert page come with it. Mounted only while
 * open, so each opening starts with fresh form state.
 */
export function Modal({
  title,
  icon,
  onClose,
  children,
  footer,
  onSubmit,
  size,
  meta,
}: {
  title: string;
  icon?: PortalIconName;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  /** When set, the body is a form and the footer's submit button submits it. */
  onSubmit?: () => void;
  /** `doc`: the large window a document is read in (PdfModal), instead of the form-sized one. */
  size?: 'doc';
  /** A line under the title, such as a document's facts. */
  meta?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  // However it closes (Cancel, Save, Esc, a click outside), the parent simply stops rendering it. So the exit is
  // played by a copy: this cleanup runs while the dialog is still on screen, leaves a look-alike in its place and lets
  // that fade and shrink away. The copy is aria-hidden and takes no clicks; the real dialog is already gone.
  useLayoutEffect(
    () => () => {
      const d = ref.current;
      if (!d?.open || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const box = d.getBoundingClientRect();
      const veil = document.createElement('div');
      veil.className = 'p-modal-veil';
      const ghost = document.createElement('div');
      ghost.className = 'p-modal p-modal-ghost';
      Object.assign(ghost.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
      ghost.append(d.firstElementChild!.cloneNode(true));
      for (const el of [veil, ghost]) el.setAttribute('aria-hidden', 'true');
      document.body.append(veil, ghost);
      // exits are quicker than the 260ms entrance
      veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease', fill: 'forwards' });
      ghost
        .animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.97) translateY(4px)' }], {
          duration: 160,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        })
        .finished.finally(() => (veil.remove(), ghost.remove()));
    },
    [],
  );
  useEffect(() => {
    const d = ref.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    d.showModal();
    return () => {
      if (d.open) d.close();
      opener?.focus({ preventScroll: true });
    };
  }, []);
  const body = (
    <>
      <div className="p-modal-body">{children}</div>
      <div className="p-modal-foot">{footer}</div>
    </>
  );
  return (
    <dialog
      ref={ref}
      className={size ? `p-modal is-${size}` : 'p-modal'}
      data-lenis-prevent
      aria-labelledby={`${id}-t`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="p-modal-card">
        <div className="p-modal-head">
          {icon && (
            <span className="p-modal-icon">
              <PIcon name={icon} />
            </span>
          )}
          <div>
            <h2 id={`${id}-t`} className="p-modal-title">
              {title}
            </h2>
            {meta}
          </div>
          <button type="button" className="p-icon-btn" onClick={onClose} aria-label="Close">
            <PIcon name="close" />
          </button>
        </div>
        {onSubmit ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            {body}
          </form>
        ) : (
          body
        )}
      </div>
    </dialog>
  );
}

/**
 * For a button that plays its animation before the action happens: `play(action)` starts it and runs the action
 * `ms` later, or at once with reduced motion. If the button goes away mid-way (its dialog closed, the page left),
 * the action still runs: the user already chose it.
 */
export function usePlayThen(ms: number) {
  const [playing, setPlaying] = useState(false);
  const timer = useRef(0);
  const pending = useRef<(() => void) | null>(null);
  const run = () => {
    const action = pending.current;
    pending.current = null;
    action?.();
  };
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      run();
    },
    [],
  );
  const play = (action: () => void) => {
    if (pending.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return action();
    pending.current = action;
    setPlaying(true);
    timer.current = window.setTimeout(run, ms);
  };
  return [playing, play] as const;
}

// how long the delete plays before the item is actually removed (the CSS timeline in portal.css ends at 2.1s)
export const DELETE_MS = 2300;

/**
 * For buttons that ask first and then play their reel while the backend works (owner's 1A, 2026-10-27): `going` is
 * the id whose button plays; `play(id, work)` hands `work` a promise of the reel having played, for the store to wait
 * on (afterReel in reel.ts), and stops the reel when the work is done or refused.
 */
export function useReel(ms: number) {
  const [going, setGoing] = useState<string | null>(null);
  const play = async <T,>(id: string, work: (played: Promise<void>) => Promise<T>) => {
    setGoing(id);
    try {
      return await work(reelPlayed(ms));
    } finally {
      setGoing(null);
    }
  };
  return [going, play] as const;
}

/**
 * Deletes after a reel the user picked: the letters of the label fall into the bin, whose lid lifts to take them; the
 * pill shrinks to a circle, a ring draws round it, and the bin turns into the Origin logo with a soft glow. On its own
 * (`onDone`) it deletes on click once the reel has played (see usePlayThen). With `onAsk` the click only asks (a
 * window), and the reel plays while `going` is true, for a delete the backend does (see useReel).
 */
export function DeleteButton({
  label = 'Delete',
  srText,
  small = false,
  disabled,
  title,
  onDone,
  onAsk,
  going: goingNow,
}: {
  label?: string;
  /** Read after the label by screen readers, to say what is deleted ("Delete Asha Rao"). */
  srText?: string;
  small?: boolean;
  disabled?: boolean;
  title?: string;
  onDone?: () => void;
  onAsk?: () => void;
  going?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [playing, play] = usePlayThen(DELETE_MS);
  const going = onAsk ? !!goingNow : playing;
  const measure = () => {
    const btn = ref.current!;
    // the pill shrinks from its own width, so that width is handed to the CSS
    btn.style.setProperty('--w', `${btn.offsetWidth}px`);
    // each letter flies to the bin's centre from wherever it sits, so labels of any length and size land inside it
    const bin = btn.querySelector('.p-del-bin')!.getBoundingClientRect();
    const letters = btn.querySelectorAll<HTMLElement>('.p-del-word > span');
    letters.forEach((s) => {
      const r = s.getBoundingClientRect();
      s.style.setProperty('--to', `${bin.left + bin.width / 2 - (r.left + r.width / 2)}px`);
    });
    // every letter must be in before the word collapses at 0.8s, so long labels stagger faster
    btn.style.setProperty('--stagger', `${Math.min(55, 280 / Math.max(1, letters.length - 1))}ms`);
  };
  const start = () => {
    if (going) return;
    measure();
    play(onDone!);
  };
  // asked first: measured as the reel starts, before the browser paints it
  useLayoutEffect(() => {
    if (onAsk && goingNow) measure();
  }, [onAsk, goingNow]);
  return (
    <button
      ref={ref}
      type="button"
      className={small ? 'p-del is-small' : 'p-del'}
      data-going={going || undefined}
      aria-disabled={going || undefined}
      aria-label={going ? 'Deleting' : srText ? `${label} ${srText}` : label}
      disabled={disabled}
      title={title}
      // while its reel plays, a click does nothing (it must not ask again)
      onClick={going ? undefined : (onAsk ?? start)}
    >
      <span className="p-del-bin" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path className="p-del-lid" d="M4 7h16M9 7V4h6v3" />
          <path d="M6 7l1 13h10l1-13M10 11v6M14 11v6" />
        </svg>
      </span>
      <span className="p-del-word" aria-hidden="true">
        {[...label].map((ch, i) => (
          // a plain space would collapse inside its inline-block and the words would run together
          <span key={i} style={{ '--i': i } as CSSProperties}>
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </span>
      <svg className="p-del-ring" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="22" pathLength="1" />
      </svg>
      <span className="p-del-logo" aria-hidden="true">
        <LogoMark size={24} />
      </span>
    </button>
  );
}

/** A short status line after an action ("Invite added"), read out by screen readers. */
export function useNotice() {
  const [text, setText] = useState('');
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = (next: string) => {
    window.clearTimeout(timer.current);
    setText(next);
    timer.current = window.setTimeout(() => setText(''), 5000);
  };
  const node = (
    <p className="p-notice" role="status" aria-live="polite" data-on={text ? '' : undefined}>
      {text}
    </p>
  );
  return [node, show] as const;
}

// in its own module so the public top bar (and its tests) can use it without the portal's components
export { initials } from './names';

/**
 * When a filter changes which rows show, the rows that stay slide from where they were to where they are now, and
 * rows that appear fade in. Mark each row with data-flip="<its id>" and pass a key that changes with the filter.
 * Only transform and opacity animate (FLIP), so nothing is laid out again while it moves.
 */
export function useListFlip<T extends HTMLElement>(filterKey: string) {
  const ref = useRef<T>(null);
  const lastKey = useRef(filterKey);
  const before = useRef<Map<string, number> | null>(null);

  // Where each row is relative to the list, as drawn right now (mid-slide rows report where they are on screen).
  const measure = (host: HTMLElement) => {
    const top = host.getBoundingClientRect().top;
    const at = new Map<string, number>();
    host.querySelectorAll<HTMLElement>('[data-flip]').forEach((el) => at.set(el.dataset.flip!, el.getBoundingClientRect().top - top));
    return at;
  };

  // The old positions are read during the render that changes the key, while the page still shows the old list.
  // Reading earlier would go stale: fonts, cards and notices above can move the list in the meantime.
  if (filterKey !== lastKey.current) {
    lastKey.current = filterKey;
    before.current = ref.current ? measure(ref.current) : null;
  }

  useLayoutEffect(() => {
    const host = ref.current;
    const was = before.current;
    before.current = null;
    if (!host || !was || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // a slide still running from the last change would skew where the rows now sit; it is replaced, not stacked
    host.querySelectorAll<HTMLElement>('[data-flip]').forEach((el) => el.getAnimations().forEach((an) => an.cancel()));
    // the same curve as the site's --ease token
    const timing = { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
    measure(host).forEach((now, id) => {
      const el = host.querySelector<HTMLElement>(`[data-flip="${CSS.escape(id)}"]`)!;
      const from = was.get(id);
      if (from === undefined) el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], timing);
      else if (Math.abs(from - now) > 0.5) el.animate([{ transform: `translateY(${from - now}px)` }, { transform: 'none' }], timing);
    });
  }, [filterKey]);

  return ref;
}
