import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { COMPANY_CHECKS, EMPLOYEE_CHECKS, type PersonRole, type Verification, type VerificationKind, type VerificationStatus } from '../data';
import { useSession } from '../session';
import { formatDate, usePeopleById, usePortal } from '../store';
import { Badge, btnClass, BtnLabel, ConfirmDelete, Empty, initials, Modal, PageHead, PIcon, SearchField, useNotice } from '../ui';
import { PortalNotFound } from './Resources';

const STATUS_LABEL: Record<VerificationStatus, string> = { pending: 'Pending', verified: 'Verified', rejected: 'Rejected' };
// status badges reuse the portal's existing colours: amber waiting, green done, red stopped
const STATUS_BADGE: Record<VerificationStatus, string> = { pending: 'todo', verified: 'done', rejected: 'rejected' };
const CHECKS: Record<VerificationKind, readonly { id: string; label: string }[]> = { company: COMPANY_CHECKS, employee: EMPLOYEE_CHECKS };
const ROLE_LABEL: Record<PersonRole, string> = { admin: 'Admin', subadmin: 'Sub Admin', employee: 'Employee', intern: 'Intern' };
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// a pending check older than this is flagged, so stale requests don't sit unnoticed
const STALE_DAYS = 7;
const FILTERS: (VerificationStatus | '')[] = ['', 'pending', 'verified', 'rejected'];

const COPY = {
  company: {
    title: 'Company Verification',
    sub: 'Check the documents of companies we work with before onboarding them.',
    search: 'Search company, number or email',
  },
  employee: {
    title: 'Employee Verification',
    sub: 'Background and document checks for employees and interns.',
    search: 'Search name or email',
  },
} as const;

const DAY = 864e5;
const daysBetween = (from: string, to: string) => Math.max(0, Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / DAY));
const todayIso = () => new Date().toISOString().slice(0, 10);
const formatStamp = (at: string) =>
  new Date(at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const CompanyVerification = () => <VerificationPage kind="company" />;
export const EmployeeVerification = () => <VerificationPage kind="employee" />;

/**
 * A case-file desk: the requests on the left, the open file on the right. The open file lives in the address
 * (?file=), so a link or the back button lands on the same request.
 */
function VerificationPage({ kind }: { kind: VerificationKind }) {
  const role = useSession()!.role;
  const { verifications } = usePortal();
  const byId = usePeopleById();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<VerificationStatus | ''>('');
  const [creating, setCreating] = useState(false);
  // the request decided in this visit, so only that decision plays the stamp
  const [stamped, setStamped] = useState<string | null>(null);
  const [notice, notify] = useNotice();
  // HR OPS is admin-only in the sidebar; a typed address shouldn't get around that
  if (role !== 'admin') return <PortalNotFound />;

  const copy = COPY[kind];
  const mine = verifications.filter((v) => v.kind === kind);
  const subjectOf = (v: Verification) => (v.kind === 'company' ? v.company : (byId.get(v.personId)?.name ?? 'Removed user'));
  const sublineOf = (v: Verification) => (v.kind === 'company' ? v.contactEmail : (byId.get(v.personId)?.email ?? ''));
  const query = q.trim().toLowerCase();
  const matches = (v: Verification) => !query || [subjectOf(v), sublineOf(v), v.kind === 'company' ? v.registration : ''].some((t) => t.toLowerCase().includes(query));
  const rows = mine.filter((v) => (!status || v.status === status) && matches(v));
  // the file that's open: the one in the address, else the oldest waiting request, else the first on the list
  const fileId = params.get('file');
  const oldestPending = mine.filter((v) => v.status === 'pending').sort((a, b) => a.requested.localeCompare(b.requested))[0];
  const open = mine.find((v) => v.id === fileId) ?? oldestPending ?? mine[0];
  const select = (id: string) => {
    setStamped(null);
    setParams({ file: id }, { replace: true });
  };

  return (
    <>
      <PageHead title={copy.title} sub={copy.sub}>
        <button type="button" className={btnClass('light')} onClick={() => setCreating(true)}>
          <BtnLabel icon="plus">New request</BtnLabel>
        </button>
      </PageHead>
      {notice}
      {mine.length ? (
        <div className="p-desk">
          <section className="p-desk-list" aria-label="Requests">
            <div className="p-desk-filters" role="group" aria-label="Show requests">
              {FILTERS.map((f) => (
                <button key={f || 'all'} type="button" aria-pressed={status === f} onClick={() => setStatus(f)}>
                  {f ? STATUS_LABEL[f] : 'All'}
                  <span className="p-desk-count">{f ? mine.filter((v) => v.status === f).length : mine.length}</span>
                </button>
              ))}
            </div>
            <SearchField value={q} onChange={setQ} label={`Search ${copy.title.toLowerCase()} requests`} placeholder={copy.search} />
            {rows.length ? (
              <ul className="p-desk-items" data-lenis-prevent>
                {rows.map((v) => {
                  const total = CHECKS[kind].length;
                  const age = daysBetween(v.requested, v.decided ?? todayIso());
                  const stale = v.status === 'pending' && age > STALE_DAYS;
                  return (
                    <li key={v.id}>
                      <button type="button" className="p-desk-item" aria-current={v.id === open?.id ? 'true' : undefined} onClick={() => select(v.id)}>
                        <span className="p-avatar is-soft is-small" aria-hidden="true">
                          {initials(subjectOf(v))}
                        </span>
                        <span className="p-desk-item-main">
                          <strong>{subjectOf(v)}</strong>
                          <small>{sublineOf(v)}</small>
                          <span className="p-desk-item-meta">
                            <span className="p-meter" aria-hidden="true">
                              {CHECKS[kind].map((c) => (
                                <i key={c.id} data-on={v.done.includes(c.id) || undefined} />
                              ))}
                            </span>
                            <span>
                              {v.done.length}/{total} documents
                            </span>
                            <span data-stale={stale || undefined}>{v.status === 'pending' ? (age === 0 ? 'Opened today' : `Open ${age} ${age === 1 ? 'day' : 'days'}`) : formatDate(v.decided ?? v.requested)}</span>
                          </span>
                        </span>
                        <Badge kind={STATUS_BADGE[v.status]}>{STATUS_LABEL[v.status]}</Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty icon="search" title="Nothing matches">
                Try clearing the search or picking All.
              </Empty>
            )}
          </section>
          {open && (
            <CaseFile
              key={open.id}
              request={open}
              subject={subjectOf(open)}
              stamp={stamped === open.id}
              onDecided={() => setStamped(open.id)}
              onDeleted={() => setParams({}, { replace: true })}
              notify={notify}
            />
          )}
        </div>
      ) : (
        <section className="p-card">
          <Empty icon="shield" title="No requests yet">
            Click "New request" to start a verification.
          </Empty>
        </section>
      )}
      {creating && <NewRequest kind={kind} existing={mine} onClose={() => setCreating(false)} onCreated={select} notify={notify} />}
    </>
  );
}

function CaseFile({
  request,
  subject,
  stamp,
  onDecided,
  onDeleted,
  notify,
}: {
  request: Verification;
  subject: string;
  stamp: boolean;
  onDecided: () => void;
  onDeleted: () => void;
  notify: (t: string) => void;
}) {
  const { setVerificationCheck, decideVerification, removeVerification } = usePortal();
  const byId = usePeopleById();
  const [note, setNote] = useState(request.note);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const checks = CHECKS[request.kind];
  const allDone = checks.every((c) => request.done.includes(c.id));
  const pending = request.status === 'pending';
  const person = request.kind === 'employee' ? byId.get(request.personId) : undefined;
  const age = daysBetween(request.requested, request.decided ?? todayIso());

  const decide = (status: VerificationStatus) => {
    // a rejection without a reason leaves nobody able to fix it
    if (status === 'rejected' && !note.trim()) return setError('Add a note saying why it was rejected.');
    decideVerification(request.id, status, note.trim());
    setError('');
    if (status !== 'pending') onDecided();
    notify(status === 'pending' ? `${subject} was reopened.` : `${subject} was marked ${STATUS_LABEL[status].toLowerCase()}.`);
  };

  const facts: [string, ReactNode][] =
    request.kind === 'company'
      ? [
          ['Registration no.', <span className="p-mono">{request.registration}</span>],
          ['Contact', request.contactEmail],
          [
            'Website',
            request.website ? (
              <a href={request.website} target="_blank" rel="noreferrer">
                {request.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              'Not given'
            ),
          ],
        ]
      : [
          ['Email', person?.email ?? 'Removed user'],
          ['Role', person ? ROLE_LABEL[person.role] : 'Not found'],
          ['Team', person?.team ?? 'Not found'],
        ];

  return (
    <article className="p-card p-file" aria-labelledby="file-title" data-status={request.status}>
      <header className="p-file-head">
        <span className="p-avatar is-large" aria-hidden="true">
          {initials(subject)}
        </span>
        <div>
          <p className="p-file-kicker">{request.kind === 'company' ? 'Company file' : 'Employee file'}</p>
          <h2 id="file-title" className="p-file-title">
            {subject}
          </h2>
          <p className="p-dim">
            Opened by {request.requestedBy} on {formatDate(request.requested)} · {pending ? `open ${age} ${age === 1 ? 'day' : 'days'}` : `decided in ${age} ${age === 1 ? 'day' : 'days'}`}
          </p>
        </div>
        {/* the decision lands like a rubber stamp; only the one made just now animates */}
        {!pending && (
          <span className="p-stamp" data-fresh={stamp || undefined} role="img" aria-label={`${STATUS_LABEL[request.status]} by ${request.decidedBy} on ${formatDate(request.decided!)}`}>
            {STATUS_LABEL[request.status]}
            <small>{request.decided && formatDate(request.decided)}</small>
          </span>
        )}
      </header>

      <dl className="p-file-facts">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd title={typeof v === 'string' ? v : undefined}>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="p-file-body">
        <fieldset className="p-file-docs" disabled={!pending}>
          <legend>
            <span>Documents</span>
            <span className="p-dim">
              {request.done.length} of {checks.length} checked
            </span>
          </legend>
          <span className="p-meter is-wide" aria-hidden="true">
            {checks.map((c) => (
              <i key={c.id} data-on={request.done.includes(c.id) || undefined} />
            ))}
          </span>
          {checks.map((c) => (
            <label key={c.id} className="p-doc">
              <input type="checkbox" checked={request.done.includes(c.id)} onChange={(e) => setVerificationCheck(request.id, c.id, e.target.checked)} />
              <span className="p-doc-box" aria-hidden="true">
                <PIcon name="check" size={12} />
              </span>
              <span>{c.label}</span>
            </label>
          ))}
        </fieldset>

        <section className="p-file-log" aria-labelledby="file-log">
          <h3 id="file-log">Activity</h3>
          <ol>
            {[...request.log].reverse().map((e, i) => (
              <li key={`${e.at}-${i}`}>
                <p>{e.text}</p>
                <span className="p-dim">
                  {e.by} · <time dateTime={e.at}>{formatStamp(e.at)}</time>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <label className="p-field p-file-note">
        <span>
          Decision note {pending && <span className="p-dim">(needed to reject)</span>}
        </span>
        <textarea value={note} onChange={(e) => (setNote(e.target.value), setError(''))} readOnly={!pending} rows={2} placeholder="What was checked, or what is missing" />
      </label>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}

      <footer className="p-file-foot">
        <button type="button" className="p-text-btn is-danger" onClick={() => setDeleting(true)}>
          Delete request
        </button>
        <span className="p-file-actions">
          {pending ? (
            <>
              {!allDone && <span className="p-dim">Check every document to verify</span>}
              <button type="button" className={btnClass('ghost')} onClick={() => decide('rejected')}>
                <BtnLabel icon="close">Reject</BtnLabel>
              </button>
              <button type="button" className={btnClass('primary')} onClick={() => decide('verified')} disabled={!allDone}>
                <BtnLabel icon="check">Mark verified</BtnLabel>
              </button>
            </>
          ) : (
            <button type="button" className={btnClass('ghost')} onClick={() => decide('pending')}>
              <BtnLabel icon="refresh">Reopen</BtnLabel>
            </button>
          )}
        </span>
      </footer>
      {deleting && (
        <ConfirmDelete
          what={`the request for ${subject}`}
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            removeVerification(request.id);
            onDeleted();
            notify('The request was deleted.');
          }}
        />
      )}
    </article>
  );
}

function NewRequest({
  kind,
  existing,
  onClose,
  onCreated,
  notify,
}: {
  kind: VerificationKind;
  existing: Verification[];
  onClose: () => void;
  onCreated: (id: string) => void;
  notify: (t: string) => void;
}) {
  const { people, requestVerification } = usePortal();
  // one open request per person: a second pending check would split the evidence across two records
  const busy = new Set(existing.flatMap((v) => (v.kind === 'employee' && v.status === 'pending' ? [v.personId] : [])));
  const candidates = people.filter((p) => p.role !== 'admin' && !busy.has(p.id));
  const [personId, setPersonId] = useState(candidates[0]?.id ?? '');
  const [company, setCompany] = useState('');
  const [registration, setRegistration] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [error, setError] = useState('');
  const change = (set: (v: string) => void) => (e: { target: { value: string } }) => (set(e.target.value), setError(''));

  const submit = () => {
    if (kind === 'employee') {
      if (!personId) return setError('Pick who to verify.');
      onCreated(requestVerification({ kind, personId }));
      notify(`Verification started for ${people.find((p) => p.id === personId)?.name}.`);
      return onClose();
    }
    const name = company.trim();
    if (!name) return setError('Enter the company name.');
    if (existing.some((v) => v.kind === 'company' && v.status === 'pending' && v.company.toLowerCase() === name.toLowerCase())) return setError('This company already has a pending request.');
    if (!registration.trim()) return setError('Enter the registration number (CIN or LLPIN).');
    if (!EMAIL_SHAPE.test(contactEmail.trim())) return setError('Enter a contact email, like name@company.com.');
    let site = '';
    if (website.trim()) {
      try {
        const url = new URL(website.trim());
        // only web links: the address is shown as a link people can click
        if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('not a web link');
        site = url.href;
      } catch {
        return setError('Enter the website as a full address, starting with https://');
      }
    }
    onCreated(requestVerification({ kind, company: name, registration: registration.trim().toUpperCase(), website: site, contactEmail: contactEmail.trim().toLowerCase() }));
    notify(`Verification started for ${name}.`);
    onClose();
  };

  return (
    <Modal
      eyebrow={COPY[kind].title}
      title="New verification request"
      icon="shield"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')} disabled={kind === 'employee' && !candidates.length}>
            <BtnLabel>Start verification</BtnLabel>
          </button>
        </>
      }
    >
      {kind === 'employee' ? (
        candidates.length ? (
          <label className="p-field">
            <span>Employee</span>
            <select className="p-select" value={personId} onChange={change(setPersonId)} autoFocus>
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.email})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="p-modal-text">Everyone already has a pending verification.</p>
        )
      ) : (
        <>
          <label className="p-field">
            <span>Company name</span>
            <input value={company} onChange={change(setCompany)} placeholder="Registered company name" autoFocus />
          </label>
          <div className="p-form-row">
            <label className="p-field">
              <span>Registration no.</span>
              <input value={registration} onChange={change(setRegistration)} placeholder="CIN or LLPIN" />
            </label>
            <label className="p-field">
              <span>Contact email</span>
              <input type="email" value={contactEmail} onChange={change(setContactEmail)} placeholder="name@company.com" />
            </label>
          </div>
          <label className="p-field">
            <span>Website (optional)</span>
            <input type="url" value={website} onChange={change(setWebsite)} placeholder="https://" />
          </label>
        </>
      )}
      <p className="p-field-hint">The request opens as Pending, with every document still to check.</p>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
