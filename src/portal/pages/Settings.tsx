import { useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { PortalIconName } from '../data';
import { NOTIFICATION_KINDS, ROLE_NAME, setDisplayName, setMutedNotifications, setPhoto, useSession, type NotificationKind } from '../session';
import { Badge, btnClass, BtnLabel, initials, PageHead, PIcon, useNotice } from '../ui';

const MIN_PASSWORD = 8;
const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const PHOTO_MAX_MB = 5;
// stored as a small square so it fits in browser storage and loads instantly
const PHOTO_SIZE = 160;

const SECTIONS: { id: string; label: string; icon: PortalIconName; Panel: () => React.JSX.Element }[] = [
  { id: 'profile', label: 'Profile', icon: 'users', Panel: ProfilePanel },
  { id: 'password', label: 'Password', icon: 'lock', Panel: PasswordPanel },
  { id: 'notifications', label: 'Notifications', icon: 'bell', Panel: NotificationsPanel },
];

/**
 * The signed-in person's own account, one section at a time. The open section lives in the address (?tab=),
 * so the back button and a shared link both land on it.
 */
export function Settings() {
  const [params] = useSearchParams();
  const index = Math.max(0, SECTIONS.findIndex((s) => s.id === params.get('tab')));
  const current = SECTIONS[index];
  return (
    <>
      <PageHead title="Settings" sub="Your photo, name, password and notifications." />
      <div className="p-settings">
        {/* one dark pill slides to the open section, so the change reads as a move rather than two blinks */}
        <nav className="p-set-nav" aria-label="Settings sections" style={{ '--i': index } as CSSProperties}>
          <span className="p-set-pill" aria-hidden="true" />
          {SECTIONS.map((s) => (
            <Link key={s.id} to={`?tab=${s.id}`} replace className="p-set-tab" aria-current={s === current ? 'page' : undefined}>
              <PIcon name={s.icon} />
              <span>{s.label}</span>
            </Link>
          ))}
        </nav>
        <div key={current.id} className="p-set-panel">
          <current.Panel />
        </div>
      </div>
    </>
  );
}

/** A section card: title on top, labelled rows, and an optional footer for the save action. */
function SettingsCard({ id, title, sub, children, footer, onSubmit }: { id: string; title: string; sub: string; children: ReactNode; footer?: ReactNode; onSubmit?: (e: FormEvent) => void }) {
  const body = (
    <>
      <div className="p-set-rows">{children}</div>
      {footer && <div className="p-set-foot">{footer}</div>}
    </>
  );
  return (
    <section className="p-card p-set-card" aria-labelledby={id}>
      <header className="p-set-head">
        <h2 id={id} className="p-card-title">
          {title}
        </h2>
        <p className="p-muted">{sub}</p>
      </header>
      {onSubmit ? (
        <form onSubmit={onSubmit} noValidate>
          {body}
        </form>
      ) : (
        body
      )}
    </section>
  );
}

function Row({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="p-set-row">
      <div className="p-set-label">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
        {hint && <p>{hint}</p>}
      </div>
      <div className="p-set-control">{children}</div>
    </div>
  );
}

/** Crops the middle square of the picked image and scales it down to a JPEG data: address. */
function toSquarePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = PHOTO_SIZE;
      canvas.getContext('2d')!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => (URL.revokeObjectURL(url), reject(new Error('unreadable image')));
    img.src = url;
  });
}

function ProfilePanel() {
  const session = useSession()!;
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(session.name);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [notice, notify] = useNotice();
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const dirty = trimmed !== session.name;

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) return setPhotoError('Choose a PNG, JPG or WebP image.');
    if (file.size > PHOTO_MAX_MB * 1024 * 1024) return setPhotoError(`Choose an image under ${PHOTO_MAX_MB} MB.`);
    try {
      setPhoto(await toSquarePhoto(file));
      setPhotoError('');
      notify('Your photo was updated.');
    } catch {
      setPhotoError("That image couldn't be read. Try another file.");
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (trimmed.length < 2) return setError('Enter a name of at least 2 characters.');
    if (trimmed.length > 60) return setError('Keep the name under 60 characters.');
    setDisplayName(trimmed);
    setName(trimmed);
    notify('Your name was updated.');
  };

  return (
    <SettingsCard
      id="settings-profile"
      title="Profile"
      sub="How you appear to your team across the portal."
      onSubmit={save}
      footer={
        <>
          {notice}
          <span className="p-set-foot-actions">
            {dirty && (
              <button type="button" className={btnClass('ghost')} onClick={() => (setName(session.name), setError(''))}>
                <BtnLabel>Reset</BtnLabel>
              </button>
            )}
            <button type="submit" className={btnClass('primary')} disabled={!dirty}>
              <BtnLabel>Save changes</BtnLabel>
            </button>
          </span>
        </>
      }
    >
      <Row label="Photo" hint={`PNG, JPG or WebP, up to ${PHOTO_MAX_MB} MB.`}>
        <div className="p-set-photo">
          <span className="p-avatar is-large" aria-hidden="true">
            {session.photo ? <img src={session.photo} alt="" /> : initials(session.name)}
          </span>
          <button type="button" className={btnClass('ghost', { small: true })} onClick={() => input.current?.click()}>
            <BtnLabel icon="upload">{session.photo ? 'Change' : 'Upload'}</BtnLabel>
          </button>
          {session.photo && (
            <button type="button" className="p-text-btn is-danger" onClick={() => (setPhoto(undefined), notify('Your photo was removed.'))}>
              Remove
            </button>
          )}
          <input ref={input} type="file" accept={PHOTO_TYPES.join(',')} onChange={pick} hidden />
        </div>
        {photoError && (
          <p className="p-error" role="alert">
            {photoError}
          </p>
        )}
      </Row>
      <Row label="Username" hint="Shown on your profile, tasks and certificates." htmlFor="settings-name">
        <input
          id="settings-name"
          className="p-set-input"
          value={name}
          onChange={(e) => (setName(e.target.value), setError(''))}
          autoComplete="name"
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'settings-name-err' : undefined}
        />
        {error && (
          <p id="settings-name-err" className="p-error" role="alert">
            {error}
          </p>
        )}
      </Row>
      <Row label="Work email" hint="Comes from your company account.">
        <p className="p-set-value">
          {session.email}
          <PIcon name="lock" size={14} />
        </p>
      </Row>
      <Row label="Role" hint="Only an admin can change it.">
        <p className="p-set-value">
          <Badge kind={session.role}>{ROLE_NAME[session.role]}</Badge>
        </p>
      </Row>
    </SettingsCard>
  );
}

function PasswordPanel() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [notice, notify] = useNotice();
  // checked live, so the list explains what's missing before anyone presses the button
  const checks = [
    { label: `At least ${MIN_PASSWORD} characters`, ok: next.length >= MIN_PASSWORD },
    { label: 'Different from your current password', ok: !!next && next !== current },
    { label: 'Both new passwords match', ok: !!next && next === confirm },
  ];
  const ready = !!current && checks.every((c) => c.ok);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    // No sign-in server is connected yet, so nothing can actually change: say so instead of pretending it worked.
    setCurrent('');
    setNext('');
    setConfirm('');
    notify("Password changes aren't connected yet, so your password wasn't changed.");
  };

  const field = (id: string, value: string, set: (v: string) => void, autoComplete: string) => (
    <input id={id} className="p-set-input" type="password" value={value} onChange={(e) => set(e.target.value)} autoComplete={autoComplete} />
  );

  return (
    <SettingsCard
      id="settings-password"
      title="Password"
      sub="Use a password you don't use anywhere else."
      onSubmit={submit}
      footer={
        <>
          {notice}
          <span className="p-set-foot-actions">
            <button type="submit" className={btnClass('primary')} disabled={!ready}>
              <BtnLabel icon="lock">Change password</BtnLabel>
            </button>
          </span>
        </>
      }
    >
      <Row label="Current password" htmlFor="pw-current">
        {field('pw-current', current, setCurrent, 'current-password')}
      </Row>
      <Row label="New password" htmlFor="pw-new">
        {field('pw-new', next, setNext, 'new-password')}
        <ul className="p-set-checks" aria-label="Password requirements">
          {checks.map((c) => (
            <li key={c.label} data-ok={c.ok || undefined}>
              <span className="p-set-check" aria-hidden="true">
                <PIcon name="check" size={12} />
              </span>
              {c.label}
              <span className="sr-only">{c.ok ? ' (done)' : ' (not yet)'}</span>
            </li>
          ))}
        </ul>
      </Row>
      <Row label="Confirm new password" htmlFor="pw-confirm">
        {field('pw-confirm', confirm, setConfirm, 'new-password')}
      </Row>
    </SettingsCard>
  );
}

function NotificationsPanel() {
  const muted = useSession()!.mutedNotifications ?? [];
  const toggle = (kind: NotificationKind, on: boolean) => setMutedNotifications(on ? muted.filter((k) => k !== kind) : [...muted, kind]);

  return (
    <SettingsCard
      id="settings-notify"
      title="Email notifications"
      sub="Choose what you want to hear about."
      footer={<p className="p-set-foot-note">Saved in this browser. Emails aren't connected yet, so none are sent for now.</p>}
    >
      {NOTIFICATION_KINDS.map((k) => (
        <label key={k.id} className="p-set-row is-switch">
          <span className="p-set-label">
            <span>{k.label}</span>
            <p>{k.hint}</p>
          </span>
          <input type="checkbox" role="switch" className="p-switch" checked={!muted.includes(k.id)} onChange={(e) => toggle(k.id, e.target.checked)} />
        </label>
      ))}
    </SettingsCard>
  );
}
