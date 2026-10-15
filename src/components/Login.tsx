import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useScene } from '../gl/Scene';
import { ThreadMark } from '../sections/Faq';
import { LogoGlass } from './LogoGlass';
import { Arrow, Brand, BtnText } from './ui';
import '../styles/login.css';

/**
 * Employee login, as a pop-up over whatever page is open (the nav, the phone menu and the footer all open it).
 * Two views share the form side: sign in and password reset. Accounts are made by an administrator, so
 * there is no sign-up.
 * There is no login backend yet: each form checks what was typed, then says plainly that it isn't
 * connected. Nothing typed here is stored or sent anywhere.
 */

const LoginContext = createContext<() => void>(() => {});

/** Opens the employee login pop-up. */
export const useOpenLogin = () => useContext(LoginContext);

export function LoginProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openLogin = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  return (
    <LoginContext.Provider value={openLogin}>
      {children}
      {/* mounted only while open, so the 3D logo is built on open and torn down on close */}
      {open && <LoginDialog onClose={close} />}
    </LoginContext.Provider>
  );
}

type View = 'signin' | 'forgot';
type Field = 'email' | 'password';
type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'notice'; text: string };

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOT_CONNECTED: Record<View, string> = {
  signin: 'Sign-in isn’t connected yet, so nothing was sent. What you typed stays on this page.',
  forgot: 'Password reset isn’t connected yet, so no email was sent. Please ask your administrator for now.',
};
const COPY: Record<View, { title: string; sub: string; submit: string; busy: string }> = {
  signin: { title: 'Welcome back', sub: 'Sign in to your workspace.', submit: 'Sign in', busy: 'Signing in…' },
  forgot: { title: 'Reset your password', sub: 'Enter your work email and we’ll send you a reset link.', submit: 'Send reset link', busy: 'Sending…' },
};
// matches the closing animation in login.css
const CLOSE_MS = 220;


function LoginDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef(0);
  const [closing, setClosing] = useState(false);
  const [view, setView] = useState<View>('signin');
  // which way the new view slides in; unset until the first switch, so the opening stagger plays only once
  const [dir, setDir] = useState<'next' | 'back' | undefined>();
  // kept across views, so switching to reset doesn't make anyone type their email twice
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const { lenis } = useScene();
  const ids = useId();
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const copy = COPY[view];

  // a modal <dialog> brings Esc, a focus trap and an inert page; the page behind also stops scrolling
  useEffect(() => {
    const d = dialog.current!;
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
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer.current);
      root.style.overflow = overflow;
      lenis?.start();
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
    setDir(next === 'forgot' ? 'next' : 'back');
    setView(next);
    setErrors({});
    setStatus({ kind: 'idle' });
    setShowPassword(false);
    // after the new view renders, focus moves into its form
    requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('input')?.focus());
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password') ?? '');
    const mail = email.trim();
    const next: typeof errors = {};
    if (!mail) next.email = 'Enter your work email.';
    else if (!EMAIL_SHAPE.test(mail)) next.email = 'That doesn’t look like an email address.';
    if (view === 'signin' && !password) next.password = 'Enter your password.';
    setErrors(next);
    const first = (['email', 'password'] as Field[]).find((k) => next[k]);
    if (first) {
      e.currentTarget.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setStatus({ kind: 'loading' });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus({ kind: 'notice', text: NOT_CONNECTED[view] }), 900);
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
          // browsers ignore "off" on passwords; "new-password" is the one hint that stops them filling a saved login
          autoComplete="new-password"
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
            <LogoGlass background={dark ? '#1A1830' : '#EEEAFE'} entrance bounce />
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

          {view === 'forgot' && (
            <button type="button" className="login-back" onClick={() => switchTo('signin')}>
              <Arrow dir="left" /> Back to sign in
            </button>
          )}

          {/* keyed by view, so each view mounts fresh and slides in */}
          <div key={view} className="login-view">
            <h2 id={`${ids}-title`} className="login-title">
              {copy.title}
            </h2>
            <p className="login-sub">{copy.sub}</p>

            <form ref={form} className="login-form" onSubmit={submit} noValidate autoComplete="off">
              <label className="login-field">
                <span>Work email</span>
                <input
                  name="email"
                  type="email"
                  // the browser's saved logins stay out until sign-in is connected; restore username / email /
                  // current-password / new-password hints then
                  autoComplete="off"
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
              {view !== 'forgot' && passwordField}
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
              <p className="login-notice" role="status" aria-live="polite">
                {status.kind === 'notice' ? status.text : ''}
              </p>
            </form>
          </div>
        </div>
      </div>
    </dialog>
  );
}
