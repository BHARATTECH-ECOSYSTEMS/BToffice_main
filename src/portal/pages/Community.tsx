import { useEffect, useState, type CSSProperties } from 'react';
import { toneStyle } from '../../components/ui';
import type { HueName } from '../../gl/palette';
import type { ApiError } from '../api';
import { communityFailedMessage, personalEmailProblem } from '../community';
import { STREAM_LABEL, STREAMS, type Stream } from '../data';
import { useAccountProfile } from '../profile';
import { managesPortal, useSession } from '../session';
import { formatDate, usePortal } from '../store';
import { Badge, btnClass, BtnLabel, DeleteButton, Empty, initials, Modal, PageHead, PIcon, useListFlip, useNotice } from '../ui';
import { useCommunitySource, useOwnPersonalEmail, type CommunitySource, type SourceMember } from './communitySource';
import { InternalJobs, PostJob } from './CommunityJobs';

/** Each stream's colour, for the ring round a member's initials. */
const STREAM_TONE: Record<Stream, HueName> = { tech: 'violet', operations: 'tangerine', hr: 'saffron', finance: 'violet' };

/**
 * Bharattech Community: everyone who has left, as a wall of member cards filtered by the stream they worked in, with
 * the referrals shared with them beside it and the internal jobs offered back to them below. Employees see the
 * members only. Admins and sub admins also see the referrals and the internal jobs; only admins run them: they share
 * referrals, post jobs, handle the applicants, and add the personal email each member is reached on (personal data,
 * so only admins see it). Only former colleagues are members, and nobody is added by hand: marking someone as left on
 * the People page puts them in their stream's community. Connected to the backend (communitySource.ts), admins can
 * also bring back someone marked as left by mistake; referrals and internal jobs stay the demo's until they connect.
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
  const { referrals, removeReferral } = usePortal();
  const source = useCommunitySource();
  const [stream, setStream] = useState<Stream | ''>('');
  const [posting, setPosting] = useState(false);
  const [bringing, setBringing] = useState<SourceMember | null>(null);
  const [notice, notify] = useNotice();
  const all = source.members;
  // the backend sends them newest leaver first; the demo's samples are sorted the same way here
  const members = all.filter((a) => !stream || a.stream === stream).sort((a, b) => b.left.localeCompare(a.left));
  const shared = referrals.filter((r) => !stream || r.stream === stream);
  const membersRef = useListFlip<HTMLUListElement>(`${stream}|${all.length}`);
  const referralsRef = useListFlip<HTMLUListElement>(`${stream}|${referrals.length}`);
  const label = stream ? `${STREAM_LABEL[stream]} community` : 'community';
  const isAdmin = session.role === 'admin';
  // referrals are for admins and sub admins; employees see the members only. Connected, they wait for Part 2.
  const showReferrals = session.role !== 'employee' && !source.connected;
  // the wall's cards come in one after another on arrival only; later changes slide (useListFlip)
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setEntering(false), 1200);
    return () => window.clearTimeout(t);
  }, []);

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
        {isAdmin && !source.connected && (
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

      {session.role === 'employee' && <JoinCommunity notify={notify} />}

      <div className="p-chips p-comm-streams" role="group" aria-label="Show community">
        {(['', ...STREAMS.map((s) => s.id)] as const).map((s) => (
          <button key={s || 'all'} type="button" aria-pressed={stream === s} onClick={() => setStream(s)}>
            {s ? STREAM_LABEL[s] : 'All'} <span className="p-count">{all.filter((a) => !s || a.stream === s).length}</span>
          </button>
        ))}
      </div>

      <div className="p-comm-wall-layout" data-aside={showReferrals || undefined}>
        <section className="p-comm-wall" aria-labelledby="comm-members">
          <header className="p-comm-head">
            <h2 id="comm-members" className="p-comm-title">
              Members <span className="p-comm-count">{members.length}</span>
            </h2>
            <p className="p-muted">
              Former colleagues in the {label}
              {isAdmin ? ', reached on their personal email.' : '.'}
            </p>
          </header>
          {source.status.kind === 'loading' ? (
            <p className="p-muted" role="status">
              Loading the community…
            </p>
          ) : source.status.kind === 'error' ? (
            <section className="p-card" role="alert">
              <Empty icon="alert" title="The community didn’t load">
                {communityFailedMessage(source.status.error)}
              </Empty>
              {source.status.error.kind !== 'signed-out' && (
                <button type="button" className={btnClass('light', { small: true })} onClick={source.retry}>
                  <BtnLabel icon="refresh">Try again</BtnLabel>
                </button>
              )}
            </section>
          ) : members.length ? (
            <ul className="p-comm-grid" ref={membersRef} data-enter={entering || undefined}>
              {members.map((a, i) => (
                <li key={a.id} className="p-comm-card" data-flip={a.id} style={toneStyle(STREAM_TONE[a.stream], { '--i': i } as CSSProperties)}>
                  <span className="p-comm-card-top">
                    <span className="p-comm-face" aria-hidden="true">
                      {initials(a.name)}
                    </span>
                    <Badge kind="soft">{STREAM_LABEL[a.stream]}</Badge>
                  </span>
                  <strong className="p-comm-name">{a.name}</strong>
                  <small className="p-comm-left">Left {formatDate(a.left)}</small>
                  {isAdmin && (
                    <span className="p-comm-card-email">
                      <PersonalEmail member={a} source={source} notify={notify} />
                    </span>
                  )}
                  {isAdmin && a.canBringBack && source.bringBack && (
                    <button type="button" className="p-text-btn p-comm-back" onClick={() => setBringing(a)}>
                      Bring back<span className="sr-only"> {a.name}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <section className="p-card">
              <Empty icon="users" title="No members yet">
                People join when they're marked as left on the People page.
              </Empty>
            </section>
          )}
        </section>

        {showReferrals && (
          <aside className="p-comm-refs" aria-labelledby="comm-referrals">
            <header className="p-comm-head">
              <h2 id="comm-referrals" className="p-comm-title">
                Referrals <span className="p-comm-count">{shared.length}</span>
              </h2>
              <p className="p-muted">Roles at other companies passed on to the {label}.</p>
            </header>
            <section className="p-card p-comm-panel">
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
          </aside>
        )}
      </div>

      {/* internal job postings are run by admins and sub admins; employees don't see them */}
      {managesPortal(session.role) &&
        (source.connected ? (
          <section className="p-card">
            <Empty icon="spark" title="Referrals and internal jobs are being connected next">
              Members and their personal emails are saved to the company system now. Sharing referrals and posting internal jobs come next.
            </Empty>
          </section>
        ) : (
          <InternalJobs stream={stream} notify={notify} isAdmin={isAdmin} />
        ))}

      {bringing && source.bringBack && (
        <BringBackModal
          member={bringing}
          onClose={() => setBringing(null)}
          onConfirm={async () => {
            const member = bringing;
            setBringing(null);
            try {
              const { needsInvite } = await source.bringBack!(member.id);
              notify(
                needsInvite
                  ? `${member.name} is back in People. Their sign-in account was gone, so send them an invite from People.`
                  : `${member.name} is back in People, and can sign in again.`,
              );
            } catch (error) {
              notify(communityFailedMessage(error as ApiError));
            }
          }}
        />
      )}

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
 * An employee joins the community ahead of leaving by giving the personal email it should reach them on. Nothing
 * changes while they work here; the day they're marked as left, they arrive in their stream's community with that
 * email already in place. They can change it or take it back at any time.
 */
function JoinCommunity({ notify }: { notify: (t: string) => void }) {
  const session = useSession()!;
  const { me } = usePortal();
  const own = useOwnPersonalEmail(true);
  // connected, their stream comes from their own record; the demo keeps it on the sample person
  const [profile] = useAccountProfile();
  const myStream = profile.kind === 'off' ? me.stream : profile.kind === 'ready' ? profile.profile.stream : undefined;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const joined = own.email;
  const community = myStream ? `${STREAM_LABEL[myStream]} community` : 'community';

  const save = async () => {
    const email = value.trim().toLowerCase();
    const problem = email ? personalEmailProblem(email, session.email) : 'Enter an email like name@gmail.com.';
    if (problem) return setError(problem);
    if (own.emailTaken(email)) return setError('Someone else already uses this email.');
    setSaving(true);
    try {
      await own.save(email);
      setEditing(false);
      notify(joined ? 'Your personal email was changed.' : `You've joined the ${community}.`);
    } catch (e) {
      setError(communityFailedMessage(e as ApiError));
    } finally {
      setSaving(false);
    }
  };
  const leaveList = async () => {
    try {
      await own.save('');
      notify(`You've left the ${community} list.`);
    } catch (e) {
      notify(communityFailedMessage(e as ApiError));
    }
  };

  // connected, nothing to show until their own email has loaded (or say why it didn't)
  if (joined === undefined) {
    return own.error ? (
      <section className="p-card p-comm-join" role="alert">
        <span className="p-comm-join-text">
          <h2>Join the community</h2>
          <p>{communityFailedMessage(own.error)}</p>
        </span>
      </section>
    ) : null;
  }

  if (joined && !editing) {
    return (
      <section className="p-card p-comm-join is-joined" aria-labelledby="comm-join">
        <span className="p-comm-join-icon" aria-hidden="true">
          <PIcon name="check" size={20} />
        </span>
        <span className="p-comm-join-text">
          <h2 id="comm-join">You're in the {community}</h2>
          <p>
            When you leave, we'll reach you at <strong className="p-comm-join-email">{joined}</strong>.
          </p>
        </span>
        <span className="p-comm-join-actions">
          <button type="button" className={btnClass('ghost', { small: true })} onClick={() => (setValue(joined), setError(''), setEditing(true))}>
            <BtnLabel icon="edit">Change email</BtnLabel>
          </button>
          <button type="button" className={btnClass('ghost', { small: true })} onClick={() => void leaveList()}>
            <BtnLabel>Leave</BtnLabel>
          </button>
        </span>
      </section>
    );
  }

  return (
    <section className="p-card p-comm-join" aria-labelledby="comm-join">
      <span className="p-comm-join-icon" aria-hidden="true">
        <PIcon name="users" size={20} />
      </span>
      <span className="p-comm-join-text">
        <h2 id="comm-join">{joined ? 'Change your personal email' : 'Join the community'}</h2>
        <p>
          {joined
            ? `When you leave, the ${community} will reach you on this email instead.`
            : `Give us a personal email now. When you leave, you'll join the ${community} on it and hear about roles first.`}
        </p>
      </span>
      <form
        className="p-comm-join-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="sr-only" htmlFor="join-email">
          Your personal email
        </label>
        <input
          id="join-email"
          type="email"
          value={value}
          onChange={(e) => (setValue(e.target.value), setError(''))}
          onKeyDown={(e) => e.key === 'Escape' && joined && setEditing(false)}
          placeholder="name@gmail.com"
          autoComplete="email"
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'join-email-err' : undefined}
        />
        <button type="submit" className={btnClass('primary')} disabled={saving}>
          <BtnLabel icon={joined ? undefined : 'plus'}>{saving ? 'Saving…' : joined ? 'Save' : 'Join'}</BtnLabel>
        </button>
        {joined && (
          <button type="button" className={btnClass('ghost')} onClick={() => setEditing(false)}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
        )}
        {error && (
          <small id="join-email-err" className="p-error" role="alert">
            {error}
          </small>
        )}
      </form>
    </section>
  );
}

/**
 * The personal email a former colleague is reached on, shown under their name; an admin adds or changes it in place.
 * It must look like an email and can't be their old work email, which stopped working when they left.
 */
function PersonalEmail({ member, source, notify }: { member: SourceMember; source: CommunitySource; notify: (t: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(member.personalEmail ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return member.personalEmail ? (
      <span className="p-comm-email">
        {/* a long address is cut short on a narrow card; the whole of it shows on hover */}
        <span className="p-comm-email-text" title={member.personalEmail}>
          {member.personalEmail}
        </span>
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

  const save = async () => {
    const email = value.trim().toLowerCase();
    const problem = email ? personalEmailProblem(email, member.workEmail ?? '') : 'Enter an email like name@gmail.com.';
    if (problem) return setError(problem);
    if (source.emailTaken(email, member.id)) return setError('Another member already uses this email.');
    setSaving(true);
    try {
      await source.setPersonalEmail(member.id, email);
      setEditing(false);
      notify(`Personal email saved for ${member.name}.`);
    } catch (e) {
      setError(communityFailedMessage(e as ApiError));
    } finally {
      setSaving(false);
    }
  };
  return (
    <form
      className="p-comm-email-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
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
      <button type="submit" className={btnClass('primary', { small: true })} disabled={saving}>
        <BtnLabel>{saving ? 'Saving…' : 'Save'}</BtnLabel>
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

/** Asks before bringing someone back: their sign-in is switched on again and they return to People. */
function BringBackModal({ member, onClose, onConfirm }: { member: SourceMember; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal
      title={`Bring ${member.name} back?`}
      icon="users"
      onClose={onClose}
      onSubmit={onConfirm}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Keep them in the community</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel>Bring back</BtnLabel>
          </button>
        </>
      }
    >
      <p>
        For someone marked as left by mistake. {member.name} goes back to People with the same Employee ID, and their sign-in is switched on again.
      </p>
    </Modal>
  );
}
