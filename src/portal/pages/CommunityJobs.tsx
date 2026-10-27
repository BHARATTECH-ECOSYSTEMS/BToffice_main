import { useState } from 'react';
import { EMAIL, HQ } from '../../content';
import type { ApiError } from '../api';
import { communityFailedMessage, emailedLine, JOB_LIMITS, jobProblem, nextStages, type JobDraft } from '../community';
import { STREAM_LABEL, STREAMS, WORK_MODE_LABEL, type ApplicationStage, type InternalJob, type Stream, type WorkMode } from '../data';
import { formatDate } from '../store';
import { Badge, btnClass, BtnLabel, Empty, Modal, PIcon } from '../ui';
import type { SourceMember } from './communitySource';
import type { JobsSource, SourceApplicant, SourceJob } from './jobsSource';

// the local calendar day, so an apply-by date ends at midnight here rather than in UTC
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A mailto link; the address list may be empty (then the person picks recipients in their mail app). */
const mailto = ({ to = '', bcc = [] as string[], subject, body }: { to?: string; bcc?: string[]; subject: string; body: string }) =>
  `mailto:${encodeURIComponent(to)}?${bcc.length ? `bcc=${bcc.map(encodeURIComponent).join(',')}&` : ''}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

/** The posting as plain text, for the demo's email that offers it to a community (connected, the backend emails it). */
function jobEmail(job: InternalJob) {
  return [
    `Hi,`,
    ``,
    `We're hiring for ${job.title} and want to offer it to former colleagues first.`,
    ``,
    job.about,
    ``,
    `Location: ${job.location}`,
    `Work mode: ${WORK_MODE_LABEL[job.mode]}`,
    `Experience: ${job.experience}`,
    `Openings: ${job.openings}`,
    `Apply by: ${job.closes ? formatDate(job.closes) : 'until the role is filled'}`,
    ``,
    `Who can apply:`,
    ...job.criteria.map((c) => `- ${c}`),
    ``,
    `There's no interview. ${job.check}`,
    ``,
    `To apply, write to ${job.applyEmail} with "${job.title}" in the subject.`,
    ``,
    `Bharattech Origin`,
  ].join('\n');
}

const STAGE: Record<ApplicationStage, { label: string; short: string; badge: string }> = {
  applied: { label: 'Applied', short: 'Applied', badge: 'todo' },
  eligible: { label: 'Meets criteria', short: 'Meets criteria', badge: 'doing' },
  checking: { label: 'Knowledge check sent', short: 'Check sent', badge: 'employee' },
  rejoined: { label: 'Rejoined', short: 'Rejoined', badge: 'done' },
  declined: { label: 'Not this time', short: 'Not this time', badge: 'rejected' },
};
// the road an application takes; "not this time" can happen at two of the steps, so it's counted beside them
const PIPELINE: ApplicationStage[] = ['applied', 'eligible', 'checking', 'rejoined'];

/** What the page says after a step, and whether its email went (connected; the demo sends none). */
function stepNotice(name: string, to: ApplicationStage, { emailed, needsInvite }: { emailed?: boolean; needsInvite?: boolean }, connected: boolean) {
  const mail = (sent: string, failed: string) => (emailed === undefined ? '' : emailed ? ` ${sent}` : ` ${failed}`);
  switch (to) {
    case 'eligible':
      return `${name} meets the criteria.`;
    case 'checking':
      return connected ? `The knowledge check was emailed to ${name}.` : `Knowledge check marked as sent to ${name}. Email isn't connected yet, so nothing was sent.`;
    case 'rejoined':
      return `${name} passed and is back in People${connected ? ', with today as their join date' : ''}.${needsInvite ? ' Their sign-in account was gone, so send them an invite from People.' : ''}${mail('They were emailed how to sign in.', "The welcome email couldn't be sent; tell them by hand.")}`;
    case 'declined':
      return `${name} won't go ahead this time.${mail('They were told kindly by email.', "The email couldn't be sent; tell them by hand.")}`;
    default:
      return '';
  }
}

/**
 * Internal job postings (IJPs) for former colleagues: an admin offers an opening back to one stream's community,
 * adds the people who apply (only former colleagues from that stream), checks them against the criteria, sends a
 * knowledge check instead of an interview, and on a pass they're back in People. Former colleagues can't sign in, so
 * applications reach the admin by email and are added here. Sub admins see the postings but not who applied.
 */
export function InternalJobs({
  stream,
  notify,
  isAdmin,
  source,
  members,
  onRejoined,
}: {
  stream: Stream | '';
  notify: (t: string) => void;
  isAdmin: boolean;
  source: JobsSource;
  members: SourceMember[];
  /** Someone rejoined: they're staff again, so whatever lists the community should load again. */
  onRejoined: () => void;
}) {
  const shown = source.jobs.filter((j) => !stream || j.stream === stream);
  const openCount = shown.filter(isOpen).length;
  return (
    <section className="p-comm-jobs" aria-labelledby="comm-jobs">
      <header className="p-comm-head">
        <h2 id="comm-jobs" className="p-comm-title">
          Internal job postings <span className="p-comm-count">{shown.length}</span>
        </h2>
        <p className="p-muted">
          {openCount ? `${openCount} ${openCount === 1 ? 'role is' : 'roles are'} open to former colleagues right now.` : 'No roles are open to former colleagues right now.'}
          {/* former colleagues can't sign in, so the admin adds the applications they email in */}
          {isAdmin &&
            (source.connected
              ? ' Posting emails the community; add the applications they send you to the job.'
              : " They can't sign in yet: email them the job, and add the applications they send you to it.")}
        </p>
      </header>
      {source.status.kind === 'loading' ? (
        <p className="p-muted" role="status">
          Loading internal jobs…
        </p>
      ) : source.status.kind === 'error' ? (
        <div className="p-card" role="alert">
          <Empty icon="alert" title="Internal jobs didn’t load">
            {communityFailedMessage(source.status.error)}
          </Empty>
          {source.status.error.kind !== 'signed-out' && (
            <button type="button" className={btnClass('light', { small: true })} onClick={source.retry}>
              <BtnLabel icon="refresh">Try again</BtnLabel>
            </button>
          )}
        </div>
      ) : shown.length ? (
        <div className="p-ijp-list">
          {shown.map((j) => (
            <JobCard key={j.id} job={j} notify={notify} isAdmin={isAdmin} source={source} members={members} onRejoined={onRejoined} />
          ))}
        </div>
      ) : (
        <div className="p-card">
          <Empty icon="spark" title="No internal jobs posted">
            {isAdmin ? `Post one and it's offered to the ${stream ? `${STREAM_LABEL[stream]} community` : 'community for its stream'}.` : 'Roles offered back to former colleagues show up here.'}
          </Empty>
        </div>
      )}
    </section>
  );
}

// past its apply-by date a posting reads as closed, even before an admin closes it (connected, the backend decides)
const isOpen = (job: InternalJob) => job.open && !(job.closes && job.closes < todayIso());

function JobCard({ job, notify, isAdmin, source, members, onRejoined }: { job: SourceJob; notify: (t: string) => void; isAdmin: boolean; source: JobsSource; members: SourceMember[]; onRejoined: () => void }) {
  const open = isOpen(job);
  const facts: [string, string][] = [
    ['Location', job.location],
    ['Work mode', WORK_MODE_LABEL[job.mode]],
    ['Experience', job.experience],
    ['Openings', String(job.openings)],
    ['Apply by', job.closes ? formatDate(job.closes) : 'Until filled'],
  ];
  return (
    <article className="p-card p-ijp" data-closed={!open || undefined}>
      <header className="p-ijp-head">
        <div>
          <h3 className="p-card-title p-ijp-title">{job.title}</h3>
          <p className="p-dim">
            For the {STREAM_LABEL[job.stream]} community. Posted by {job.postedBy} on {formatDate(job.posted)}
          </p>
          {job.emailed !== undefined && <p className="p-dim p-ijp-sent">{emailedLine({ stream: job.stream, emailed: job.emailed, failed: job.failed ?? 0 })}</p>}
        </div>
        <Badge kind={open ? 'active' : 'inactive'}>{open ? 'Open' : 'Closed'}</Badge>
      </header>
      <p className="p-ijp-about">{job.about}</p>
      <dl className="p-ijp-facts">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="p-ijp-block">
        <h4>Who can apply</h4>
        <ul className="p-ijp-criteria">
          {job.criteria.map((c) => (
            <li key={c}>
              <PIcon name="check" size={14} />
              {c}
            </li>
          ))}
        </ul>
      </div>
      <div className="p-ijp-check">
        <PIcon name="clipboard" size={16} />
        <p>
          <strong>No interview, a knowledge check instead</strong>
          {job.check}
        </p>
      </div>
      {open && (
        <div className="p-ijp-apply">
          <p>
            <strong>How to apply</strong>
            <span>
              Email <a href={`mailto:${job.applyEmail}`}>{job.applyEmail}</a> with the role in the subject.
            </span>
          </p>
          <a
            className={btnClass('ghost', { small: true })}
            href={mailto({ to: job.applyEmail, subject: `IJP application: ${job.title}`, body: `Hi,\n\nI'd like to apply for ${job.title} (internal job posting for former colleagues).\n\nName:\nEmployee ID when I worked there:\nPhone:\n\nThanks,` })}
          >
            <BtnLabel icon="share">Apply by email</BtnLabel>
          </a>
        </div>
      )}
      {isAdmin ? (
        <JobAdmin job={job} open={open} notify={notify} source={source} members={members} onRejoined={onRejoined} />
      ) : (
        open && <p className="p-ijp-note">Know a former colleague who fits? Let your HR team know, and they'll pass the posting on.</p>
      )}
    </article>
  );
}

/** The admin's half of a job: who applied, where each one is, adding applicants, and closing or deleting it. */
function JobAdmin({ job, open, notify, source, members, onRejoined }: { job: SourceJob; open: boolean; notify: (t: string) => void; source: JobsSource; members: SourceMember[]; onRejoined: () => void }) {
  const [who, setWho] = useState('');
  const [busy, setBusy] = useState(false);
  // connected, sending the check asks for its link or instructions, and rejoining asks first; turning someone down
  // (it emails them) and deleting the posting always ask first
  const [checking, setChecking] = useState<SourceApplicant | null>(null);
  const [rejoining, setRejoining] = useState<SourceApplicant | null>(null);
  const [declining, setDeclining] = useState<SourceApplicant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const mine = job.applicants ?? [];
  // only former colleagues from this job's stream, and nobody twice
  const candidates = members.filter((m) => m.stream === job.stream && !mine.some((a) => a.personId === m.id));
  // the demo's "Email this job": everyone in the community with a personal email, in Bcc
  const reach = members.filter((m) => m.stream === job.stream && m.personalEmail).map((m) => m.personalEmail!);

  const run = async (change: () => Promise<string>) => {
    setBusy(true);
    try {
      notify(await change());
    } catch (error) {
      notify(communityFailedMessage(error as ApiError));
    } finally {
      setBusy(false);
    }
  };
  const move = (a: SourceApplicant, to: ApplicationStage, instructions?: string) =>
    run(async () => {
      const notice = stepNotice(a.name, to, await source.move(job.id, a, to, instructions), source.connected);
      if (to === 'rejoined') onRejoined();
      return notice;
    });
  const ask = (a: SourceApplicant, to: ApplicationStage) => {
    if (source.connected && to === 'checking') return setChecking(a);
    if (source.connected && to === 'rejoined') return setRejoining(a);
    if (to === 'declined') return setDeclining(a);
    void move(a, to);
  };

  const declined = mine.filter((a) => a.stage === 'declined').length;
  return (
    <>
      <div className="p-ijp-applicants">
        <h4>Applicants</h4>
        {mine.length > 0 && (
          // the applications as a sequence, each step with how many are at it now
          <ol className="p-ijp-pipeline" aria-label="Applicants by stage">
            {PIPELINE.map((st) => {
              const n = mine.filter((a) => a.stage === st).length;
              return (
                <li key={st} data-on={n > 0 || undefined}>
                  <strong>{n}</strong>
                  <span>{STAGE[st].short}</span>
                </li>
              );
            })}
            {declined > 0 && <li className="is-out">{declined} not this time</li>}
          </ol>
        )}
        {mine.length ? (
          <ul>
            {mine.map((a) => (
              <li key={a.id} className="p-ijp-applicant">
                <span className="p-comm-main">
                  <strong>{a.name}</strong>
                  <small>Updated {formatDate(a.updated)}</small>
                </span>
                <Badge kind={STAGE[a.stage].badge}>{STAGE[a.stage].label}</Badge>
                <span className="p-ijp-actions">
                  {nextStages(a.stage).map((to) => (
                    <StepButton key={to} applicant={a} to={to} disabled={busy} onClick={() => ask(a, to)} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-dim">Nobody has applied yet.</p>
        )}
      </div>

      <footer className="p-ijp-foot">
        {open && (
          <form
            className="p-assign"
            onSubmit={(e) => {
              e.preventDefault();
              const person = candidates.find((c) => c.id === who);
              if (!person) return;
              void run(async () => {
                await source.addApplicant(job.id, person.id);
                setWho('');
                return `${person.name} was added as an applicant.`;
              });
            }}
          >
            <label className="p-field is-tight">
              <span>Add an applicant</span>
              <select className="p-select" value={who} onChange={(e) => setWho(e.target.value)} disabled={!candidates.length || busy}>
                <option value="">{candidates.length ? `Former ${STREAM_LABEL[job.stream]} colleague` : 'Everyone in this community is added'}</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={btnClass('ghost')} disabled={!who || busy}>
              <BtnLabel icon="plus">Add</BtnLabel>
            </button>
          </form>
        )}
        {/* one button height across the footer, level with the Add button beside the select */}
        <span className="p-ijp-foot-actions">
          {open &&
            !source.connected &&
            (reach.length ? (
              <a
                className={btnClass('primary')}
                href={mailto({ bcc: reach, subject: `Internal job for former colleagues: ${job.title}`, body: jobEmail(job) })}
                onClick={() => notify(`Opening an email to ${reach.length} ${reach.length === 1 ? 'member' : 'members'} of the ${STREAM_LABEL[job.stream]} community. Their addresses are in Bcc.`)}
              >
                <BtnLabel icon="share">Email this job</BtnLabel>
              </a>
            ) : (
              <button type="button" className={btnClass('primary')} disabled title={`Nobody in the ${STREAM_LABEL[job.stream]} community has a personal email yet. Add one under Members.`}>
                <BtnLabel icon="share">Email this job</BtnLabel>
              </button>
            ))}
          <button
            type="button"
            className={btnClass('ghost')}
            disabled={busy}
            onClick={() => void run(async () => (await source.setOpen(job.id, !job.open), job.open ? `${job.title} is closed.` : `${job.title} is open again.`))}
          >
            <BtnLabel icon={job.open ? 'lock' : 'refresh'}>{job.open ? 'Close posting' : 'Reopen'}</BtnLabel>
          </button>
          <button type="button" className={btnClass('ghost')} disabled={busy} onClick={() => setDeleting(true)}>
            <BtnLabel>
              Delete<span className="sr-only"> {job.title}</span>
            </BtnLabel>
          </button>
        </span>
      </footer>

      {checking && (
        <SendCheck
          job={job}
          applicant={checking}
          onClose={() => setChecking(null)}
          onSend={async (instructions) => {
            const notice = stepNotice(checking.name, 'checking', await source.move(job.id, checking, 'checking', instructions), true);
            setChecking(null);
            notify(notice);
          }}
        />
      )}
      {rejoining && (
        <Modal
          title={`${rejoining.name} passed: bring them back?`}
          icon="users"
          onClose={() => setRejoining(null)}
          onSubmit={() => {
            const a = rejoining;
            setRejoining(null);
            void move(a, 'rejoined');
          }}
          footer={
            <>
              <button type="button" className={btnClass('ghost')} onClick={() => setRejoining(null)}>
                <BtnLabel>Not yet</BtnLabel>
              </button>
              <button type="submit" className={btnClass('primary')}>
                <BtnLabel icon="check">Rejoin</BtnLabel>
              </button>
            </>
          }
        >
          <p>
            {rejoining.name} goes back to People with the same Employee ID, their sign-in is switched on again, their join date becomes today, and they’re
            emailed how to sign in.
          </p>
        </Modal>
      )}
      {declining && (
        <Modal
          title={`Turn down ${declining.name}?`}
          icon="alert"
          onClose={() => setDeclining(null)}
          onSubmit={() => {
            const a = declining;
            setDeclining(null);
            void move(a, 'declined');
          }}
          footer={
            <>
              <button type="button" className={btnClass('ghost')} onClick={() => setDeclining(null)}>
                <BtnLabel>Cancel</BtnLabel>
              </button>
              <button type="submit" className={btnClass('primary')}>
                <BtnLabel>{declining.stage === 'checking' ? "Didn't pass" : "Doesn't meet"}</BtnLabel>
              </button>
            </>
          }
        >
          <p>
            {declining.name} won’t go ahead for {job.title}
            {source.connected && declining.hasPersonalEmail ? ', and is emailed to say so' : ''}. This can’t be undone.
            {source.connected && !declining.hasPersonalEmail && ' They have no personal email, so tell them yourself.'}
          </p>
        </Modal>
      )}
      {deleting && (
        <Modal
          title={`Delete ${job.title}?`}
          icon="alert"
          onClose={() => setDeleting(false)}
          onSubmit={() => {
            setDeleting(false);
            void run(async () => (await source.remove(job.id), `${job.title} was deleted.`));
          }}
          footer={
            <>
              <button type="button" className={btnClass('ghost')} onClick={() => setDeleting(false)}>
                <BtnLabel>Cancel</BtnLabel>
              </button>
              <button type="submit" className={btnClass('primary')}>
                <BtnLabel>Delete posting</BtnLabel>
              </button>
            </>
          }
        >
          <p>
            The posting is removed for everyone{mine.length ? ', along with who applied and where each one is' : ''}. Emails already sent about it stay with
            the people who got them. This can’t be undone.
          </p>
        </Modal>
      )}
    </>
  );
}

/** One step an application can take next, worded for where it is now. */
function StepButton({ applicant, to, disabled, onClick }: { applicant: SourceApplicant; to: ApplicationStage; disabled: boolean; onClick: () => void }) {
  const primary = to === 'eligible' || to === 'checking' || to === 'rejoined';
  const label: Record<ApplicationStage, string> = {
    eligible: 'Meets criteria',
    checking: 'Send knowledge check',
    rejoined: 'Passed, rejoin',
    declined: applicant.stage === 'checking' ? "Didn't pass" : "Doesn't meet",
    applied: '',
  };
  // the check goes to their personal email: their work email stopped when they left
  const noEmail = to === 'checking' && !applicant.hasPersonalEmail;
  return (
    <button
      type="button"
      className={btnClass(primary ? 'primary' : 'ghost', { small: true })}
      disabled={disabled || noEmail}
      title={noEmail ? 'Add their personal email under Members first' : undefined}
      onClick={onClick}
    >
      <BtnLabel icon={to === 'checking' ? 'clipboard' : primary ? 'check' : undefined}>{label[to]}</BtnLabel>
    </button>
  );
}

const INSTRUCTIONS_MAX = 1000;

/** The knowledge check's link or instructions, emailed to the applicant; the window stays open until it has gone. */
function SendCheck({ job, applicant, onClose, onSend }: { job: SourceJob; applicant: SourceApplicant; onClose: () => void; onSend: (instructions: string) => Promise<void> }) {
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const submit = async () => {
    if (!instructions.trim()) return setError('Add the test link or instructions to send.');
    setSending(true);
    try {
      await onSend(instructions);
    } catch (e) {
      setError(communityFailedMessage(e as ApiError));
      setSending(false);
    }
  };
  return (
    <Modal
      title={`Send ${applicant.name} the knowledge check`}
      icon="clipboard"
      onClose={onClose}
      onSubmit={() => void submit()}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose} disabled={sending}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')} disabled={sending}>
            <BtnLabel icon="clipboard">{sending ? 'Emailing…' : 'Email the check'}</BtnLabel>
          </button>
        </>
      }
    >
      <p className="p-muted">{job.check}</p>
      <label className="p-field">
        <span>Test link or instructions</span>
        <textarea
          value={instructions}
          onChange={(e) => (setInstructions(e.target.value), setError(''))}
          rows={4}
          maxLength={INSTRUCTIONS_MAX}
          placeholder="The test's link, when to take it by, anything they need"
          autoFocus
        />
      </label>
      <p className="p-field-hint">It goes to their personal email. The step changes to “Knowledge check sent” only once the email has gone.</p>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

const DEFAULT_CHECK = 'A short online test on the skills this role needs, sent to your personal email. Pass it and you rejoin.';

/**
 * Posting an internal job: what the role is, who it's offered to, the practical facts (where, how, how many, by when),
 * who can apply, and what the knowledge check covers. The location starts as the head office. Connected, posting
 * also emails the community, so the window stays open until that's done.
 */
export function PostJob({
  initial,
  post,
  connected,
  onClose,
  onPosted,
}: {
  initial: Stream;
  post: (draft: JobDraft) => Promise<SourceJob>;
  connected: boolean;
  onClose: () => void;
  onPosted: (job: SourceJob) => void;
}) {
  const [stream, setStream] = useState<Stream>(initial);
  const [title, setTitle] = useState('');
  const [about, setAbout] = useState('');
  const [location, setLocation] = useState(HQ.split(',')[0]);
  const [mode, setMode] = useState<WorkMode>('onsite');
  const [experience, setExperience] = useState('');
  const [openings, setOpenings] = useState('1');
  const [closes, setCloses] = useState('');
  const [criteria, setCriteria] = useState('');
  const [check, setCheck] = useState(DEFAULT_CHECK);
  const [applyEmail, setApplyEmail] = useState(EMAIL);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const change = (set: (v: string) => void) => (e: { target: { value: string } }) => (set(e.target.value), setError(''));

  const submit = async () => {
    const draft: JobDraft = { stream, title, about, location, mode, experience, openings: Number(openings), closes, criteria: criteria.split('\n'), check, applyEmail };
    const problem = jobProblem(draft, todayIso());
    if (problem) return setError(problem);
    setSending(true);
    try {
      onPosted(await post(draft));
      onClose();
    } catch (e) {
      setError(communityFailedMessage(e as ApiError));
      setSending(false);
    }
  };

  return (
    <Modal
      title="Post an internal job"
      icon="spark"
      onClose={onClose}
      onSubmit={() => void submit()}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose} disabled={sending}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')} disabled={sending}>
            <BtnLabel icon="spark">{sending ? 'Posting and emailing…' : connected ? 'Post and email' : 'Post job'}</BtnLabel>
          </button>
        </>
      }
    >
      <div className="p-form-row">
        <label className="p-field">
          <span>Role</span>
          <input value={title} onChange={change(setTitle)} placeholder="e.g. Frontend Engineer" maxLength={JOB_LIMITS.title} autoFocus />
        </label>
        <label className="p-field">
          <span>Offered to</span>
          <select className="p-select" value={stream} onChange={(e) => setStream(e.target.value as Stream)}>
            {STREAMS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} community
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="p-field">
        <span>About the role</span>
        <textarea value={about} onChange={change(setAbout)} rows={5} placeholder="What they'll work on, and with which team." maxLength={600} />
      </label>
      <div className="p-form-row">
        <label className="p-field">
          <span>Location</span>
          <input value={location} onChange={change(setLocation)} maxLength={60} />
        </label>
        <label className="p-field">
          <span>Work mode</span>
          <select className="p-select" value={mode} onChange={(e) => setMode(e.target.value as WorkMode)}>
            {(Object.keys(WORK_MODE_LABEL) as WorkMode[]).map((m) => (
              <option key={m} value={m}>
                {WORK_MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="p-form-row">
        <label className="p-field">
          <span>Experience</span>
          <input value={experience} onChange={change(setExperience)} placeholder="e.g. 2+ years" maxLength={JOB_LIMITS.experience} />
        </label>
        <label className="p-field">
          <span>Openings</span>
          <input type="number" min={1} max={JOB_LIMITS.openings} step={1} inputMode="numeric" value={openings} onChange={change(setOpenings)} />
        </label>
        <label className="p-field">
          <span>Apply by (optional)</span>
          <input type="date" min={todayIso()} value={closes} onChange={change(setCloses)} />
        </label>
      </div>
      <label className="p-field">
        <span>Who can apply</span>
        <textarea value={criteria} onChange={change(setCriteria)} rows={3} placeholder={'One per line, e.g.\nWorked with us for at least a year\nLeft in good standing'} maxLength={1000} />
      </label>
      <label className="p-field">
        <span>Knowledge check</span>
        <textarea value={check} onChange={change(setCheck)} rows={2} maxLength={300} />
      </label>
      <label className="p-field">
        <span>Applications go to</span>
        <input type="email" value={applyEmail} onChange={change(setApplyEmail)} autoComplete="off" maxLength={JOB_LIMITS.email} />
      </label>
      {connected && <p className="p-field-hint">Members of the {STREAM_LABEL[stream]} community with a personal email get it by email, one each.</p>}
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
