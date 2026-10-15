import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useScene } from '../gl/Scene';
import { ThreadMark } from '../sections/Faq';
import { LogoGlass } from './LogoGlass';
import { Arrow, Brand, BtnText } from './ui';
import '../styles/login.css';

/**
 * Employee login, as a pop-up over whatever page is open (the nav, the phone menu and the footer all open it).
 * Three views share the form side: sign in and sign up (as tabs) and password reset.
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

type View = 'signin' | 'signup' | 'forgot';
type Field = 'name' | 'email' | 'password';
type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'notice'; text: string };

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const NOT_CONNECTED: Record<View, string> = {
  signin: 'Sign-in isn’t connected yet, so nothing was sent. What you typed stays on this page.',
  signup: 'Sign-up isn’t connected yet, so no account was created. What you typed stays on this page.',
  forgot: 'Password reset isn’t connected yet, so no email was sent. Please ask your administrator for now.',
};
const COPY: Record<View, { title: string; sub: string; submit: string; busy: string }> = {
  signin: { title: 'Welcome back', sub: 'Sign in to your workspace.', submit: 'Sign in', busy: 'Signing in…' },
  signup: { title: 'Create your account', sub: 'Join your team’s workspace with your work email.', submit: 'Create account', busy: 'Creating account…' },
  forgot: { title: 'Reset your password', sub: 'Enter your work email and we’ll send you a reset link.', submit: 'Send reset link', busy: 'Sending…' },
};
const TABS: { view: View; label: string }[] = [
  { view: 'signin', label: 'Sign in' },
  { view: 'signup', label: 'Sign up' },
];
// views to the right of the current one slide in from the right, so the tabs and the reset view read as a row
const ORDER: Record<View, number> = { signin: 0, signup: 1, forgot: 2 };
// matches the closing animation in login.css
const CLOSE_MS = 220;

const PROVIDERS = [
  {
    name: 'Google',
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
      </svg>
    ),
  },
  {
    name: 'Microsoft',
    icon: (
      <svg viewBox="0 0 21 21" aria-hidden="true">
        <path fill="#F25022" d="M1 1h9v9H1z" />
        <path fill="#7FBA00" d="M11 1h9v9h-9z" />
        <path fill="#00A4EF" d="M1 11h9v9H1z" />
        <path fill="#FFB900" d="M11 11h9v9h-9z" />
      </svg>
    ),
  },
  {
    name: 'GitHub',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
        />
      </svg>
    ),
  },
];

function LoginDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const timer = useRef(0);
  const [closing, setClosing] = useState(false);
  const [view, setView] = useState<View>('signin');
  // which way the new view slides in; unset until the first switch, so the opening stagger plays only once
  const [dir, setDir] = useState<'next' | 'back' | undefined>();
  // kept across views, so switching to sign-up or reset doesn't make anyone type their email twice
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

  const switchTo = (next: View, focus: 'field' | 'tab' = 'field') => {
    if (next === view) return;
    window.clearTimeout(timer.current);
    setDir(ORDER[next] > ORDER[view] ? 'next' : 'back');
    setView(next);
    setErrors({});
    setStatus({ kind: 'idle' });
    setShowPassword(false);
    // after the new view renders: a link moves focus into its form, a tab keeps focus on the tabs
    requestAnimationFrame(() => {
      if (focus === 'tab') tabs.current[TABS.findIndex((t) => t.view === next)]?.focus();
      else form.current?.querySelector<HTMLInputElement>('input')?.focus();
    });
  };

  // tabs follow the usual keyboard pattern: arrows move between them
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    switchTo(view === 'signup' ? 'signin' : 'signup', 'tab');
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name') ?? '').trim();
    const password = String(f.get('password') ?? '');
    const mail = email.trim();
    const next: typeof errors = {};
    if (view === 'signup' && !name) next.name = 'Enter your full name.';
    if (!mail) next.email = 'Enter your work email.';
    else if (!EMAIL_SHAPE.test(mail)) next.email = 'That doesn’t look like an email address.';
    if (view === 'signin' && !password) next.password = 'Enter your password.';
    if (view === 'signup' && password.length < MIN_PASSWORD) next.password = `Use at least ${MIN_PASSWORD} characters.`;
    setErrors(next);
    const first = (['name', 'email', 'password'] as Field[]).find((k) => next[k]);
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
      {error('password') || (view === 'signup' && <small className="login-hint">At least {MIN_PASSWORD} characters.</small>)}
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

          {view === 'forgot' ? (
            <button type="button" className="login-back" onClick={() => switchTo('signin')}>
              <Arrow dir="left" /> Back to sign in
            </button>
          ) : (
            <div className="login-tabs" role="tablist" aria-label="Sign in or sign up" data-on={view}>
              {TABS.map((t, i) => (
                <button
                  key={t.view}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${ids}-tab-${t.view}`}
                  aria-selected={view === t.view}
                  aria-controls={`${ids}-panel`}
                  tabIndex={view === t.view ? 0 : -1}
                  onClick={() => switchTo(t.view, 'tab')}
                  onKeyDown={onTabKey}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* keyed by view, so each view mounts fresh and slides in */}
          <div key={view} className="login-view" id={`${ids}-panel`} role={view === 'forgot' ? undefined : 'tabpanel'} aria-labelledby={view === 'forgot' ? undefined : `${ids}-tab-${view}`}>
            <h2 id={`${ids}-title`} className="login-title">
              {copy.title}
            </h2>
            <p className="login-sub">{copy.sub}</p>

            <form ref={form} className="login-form" onSubmit={submit} noValidate autoComplete="off">
              {view === 'signup' && (
                <label className="login-field">
                  <span>Full name</span>
                  <input name="name" type="text" autoComplete="off" {...errorProps('name')} onInput={() => clearError('name')} />
                  {error('name')}
                </label>
              )}
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
              {view !== 'forgot' && (
                <>
                  <div className="login-or" aria-hidden="true">
                    <span>or continue with</span>
                  </div>
                  <div className="login-providers">
                    {PROVIDERS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        className="login-provider"
                        onClick={() => setStatus({ kind: 'notice', text: `${p.name} sign-in isn’t connected yet, so nothing was sent.` })}
                      >
                        {p.icon}
                        {p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
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
