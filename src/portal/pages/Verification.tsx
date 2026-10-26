import { Fragment, useState, type CSSProperties, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { ApiError } from '../api';
import {
  COMPANY_CHECKS,
  EMAIL_SHAPE,
  EMPLOYEE_CHECKS,
  EMPLOYMENT_CHECKS,
  ID_DOCS,
  ID_RETENTION_DAYS,
  SKIPPABLE_CHECKS,
  VERIFICATION_FILES,
  VERIFICATION_STALE_DAYS,
  type FileKind,
  type SkippableCheck,
  type Verification,
  type VerificationKind,
  type VerificationStatus,
} from '../data';
import { PdfModal } from '../PdfModal';
import { useDirectory } from '../people';
import { useSession } from '../session';
import { documentsDeleteOn, formatDate, usePortal } from '../store';
import { Badge, btnClass, BtnLabel, DeleteButton, Empty, initials, Modal, PageHead, PIcon, PortalNotFound, SampleDataBar, SearchField, useNotice } from '../ui';
import { verificationFailedMessage } from '../verifications';
import { EvidenceDetail, EvidenceSummary, NotApplicableWindow } from './CheckEvidence';
import { useVerificationSource, type VerificationSource } from './verificationSource';

const STATUS_LABEL: Record<VerificationStatus, string> = { pending: 'Pending', verified: 'Verified', rejected: 'Rejected' };
// status badges reuse the portal's existing colours: amber waiting, green done, red stopped
const STATUS_BADGE: Record<VerificationStatus, string> = { pending: 'todo', verified: 'done', rejected: 'rejected' };
const CHECKS: Record<VerificationKind, readonly { id: string; label: string }[]> = { company: COMPANY_CHECKS, employee: EMPLOYEE_CHECKS, employment: EMPLOYMENT_CHECKS };
const FILTERS: (VerificationStatus | '')[] = ['', 'pending', 'verified', 'rejected'];
const CHECK_OF_FILE = new Map<string, string>(VERIFICATION_FILES.map((f) => [f.id, f.check]));
const FILE_CHECKS = new Set(CHECK_OF_FILE.values());
const isSkippable = (check: string): check is SkippableCheck => (SKIPPABLE_CHECKS as readonly string[]).includes(check);

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
  employment: {
    title: 'Verification Requests',
    sub: 'Other companies asking us to confirm that someone worked here, sent from the website’s form.',
    search: 'Search candidate, company or email',
  },
} as const;

const DAY = 864e5;
const daysBetween = (from: string, to: string) => Math.max(0, Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / DAY));
const todayIso = () => new Date().toISOString().slice(0, 10);
// "2024-02" → "Feb 2024"
const formatMonth = (month: string) => new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
const formatStamp = (at: string) =>
  new Date(at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const failure = (error: unknown) => verificationFailedMessage(error instanceof ApiError ? error : new ApiError('unavailable'));

export const CompanyVerification = () => <VerificationPage kind="company" />;
export const EmployeeVerification = () => <VerificationPage kind="employee" />;
export const EmploymentVerification = () => <VerificationPage kind="employment" />;

/**
 * A case-file desk: the requests on the left, the open file on the right. The open file lives in the address
 * (?file=), so a link or the back button lands on the same request.
 */
function VerificationPage({ kind }: { kind: VerificationKind }) {
  const role = useSession()!.role;
  const source = useVerificationSource(kind, role === 'admin');
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
  const mine = source.requests;
  const { subjectOf, sublineOf } = source;
  const query = q.trim().toLowerCase();
  const extraOf = (v: Verification) => (v.kind === 'company' ? [v.registration] : v.kind === 'employment' ? [v.requesterEmail, v.designation] : []);
  const matches = (v: Verification) => !query || [subjectOf(v), sublineOf(v), ...extraOf(v)].some((t) => t.toLowerCase().includes(query));
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
        {/* requests from other companies come in through the website's form, not from here */}
        {kind !== 'employment' && (
          <button type="button" className={btnClass('light')} onClick={() => setCreating(true)}>
            <BtnLabel icon="plus">New request</BtnLabel>
          </button>
        )}
      </PageHead>
      {!source.connected && <SampleDataBar />}
      {notice}
      {source.status.kind === 'loading' ? (
        <section className="p-card">
          <Empty icon="shield" title="Loading requests">
            Getting them from the company system.
          </Empty>
        </section>
      ) : source.status.kind === 'error' ? (
        <section className="p-card">
          <Empty icon="alert" title="Couldn’t load the requests">
            {verificationFailedMessage(source.status.error)}{' '}
            <button type="button" className={btnClass('ghost', { small: true })} onClick={source.retry}>
              <BtnLabel icon="refresh">Try again</BtnLabel>
            </button>
          </Empty>
        </section>
      ) : mine.length ? (
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
                  const stale = v.status === 'pending' && age > VERIFICATION_STALE_DAYS;
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
                              {v.done.length}/{total} {kind === 'employment' ? 'checked' : 'documents'}
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
              source={source}
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
            {kind === 'employment' ? 'Requests that companies send from the website’s footer form show up here.' : 'Click "New request" to start a verification.'}
          </Empty>
        </section>
      )}
      {creating && kind !== 'employment' && <NewRequest kind={kind} source={source} existing={mine} onClose={() => setCreating(false)} onCreated={select} notify={notify} />}
    </>
  );
}

function CaseFile({
  source,
  request,
  subject,
  stamp,
  onDecided,
  onDeleted,
  notify,
}: {
  source: VerificationSource;
  request: Verification;
  subject: string;
  stamp: boolean;
  onDecided: () => void;
  onDeleted: () => void;
  notify: (t: string) => void;
}) {
  const [note, setNote] = useState(request.note);
  const [error, setError] = useState('');
  // one change at a time: the buttons wait while the backend saves
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // the upload open in the PDF window (connected)
  const [viewing, setViewing] = useState<FileKind | null>(null);
  // the check being marked not applicable (connected)
  const [skipping, setSkipping] = useState<SkippableCheck | null>(null);
  const checks = CHECKS[request.kind];
  const allDone = checks.every((c) => request.done.includes(c.id));
  const pending = request.status === 'pending';
  const person = source.personOf(request);
  const age = daysBetween(request.requested, request.decided ?? todayIso());
  // the employee's own uploads (employee files only), and when the 60-day rule removes them
  const ids = source.uploadsOf(request);
  const idsComplete = ID_DOCS.every((d) => ids.some((u) => u.kind === d.id));
  // a check can't be ticked off before the employee has provided what it needs (or it's marked not applicable)
  const waitingFor = (check: string) => request.kind === 'employee' && !request.done.includes(check) && !source.checkReady(request, check);
  const marks = source.notApplicableOf(request);
  const leftOn = source.leftOn(request);
  const deletedOn = source.deletedOn(request);
  /** Runs one change; a refusal shows in the file instead of a notice that says it worked. */
  const save = async (change: () => Promise<void>) => {
    setSaving(true);
    setError('');
    try {
      await change();
      return true;
    } catch (e) {
      setError(failure(e));
      return false;
    } finally {
      setSaving(false);
    }
  };
  // One link for every employee's upload: it opens their own profile once they sign in. A real one carries a
  // single-use token for this request.
  const uploadLink = `${window.location.origin}${window.location.pathname}#/portal/profile?docs=1`;
  const copyLink = () =>
    navigator.clipboard
      .writeText(uploadLink)
      .then(() => notify('Upload link copied.'))
      .catch(() => notify(`Couldn't copy it. The link is ${uploadLink}`));

  const decide = async (status: VerificationStatus) => {
    // a rejection without a reason leaves nobody able to fix it
    if (status === 'rejected' && !note.trim()) return setError('Add a note saying why it was rejected.');
    const result: { decided?: Verification } = {};
    if (!(await save(async () => void (result.decided = (await source.decide(request.id, status, note.trim())) || undefined)))) return;
    if (status !== 'pending') onDecided();
    // an outside request's answer goes back by email: say whether it went, never imply it did
    const emailed = result.decided ? source.answerEmailed(result.decided) : undefined;
    const answer =
      request.kind !== 'employment' || status === 'pending'
        ? ''
        : emailed === true
          ? ` The answer was emailed to ${request.requesterEmail}.`
          : emailed === false
            ? ` The answer email didn’t go out, so reply to ${request.requesterEmail} by hand.`
            : ` Email isn’t connected yet, so ${request.requesterCompany} hasn’t been sent the answer.`;
    notify(status === 'pending' ? `${subject} was reopened.` : `${subject} was marked ${STATUS_LABEL[status].toLowerCase()}.${answer}`);
  };
  const lead = source.leadOf(request);
  const emailedNow = source.answerEmailed(request);

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
      : request.kind === 'employment'
      ? [
          ...((request as { reference?: string }).reference ? [['Reference', <span className="p-mono">{(request as { reference?: string }).reference}</span>] as [string, ReactNode]] : []),
          ['Asked by', `${request.requesterName}, ${request.requesterCompany}`],
          ['Reply to', request.requesterEmail],
          ['Designation', request.designation],
          ['Worked here', `${formatMonth(request.from)} to ${request.to ? formatMonth(request.to) : 'now'}`],
          ['Employee ID', request.employeeId ? <span className="p-mono">{request.employeeId}</span> : 'Not given'],
          // a lead for the "Found in our records" check, not a decision: names can repeat
          [
            'In our directory',
            lead
              ? [`${lead.name} (${lead.employeeId || 'no ID'})`, lead.roleLabel, lead.joinedOn && `joined ${formatDate(lead.joinedOn)}`, !lead.current && 'no longer here'].filter(Boolean).join(', ')
              : 'No match found',
          ],
        ]
      : [
          ['Email', person?.email ?? 'Removed user'],
          ['Role', person ? person.roleLabel : 'Not found'],
          ['Team', person ? person.team || 'Not set' : 'Not found'],
        ];

  return (
    <article className="p-card p-file" aria-labelledby="file-title" data-status={request.status}>
      <header className="p-file-head">
        <span className="p-avatar is-large" aria-hidden="true">
          {initials(subject)}
        </span>
        <div>
          <h2 id="file-title" className="p-file-title">
            {subject}
          </h2>
          <p className="p-dim">
            {request.kind === 'company' ? 'Company file' : request.kind === 'employee' ? 'Employee file' : 'Verification request'} · {request.kind === 'employment' ? 'sent' : 'opened'} by {request.requestedBy} on {formatDate(request.requested)} · {pending ? `open ${age} ${age === 1 ? 'day' : 'days'}` : `decided in ${age} ${age === 1 ? 'day' : 'days'}`}
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
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="p-file-body">
        <fieldset className="p-file-docs" disabled={!pending || saving}>
          <legend>
            <span>{request.kind === 'employment' ? 'Checks' : 'Documents'}</span>
            <span className="p-dim">
              {request.done.length} of {checks.length} checked
            </span>
          </legend>
          <span className="p-meter is-wide" aria-hidden="true" style={{ '--n': checks.length } as CSSProperties}>
            {checks.map((c) => (
              <i key={c.id} data-on={request.done.includes(c.id) || undefined} />
            ))}
          </span>
          {checks.map((c) => {
            // connected, every check proved by an upload shows its files or what it's waiting for; the demo only its two
            // IDs; References is a plain tick either way
            const shown = request.kind === 'employee' && (source.connected ? FILE_CHECKS.has(c.id) : ID_DOCS.some((d) => d.id === c.id));
            const fileId = `${request.id}-${c.id}-file`;
            const mark = marks.find((n) => n.check === c.id);
            const evidence = {
              check: c.id,
              files: ids.filter((u) => CHECK_OF_FILE.get(u.kind) === c.id),
              mark,
              // the file needs the sign-in, so it opens in the portal's PDF window (and the opening is logged)
              onOpen: source.openUpload ? setViewing : null,
            };
            const missing = deletedOn ? 'Deleted' : !source.uploadsConnected ? 'Uploads aren’t connected yet' : pending ? 'Not uploaded yet' : 'No file on record';
            const canSkip = !!source.markNotApplicable && pending && isSkippable(c.id) && !mark && !request.done.includes(c.id);
            return (
              <Fragment key={c.id}>
                <div className="p-doc-line">
                  <label className="p-doc">
                    <input
                      type="checkbox"
                      checked={request.done.includes(c.id)}
                      disabled={waitingFor(c.id)}
                      aria-describedby={shown ? fileId : undefined}
                      onChange={(e) => {
                        const done = e.target.checked;
                        void save(() => source.setCheck(request.id, c.id, done));
                      }}
                    />
                    <span className="p-doc-box" aria-hidden="true">
                      <PIcon name="check" size={12} />
                    </span>
                    <span>{c.label}</span>
                  </label>
                  {shown && <EvidenceSummary id={fileId} missing={missing} {...evidence} />}
                  {canSkip && (
                    <button type="button" className={`${btnClass('ghost', { small: true })} p-skip`} onClick={() => setSkipping(c.id as SkippableCheck)}>
                      <BtnLabel>
                        Not applicable<span className="sr-only">: {c.label}</span>
                      </BtnLabel>
                    </button>
                  )}
                </div>
                {shown && <EvidenceDetail {...evidence} />}
              </Fragment>
            );
          })}
          {request.kind === 'employee' && (deletedOn || (leftOn && ids.length > 0) || (pending && (source.connected ? checks.some((c) => waitingFor(c.id)) : !idsComplete))) && (
            <p className="p-file-docs-note">
              {deletedOn ? (
                <span>
                  The Aadhaar and PAN were deleted automatically on {formatDate(deletedOn)}, {ID_RETENTION_DAYS} days after they left. Their name, dates and this result are kept.
                </span>
              ) : leftOn && ids.length > 0 ? (
                <span>
                  They left on {formatDate(leftOn)}, so their files are deleted automatically on {formatDate(documentsDeleteOn(leftOn))}.
                </span>
              ) : source.openUpload ? (
                <span>
                  {subject} was asked in their bell and by email to upload their documents in their Profile. Each check can be ticked once its file is here;
                  Previous employment can also be marked not applicable.
                </span>
              ) : (
                <>
                  <span>{subject} uploads the Aadhaar and PAN. Email isn’t connected yet, so send them the link yourself.</span>
                  <button type="button" className={btnClass('ghost', { small: true })} onClick={copyLink}>
                    <BtnLabel icon="link">Copy upload link</BtnLabel>
                  </button>
                </>
              )}
            </p>
          )}
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
      {request.kind === 'employment' && !pending && (
        <p className="p-field-hint">
          {emailedNow === true
            ? `The answer was emailed to ${request.requesterEmail}: only whether the details they sent are confirmed, never this note.`
            : emailedNow === false
              ? `The answer email didn’t go out, so reply to ${request.requesterEmail} by hand.`
              : `Email isn’t connected yet, so ${request.requesterEmail} hasn’t been sent this answer.`}
        </p>
      )}

      <footer className="p-file-foot">
        {/* connected, a decided request is the record and stays; the demo's bin button deletes any */}
        {source.canDelete(request) &&
          (source.connected ? (
            <button type="button" className={btnClass('ghost', { small: true })} onClick={() => setDeleting(true)} disabled={saving}>
              <BtnLabel>Delete request</BtnLabel>
            </button>
          ) : (
            <DeleteButton
              small
              label="Delete request"
              onDone={() => {
                void source.remove(request.id);
                onDeleted();
                notify('The request was deleted.');
              }}
            />
          ))}
        <span className="p-file-actions">
          {pending ? (
            <>
              {!allDone && <span className="p-dim">{request.kind === 'employment' ? 'Tick every check to verify' : 'Check every document to verify'}</span>}
              <button type="button" className={btnClass('ghost')} onClick={() => void decide('rejected')} disabled={saving}>
                <BtnLabel icon="close">Reject</BtnLabel>
              </button>
              <button type="button" className={btnClass('primary')} onClick={() => void decide('verified')} disabled={!allDone || saving}>
                <BtnLabel icon="check">Mark verified</BtnLabel>
              </button>
            </>
          ) : (
            <button type="button" className={btnClass('ghost')} onClick={() => void decide('pending')} disabled={saving}>
              <BtnLabel icon="refresh">Reopen</BtnLabel>
            </button>
          )}
        </span>
      </footer>
      {viewing && source.openUpload && (
        <PdfModal
          title={`${subject}: ${VERIFICATION_FILES.find((d) => d.id === viewing)?.label}`}
          fileName={ids.find((u) => u.kind === viewing)?.fileName ?? `${viewing}.pdf`}
          load={() => source.openUpload!(request, viewing)}
          failure={(kind) => (kind === 'not-found' ? 'That file isn’t there any more.' : verificationFailedMessage(new ApiError(kind)))}
          details="Opening it is recorded in this request’s activity."
          // the backend logged the opening: load the request again so the activity shows it
          onOpened={source.retry}
          onClose={() => setViewing(null)}
        />
      )}
      {skipping && source.markNotApplicable && (
        <NotApplicableWindow
          check={EMPLOYEE_CHECKS.find((c) => c.id === skipping)?.label ?? skipping}
          subject={subject}
          onClose={() => setSkipping(null)}
          onSave={async (reason) => {
            await source.markNotApplicable!(request.id, skipping, reason);
            setSkipping(null);
            notify(`${EMPLOYEE_CHECKS.find((c) => c.id === skipping)?.label} was marked not applicable.`);
          }}
        />
      )}
      {deleting && (
        <Modal
          title={`Delete the request for ${subject}?`}
          icon="shield"
          onClose={() => setDeleting(false)}
          onSubmit={async () => {
            setDeleting(false);
            if (await save(() => source.remove(request.id))) {
              onDeleted();
              notify('The request was deleted.');
            }
          }}
          footer={
            <>
              <button type="button" className={btnClass('ghost')} onClick={() => setDeleting(false)}>
                <BtnLabel>Keep it</BtnLabel>
              </button>
              <button type="submit" className={btnClass('primary')}>
                <BtnLabel>Delete the request</BtnLabel>
              </button>
            </>
          }
        >
          <p>It’s still pending, so it can be deleted, with its checks and activity. This can’t be undone. A decided request is kept as the record.</p>
        </Modal>
      )}
    </article>
  );
}

function NewRequest({
  kind,
  source,
  existing,
  onClose,
  onCreated,
  notify,
}: {
  kind: Exclude<VerificationKind, 'employment'>;
  source: VerificationSource;
  existing: Verification[];
  onClose: () => void;
  onCreated: (id: string) => void;
  notify: (t: string) => void;
}) {
  const { people } = usePortal();
  // connected, who can be verified comes from the company's directory; the demo uses its sample people
  const directory = useDirectory();
  // one open request per person: a second pending check would split the evidence across two records
  const busy = new Set(existing.flatMap((v) => (v.kind === 'employee' && v.status === 'pending' ? [v.personId] : [])));
  const everyone = source.connected
    ? directory.state.kind === 'ready'
      ? directory.state.people.filter((p) => p.accountRole !== 'Superadmin' && p.accountRole !== 'Admin').map((p) => ({ id: p.id, name: p.name, email: p.email }))
      : null
    : people.filter((p) => p.role !== 'admin');
  const candidates = (everyone ?? []).filter((p) => !busy.has(p.id));
  const loadingPeople = kind === 'employee' && source.connected && directory.state.kind === 'loading';
  const peopleFailed = kind === 'employee' && source.connected && directory.state.kind === 'error';
  const [picked, setPicked] = useState('');
  const personId = picked || candidates[0]?.id || '';
  const [company, setCompany] = useState('');
  const [registration, setRegistration] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const change = (set: (v: string) => void) => (e: { target: { value: string } }) => (set(e.target.value), setError(''));
  /** Saves the request; a refusal (say, one already pending) stays in the window to fix. */
  const start = async (draft: Parameters<VerificationSource['open']>[0], done: string) => {
    setSaving(true);
    try {
      onCreated(await source.open(draft));
      notify(done);
      onClose();
    } catch (e) {
      setError(failure(e));
    } finally {
      setSaving(false);
    }
  };

  const submit = () => {
    if (saving) return;
    if (kind === 'employee') {
      if (!personId) return setError('Pick who to verify.');
      const name = candidates.find((p) => p.id === personId)?.name;
      return void start(
        { kind, personId },
        source.connected
          ? `Verification started for ${name}. They were asked in their bell and by email to upload their documents.`
          : `Verification started for ${name}. Email isn't connected yet, so copy the upload link from the request and send it to them.`,
      );
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
    void start({ kind, company: name, registration: registration.trim().toUpperCase(), website: site, contactEmail: contactEmail.trim().toLowerCase() }, `Verification started for ${name}.`);
  };

  return (
    <Modal
      title={`New ${kind} verification request`}
      icon="shield"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')} disabled={saving || (kind === 'employee' && !candidates.length)}>
            <BtnLabel>Start verification</BtnLabel>
          </button>
        </>
      }
    >
      {kind === 'employee' ? (
        loadingPeople ? (
          <p className="p-modal-text">Loading the directory…</p>
        ) : peopleFailed ? (
          <p className="p-modal-text">The directory didn’t load, so nobody can be picked. Close this and try again in a moment.</p>
        ) : candidates.length ? (
          <label className="p-field">
            <span>Employee</span>
            <select className="p-select" value={personId} onChange={change(setPicked)} autoFocus>
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
