import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useScene } from '../gl/Scene';
import { submitEmploymentRequest } from '../portal/inbox';
import { Arrow, BtnText } from './ui';
import '../styles/verify-request.css';

/**
 * Employment verification for outside companies, in the site footer. Other companies (a new employer, a
 * background-check agency) send their request here instead of emailing someone at Bharattech, so every request
 * reaches HR OPS → Verification Requests in one place. There is no backend yet: the request is kept in this tab
 * only, and the answer is not emailed back. The form says so.
 */
export function VerifyRequestBand() {
  const [open, setOpen] = useState(false);
  const ids = useId();
  return (
    <>
      <section className="footer-verify" aria-labelledby={`${ids}-title`}>
        <div>
          <h3 id={`${ids}-title`}>Verifying someone who worked here?</h3>
          <p>Companies and background-check agencies can send an employment verification request here instead of emailing us.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)} aria-haspopup="dialog">
          <BtnText>Request a verification</BtnText> <Arrow />
        </button>
      </section>
      {/* beside the strip, not inside it, so the strip's text styles don't reach the form */}
      {open && <VerifyDialog onClose={() => setOpen(false)} />}
    </>
  );
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const thisMonth = () => new Date().toISOString().slice(0, 7);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = Array.from({ length: 31 }, (_, i) => new Date().getFullYear() - i);

/**
 * A month as two dropdowns (month, year), sent as one `YYYY-MM` value under `name`. Used instead of
 * <input type="month">, which Safari and Firefox show as a plain text box with no picker.
 */
function MonthField({ name, label, required }: { name: string; label: string; required?: boolean }) {
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const id = useId();
  return (
    <div className="vr-month" role="group" aria-labelledby={`${id}-label`}>
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

  // a modal <dialog> brings Esc, a focus trap and an inert page; the page behind stops scrolling
  useEffect(() => {
    const d = dialog.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    d.showModal();
    lenis?.stop();
    return () => {
      lenis?.start();
      if (d.open) d.close();
      opener?.focus({ preventScroll: true });
    };
  }, [lenis]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    setReference(submitEmploymentRequest(draft));
  };

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
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button type="button" className="vr-close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
        </svg>
      </button>
      {reference ? (
        <div className="vr-done" role="status">
          <h2 id={`${ids}-title`}>Request received</h2>
          <p>
            Your reference is <strong className="vr-ref">{reference}</strong>. Our HR team checks it against our records.
          </p>
          <p className="form-note">
            Demo: there is no server yet, so this request is kept in this browser tab only and the answer won’t be emailed to you. Staff can see it in the
            portal under HR OPS, Verification Requests.
          </p>
          <button type="button" className="btn btn-primary" onClick={onClose} autoFocus>
            <BtnText>Done</BtnText>
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <h2 id={`${ids}-title`}>Request an employment verification</h2>
          <p className="vr-sub">Tell us who you’re checking. We confirm whether they worked here, for how long, and in which role.</p>
          <div className="fields">
            <label>
              <span>Your company</span>
              <input name="company" required autoComplete="organization" autoFocus />
            </label>
            <label>
              <span>Your name</span>
              <input name="name" required autoComplete="name" />
            </label>
            <label className="span-2">
              <span>Work email (we reply here)</span>
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              <span>Candidate’s full name</span>
              <input name="candidate" required />
            </label>
            <label>
              <span>Designation they gave you</span>
              <input name="designation" required />
            </label>
            <MonthField name="from" label="Joined" required />
            <MonthField name="to" label="Left (empty if still here)" />
            <label className="span-2">
              <span>Employee ID (optional)</span>
              <input name="employeeId" />
            </label>
            <label className="span-2 vr-consent">
              <input name="consent" type="checkbox" required />
              <span>The candidate has given written consent for this check.</span>
            </label>
          </div>
          {error && (
            <p className="vr-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-foot">
            <button className="btn btn-primary" type="submit">
              <BtnText>Send request</BtnText> <Arrow />
            </button>
            <p className="form-note">Demo: requests aren’t sent to a server yet, and nothing is emailed.</p>
          </div>
        </form>
      )}
    </dialog>
  );
}
