import { useState, type CSSProperties } from 'react';
import { api } from '../api';
import { EMAIL_SHAPE, ID_RETENTION_DAYS, ROLE_LABEL, STREAM_LABEL, STREAMS, type Person, type PersonRole, type Stream } from '../data';
import { managesPortal, useSession } from '../session';
import { usePortal } from '../store';
import { Badge, btnClass, BtnLabel, DeleteButton, Empty, Modal, PageHead, PIcon, SearchField, useListFlip, useNotice, usePlayThen } from '../ui';
import { ConnectedPeople } from './PeopleConnected';

/** The real directory when the backend is connected; the demo directory otherwise. */
export function People() {
  return api ? <ConnectedPeople /> : <DemoPeople />;
}

function DemoPeople() {
  const role = useSession()!.role;
  const isManager = managesPortal(role);
  const isAdmin = role === 'admin';
  const { people, me, setPersonRole, removePerson, invitePerson, markLeft } = usePortal();
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<PersonRole | 'all'>('all');
  const [inviting, setInviting] = useState(false);
  const [notice, notify] = useNotice();
  const query = q.trim().toLowerCase();
  const rows = people.filter((p) => (roleFilter === 'all' || p.role === roleFilter) && (!query || [p.id, p.name, p.email, p.role].some((v) => v.toLowerCase().includes(query))));
  const listRef = useListFlip<HTMLTableSectionElement>(`${roleFilter}|${query}`);
  // Only admins change roles or delete, and other admins (and themselves) are left alone.
  const manageable = (p: Person) => isAdmin && p.role !== 'admin' && p.id !== me.id;

  return (
    <>
      <PageHead title="People" sub={isManager ? 'Manage users and roles in your organisation.' : 'Everyone in the organisation.'}>
        {isManager && (
          <button type="button" className={btnClass('light')} onClick={() => setInviting(true)}>
            <BtnLabel icon="plus">Add people</BtnLabel>
          </button>
        )}
      </PageHead>
      <section className="p-card" aria-label="People directory">
        <div className="p-toolbar is-split">
          <div className="p-chips" role="group" aria-label="Show role">
            {(['all', 'admin', 'subadmin', 'employee', 'intern'] as const).map((r) => (
              <button key={r} type="button" aria-pressed={roleFilter === r} onClick={() => setRoleFilter(r)}>
                {r === 'all' ? 'All' : ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <SearchField value={q} onChange={setQ} label="Search people" placeholder="Search by name, email, ID or role" />
        </div>
        {rows.length ? (
          <div className="p-table-wrap">
            <table className="p-table">
              <thead>
                <tr>
                  <th scope="col">Emp ID</th>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Phone no.</th>
                  <th scope="col">Details</th>
                  {isManager && <th scope="col">Assign role</th>}
                  {isManager && (
                    <th scope="col" className="is-end">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody ref={listRef}>
                {rows.map((p) => (
                  <tr key={p.id} data-flip={p.id}>
                    <td className="is-mono">{p.id}</td>
                    <td className="is-strong">
                      {p.name}
                      {p.id === me.id && <span className="p-you">You</span>}
                    </td>
                    <td>{p.email}</td>
                    <td>
                      <Badge kind={p.role}>{ROLE_LABEL[p.role]}</Badge>
                      {p.status === 'invited' && <Badge kind="invited">Invited</Badge>}
                    </td>
                    <td>
                      {p.phone || (
                        <span className="p-dim" title="Not set">
                          -
                        </span>
                      )}
                    </td>
                    <td>
                      {p.team} · {STREAM_LABEL[p.stream]}
                    </td>
                    {isManager && (
                      <td>
                        {manageable(p) ? (
                          <label>
                            <span className="sr-only">Role for {p.name}</span>
                            <select
                              className="p-select"
                              value={p.role}
                              onChange={(e) => {
                                setPersonRole(p.id, e.target.value as PersonRole);
                                notify(`${p.name} is now ${ROLE_LABEL[e.target.value as PersonRole].toLowerCase()}.`);
                              }}
                            >
                              <option value="subadmin">Sub Admin</option>
                              <option value="employee">Employee</option>
                              <option value="intern">Intern</option>
                            </select>
                          </label>
                        ) : (
                          <span className="p-dim">{ROLE_LABEL[p.role]}</span>
                        )}
                      </td>
                    )}
                    {isManager && (
                      <td className="is-end p-row-actions">
                        {/* shown but disabled for admins and yourself, so it's clear the row can't be changed rather than missing */}
                        <WaveButton
                          srText={p.name}
                          disabled={!manageable(p)}
                          title={
                            manageable(p)
                              ? `Moves them to the ${STREAM_LABEL[p.stream]} community today. Their ID documents are deleted ${ID_RETENTION_DAYS} days later.`
                              : !isAdmin
                                ? 'Only admins can mark someone as left'
                                : p.id === me.id
                                  ? "You can't mark yourself as left"
                                  : "Admin accounts can't be marked as left"
                          }
                          onDone={() => {
                            markLeft(p.id, new Date().toISOString().slice(0, 10), p.stream);
                            notify(`${p.name} has left and joined the ${STREAM_LABEL[p.stream]} community.`);
                          }}
                        />
                        <DeleteButton
                          small
                          srText={p.name}
                          disabled={!manageable(p)}
                          title={manageable(p) ? undefined : !isAdmin ? 'Only admins can delete accounts' : p.id === me.id ? "You can't delete your own account" : 'Admin accounts can\'t be deleted'}
                          onDone={() => (removePerson(p.id), notify(`${p.name} was removed.`))}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="users" title="Nobody matches that search" />
        )}
        {notice}
      </section>

      {inviting && (
        <InviteModal
          taken={(email) => people.some((p) => p.email === email)}
          onClose={() => setInviting(false)}
          onInvite={(name, email, role, stream) => {
            invitePerson(name, email, role, stream);
            notify(`${name} was added. Invite emails aren't connected yet, so no email was sent.`);
          }}
        />
      )}
    </>
  );
}

// how long the goodbye plays before they're marked as left (the CSS timeline in portal.css ends at 1.7s)
const WAVE_MS = 1850;
const WAVE_LABEL = 'Mark as left';

/**
 * Marks someone as left on click, with no form, waving goodbye on the button itself: the letters drift off one by one,
 * a hand pops in and waves twice, and the button settles into a quiet "Left" chip with a tick. Only then is the person
 * moved (see usePlayThen).
 */
function WaveButton({ srText, disabled, title, onDone }: { srText: string; disabled?: boolean; title?: string; onDone: () => void }) {
  const [waving, play] = usePlayThen(WAVE_MS);
  return (
    <button
      type="button"
      className={`${btnClass('ghost', { small: true })} p-wave`}
      data-going={waving || undefined}
      aria-disabled={waving || undefined}
      aria-label={waving ? 'Marking as left' : `${WAVE_LABEL} ${srText}`}
      disabled={disabled}
      title={title}
      onClick={() => play(onDone)}
    >
      <PIcon name="logout" size={16} />
      <span className="btn-text" aria-hidden="true">
        <span>
          {[...WAVE_LABEL].map((ch, i) => (
            // a plain space would collapse inside its inline-block and the words would run together
            <span key={i} className="p-wave-ch" style={{ '--i': i } as CSSProperties}>
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </span>
      </span>
      <svg className="p-wave-hand" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      </svg>
      <span className="p-wave-chip" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" />
        </svg>
        Left
      </span>
    </button>
  );
}

export function InviteModal({
  taken,
  onClose,
  onInvite,
}: {
  taken: (email: string) => boolean;
  onClose: () => void;
  onInvite: (name: string, email: string, role: PersonRole, stream: Stream) => void;
}) {
  // only admins can hand out sub admin rights
  const isAdmin = useSession()!.role === 'admin';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PersonRole>('employee');
  const [stream, setStream] = useState<Stream>('tech');
  const [error, setError] = useState('');
  return (
    <Modal
      title="Add New User"
      icon="users"
      onClose={onClose}
      onSubmit={() => {
        const mail = email.trim().toLowerCase();
        if (!name.trim()) return setError('Enter their full name.');
        if (!EMAIL_SHAPE.test(mail)) return setError('Enter a valid email address.');
        if (taken(mail)) return setError('Someone with that email is already in the list.');
        onInvite(name.trim(), mail, role, stream);
        onClose();
      }}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel>Send Invite</BtnLabel>
          </button>
        </>
      }
    >
      <label className="p-field">
        <span>Name</span>
        <input value={name} onChange={(e) => (setName(e.target.value), setError(''))} placeholder="Full name" autoFocus />
      </label>
      <label className="p-field">
        <span>Email</span>
        <input type="email" value={email} onChange={(e) => (setEmail(e.target.value), setError(''))} placeholder="name@company.com" />
      </label>
      <label className="p-field">
        <span>Role</span>
        <select className="p-select" value={role} onChange={(e) => setRole(e.target.value as PersonRole)}>
          {isAdmin && <option value="subadmin">Sub Admin</option>}
          <option value="employee">Employee</option>
          <option value="intern">Intern</option>
        </select>
      </label>
      <label className="p-field">
        <span>Stream</span>
        <select className="p-select" value={stream} onChange={(e) => setStream(e.target.value as Stream)}>
          {STREAMS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
