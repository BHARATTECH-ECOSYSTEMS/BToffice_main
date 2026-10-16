import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useScene } from '../gl/Scene';
import { getSession, startSession } from '../portal/session';
import { ThreadMark } from '../sections/Faq';
import { LogoGlass } from './LogoGlass';
import { Arrow, Brand, BtnText } from './ui';
import '../styles/login.css';

/**
 * Employee login, as a pop-up over whatever page is open (the nav, the phone menu and the footer all open it).
 * Two views share the form side: sign in and password reset. Accounts are made by an administrator, so
 * there is no sign-up.
 * There is no login backend yet. Sign in opens the employee portal as a DEMO session (src/portal/session.ts):
 * any well-formed email gets in and no password is checked, and the form says so. Password reset still only
 * says it isn't connected. Nothing typed here is sent anywhere, and the password is never stored.
 */

const LoginContext = createContext<() => void>(() => {});

/** Opens the employee login pop-up. */
export const useOpenLogin = () => useContext(LoginContext);

export function LoginProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { state } = useLocation();
  // someone already signed in goes straight to the portal instead of seeing the form again
  const openLogin = useCallback(() => (getSession() ? navigate('/portal') : setOpen(true)), [navigate]);
  const close = useCallback(() => setOpen(false), []);

  // the portal sends signed-out visitors here with the login open
  const asked = (state as { openLogin?: boolean } | null)?.openLogin;
  useEffect(() => {
    if (asked) setOpen(true);
  }, [asked]);
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
type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'notice'; text: string } | { kind: 'entering' } | { kind: 'welcome' };

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_NOT_CONNECTED = 'Password reset isn’t connected yet, so no email was sent. Please ask your administrator for now.';
const COPY: Record<View, { title: string; sub: string; submit: string; busy: string }> = {
  signin: { title: 'Welcome back', sub: 'Sign in to your workspace.', submit: 'Sign in', busy: 'Signing in…' },
  forgot: { title: 'Reset your password', sub: 'Enter your work email and we’ll send you a reset link.', submit: 'Send reset link', busy: 'Sending…' },
};
// matches the closing animation in login.css
const CLOSE_MS = 220;
// The sign-in walk (after the "Lunara" reel): the door opens, the figure walks through, the door shuts, then the
// button floods teal from the doorway. These match the keyframes in login.css.
const WALK_MS = 1450;
// long enough for the teal, the check and then the sparks (they start SPARK_MS into the welcome; login.css)
const WELCOME_MS = 1150;
const SPARK_MS = 380;
// where each spark lands, from the check in the middle of the button: a loose fan, mostly upwards
const SPARKS: { x: number; y: number; size: number }[] = [
  { x: -78, y: -26, size: 6 },
  { x: -38, y: -50, size: 8 },
  { x: 6, y: -58, size: 5 },
  { x: 46, y: -46, size: 7 },
  { x: 82, y: -18, size: 6 },
];

/**
 * A soft two-note "ting" for the welcome, made in the browser so there's no audio file to load. Browsers only let
 * sound start from a click, so this runs inside the sign-in click and schedules the notes for later. If audio isn't
 * available it simply stays quiet.
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


function LoginDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef(0);
  const walk = useRef<number[]>([]);
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
  const navigate = useNavigate();
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
      walk.current.forEach((t) => window.clearTimeout(t));
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
    if (view === 'signin') {
      if (status.kind === 'entering' || status.kind === 'welcome') return;
      const remember = f.get('remember') === 'on';
      // Everyone signs in as an employee for now; the portal's demo "View as" switch shows the other roles.
      // Leaving the site's layout unmounts this pop-up, whose cleanup restores scrolling and focus.
      const enter = () => {
        startSession(mail, 'employee', remember);
        navigate('/portal');
      };
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // no walk and no sparks, but the sound isn't motion, so the ting still marks the welcome
        setStatus({ kind: 'welcome' });
        scheduleChime(0.05);
        walk.current.push(window.setTimeout(enter, 400));
        return;
      }
      scheduleChime((WALK_MS + SPARK_MS) / 1000);
      setStatus({ kind: 'entering' });
      walk.current.push(
        window.setTimeout(() => setStatus({ kind: 'welcome' }), WALK_MS),
        window.setTimeout(enter, WALK_MS + WELCOME_MS),
      );
      return;
    }
    setStatus({ kind: 'loading' });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus({ kind: 'notice', text: RESET_NOT_CONNECTED }), 900);
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
              {view === 'signin' ? (
                // the wrapper holds the sparks, which fly outside the button (the button clips what's inside it)
                <div className="login-submit-wrap" data-phase={status.kind === 'welcome' ? 'welcome' : undefined}>
                <button
                  type="submit"
                  className="btn btn-primary login-submit is-door"
                  data-phase={status.kind === 'entering' || status.kind === 'welcome' ? status.kind : undefined}
                  aria-disabled={status.kind === 'entering' || status.kind === 'welcome' || undefined}
                >
                  <span className="login-submit-label">
                    <BtnText>{copy.submit}</BtnText>
                  </span>
                  {/* a little figure by a glass door: on sign-in it walks through, the door shuts and the button
                      turns teal from the doorway. Decoration only; the status line below says what is happening */}
                  <span className="login-door" aria-hidden="true">
                    <span className="login-door-light" />
                    <span className="login-door-panel" />
                  </span>
                  <svg className="login-walker" viewBox="0 0 12 24" aria-hidden="true">
                    <circle cx="6" cy="3.2" r="2.3" />
                    <path className="login-walker-body" d="M6 5.8v8" />
                    <path className="login-walker-arm is-a" d="M6 7.4l-2.6 4.4" />
                    <path className="login-walker-arm is-b" d="M6 7.4l2.6 4.4" />
                    <path className="login-walker-leg is-a" d="M6 13.8l-2.4 8.4" />
                    <path className="login-walker-leg is-b" d="M6 13.8l2.4 8.4" />
                  </svg>
                  <span className="login-flood" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                </button>
                <span className="login-sparks" aria-hidden="true">
                  {SPARKS.map((s, i) => (
                    <i key={i} style={{ '--x': `${s.x}px`, '--y': `${s.y}px`, '--s': `${s.size}px`, '--k': i } as React.CSSProperties} />
                  ))}
                </span>
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
              {view === 'signin' && <p className="login-demo">Demo: sign-in isn’t connected yet. Any work email opens the portal as an employee, and no password is checked.</p>}
              <p className="login-notice" role="status" aria-live="polite">
                {status.kind === 'notice' ? status.text : status.kind === 'entering' ? 'Signing you in…' : status.kind === 'welcome' ? 'Welcome back!' : ''}
              </p>
            </form>
          </div>
        </div>
      </div>
    </dialog>
  );
}
