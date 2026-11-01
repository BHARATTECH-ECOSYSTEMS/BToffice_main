import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useScene } from '../gl/Scene';
import { auth, isEmployeeId, isUsername, resetTokenFrom, USERNAME_SHAPE, type SignInResult } from '../portal/auth';
import { endedSwitchedOff, getSession, startSession } from '../portal/session';
import { LogoGlass } from './LogoGlass';
import { coverPage } from './pageCover';
import { Arrow, Brand, BtnText, ThreadMark } from './ui';
import '../styles/login.css';

/**
 * Employee login, as a pop-up over whatever page is open (the nav, the phone menu and the footer all open it).
 * Two views share the form side: sign in and password reset. Accounts are made by an administrator, so
 * there is no sign-up.
 * With the real sign-in connected (src/portal/auth.ts), the email and password go to the company backend, and the
 * portal opens with the account's own name and role. Without it, sign in opens the portal as a DEMO session: any
 * well-formed email gets in, no password is checked, nothing is sent anywhere, and the form says so.
 * Password reset: with the real sign-in, "Forgot password?" asks the backend to email a single-use link, and the link
 * (<site>/#/reset-password?token=…) opens this pop-up to choose the new password. The demo only says it isn't
 * connected. The password is never stored.
 */

const LoginContext = createContext<() => void>(() => {});

/** Opens the employee login pop-up. */
export const useOpenLogin = () => useContext(LoginContext);

export function LoginProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // a reset email's link opens the pop-up on "Choose a new password" (or on a new request, if the link is broken);
  // `n` counts the links opened, so each one starts a fresh pop-up even when one is already open
  const [reset, setReset] = useState<{ token: string | null; n: number } | null>(null);
  const navigate = useNavigate();
  const { state, pathname, search } = useLocation();
  // someone already signed in goes straight to the portal instead of seeing the form again
  const openLogin = useCallback(() => (getSession() ? navigate('/portal') : setOpen(true)), [navigate]);
  const linksOpened = useRef(0);
  const close = useCallback(() => (setOpen(false), setReset(null)), []);

  // the portal sends signed-out visitors here with the login open
  const asked = (state as { openLogin?: boolean } | null)?.openLogin;
  useEffect(() => {
    if (asked) setOpen(true);
  }, [asked]);

  useEffect(() => {
    if (!RESET_PATH.test(pathname)) return;
    const token = resetTokenFrom(pathname, search);
    setReset({ token, n: ++linksOpened.current });
    setOpen(true);
    // the token is kept in memory only: off the address bar, so it isn't left in the history or shared by copying it
    navigate('/', { replace: true });
  }, [pathname, search, navigate]);
  return (
    <LoginContext.Provider value={openLogin}>
      {children}
      {/* mounted only while open, so the 3D logo is built on open and torn down on close */}
      {open && <LoginDialog key={reset?.n ?? 0} onClose={close} reset={reset} />}
    </LoginContext.Provider>
  );
}

const RESET_PATH = /^\/reset-password\/?$/;

// setup: an invited person's first sign-in, where they choose their username and password (real sign-in only)
// reset: choosing a new password from a reset email's link (real sign-in only)
type View = 'signin' | 'forgot' | 'setup' | 'reset';
type Field = 'email' | 'password' | 'username' | 'newPassword' | 'confirm';
type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'notice'; text: string } | { kind: 'entering' } | { kind: 'welcome' };

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEW_PASSWORD_MIN = 8;
const RESET_NOT_CONNECTED = 'Password reset isn’t connected yet, so no email was sent. Please ask your administrator for now.';
const RESET_UNAVAILABLE = 'We couldn’t reach the sign-in service, so no email was sent. Try again in a moment.';
const RESET_LINK_GONE = 'That reset link has expired or was already used. Ask for a new one here.';
const RESET_LINK_BROKEN = 'That reset link isn’t complete. Ask for a new one here.';
const RESET_SAVE_FAILED = 'We couldn’t reach the sign-in service, so your password wasn’t changed. Try again in a moment.';
const RESET_DONE = 'Your password was changed, and you were signed out everywhere else. Sign in with the new one.';
// the backend limits password tries per address (429), counted over 15 minutes: a wait, not an outage
const TOO_MANY_TRIES = 'Too many tries from here right now. Wait a few minutes and try again.';
const INVITE_EXPIRED = 'This invite has expired: invites last 12 hours. Ask your admin to send it again from People.';
const SIGN_IN_FAILED: Record<Exclude<SignInResult, { ok: true }>['reason'], string> = {
  credentials: 'Those details don’t match. Check your email, username or Employee ID and password, and try again.',
  'set-password': 'Your account still needs a new password before you can sign in. Please ask your administrator to help you finish setting it.',
  'not-set-up': 'Your account isn’t fully set up yet. Ask an admin to finish it, then sign in again.',
  'switched-off': 'Your sign-in is switched off. Ask an admin if you think this is a mistake.',
  'invite-expired': INVITE_EXPIRED,
  busy: 'Too many sign-in attempts from here right now. Wait a few minutes and try again.',
  unavailable: 'We couldn’t reach the sign-in service. Check your connection and try again in a moment.',
};
const SETUP_FAILED = {
  credentials: 'Your temporary password didn’t work any more. Go back and sign in again with the one from your invite email.',
  'invite-expired': INVITE_EXPIRED,
  busy: TOO_MANY_TRIES,
  unavailable: 'We couldn’t finish setting up your account. Check your connection and try again in a moment.',
};
const COPY: Record<View, { title: string; sub: string; submit: string; busy: string }> = {
  signin: { title: 'Welcome back', sub: 'Sign in to your workspace.', submit: 'Sign in', busy: 'Signing in…' },
  forgot: {
    title: 'Reset your password',
    sub: auth ? 'Enter your work email, username or Employee ID and we’ll email you a reset link.' : 'Enter your work email and we’ll send you a reset link.',
    submit: 'Send reset link',
    busy: 'Sending…',
  },
  setup: { title: 'Set up your account', sub: 'Choose a username and your own password.', submit: 'Finish setup', busy: 'Saving…' },
  reset: { title: 'Choose a new password', sub: 'Your reset link worked. Choose the password you’ll sign in with.', submit: 'Save new password', busy: 'Saving…' },
};

/** A username suggestion from the email ("neha.k@…" → "neha.k"), or nothing when it wouldn't pass the backend's rule. */
const suggestUsername = (email: string) => {
  const name = (email.split('@')[0] ?? '').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 32);
  return USERNAME_SHAPE.test(name) ? name : '';
};
// matches the closing animation in login.css
const CLOSE_MS = 220;
// The sign-in moment: the glass logo orb pops in and rolls one full turn while a ring traces a circle round it
// (ROLL_MS, matching the keyframes in login.css), then the logo breaks into dots (BURST_MS, src/gl/logoBurst.ts).
const ROLL_MS = 1100;
const BURST_MS = 1000;
// the orb's radius in px (.login-orb-ball in login.css): the dots start exactly where the logo was
const ORB_RADIUS = 17;

/**
 * A soft two-note "ting" for the welcome, made in the browser so there's no audio file to load. Browsers only let
 * sound start once the page has been clicked, so this runs from the sign-in click (with the real sign-in, as soon as
 * the backend answers it) and schedules the notes for later. If audio isn't allowed or available it stays quiet.
 */
function scheduleChime(delaySec: number) {
  if (typeof AudioContext === 'undefined') return;
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0.12;
  master.connect(ctx.destination);
  const start = ctx.currentTime + delaySec;
  // G6 then D7: a bright, short bell; each note fades out on its own
  [
    [1568, 0],
    [2349, 0.08],
  ].forEach(([freq, offset]) => {
    const t = start + offset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(1, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 1);
  });
  // free the audio device once the notes have rung out
  window.setTimeout(() => void ctx.close(), (delaySec + 1.4) * 1000);
}


function LoginDialog({ onClose, reset }: { onClose: () => void; reset: { token: string | null } | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef(0);
  const walk = useRef<number[]>([]);
  const burstCanvas = useRef<HTMLCanvasElement>(null);
  const stopBurst = useRef<() => void>(() => {});
  // false once the pop-up has closed, so a sign-in answer that arrives later doesn't animate or navigate
  const alive = useRef(true);
  // an invited person between signing in with their temporary password and choosing their own; never stored
  const invite = useRef<{ email: string; temporaryPassword: string; remember: boolean } | null>(null);
  const [suggestedName, setSuggestedName] = useState('');
  // the token from a reset email's link, in memory only; dropped once it has been used
  const resetToken = useRef(auth ? (reset?.token ?? null) : null);
  const [closing, setClosing] = useState(false);
  // a reset link opens on its own view; a broken one (or any in the demo) on a fresh request
  const [view, setView] = useState<View>(reset ? (resetToken.current ? 'reset' : 'forgot') : 'signin');
  // only the real sign-in knows Employee IDs and usernames; the demo stays email-only
  const idAllowed = (view === 'signin' || view === 'forgot') && !!auth;
  // which way the new view slides in; unset until the first switch, so the opening stagger plays only once
  const [dir, setDir] = useState<'next' | 'back' | undefined>();
  // kept across views, so switching to reset doesn't make anyone type their email twice
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>(
    reset && !resetToken.current
      ? { kind: 'notice', text: auth ? RESET_LINK_BROKEN : RESET_NOT_CONNECTED }
      : // the portal was closed because the account was switched off while signed in
        endedSwitchedOff() ? { kind: 'notice', text: SIGN_IN_FAILED['switched-off'] } : { kind: 'idle' },
  );
  const { lenis } = useScene();
  const navigate = useNavigate();
  const ids = useId();
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const copy = COPY[view];

  // a modal <dialog> brings Esc, a focus trap and an inert page; the page behind also stops scrolling
  useEffect(() => {
    const d = dialog.current!;
    alive.current = true;
    // the button that opened it gets focus back on close, so keyboard users keep their place
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // the card grows out of that button: its offset from the screen centre, where the dialog sits
    if (opener && opener !== document.body) {
      const r = opener.getBoundingClientRect();
      d.style.setProperty('--from-x', `${r.left + r.width / 2 - window.innerWidth / 2}px`);
      d.style.setProperty('--from-y', `${r.top + r.height / 2 - window.innerHeight / 2}px`);
    }
    d.showModal();
    form.current?.querySelector<HTMLInputElement>('input')?.focus();
    lenis?.stop();
    // the home hero's glass holds still behind the window, so the window's own glass logo opens smoothly
    const uncover = coverPage();
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      alive.current = false;
      window.clearTimeout(timer.current);
      walk.current.forEach((t) => window.clearTimeout(t));
      stopBurst.current();
      root.style.overflow = overflow;
      lenis?.start();
      uncover();
      if (d.open) d.close();
      opener?.focus({ preventScroll: true });
    };
  }, [lenis]);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(onClose, CLOSE_MS);
  }, [closing, onClose]);

  const switchTo = (next: View) => {
    if (next === view) return;
    window.clearTimeout(timer.current);
    setDir(next === 'signin' ? 'back' : 'next');
    setView(next);
    setErrors({});
    setStatus({ kind: 'idle' });
    setShowPassword(false);
    // after the new view renders, focus moves into its form
    requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('input')?.focus());
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (view === 'setup') return finishSetup(e.currentTarget);
    if (view === 'reset') return finishReset(e.currentTarget);
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password') ?? '');
    const mail = email.trim();
    const next: typeof errors = {};
    if (!mail) next.email = idAllowed ? 'Enter your work email, username or Employee ID.' : 'Enter your work email.';
    else if (!EMAIL_SHAPE.test(mail) && !(idAllowed && (isEmployeeId(mail) || isUsername(mail)))) {
      next.email = idAllowed ? 'Enter a work email, your username, or an Employee ID like BT-0001.' : 'That doesn’t look like an email address.';
    }
    if (view === 'signin' && !password) next.password = 'Enter your password.';
    setErrors(next);
    const first = (['email', 'password'] as Field[]).find((k) => next[k]);
    if (first) {
      e.currentTarget.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    if (view === 'signin') {
      if (status.kind === 'loading' || status.kind === 'entering' || status.kind === 'welcome') return;
      const remember = f.get('remember') === 'on';
      if (!auth) {
        // Demo: everyone signs in as an employee; the portal's "View as" switch shows the other roles.
        welcome(() => startSession(mail, 'employee', remember));
        return;
      }
      setStatus({ kind: 'loading' });
      void auth.signIn(mail, password, remember).then((result) => {
        // signed in even if the pop-up was closed meanwhile, so the next "Employee login" opens the portal
        if (result.ok) startSession(result.account.email, result.account.role, remember, result.account.name);
        if (!alive.current) return;
        if (result.ok) return welcome();
        if (result.reason === 'credentials') {
          setStatus({ kind: 'idle' });
          setErrors({ password: SIGN_IN_FAILED.credentials });
          form.current?.querySelector<HTMLInputElement>('[name="password"]')?.focus();
          return;
        }
        if (result.reason === 'set-password') {
          // the temporary password from the invite worked; keep it (in memory only) for the setup step
          invite.current = { email: mail, temporaryPassword: password, remember };
          setSuggestedName(suggestUsername(mail));
          return switchTo('setup');
        }
        setStatus({ kind: 'notice', text: SIGN_IN_FAILED[result.reason] });
      });
      return;
    }
    if (status.kind === 'loading') return;
    setStatus({ kind: 'loading' });
    window.clearTimeout(timer.current);
    if (!auth) {
      timer.current = window.setTimeout(() => setStatus({ kind: 'notice', text: RESET_NOT_CONNECTED }), 900);
      return;
    }
    void auth.requestPasswordReset(mail).then((result) => {
      if (alive.current) setStatus({ kind: 'notice', text: result.ok ? result.message : result.reason === 'busy' ? TOO_MANY_TRIES : RESET_UNAVAILABLE });
    });
  };

  const finishReset = (formEl: HTMLFormElement) => {
    const token = resetToken.current;
    if (!auth || !token || status.kind === 'loading') return;
    const f = new FormData(formEl);
    const newPassword = String(f.get('newPassword') ?? '');
    const confirm = String(f.get('confirm') ?? '');
    const next: typeof errors = {};
    if (newPassword.length < NEW_PASSWORD_MIN) next.newPassword = `Use at least ${NEW_PASSWORD_MIN} characters.`;
    if (confirm !== newPassword) next.confirm = 'The two passwords don’t match.';
    setErrors(next);
    const first = (['newPassword', 'confirm'] as Field[]).find((k) => next[k]);
    if (first) {
      formEl.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setStatus({ kind: 'loading' });
    void auth.resetPassword(token, newPassword).then((result) => {
      if (result.ok || result.reason === 'link-gone') resetToken.current = null;
      if (!alive.current) return;
      if (result.ok) {
        switchTo('signin');
        return setStatus({ kind: 'notice', text: RESET_DONE });
      }
      if (result.reason === 'link-gone') {
        switchTo('forgot');
        return setStatus({ kind: 'notice', text: RESET_LINK_GONE });
      }
      setStatus({ kind: 'idle' });
      if (result.reason === 'refused') {
        setErrors({ newPassword: result.message || 'That password wasn’t accepted. Please choose another.' });
        formEl.querySelector<HTMLInputElement>('[name="newPassword"]')?.focus();
        return;
      }
      setStatus({ kind: 'notice', text: result.reason === 'busy' ? TOO_MANY_TRIES : RESET_SAVE_FAILED });
    });
  };

  const finishSetup = (formEl: HTMLFormElement) => {
    const pending = invite.current;
    if (!auth || !pending || status.kind === 'loading' || status.kind === 'entering' || status.kind === 'welcome') return;
    const f = new FormData(formEl);
    const newUsername = String(f.get('username') ?? '').trim();
    const newPassword = String(f.get('newPassword') ?? '');
    const confirm = String(f.get('confirm') ?? '');
    const next: typeof errors = {};
    if (!USERNAME_SHAPE.test(newUsername)) next.username = 'Use 3 to 32 letters, numbers, dots, dashes or underscores.';
    if (newPassword.length < NEW_PASSWORD_MIN) next.newPassword = `Use at least ${NEW_PASSWORD_MIN} characters.`;
    else if (newPassword === pending.temporaryPassword) next.newPassword = 'Choose a password that isn’t the temporary one.';
    if (confirm !== newPassword) next.confirm = 'The two passwords don’t match.';
    setErrors(next);
    const first = (['username', 'newPassword', 'confirm'] as Field[]).find((k) => next[k]);
    if (first) {
      formEl.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setStatus({ kind: 'loading' });
    void auth.acceptInvite({ username: pending.email, temporaryPassword: pending.temporaryPassword, newPassword, newUsername }, pending.remember).then((result) => {
      if (result.ok) {
        invite.current = null;
        startSession(result.account.email, result.account.role, pending.remember, result.account.name);
      }
      if (!alive.current) return;
      if (result.ok) {
        // back on the sign-in view, so the welcome plays on its button as it does for every sign-in
        switchTo('signin');
        return welcome();
      }
      setStatus({ kind: 'idle' });
      if (result.reason === 'username-taken' || result.reason === 'invalid') {
        setErrors({ username: result.reason === 'invalid' && result.message ? result.message : 'That username is taken. Try another.' });
        formEl.querySelector<HTMLInputElement>('[name="username"]')?.focus();
        return;
      }
      setStatus({ kind: 'notice', text: SETUP_FAILED[result.reason] });
    });
  };

  /** The sign-in moment, then the portal. `begin` runs as the portal opens. */
  const welcome = (begin?: () => void) => {
    // Leaving the site's layout unmounts this pop-up, whose cleanup restores scrolling and focus.
    const enter = () => {
      begin?.();
      navigate('/portal');
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // no roll and no dots, but the sound isn't motion, so the ting still marks the welcome
      setStatus({ kind: 'welcome' });
      scheduleChime(0.05);
      walk.current.push(window.setTimeout(enter, 400));
      return;
    }
    // load the dot burst now, so it's ready by the time the roll ends
    const burst = import('../gl/logoBurst');
    scheduleChime(ROLL_MS / 1000);
    setStatus({ kind: 'entering' });
    walk.current.push(
      window.setTimeout(() => {
        setStatus({ kind: 'welcome' });
        void burst.then(({ playLogoBurst }) => {
          if (burstCanvas.current) stopBurst.current = playLogoBurst(burstCanvas.current, { radius: ORB_RADIUS, duration: BURST_MS });
        });
      }, ROLL_MS),
      window.setTimeout(enter, ROLL_MS + BURST_MS),
    );
  };

  const clearError = (k: Field) => errors[k] && setErrors((x) => ({ ...x, [k]: undefined }));
  const errorProps = (k: Field) => ({
    'aria-invalid': !!errors[k] || undefined,
    'aria-describedby': errors[k] ? `${ids}-${k}-err` : undefined,
  });
  const error = (k: Field) =>
    errors[k] && (
      <em id={`${ids}-${k}-err`} className="login-error">
        {errors[k]}
      </em>
    );

  // the 3D logo leans towards the pointer; only this one element's custom properties change
  const lean = (e: React.PointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    art.current?.style.setProperty('--lx', (((e.clientX - b.left) / b.width) * 2 - 1).toFixed(3));
    art.current?.style.setProperty('--ly', (((e.clientY - b.top) / b.height) * 2 - 1).toFixed(3));
  };

  const passwordField = (
    <label className="login-field">
      <span>Password</span>
      <span className="login-password">
        <input
          name="password"
          type={showPassword ? 'text' : 'password'}
          // demo: browsers ignore "off" on passwords; "new-password" is the one hint that stops them filling a saved login
          autoComplete={auth ? 'current-password' : 'new-password'}
          {...errorProps('password')}
          onInput={() => clearError('password')}
        />
        <button type="button" className="login-reveal" onClick={() => setShowPassword((s) => !s)} aria-pressed={showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </span>
      {error('password')}
    </label>
  );

  const newPasswordInput = (name: 'newPassword' | 'confirm', label: string) => (
    <label className="login-field">
      <span>{label}</span>
      <span className="login-password">
        <input name={name} type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...errorProps(name)} onInput={() => clearError(name)} />
        {name === 'newPassword' && (
          <button type="button" className="login-reveal" onClick={() => setShowPassword((s) => !s)} aria-pressed={showPassword} aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
      </span>
      {error(name)}
    </label>
  );

  const setupFields = (
    <>
      <label className="login-field">
        <span>Username</span>
        <input name="username" autoComplete="username" defaultValue={suggestedName} {...errorProps('username')} onInput={() => clearError('username')} />
        {error('username')}
      </label>
      {newPasswordInput('newPassword', 'New password')}
      {newPasswordInput('confirm', 'New password again')}
    </>
  );

  return (
    <dialog
      ref={dialog}
      className="login"
      data-closing={closing || undefined}
      data-switched={dir}
      aria-labelledby={`${ids}-title`}
      onCancel={(e) => {
        // Esc: play the closing animation instead of vanishing
        e.preventDefault();
        close();
      }}
      // a click on the dimmed backdrop lands on the dialog element itself
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="login-card">
        <div className="login-art" ref={art} onPointerMove={lean} onPointerLeave={() => (art.current?.style.setProperty('--lx', '0'), art.current?.style.setProperty('--ly', '0'))} aria-hidden="true">
          <i className="login-glow is-a" />
          <i className="login-glow is-b" />
          <i className="login-glow is-c" />
          <div className="login-logo">
            {/* built once the card has grown open (login-grow), so the opening never stutters */}
            <LogoGlass background={dark ? '#1A1830' : '#EEEAFE'} entrance bounce buildAfter={600} />
          </div>
          <Brand mark={<ThreadMark />} />
          <p className="login-art-line">The operating system for intelligence.</p>
        </div>

        <div className="login-main">
          <button type="button" className="login-close" onClick={close} aria-label="Close login">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
            </svg>
          </button>
          <p className="cell-label">Employee login</p>

          {view !== 'signin' && (
            <button
              type="button"
              className="login-back"
              onClick={() => {
                invite.current = null;
                switchTo('signin');
              }}
            >
              <Arrow dir="left" /> Back to sign in
            </button>
          )}

          {/* keyed by view, so each view mounts fresh and slides in */}
          <div key={view} className="login-view">
            <h2 id={`${ids}-title`} className="login-title">
              {copy.title}
            </h2>
            <p className="login-sub">{copy.sub}</p>

            <form ref={form} className="login-form" onSubmit={submit} noValidate autoComplete={auth ? 'on' : 'off'}>
              {view === 'setup' && setupFields}
              {view === 'reset' && (
                <>
                  {newPasswordInput('newPassword', 'New password')}
                  {newPasswordInput('confirm', 'New password again')}
                </>
              )}
              {(view === 'signin' || view === 'forgot') && (
              <label className="login-field">
                <span>{idAllowed ? 'Work email, username or Employee ID' : 'Work email'}</span>
                <input
                  name="email"
                  // a text field, because the browser's email check would refuse BT-0001
                  type={idAllowed ? 'text' : 'email'}
                  autoCapitalize="none"
                  spellCheck={false}
                  // the browser's saved logins stay out of the demo sign-in, which checks no password
                  autoComplete={auth ? 'username' : 'off'}
                  placeholder="name@bharattechorigin.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError('email');
                  }}
                  {...errorProps('email')}
                />
                {error('email')}
              </label>
              )}
              {view === 'signin' && passwordField}
              {view === 'signin' && (
                <div className="login-row">
                  <label className="login-check">
                    <input type="checkbox" name="remember" />
                    <span>Remember me</span>
                  </label>
                  <button type="button" className="login-link" onClick={() => switchTo('forgot')}>
                    Forgot password?
                  </button>
                </div>
              )}
              {view === 'signin' ? (
                // the wrapper holds the dot canvas, which reaches outside the button (the button clips what's inside it)
                <div className="login-submit-wrap">
                  <button
                    type="submit"
                    className="btn btn-primary login-submit is-glass"
                    data-phase={status.kind === 'entering' || status.kind === 'welcome' ? status.kind : undefined}
                    aria-disabled={status.kind === 'loading' || status.kind === 'entering' || status.kind === 'welcome' || undefined}
                  >
                    <span className="login-submit-label">
                      {status.kind === 'loading' ? (
                        <>
                          <i className="login-spinner" aria-hidden="true" /> <BtnText>{copy.busy}</BtnText>
                        </>
                      ) : (
                        <BtnText>{copy.submit}</BtnText>
                      )}
                    </span>
                    {/* the logo as a glass orb: it rolls a full turn inside a ring, then breaks into dots (the canvas
                        below). Decoration only; the status line under the form says what is happening */}
                    <span className="login-orb" aria-hidden="true">
                      <svg className="login-orb-ring" viewBox="0 0 46 46">
                        <circle cx="23" cy="23" r="21" pathLength={1} />
                      </svg>
                      <span className="login-orb-comet" />
                      <span className="login-orb-ball">
                        <ThreadMark size={ORB_RADIUS * 2} />
                      </span>
                    </span>
                    <span className="login-submit-done" aria-hidden="true">
                      Welcome back
                    </span>
                  </button>
                  <canvas ref={burstCanvas} className="login-burst" aria-hidden="true" />
                </div>
              ) : (
                <button type="submit" className="btn btn-primary login-submit" disabled={status.kind === 'loading'}>
                  {status.kind === 'loading' ? (
                    <>
                      <i className="login-spinner" aria-hidden="true" /> <BtnText>{copy.busy}</BtnText>
                    </>
                  ) : (
                    <>
                      <BtnText>{copy.submit}</BtnText> <Arrow />
                    </>
                  )}
                </button>
              )}
              {view === 'signin' && !auth && <p className="login-demo">Demo: sign-in isn’t connected yet. Any work email opens the portal as an employee, and no password is checked.</p>}
              <p className="login-notice" role="status" aria-live="polite">
                {status.kind === 'notice'
                  ? status.text
                  : status.kind === 'loading' && view !== 'signin'
                    ? copy.busy
                    : status.kind === 'loading' || status.kind === 'entering'
                      ? 'Signing you in…'
                      : status.kind === 'welcome'
                        ? 'Welcome back!'
                        : ''}
              </p>
            </form>
          </div>
        </div>
      </div>
    </dialog>
  );
}
