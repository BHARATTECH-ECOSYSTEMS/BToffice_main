import { useState } from 'react';
import { STREAM_LABEL, STREAMS, type Referral, type Stream } from '../data';
import { managesPortal, useSession } from '../session';
import { formatDate, usePortal } from '../store';
import { Badge, btnClass, BtnLabel, ConfirmDelete, Empty, initials, Modal, PageHead, PIcon, useListFlip, useNotice } from '../ui';

/**
 * Bharattech Community: everyone who has left, grouped by the stream they worked in, and the job referrals shared
 * with them. Nobody is added by hand: marking someone as left on the People page puts them in their stream's
 * community. Former colleagues can't sign in yet, so for now this is the staff's side of the community.
 */
export function Community() {
  const session = useSession()!;
  const { alumni, referrals, removeReferral } = usePortal();
  const [stream, setStream] = useState<Stream | ''>('');
  const [sharing, setSharing] = useState(false);
  const [removing, setRemoving] = useState<Referral | null>(null);
  const [notice, notify] = useNotice();
  const members = alumni.filter((a) => !stream || a.stream === stream).sort((a, b) => b.left.localeCompare(a.left));
  const shared = referrals.filter((r) => !stream || r.stream === stream);
  const membersRef = useListFlip<HTMLUListElement>(stream);
  const referralsRef = useListFlip<HTMLUListElement>(`${stream}|${referrals.length}`);
  // whoever shared a referral can take it down, and so can the people who run the portal
  const canRemove = (r: Referral) => managesPortal(session.role) || r.postedBy === session.name;
  const label = stream ? `${STREAM_LABEL[stream]} community` : 'community';

  return (
    <>
      <PageHead title="Bharattech Community" sub="Everyone who leaves joins the community for their stream automatically. Share job referrals with them here.">
        <button type="button" className={btnClass('light')} onClick={() => setSharing(true)}>
          <BtnLabel icon="share">Share a referral</BtnLabel>
        </button>
      </PageHead>
      {notice}
      <div className="p-chips p-comm-streams" role="group" aria-label="Show community">
        {(['', ...STREAMS.map((s) => s.id)] as const).map((s) => (
          <button key={s || 'all'} type="button" aria-pressed={stream === s} onClick={() => setStream(s)}>
            {s ? STREAM_LABEL[s] : 'All'} <span className="p-count">{alumni.filter((a) => !s || a.stream === s).length}</span>
          </button>
        ))}
      </div>

      <div className="p-split">
        <section className="p-card" aria-labelledby="comm-members">
          <div className="p-card-head is-start">
            <span className="p-tile-icon">
              <PIcon name="users" />
            </span>
            <div>
              <h2 id="comm-members" className="p-card-title">
                Members
              </h2>
              <p className="p-muted">Former colleagues in the {label}.</p>
            </div>
          </div>
          {members.length ? (
            <ul className="p-comm-list" ref={membersRef}>
              {members.map((a) => (
                <li key={a.id} className="p-comm-member" data-flip={a.id}>
                  <span className="p-avatar is-soft is-small" aria-hidden="true">
                    {initials(a.name)}
                  </span>
                  <span className="p-comm-main">
                    <strong>{a.name}</strong>
                    <small>Left {formatDate(a.left)}</small>
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

        <section className="p-card" aria-labelledby="comm-referrals">
          <div className="p-card-head is-start">
            <span className="p-tile-icon">
              <PIcon name="share" />
            </span>
            <div>
              <h2 id="comm-referrals" className="p-card-title">
                Referrals
              </h2>
              <p className="p-muted">Openings we've passed on to the {label}.</p>
            </div>
          </div>
          {shared.length ? (
            <ul className="p-comm-list" ref={referralsRef}>
              {shared.map((r) => (
                <li key={r.id} className="p-comm-referral" data-flip={r.id}>
                  <div className="p-comm-main">
                    <strong>{r.title}</strong>
                    <span>{r.company}</span>
                    {r.note && <p>{r.note}</p>}
                    <small>
                      Shared by {r.postedBy} on {formatDate(r.posted)}
                    </small>
                  </div>
                  <div className="p-comm-side">
                    <Badge kind="soft">{STREAM_LABEL[r.stream]}</Badge>
                    {r.link && (
                      <a className={btnClass('ghost', { small: true })} href={r.link} target="_blank" rel="noreferrer">
                        <BtnLabel icon="external">
                          Open<span className="sr-only"> {r.title} at {r.company} (opens in a new tab)</span>
                        </BtnLabel>
                      </a>
                    )}
                    {canRemove(r) && (
                      <button type="button" className="p-text-btn is-danger" onClick={() => setRemoving(r)}>
                        Remove<span className="sr-only"> {r.title}</span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="share" title="No referrals here yet">
              Share an opening and it shows up for the {label}.
            </Empty>
          )}
        </section>
      </div>
      <p className="p-field-hint">Former colleagues can't sign in to the portal yet, and nothing is emailed to them, so they don't see these referrals until that's connected.</p>

      {sharing && (
        <ShareReferral
          initial={stream || 'tech'}
          onClose={() => setSharing(false)}
          onShared={(title, s) => {
            setStream(s);
            notify(`${title} was shared with the ${STREAM_LABEL[s]} community.`);
          }}
        />
      )}
      {removing && (
        <ConfirmDelete
          what={`the referral for ${removing.title}`}
          onClose={() => setRemoving(null)}
          onConfirm={() => {
            removeReferral(removing.id);
            notify('The referral was removed.');
          }}
        />
      )}
    </>
  );
}

function ShareReferral({ initial, onClose, onShared }: { initial: Stream; onClose: () => void; onShared: (title: string, stream: Stream) => void }) {
  const { shareReferral } = usePortal();
  const [stream, setStream] = useState<Stream>(initial);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const change = (set: (v: string) => void) => (e: { target: { value: string } }) => (set(e.target.value), setError(''));

  const submit = () => {
    if (!title.trim()) return setError('Enter the role, like Backend Engineer.');
    if (!company.trim()) return setError('Enter the company that is hiring.');
    let url = '';
    if (link.trim()) {
      try {
        const u = new URL(link.trim());
        // only web links: it's shown as a link people click
        if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('not a web link');
        url = u.href;
      } catch {
        return setError('Enter the link as a full address, starting with https://');
      }
    }
    shareReferral({ stream, title: title.trim(), company: company.trim(), link: url, note: note.trim() });
    onShared(title.trim(), stream);
    onClose();
  };

  return (
    <Modal
      title="Share a referral"
      icon="share"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel>Share</BtnLabel>
          </button>
        </>
      }
    >
      <div className="p-form-row">
        <label className="p-field">
          <span>Role</span>
          <input value={title} onChange={change(setTitle)} placeholder="Backend Engineer" autoFocus />
        </label>
        <label className="p-field">
          <span>Company</span>
          <input value={company} onChange={change(setCompany)} placeholder="Who is hiring" />
        </label>
      </div>
      <div className="p-form-row">
        <label className="p-field">
          <span>Community</span>
          <select className="p-select" value={stream} onChange={(e) => setStream(e.target.value as Stream)}>
            {STREAMS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="p-field">
          <span>Link (optional)</span>
          <input type="url" value={link} onChange={change(setLink)} placeholder="https://" />
        </label>
      </div>
      <label className="p-field">
        <span>Note (optional)</span>
        <textarea value={note} onChange={change(setNote)} rows={2} placeholder="Who to ask, location, anything that helps" />
      </label>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
