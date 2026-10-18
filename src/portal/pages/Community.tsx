import { useState } from 'react';
import { STREAM_LABEL, STREAMS, type Alumnus, type Stream } from '../data';
import { useSession } from '../session';
import { formatDate, usePortal } from '../store';
import { Badge, btnClass, BtnLabel, DeleteButton, Empty, initials, PageHead, PIcon, useListFlip, useNotice } from '../ui';
import { InternalJobs, PostJob } from './CommunityJobs';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Bharattech Community: everyone who has left, grouped by the stream they worked in, the referrals shared with them,
 * and internal jobs offered back to them. Everyone in the portal can see it; only admins run it: they share
 * referrals, post jobs, handle the applicants, and add the personal email each member is reached on (personal data,
 * so only admins see it). Only former colleagues are members, and nobody is added by hand: marking someone as left on
 * the People page puts them in their stream's community.
 */
// how the community works, as the three things that happen in order; worded for whoever is reading
const STEPS = {
  admin: [
    { title: 'They leave, we stay in touch', body: "Marking someone as left adds them to their stream's community. Add the personal email they'll use." },
    { title: 'They hear about roles first', body: 'Post an internal job and email it to the community before it goes anywhere else.' },
    { title: 'They come back, no interview', body: "Whoever meets the criteria takes a short knowledge check. Pass, and they're back in People." },
  ],
  team: [
    { title: 'Leave, and stay in touch', body: "Whoever leaves joins their stream's community, on their personal email." },
    { title: 'Hear about roles first', body: 'Openings at Bharattech go to former colleagues before anyone else.' },
    { title: 'Come back without an interview', body: 'Meet the criteria and pass a short knowledge check to rejoin.' },
  ],
};

export function Community() {
  const session = useSession()!;
  const { alumni, referrals, removeReferral } = usePortal();
  const [stream, setStream] = useState<Stream | ''>('');
  const [posting, setPosting] = useState(false);
  const [notice, notify] = useNotice();
  const members = alumni.filter((a) => !stream || a.stream === stream).sort((a, b) => b.left.localeCompare(a.left));
  const shared = referrals.filter((r) => !stream || r.stream === stream);
  const membersRef = useListFlip<HTMLUListElement>(stream);
  const referralsRef = useListFlip<HTMLUListElement>(`${stream}|${referrals.length}`);
  const label = stream ? `${STREAM_LABEL[stream]} community` : 'community';
  const isAdmin = session.role === 'admin';
  // referrals are for admins and sub admins; employees see the members and the internal jobs
  const showReferrals = session.role !== 'employee';

  return (
    <>
      <PageHead
        title="Bharattech Community"
        sub={
          isAdmin
            ? 'Former colleagues, kept close. Offer roles back to them first, and bring the right people back without an interview.'
            : 'Where former colleagues stay connected, and hear about roles at Bharattech first.'
        }
      >
        {isAdmin && (
          <button type="button" className={btnClass('primary')} onClick={() => setPosting(true)}>
            <BtnLabel icon="spark">Post an internal job</BtnLabel>
          </button>
        )}
      </PageHead>
      {notice}

      <ol className="p-comm-steps" aria-label="How the community works">
        {STEPS[isAdmin ? 'admin' : 'team'].map((s, i) => (
          <li key={s.title}>
            <span className="p-comm-step-no" aria-hidden="true">
              {i + 1}
            </span>
            <span>
              <strong>{s.title}</strong>
              <span>{s.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="p-chips p-comm-streams" role="group" aria-label="Show community">
        {(['', ...STREAMS.map((s) => s.id)] as const).map((s) => (
          <button key={s || 'all'} type="button" aria-pressed={stream === s} onClick={() => setStream(s)}>
            {s ? STREAM_LABEL[s] : 'All'} <span className="p-count">{alumni.filter((a) => !s || a.stream === s).length}</span>
          </button>
        ))}
      </div>

      {/* the roles lead, because bringing people back is what the community is for; the people sit beside them.
          Each group is a head on the page edge, then a card; the heads of both columns share one grid row. */}
      <div className="p-comm-layout">
        <InternalJobs stream={stream} notify={notify} isAdmin={isAdmin} />

        <aside className="p-comm-aside" aria-label="Community members and referrals">
          <header className="p-comm-head">
            <h2 id="comm-members" className="p-comm-title">
              Members <span className="p-comm-count">{members.length}</span>
            </h2>
            <p className="p-muted">
              Former colleagues in the {label}
              {isAdmin ? ', reached on their personal email.' : '.'}
            </p>
          </header>
          {/* only this first head shares the grid row with the jobs head; everything under it stacks in here */}
          <div className="p-comm-aside-body">
            <section className="p-card p-comm-panel" aria-labelledby="comm-members">
              {members.length ? (
                <ul className="p-comm-people" ref={membersRef}>
                  {members.map((a) => (
                    <li key={a.id} className="p-comm-person" data-flip={a.id}>
                      <span className="p-avatar is-soft is-small" aria-hidden="true">
                        {initials(a.name)}
                      </span>
                      <span className="p-comm-main">
                        <strong>{a.name}</strong>
                        <small>Left {formatDate(a.left)}</small>
                        {isAdmin && <PersonalEmail member={a} notify={notify} />}
                      </span>
                      <Badge kind="soft">{STREAM_LABEL[a.stream]}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty icon="users" title="No members yet">
                  People join when they're marked as left on the People page.
                </Empty>
              )}
            </section>

            {showReferrals && (
              <>
                <header className="p-comm-head">
                  <h2 id="comm-referrals" className="p-comm-title">
                    Referrals <span className="p-comm-count">{shared.length}</span>
                  </h2>
                  <p className="p-muted">Roles at other companies passed on to the {label}.</p>
                </header>
                <section className="p-card p-comm-panel" aria-labelledby="comm-referrals">
                  {shared.length ? (
                    <ul className="p-comm-people" ref={referralsRef}>
                      {shared.map((r) => (
                        <li key={r.id} className="p-comm-ref" data-flip={r.id}>
                          <span className="p-comm-main">
                            <strong>{r.title}</strong>
                            <span>{r.company}</span>
                            {r.note && <p>{r.note}</p>}
                            <small>
                              {STREAM_LABEL[r.stream]}, shared by {r.postedBy} on {formatDate(r.posted)}
                            </small>
                          </span>
                          {(r.link || isAdmin) && (
                            <span className="p-comm-ref-actions">
                              {r.link && (
                                <a className={btnClass('ghost', { small: true })} href={r.link} target="_blank" rel="noreferrer">
                                  <BtnLabel icon="external">
                                    Open<span className="sr-only"> {r.title} at {r.company} (opens in a new tab)</span>
                                  </BtnLabel>
                                </a>
                              )}
                              {isAdmin && (
                                <DeleteButton
                                  small
                                  label="Remove"
                                  srText={r.title}
                                  onDone={() => {
                                    removeReferral(r.id);
                                    notify('The referral was removed.');
                                  }}
                                />
                              )}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Empty icon="share" title="No referrals here yet">
                      Roles passed on to the {label} show up here.
                    </Empty>
                  )}
                </section>
              </>
            )}
          </div>
        </aside>
      </div>

      {posting && (
        <PostJob
          initial={stream || 'tech'}
          onClose={() => setPosting(false)}
          onPosted={(title, s) => {
            setStream(s);
            notify(`${title} was offered to the ${STREAM_LABEL[s]} community.`);
          }}
        />
      )}
    </>
  );
}

/**
 * The personal email a former colleague is reached on, shown under their name; an admin adds or changes it in place.
 * It must look like an email and can't be their old work email, which stopped working when they left.
 */
function PersonalEmail({ member, notify }: { member: Alumnus; notify: (t: string) => void }) {
  const { alumni, setPersonalEmail } = usePortal();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(member.personalEmail ?? '');
  const [error, setError] = useState('');

  if (!editing) {
    return member.personalEmail ? (
      <span className="p-comm-email">
        {member.personalEmail}
        <button type="button" className="p-text-btn" onClick={() => (setValue(member.personalEmail ?? ''), setEditing(true))}>
          Change<span className="sr-only"> personal email for {member.name}</span>
        </button>
      </span>
    ) : (
      <button type="button" className="p-text-btn p-comm-email-add" onClick={() => (setValue(''), setEditing(true))}>
        <PIcon name="plus" size={13} /> Add personal email<span className="sr-only"> for {member.name}</span>
      </button>
    );
  }

  const save = () => {
    const email = value.trim().toLowerCase();
    if (!EMAIL_SHAPE.test(email)) return setError('Enter an email like name@gmail.com.');
    if (email === member.email.toLowerCase()) return setError('Their work email stopped when they left. Use a personal one.');
    if (alumni.some((a) => a.id !== member.id && a.personalEmail?.toLowerCase() === email)) return setError('Another member already uses this email.');
    setPersonalEmail(member.id, email);
    setEditing(false);
    notify(`Personal email saved for ${member.name}.`);
  };
  return (
    <form
      className="p-comm-email-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label className="sr-only" htmlFor={`pe-${member.id}`}>
        Personal email for {member.name}
      </label>
      <input
        id={`pe-${member.id}`}
        type="email"
        value={value}
        onChange={(e) => (setValue(e.target.value), setError(''))}
        onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
        placeholder="name@gmail.com"
        autoComplete="off"
        autoFocus
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `pe-${member.id}-err` : undefined}
      />
      <button type="submit" className={btnClass('primary', { small: true })}>
        <BtnLabel>Save</BtnLabel>
      </button>
      <button type="button" className={btnClass('ghost', { small: true })} onClick={() => setEditing(false)}>
        <BtnLabel>Cancel</BtnLabel>
      </button>
      {error && (
        <small id={`pe-${member.id}-err`} className="p-error" role="alert">
          {error}
        </small>
      )}
    </form>
  );
}
