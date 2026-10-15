import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Arrow, BtnText } from '../components/ui';
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
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  check: 'M5 12.5 10 17l9-10',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 12h.01',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  key: 'M8 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM11 11l9 0M17 11v3M20 11v2',
  calendar: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4',
  chevron: 'M9 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
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
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
};

export function PIcon({ name, size = 18 }: { name: PortalIconName; size?: number }) {
  return (
    <svg className="p-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export type BtnVariant = 'primary' | 'ghost' | 'light' | 'danger';

/**
 * The site's own button classes (base.css): the label rolls up on hover, the arrow slides out and back in, and a
 * purple bloom grows from where the cursor came in. Portal buttons use these so they behave like the rest of the site.
 */
export const btnClass = (variant: BtnVariant = 'ghost', { small = false, wide = false } = {}) =>
  ['btn', variant === 'primary' ? 'btn-primary' : variant === 'light' ? 'btn-light' : 'btn-ghost', variant === 'danger' && 'is-danger', 'p-btn-site', small && 'is-small', wide && 'is-wide']
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

/** Every portal page opens with the same header: a small label, the title, one line on what the page is for, and its actions. */
export function PageHead({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
  return (
    <header className="p-head">
      <div>
        <p className="cell-label">Bharattech platform</p>
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

export function Badge({ kind, children }: { kind: string; children: ReactNode }) {
  return <span className={`p-badge is-${kind}`}>{children}</span>;
}

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
  const id = useId();
  return (
    <div className="p-search-wrap">
      <label htmlFor={id} className={showLabel ? 'p-search-label' : 'sr-only'}>
        {label}
      </label>
      <div className="p-search">
        <PIcon name="search" size={16} />
        <input id={id} type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

/**
 * A modal pop-up on the native <dialog>: Esc, focus trapping and an inert page come with it. Mounted only while
 * open, so each opening starts with fresh form state.
 */
export function Modal({
  eyebrow,
  title,
  icon,
  onClose,
  children,
  footer,
  onSubmit,
}: {
  eyebrow?: string;
  title: string;
  icon?: PortalIconName;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  /** When set, the body is a form and the footer's submit button submits it. */
  onSubmit?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
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
      className="p-modal"
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
            {eyebrow && <p className="cell-label">{eyebrow}</p>}
            <h2 id={`${id}-t`} className="p-modal-title">
              {title}
            </h2>
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

/** Asks before anything is deleted. */
export function ConfirmDelete({ what, onConfirm, onClose }: { what: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal
      eyebrow="Delete"
      title={`Delete ${what}?`}
      icon="trash"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button
            type="button"
            className={btnClass('danger')}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            <BtnLabel icon="trash">Delete</BtnLabel>
          </button>
        </>
      }
    >
      <p className="p-modal-text">This can't be undone.</p>
    </Modal>
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

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
