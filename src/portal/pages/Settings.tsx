import { useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { PortalIconName } from '../data';
import { api, ApiError, BUSY_MESSAGE, failedText } from '../api';
import { auth } from '../auth';
import { removeMyPhoto, saveMyPhoto, useMyPhoto } from '../myPhoto';
import { PHOTO_MAX_MB, PHOTO_TYPES, photoFileProblem, toJpeg, toSquare } from '../photos';
import { nameChangeHint, phoneProblem, saveMyPhones, useAccountProfile, type AccountProfile, type ProfileState } from '../profile';
import { endSessionForNewSignIn, ROLE_NAME, setDisplayName, setPhoto, useSession } from '../session';
import { Badge, btnClass, BtnLabel, initials, PageHead, PIcon, useNotice } from '../ui';
import { ThemeChoices } from '../../components/ThemeSwitch';

const MIN_PASSWORD = 8;

const SECTIONS: { id: string; label: string; icon: PortalIconName; Panel: () => React.JSX.Element }[] = [
  { id: 'profile', label: 'Profile', icon: 'users', Panel: ProfileSection },
  { id: 'password', label: 'Password', icon: 'lock', Panel: PasswordPanel },
  { id: 'appearance', label: 'Appearance', icon: 'eye', Panel: AppearancePanel },
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
      <PageHead title="Settings" sub="Your photo, name, password and how the portal looks." />
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

/** A section card: title on top, labelled rows, and a footer for the save action. */
function SettingsCard({ id, title, sub, children, footer, onSubmit }: { id: string; title: string; sub: string; children: ReactNode; footer: ReactNode; onSubmit: (e: FormEvent) => void }) {
  return (
    <section className="p-card p-set-card" aria-labelledby={id}>
      <header className="p-set-head">
        <h2 id={id} className="p-card-title">
          {title}
        </h2>
        <p className="p-muted">{sub}</p>
      </header>
      <form onSubmit={onSubmit} noValidate>
        <div>{children}</div>
        <div className="p-set-foot">{footer}</div>
      </form>
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

const PHOTO_FAILED: Record<ApiError['kind'], string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'Your account isn’t allowed to change its photo.',
  'not-found': 'Your account isn’t in the employee records yet. Please ask your administrator.',
  conflict: 'The photo wasn’t saved. Please try again.',
  'bad-request': 'That photo wasn’t accepted.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the server, so your photo wasn’t changed. Try again in a moment.',
};
const photoFailed = (e: ApiError) => (e.kind === 'bad-request' && e.message !== e.kind ? e.message : failedText(e, PHOTO_FAILED));

/** `roleLabel`: the account's own role ("Super Admin", "Admin"…), which decides who can change the name. */
function ProfilePanel({ roleLabel }: { roleLabel?: string }) {
  const session = useSession()!;
  // connected, the photo is saved to the account and only an admin changes the name (People → Details)
  const connected = !!api;
  const photo = useMyPhoto();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(session.name);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, notify] = useNotice();
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const dirty = !connected && trimmed !== session.name;

  const changePhoto = async (change: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await change();
      setPhotoError('');
      notify(done);
    } catch (e) {
      setPhotoError(e instanceof ApiError ? photoFailed(e) : "That image couldn't be read. Try another file.");
    } finally {
      setBusy(false);
    }
  };

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = photoFileProblem(file);
    if (problem) return setPhotoError(problem);
    void changePhoto(
      async () => {
        const square = await toSquare(file);
        if (connected) await saveMyPhoto(await toJpeg(square));
        else setPhoto(square.toDataURL('image/jpeg', 0.85));
      },
      connected ? 'Your photo was saved to your account.' : 'Your photo was updated.',
    );
  };

  const remove = () =>
    void changePhoto(async () => (connected ? removeMyPhoto() : setPhoto(undefined)), connected ? 'Your photo was removed from your account.' : 'Your photo was removed.');

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (connected) return;
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
          {!connected && (
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
          )}
        </>
      }
    >
      <Row label="Photo" hint={`PNG, JPG or WebP, up to ${PHOTO_MAX_MB} MB.${connected ? ' Saved to your account, so it shows on any device.' : ''}`}>
        <div className="p-set-photo" aria-busy={busy || undefined}>
          <span className="p-avatar is-large" aria-hidden="true">
            {photo ? <img src={photo} alt="" /> : initials(session.name)}
          </span>
          <button type="button" className={btnClass('ghost', { small: true })} disabled={busy} onClick={() => input.current?.click()}>
            <BtnLabel icon="upload">{busy ? 'Saving…' : photo ? 'Change' : 'Upload'}</BtnLabel>
          </button>
          {photo && (
            <button type="button" className="p-text-btn is-danger" disabled={busy} onClick={remove}>
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
      {connected ? (
        <Row label="Name" hint={nameChangeHint(roleLabel)}>
          <p className="p-set-value">
            {session.name}
            <PIcon name="lock" size={14} />
          </p>
        </Row>
      ) : (
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
      )}
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

/** Profile, then (connected) your phone numbers. */
function ProfileSection() {
  // one load of the account for both cards: the name's hint needs the role, the phones card the numbers
  const [account, retry] = useAccountProfile();
  return (
    <>
      <ProfilePanel roleLabel={account.kind === 'ready' ? account.profile.roleLabel : undefined} />
      {api && <PhonesCard account={account} retry={retry} />}
    </>
  );
}

const PHONES_FAILED: Partial<Record<ApiError['kind'], string>> = {
  busy: BUSY_MESSAGE,
  'signed-out': 'Your sign-in has ended, so your numbers weren’t saved. Sign in again and try once more.',
  unavailable: 'We couldn’t reach the server, so your numbers weren’t saved. Try again in a moment.',
};

/** Your own phone numbers and whether colleagues see them (owner's 1A 2A). Saved to your account. */
function PhonesCard({ account, retry }: { account: ProfileState; retry: () => void }) {
  if (account.kind !== 'ready') {
    return (
      <section className="p-card p-set-card" aria-labelledby="settings-phones" aria-busy={account.kind === 'loading' || undefined}>
        <header className="p-set-head">
          <h2 id="settings-phones" className="p-card-title">
            Phone numbers
          </h2>
          {account.kind === 'error' ? (
            <p role="alert">
              Your numbers didn’t load.{' '}
              <button type="button" className="p-text-btn" onClick={retry}>
                Try again
              </button>
            </p>
          ) : (
            <p>Loading your numbers…</p>
          )}
        </header>
      </section>
    );
  }
  return <PhonesForm saved={account.profile} />;
}

function PhonesForm({ saved: initial }: { saved: AccountProfile }) {
  const [saved, setSaved] = useState({ phone: initial.phone ?? '', workPhone: initial.workPhone ?? '', showPhone: initial.showPhone });
  const [form, setForm] = useState(saved);
  const [problems, setProblems] = useState<{ phone?: string; workPhone?: string }>({});
  const [busy, setBusy] = useState(false);
  const [notice, notify] = useNotice();
  const dirty = form.phone.trim() !== saved.phone || form.workPhone.trim() !== saved.workPhone || form.showPhone !== saved.showPhone;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!dirty || busy) return;
    const found = { phone: phoneProblem(form.phone) ?? undefined, workPhone: phoneProblem(form.workPhone) ?? undefined };
    setProblems(found);
    if (found.phone || found.workPhone) return;
    setBusy(true);
    try {
      const p = await saveMyPhones(form);
      const next = { phone: p.phone ?? '', workPhone: p.workPhone ?? '', showPhone: p.showPhone };
      setSaved(next);
      setForm(next);
      notify('Your phone numbers were saved.');
    } catch (error) {
      const failed = error instanceof ApiError ? error : new ApiError('unavailable');
      notify(failed.kind === 'bad-request' && failed.message !== failed.kind ? failed.message : (failedText(failed, PHONES_FAILED) ?? PHONES_FAILED.unavailable!));
    } finally {
      setBusy(false);
    }
  };

  const phoneRow = (key: 'phone' | 'workPhone', label: string, hint: string, example: string) => (
    <Row label={label} hint={hint} htmlFor={`settings-${key}`}>
      <input
        id={`settings-${key}`}
        className="p-set-input"
        type="tel"
        inputMode="tel"
        autoComplete={key === 'phone' ? 'tel' : 'off'}
        maxLength={20}
        placeholder={example}
        value={form[key]}
        disabled={busy}
        onChange={(e) => (setForm({ ...form, [key]: e.target.value }), setProblems({ ...problems, [key]: undefined }))}
        aria-invalid={!!problems[key] || undefined}
        aria-describedby={problems[key] ? `settings-${key}-err` : undefined}
      />
      {problems[key] && (
        <p id={`settings-${key}-err`} className="p-error" role="alert">
          {problems[key]}
        </p>
      )}
    </Row>
  );

  return (
    <SettingsCard
      id="settings-phones"
      title="Phone numbers"
      sub="Where colleagues can reach you. Leave a box empty to remove that number."
      onSubmit={save}
      footer={
        <>
          {notice}
          <span className="p-set-foot-actions">
            {dirty && !busy && (
              <button type="button" className={btnClass('ghost')} onClick={() => (setForm(saved), setProblems({}))}>
                <BtnLabel>Reset</BtnLabel>
              </button>
            )}
            <button type="submit" className={btnClass('primary')} disabled={!dirty || busy}>
              <BtnLabel>{busy ? 'Saving…' : 'Save numbers'}</BtnLabel>
            </button>
          </span>
        </>
      }
    >
      {phoneRow('phone', 'Phone', 'A 10-digit Indian number.', '+91 98765 43210')}
      {phoneRow('workPhone', 'Work phone', 'Your desk or office line, if you have one.', '+91 80 4000 1234')}
      <Row label="Show to colleagues" hint="On People and your colleague card. Off hides both numbers from colleagues; admins still see them." htmlFor="settings-showPhone">
        <input
          id="settings-showPhone"
          type="checkbox"
          role="switch"
          className="p-switch"
          checked={form.showPhone}
          disabled={busy}
          onChange={(e) => setForm({ ...form, showPhone: e.target.checked })}
        />
      </Row>
    </SettingsCard>
  );
}

const CHANGE_FAILED: Record<'wrong-current' | 'signed-out' | 'busy' | 'unavailable', string> = {
  'wrong-current': 'Your current password is incorrect. After 5 wrong tries your account is locked for a minute or more.',
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  busy: "Too many tries right now, so your password wasn't changed. Wait a few minutes and try again.",
  unavailable: "We couldn't reach the server, so your password wasn't changed. Try again in a moment.",
};
// long enough to read the confirmation before the portal closes for the new sign-in
const SIGN_IN_AGAIN_MS = 3000;

function PasswordPanel() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, notify] = useNotice();
  // checked live, so the list explains what's missing before anyone presses the button
  const checks = [
    { label: `At least ${MIN_PASSWORD} characters`, ok: next.length >= MIN_PASSWORD },
    { label: 'Different from your current password', ok: !!next && next !== current },
    { label: 'Both new passwords match', ok: !!next && next === confirm },
  ];
  const ready = !!current && checks.every((c) => c.ok) && !busy;

  const clear = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    if (!auth) {
      // the demo sign-in has no password to change: say so instead of pretending it worked
      clear();
      notify("Password changes aren't connected yet, so your password wasn't changed.");
      return;
    }
    setBusy(true);
    const result = await auth.changePassword(current, next);
    setBusy(false);
    if (result.ok) {
      clear();
      // every session was ended, this one included, so the portal closes and the login opens for the new password
      notify('Password changed. You were signed out everywhere: sign in again with your new password.');
      window.setTimeout(endSessionForNewSignIn, SIGN_IN_AGAIN_MS);
      return;
    }
    setCurrent('');
    notify(result.reason === 'refused' ? result.message || "That password isn't allowed. Try a longer one." : CHANGE_FAILED[result.reason]);
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
              <BtnLabel icon="lock">{busy ? 'Changing…' : 'Change password'}</BtnLabel>
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

/** Light, Dark or Auto. It applies at once and is kept in this browser only, so each device can differ. */
function AppearancePanel() {
  return (
    <SettingsCard
      id="settings-appearance"
      title="Appearance"
      sub="How the site and the portal look in this browser."
      onSubmit={(e) => e.preventDefault()}
      footer={<p className="p-muted">Changes apply at once. Services and Research stay dark whatever you pick.</p>}
    >
      <Row label="Theme" hint="Auto follows your phone or computer's own setting. Saved in this browser only.">
        <ThemeChoices />
      </Row>
    </SettingsCard>
  );
}
