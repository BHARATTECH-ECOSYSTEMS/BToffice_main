import { useState } from 'react';
import { ID_RETENTION_DAYS, STREAM_LABEL, STREAMS, type Person, type PersonRole, type Stream } from '../data';
import { managesPortal, useSession } from '../session';
import { usePortal } from '../store';
import { Badge, btnClass, BtnLabel, ConfirmDelete, Empty, Modal, PageHead, SearchField, useListFlip, useNotice } from '../ui';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_LABEL: Record<PersonRole, string> = { admin: 'Admin', subadmin: 'Sub Admin', employee: 'Employee', intern: 'Intern' };

export function People() {
  const role = useSession()!.role;
  const isManager = managesPortal(role);
  const isAdmin = role === 'admin';
  const { people, me, setPersonRole, removePerson, invitePerson, markLeft } = usePortal();
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<PersonRole | 'all'>('all');
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState<Person | null>(null);
  const [leaving, setLeaving] = useState<Person | null>(null);
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
                          <label className="p-select-wrap">
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
                        <button
                          type="button"
                          className={btnClass('ghost', { small: true })}
                          onClick={() => setLeaving(p)}
                          disabled={!manageable(p)}
                          title={manageable(p) ? undefined : !isAdmin ? 'Only admins can mark someone as left' : p.id === me.id ? "You can't mark yourself as left" : "Admin accounts can't be marked as left"}
                        >
                          <BtnLabel icon="logout">
                            Mark as left<span className="sr-only"> {p.name}</span>
                          </BtnLabel>
                        </button>
                        <button
                          type="button"
                          className={btnClass('danger', { small: true })}
                          onClick={() => setDeleting(p)}
                          disabled={!manageable(p)}
                          title={manageable(p) ? undefined : !isAdmin ? 'Only admins can delete accounts' : p.id === me.id ? "You can't delete your own account" : 'Admin accounts can\'t be deleted'}
                        >
                          <BtnLabel icon="trash">
                            Delete<span className="sr-only"> {p.name}</span>
                          </BtnLabel>
                        </button>
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
      {leaving && (
        <MarkLeftModal
          person={leaving}
          onClose={() => setLeaving(null)}
          onConfirm={(left, stream) => {
            markLeft(leaving.id, left, stream);
            notify(`${leaving.name} has left and joined the ${STREAM_LABEL[stream]} community.`);
          }}
        />
      )}
      {deleting && <ConfirmDelete what={deleting.name} onClose={() => setDeleting(null)} onConfirm={() => (removePerson(deleting.id), notify(`${deleting.name} was removed.`))} />}
    </>
  );
}

/** Leaving moves someone out of the directory and into their stream's community; the stream can be corrected here. */
function MarkLeftModal({ person, onClose, onConfirm }: { person: Person; onClose: () => void; onConfirm: (left: string, stream: Stream) => void }) {
  const [left, setLeft] = useState(() => new Date().toISOString().slice(0, 10));
  const [stream, setStream] = useState<Stream>(person.stream);
  const [error, setError] = useState('');
  return (
    <Modal
      title={`Mark ${person.name} as left`}
      icon="logout"
      onClose={onClose}
      onSubmit={() => {
        if (!left) return setError('Pick their last working day.');
        onConfirm(left, stream);
        onClose();
      }}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel>Mark as left</BtnLabel>
          </button>
        </>
      }
    >
      <p className="p-modal-text">
        They leave the directory and join the {STREAM_LABEL[stream]} community straight away. Their tasks and certificates stay on record under their name; their
        Aadhaar, PAN and other ID documents are deleted automatically {ID_RETENTION_DAYS} days after this date.
      </p>
      <div className="p-form-row">
        <label className="p-field">
          <span>Last working day</span>
          <input type="date" value={left} onChange={(e) => (setLeft(e.target.value), setError(''))} autoFocus />
        </label>
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
      </div>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
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
