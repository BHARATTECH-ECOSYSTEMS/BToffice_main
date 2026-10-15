import { useState } from 'react';
import type { Person, PersonRole } from '../data';
import { useSession } from '../session';
import { usePortal } from '../store';
import { Badge, btnClass, BtnLabel, ConfirmDelete, Empty, Modal, PageHead, SearchField, useNotice } from '../ui';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_LABEL: Record<PersonRole, string> = { admin: 'Admin', employee: 'Employee', intern: 'Intern' };

export function People() {
  const isAdmin = useSession()!.role === 'admin';
  const { people, me, setPersonRole, removePerson, invitePerson } = usePortal();
  const [q, setQ] = useState('');
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState<Person | null>(null);
  const [notice, notify] = useNotice();
  const query = q.trim().toLowerCase();
  const rows = people.filter((p) => !query || [p.id, p.name, p.email, p.role].some((v) => v.toLowerCase().includes(query)));
  // Admins manage employees and interns; other admins (and themselves) are left alone.
  const manageable = (p: Person) => isAdmin && p.role !== 'admin' && p.id !== me.id;

  return (
    <>
      <PageHead title="People" sub={isAdmin ? 'Manage users and roles in your organisation.' : 'Everyone in the organisation.'}>
        {isAdmin && (
          <button type="button" className={btnClass('light')} onClick={() => setInviting(true)}>
            <BtnLabel icon="plus">Add people</BtnLabel>
          </button>
        )}
      </PageHead>
      <section className="p-card" aria-label="People directory">
        <SearchField value={q} onChange={setQ} label="Search people" placeholder="Search by name, email, ID or role" />
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
                  {isAdmin && <th scope="col">Assign role</th>}
                  {isAdmin && (
                    <th scope="col" className="is-end">
                      Delete
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
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
                    <td>{p.team}</td>
                    {isAdmin && (
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
                              <option value="employee">Employee</option>
                              <option value="intern">Intern</option>
                            </select>
                          </label>
                        ) : (
                          <span className="p-dim">{ROLE_LABEL[p.role]}</span>
                        )}
                      </td>
                    )}
                    {isAdmin && (
                      <td className="is-end">
                        {/* shown but disabled for admins and yourself, so it's clear the row can't be deleted rather than missing */}
                        <button
                          type="button"
                          className={btnClass('danger', { small: true })}
                          onClick={() => setDeleting(p)}
                          disabled={!manageable(p)}
                          title={manageable(p) ? undefined : p.id === me.id ? "You can't delete your own account" : 'Admin accounts can\'t be deleted'}
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
          onInvite={(name, email, role) => {
            invitePerson(name, email, role);
            notify(`${name} was added. Invite emails aren't connected yet, so no email was sent.`);
          }}
        />
      )}
      {deleting && <ConfirmDelete what={deleting.name} onClose={() => setDeleting(null)} onConfirm={() => (removePerson(deleting.id), notify(`${deleting.name} was removed.`))} />}
    </>
  );
}

export function InviteModal({ taken, onClose, onInvite }: { taken: (email: string) => boolean; onClose: () => void; onInvite: (name: string, email: string, role: PersonRole) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PersonRole>('employee');
  const [error, setError] = useState('');
  return (
    <Modal
      eyebrow="Invite"
      title="Add New User"
      icon="users"
      onClose={onClose}
      onSubmit={() => {
        const mail = email.trim().toLowerCase();
        if (!name.trim()) return setError('Enter their full name.');
        if (!EMAIL_SHAPE.test(mail)) return setError('Enter a valid email address.');
        if (taken(mail)) return setError('Someone with that email is already in the list.');
        onInvite(name.trim(), mail, role);
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
          <option value="employee">Employee</option>
          <option value="intern">Intern</option>
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
