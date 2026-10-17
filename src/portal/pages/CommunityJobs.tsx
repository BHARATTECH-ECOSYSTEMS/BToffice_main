import { useState } from 'react';
import { EMAIL, HQ } from '../../content';
import { STREAM_LABEL, STREAMS, WORK_MODE_LABEL, type ApplicationStage, type InternalJob, type Stream, type WorkMode } from '../data';
import { formatDate, usePeopleById, usePortal } from '../store';
import { Badge, btnClass, BtnLabel, DeleteButton, Empty, Modal, PIcon } from '../ui';

// the local calendar day, so an apply-by date ends at midnight here rather than in UTC
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A mailto link; the address list may be empty (then the person picks recipients in their mail app). */
const mailto = ({ to = '', bcc = [] as string[], subject, body }: { to?: string; bcc?: string[]; subject: string; body: string }) =>
  `mailto:${encodeURIComponent(to)}?${bcc.length ? `bcc=${bcc.map(encodeURIComponent).join(',')}&` : ''}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

/** The posting as plain text, for the email that offers it to a community. */
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

/**
 * Internal job postings (IJPs) for former colleagues: an admin offers an opening back to one stream's community,
 * adds the people who apply (only former colleagues from that stream can be added), checks them against the
 * criteria, sends a knowledge check instead of an interview, and on a pass they're back in People automatically.
 * Former colleagues can't sign in or apply online yet, so applications are added here by the admin. Everyone else
 * sees the postings and their criteria, but not who applied.
 */
export function InternalJobs({ stream, notify, isAdmin }: { stream: Stream | ''; notify: (t: string) => void; isAdmin: boolean }) {
  const { jobs } = usePortal();
  const shown = jobs.filter((j) => !stream || j.stream === stream);
  const openCount = shown.filter(isOpen).length;
  return (
    <section className="p-comm-jobs" aria-labelledby="comm-jobs">
      <header className="p-comm-jobs-head">
        <h2 id="comm-jobs" className="p-comm-jobs-title">
          Internal job postings
        </h2>
        <p className="p-muted">
          {openCount ? `${openCount} ${openCount === 1 ? 'role is' : 'roles are'} open to former colleagues right now.` : 'No roles are open to former colleagues right now.'}
        </p>
      </header>
      {shown.length ? (
        <div className="p-ijp-list">
          {shown.map((j) => (
            <JobCard key={j.id} job={j} notify={notify} isAdmin={isAdmin} />
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

// past its apply-by date a posting reads as closed, even before an admin closes it
const isOpen = (job: InternalJob) => job.open && !(job.closes && job.closes < todayIso());

function JobCard({ job, notify, isAdmin }: { job: InternalJob; notify: (t: string) => void; isAdmin: boolean }) {
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
          <h3 className="p-ijp-title">{job.title}</h3>
          <p className="p-dim">
            For the {STREAM_LABEL[job.stream]} community. Posted by {job.postedBy} on {formatDate(job.posted)}
          </p>
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
        <JobAdmin job={job} open={open} notify={notify} />
      ) : (
        open && <p className="p-ijp-note">Know a former colleague who fits? Let your HR team know, and they'll pass the posting on.</p>
      )}
    </article>
  );
}

/** The admin's half of a job: who applied, where each one is, adding applicants, and closing or deleting it. */
function JobAdmin({ job, open, notify }: { job: InternalJob; open: boolean; notify: (t: string) => void }) {
  const { alumni, applications, setJobOpen, removeJob, addApplicant, moveApplication } = usePortal();
  const byId = usePeopleById();
  const [who, setWho] = useState('');
  const mine = applications.filter((a) => a.jobId === job.id);
  // only former colleagues from this job's stream, and nobody twice
  const candidates = alumni.filter((a) => a.stream === job.stream && !mine.some((m) => m.personId === a.id));
  // everyone in the community the job can be emailed to: their personal email, since their work one stopped
  const reach = alumni.filter((a) => a.stream === job.stream && a.personalEmail).map((a) => a.personalEmail!);

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
            {mine.map((a) => {
              const person = byId.get(a.personId);
              const name = person?.name ?? 'Removed user';
              const personal = alumni.find((x) => x.id === a.personId)?.personalEmail;
              return (
                <li key={a.id} className="p-ijp-applicant">
                  <span className="p-comm-main">
                    <strong>{name}</strong>
                    <small>Updated {formatDate(a.updated)}</small>
                  </span>
                  <Badge kind={STAGE[a.stage].badge}>{STAGE[a.stage].label}</Badge>
                  <span className="p-ijp-actions">
                    {a.stage === 'applied' && (
                      <>
                        <button type="button" className={btnClass('primary', { small: true })} onClick={() => (moveApplication(a.id, 'eligible'), notify(`${name} meets the criteria.`))}>
                          <BtnLabel icon="check">Meets criteria</BtnLabel>
                        </button>
                        <button type="button" className={btnClass('ghost', { small: true })} onClick={() => (moveApplication(a.id, 'declined'), notify(`${name} doesn't meet the criteria this time.`))}>
                          <BtnLabel>Doesn't meet</BtnLabel>
                        </button>
                      </>
                    )}
                    {a.stage === 'eligible' && (
                      // the check goes to their personal email: their work email stopped when they left
                      <button
                        type="button"
                        className={btnClass('primary', { small: true })}
                        disabled={!personal}
                        title={personal ? undefined : 'Add their personal email under Members first'}
                        onClick={() => (moveApplication(a.id, 'checking'), notify(`Knowledge check marked as sent to ${personal}. Email isn't connected yet, so nothing was sent.`))}
                      >
                        <BtnLabel icon="clipboard">Send knowledge check</BtnLabel>
                      </button>
                    )}
                    {a.stage === 'checking' && (
                      <>
                        <button type="button" className={btnClass('primary', { small: true })} onClick={() => (moveApplication(a.id, 'rejoined'), notify(`${name} passed and is back in People.`))}>
                          <BtnLabel icon="check">Passed, rejoin</BtnLabel>
                        </button>
                        <button type="button" className={btnClass('ghost', { small: true })} onClick={() => (moveApplication(a.id, 'declined'), notify(`${name} didn't pass the knowledge check.`))}>
                          <BtnLabel>Didn't pass</BtnLabel>
                        </button>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
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
              if (!who) return;
              addApplicant(job.id, who);
              notify(`${byId.get(who)?.name} was added as an applicant.`);
              setWho('');
            }}
          >
            <label className="p-field is-tight">
              <span>Add an applicant</span>
              <select className="p-select" value={who} onChange={(e) => setWho(e.target.value)} disabled={!candidates.length}>
                <option value="">{candidates.length ? `Former ${STREAM_LABEL[job.stream]} colleague` : 'Everyone in this community is added'}</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={btnClass('ghost')} disabled={!who}>
              <BtnLabel icon="plus">Add</BtnLabel>
            </button>
          </form>
        )}
        <span className="p-ijp-foot-actions">
          {open &&
            (reach.length ? (
              <a
                className={btnClass('primary', { small: true })}
                href={mailto({ bcc: reach, subject: `Internal job for former colleagues: ${job.title}`, body: jobEmail(job) })}
                onClick={() => notify(`Opening an email to ${reach.length} ${reach.length === 1 ? 'member' : 'members'} of the ${STREAM_LABEL[job.stream]} community. Their addresses are in Bcc.`)}
              >
                <BtnLabel icon="share">Email this job</BtnLabel>
              </a>
            ) : (
              <button type="button" className={btnClass('primary', { small: true })} disabled title={`Nobody in the ${STREAM_LABEL[job.stream]} community has a personal email yet. Add one under Members.`}>
                <BtnLabel icon="share">Email this job</BtnLabel>
              </button>
            ))}
          <button type="button" className={btnClass('ghost', { small: true })} onClick={() => (setJobOpen(job.id, !job.open), notify(job.open ? `${job.title} is closed.` : `${job.title} is open again.`))}>
            <BtnLabel icon={job.open ? 'lock' : 'refresh'}>{job.open ? 'Close posting' : 'Reopen'}</BtnLabel>
          </button>
          <DeleteButton small srText={job.title} onDone={() => (removeJob(job.id), notify(`${job.title} was deleted.`))} />
        </span>
      </footer>
    </>
  );
}

const DEFAULT_CHECK = 'A short online test on the skills this role needs, sent to your personal email. Pass it and you rejoin.';

/**
 * Posting an internal job: what the role is, who it's offered to, the practical facts (where, how, how many, by when),
 * who can apply, and what the knowledge check covers. The location starts as the head office.
 */
export function PostJob({ initial, onClose, onPosted }: { initial: Stream; onClose: () => void; onPosted: (title: string, stream: Stream) => void }) {
  const { postJob } = usePortal();
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
  const change = (set: (v: string) => void) => (e: { target: { value: string } }) => (set(e.target.value), setError(''));
  const lines = criteria
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const count = Number(openings);

  const submit = () => {
    if (!title.trim()) return setError('Enter the role, like Frontend Engineer.');
    if (!about.trim()) return setError('Say in a line or two what the role involves.');
    if (!location.trim()) return setError('Enter where the role is based, like Kanpur.');
    if (!experience.trim()) return setError('Enter the experience it needs, like 2+ years.');
    if (!Number.isInteger(count) || count < 1 || count > 50) return setError('Openings must be a whole number from 1 to 50.');
    if (closes && closes < todayIso()) return setError('The apply-by date has passed. Pick today or later.');
    if (!lines.length) return setError('Add at least one line under "Who can apply".');
    if (!check.trim()) return setError('Describe the knowledge check, so people know what to expect.');
    if (!EMAIL_SHAPE.test(applyEmail.trim())) return setError('Enter the email applications go to, like hr@bharattechorigin.com.');
    postJob({
      stream,
      title: title.trim(),
      about: about.trim(),
      location: location.trim(),
      mode,
      experience: experience.trim(),
      openings: count,
      closes: closes || undefined,
      criteria: lines,
      check: check.trim(),
      applyEmail: applyEmail.trim().toLowerCase(),
    });
    onPosted(title.trim(), stream);
    onClose();
  };

  return (
    <Modal
      title="Post an internal job"
      icon="spark"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel icon="spark">Post job</BtnLabel>
          </button>
        </>
      }
    >
      <div className="p-form-row">
        <label className="p-field">
          <span>Role</span>
          <input value={title} onChange={change(setTitle)} placeholder="e.g. Frontend Engineer" maxLength={120} autoFocus />
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
        <textarea value={about} onChange={change(setAbout)} rows={3} placeholder="What they'll work on, and with which team." maxLength={600} />
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
          <input value={experience} onChange={change(setExperience)} placeholder="e.g. 2+ years" maxLength={40} />
        </label>
        <label className="p-field">
          <span>Openings</span>
          <input type="number" min={1} max={50} step={1} inputMode="numeric" value={openings} onChange={change(setOpenings)} />
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
        <input type="email" value={applyEmail} onChange={change(setApplyEmail)} autoComplete="off" maxLength={120} />
      </label>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
