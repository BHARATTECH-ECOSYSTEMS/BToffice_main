import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useScene } from '../gl/Scene';
import { sendEmploymentRequest, sendsToBackend, submitEmploymentRequest } from '../portal/inbox';
import { Arrow, BtnText } from './ui';
import { thisMonth } from './verifyForm';
import '../styles/verify-request.css';

/**
 * Employment verification for outside companies, in the site footer. Other companies (a new employer, a
 * background-check agency) send their request here instead of emailing someone at Bharattech, so every request
 * reaches HR OPS → Verification Requests in one place. Connected, it goes to the company's backend, which emails a
 * receipt and later the answer; in the demo it's kept in this tab only, and the form says so.
 */
/** The footer's request button, under the CONNECT pill, with one line saying who it is for. */
export function VerifyRequestButton() {
  const [open, setOpen] = useState(false);
  const ids = useId();
  return (
    <div className="footer-request">
      <p id={`${ids}-hint`}>Verifying someone who worked here?</p>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-describedby={`${ids}-hint`}>
        <BtnText>Request a verification</BtnText> <Arrow />
      </button>
      {/* in the body, not the footer, so the footer's text styles (.footer-lead p) don't reach the form */}
      {open && createPortal(<VerifyDialog onClose={() => setOpen(false)} />, document.body)}
    </div>
  );
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = Array.from({ length: 31 }, (_, i) => new Date().getFullYear() - i);

/**
 * A month as two dropdowns (month, year), sent as one `YYYY-MM` value under `name`. Used instead of
 * <input type="month">, which Safari and Firefox show as a plain text box with no picker.
 */
function MonthField({ name, label, hint, required }: { name: string; label: string; hint?: string; required?: boolean }) {
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const id = useId();
  return (
    <div className="vr-month" role="group" aria-labelledby={`${id}-label`} aria-describedby={hint ? `${id}-hint` : undefined}>
      <span id={`${id}-label`}>{label}</span>
      <div>
        <select aria-label={`${label}: month`} value={month} onChange={(e) => setMonth(e.target.value)} required={required || !!year}>
          <option value="">Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1).padStart(2, '0')}>
              {m}
            </option>
          ))}
        </select>
        <select aria-label={`${label}: year`} value={year} onChange={(e) => setYear(e.target.value)} required={required || !!month}>
          <option value="">Year</option>
          {YEARS.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </div>
      {hint && (
        <small className="vr-hint" id={`${id}-hint`}>
          {hint}
        </small>
      )}
      <input type="hidden" name={name} value={month && year ? `${year}-${month}` : ''} />
    </div>
  );
}

function VerifyDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { lenis } = useScene();
  const ids = useId();
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  // connected: received, with the address the receipt went to
  const [received, setReceived] = useState<{ email: string } | null>(null);
  const [sending, setSending] = useState(false);
  // a drag that starts in a field and ends on the backdrop also clicks the backdrop: only a press there closes
  const pressedBackdrop = useRef(false);

  // a modal <dialog> brings Esc, a focus trap and an inert page; the page behind stops scrolling
  useEffect(() => {
    const d = dialog.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // the form grows out of the button that opened it (as the login does): its offset from the screen centre
    if (opener && opener !== document.body) {
      const r = opener.getBoundingClientRect();
      d.style.setProperty('--from-x', `${r.left + r.width / 2 - window.innerWidth / 2}px`);
      d.style.setProperty('--from-y', `${r.top + r.height / 2 - window.innerHeight / 2}px`);
    }
    d.showModal();
    lenis?.stop();
    return () => {
      lenis?.start();
      if (d.open) d.close();
      opener?.focus({ preventScroll: true });
    };
  }, [lenis]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '').trim();
    const draft = {
      requesterCompany: get('company'),
      requesterName: get('name'),
      requesterEmail: get('email').toLowerCase(),
      candidate: get('candidate'),
      employeeId: get('employeeId').toUpperCase(),
      designation: get('designation'),
      from: get('from'),
      to: get('to'),
    };
    // the browser checks the required fields first; these are the rules it can't express
    if (!EMAIL_SHAPE.test(draft.requesterEmail)) return setError('Enter your work email, like name@company.com.');
    if (draft.to && draft.to < draft.from) return setError('The month they left can’t be before the month they joined.');
    if (draft.from > thisMonth() || (draft.to && draft.to > thisMonth())) return setError('Employment months can’t be in the future.');
    setError('');
    if (!sendsToBackend) return setReference(submitEmploymentRequest(draft));
    setSending(true);
    const sent = await sendEmploymentRequest(draft, get('leave_empty'));
    setSending(false);
    if (!sent.ok) return setError(sent.message);
    setReference(sent.reference);
    setReceived({ email: draft.requesterEmail });
  };
  const done = !!reference || !!received;

  return (
    <dialog
      ref={dialog}
      className="vr-dialog"
      // the page's smooth scroll (Lenis) is stopped while this is open and would swallow the wheel; the form is
      // taller than short screens, so the dialog scrolls itself
      data-lenis-prevent
      aria-labelledby={`${ids}-title`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // a click on the dimmed backdrop lands on the dialog element itself
      onPointerDown={(e) => (pressedBackdrop.current = e.target === e.currentTarget)}
      onClick={(e) => e.target === e.currentTarget && pressedBackdrop.current && onClose()}
    >
      {/* the title and the close button stay put while the fields scroll under them */}
      <header className="vr-head">
        <h2 id={`${ids}-title`}>{done ? 'Request received' : 'Request an employment verification'}</h2>
        {!done && <p className="vr-sub">Tell us who you’re checking. We confirm whether they worked here, for how long, and in which role.</p>}
        <button type="button" className="vr-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
          </svg>
        </button>
      </header>
      {done ? (
        <div className="vr-body vr-done" role="status">
          {reference ? (
            <p>
              Your reference is <strong className="vr-ref">{reference}</strong>. Our HR team checks it against our records.
            </p>
          ) : (
            <p>Thank you. Our HR team checks it against our records.</p>
          )}
          {received ? (
            <p className="form-note">We’ve emailed a receipt to {received.email}, and we’ll email the answer there too.</p>
          ) : (
            <p className="form-note">
              Demo: there is no server yet, so this request is kept in this browser tab only and the answer won’t be emailed to you. Staff can see it in the
              portal under HR OPS, Verification Requests.
            </p>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose} autoFocus>
            <BtnText>Done</BtnText>
          </button>
        </div>
      ) : (
        <form className="vr-form" onSubmit={submit}>
          <div className="vr-body">
            <fieldset className="vr-group">
              <legend>About you</legend>
              <div className="fields">
                <label>
                  <span>Your company</span>
                  <input name="company" required autoComplete="organization" placeholder="Company name" autoFocus />
                </label>
                <label>
                  <span>Your name</span>
                  <input name="name" required autoComplete="name" placeholder="Full name" />
                </label>
                <label className="span-2">
                  <span>Work email</span>
                  <input name="email" type="email" required autoComplete="email" placeholder="you@company.com" aria-describedby={`${ids}-email`} />
                  <small className="vr-hint" id={`${ids}-email`}>
                    We reply to this address, so use your company email.
                  </small>
                </label>
              </div>
            </fieldset>
            <fieldset className="vr-group">
              <legend>The person you’re checking</legend>
              <div className="fields">
                <label>
                  <span>Full name</span>
                  <input name="candidate" required placeholder="As on their documents" />
                </label>
                <label>
                  <span>Designation they gave you</span>
                  <input name="designation" required placeholder="e.g. Software Engineer" />
                </label>
                <MonthField name="from" label="Joined" required />
                <MonthField name="to" label="Left" hint="Leave empty if they still work here." />
                <label className="span-2">
                  <span>Employee ID</span>
                  <input name="employeeId" placeholder="Optional" aria-describedby={`${ids}-id`} />
                  <small className="vr-hint" id={`${ids}-id`}>
                    Only if they shared it with you.
                  </small>
                </label>
              </div>
            </fieldset>
            <label className="vr-consent">
              <input name="consent" type="checkbox" required />
              <span>The candidate has given written consent for this check.</span>
            </label>
            {/* a trap for bots: off-screen, out of the tab order and hidden from screen readers, so only something
                automatic fills it in, and the backend then quietly saves nothing. Not named like an address field
                ("website"), which browsers autofill for real people */}
            <div className="vr-trap" aria-hidden="true">
              <label>
                Leave this empty
                <input name="leave_empty" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            {error && (
              <p className="vr-error" role="alert">
                {error}
              </p>
            )}
          </div>
          {/* the send button stays in reach however far the fields are scrolled */}
          <div className="vr-foot form-foot">
            <button className="btn btn-primary" type="submit" disabled={sending}>
              <BtnText>{sending ? 'Sending…' : 'Send request'}</BtnText> <Arrow />
            </button>
            <p className="form-note">
              {sendsToBackend ? 'We email you a receipt now, and the answer once HR has checked.' : 'Demo: requests aren’t sent to a server yet, and nothing is emailed.'}
            </p>
          </div>
        </form>
      )}
    </dialog>
  );
}
