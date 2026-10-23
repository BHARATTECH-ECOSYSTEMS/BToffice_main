import { useState } from 'react';
import { EMAIL_SHAPE, ROLE_LABEL, STREAM_LABEL, STREAMS, type PersonRole, type Stream } from '../data';
import type { ApiError } from '../api';
import {
  canDelete,
  canEditDetails,
  canEditPerson,
  cleanName,
  inviteChoices,
  JOIN_EARLIEST,
  joinDateProblem,
  latestJoinDate,
  NAME_MAX,
  NAME_MIN,
  inviteEmailFailed,
  roleChoices,
  roleLabel,
  useDirectory,
  type AccountRole,
  type DirectoryPerson,
} from '../people';
import { useSession } from '../session';
import { localDay } from '../eoffice';
import { Badge, btnClass, BtnLabel, Empty, Modal, PageHead, SearchField, useListFlip, useNotice } from '../ui';

/**
 * The People page with the real sign-in: the backend's directory, and for admins and superadmins the changes and
 * invites the backend allows them (src/portal/people.ts). Sub admins, employees and interns see the list only.
 * "Mark as left" comes with the Community feature, so it isn't offered here yet.
 */

const SAVE_FAILED: Record<ApiError['kind'], string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'The employee records didn’t allow that change for your role.',
  'not-found': 'That person isn’t in the employee records any more. The list has been refreshed.',
  conflict: 'That change clashes with another account.',
  'bad-request': 'That change wasn’t accepted.',
  unavailable: 'We couldn’t reach the employee records, so nothing was changed. Try again in a moment.',
};
/** What to tell someone when a change was refused; the backend's own words for refused input are more useful. */
export const saveFailedMessage = (e: ApiError) => (e.kind === 'bad-request' && e.message !== e.kind ? e.message : SAVE_FAILED[e.kind]);

const LOAD_FAILED: Record<ApiError['kind'], string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again to see the directory.',
  forbidden: 'Your account isn’t allowed to see the directory.',
  'not-found': 'The directory wasn’t found on the server.',
  conflict: 'We couldn’t load the directory. Please try again.',
  'bad-request': 'We couldn’t load the directory. Please try again.',
  unavailable: 'We couldn’t reach the employee records. Check your connection and try again.',
};

const FILTERS: (PersonRole | 'all')[] = ['all', 'admin', 'subadmin', 'employee', 'intern'];

export function ConnectedPeople() {
  const myEmail = useSession()!.email;
  const directory = useDirectory();
  const { state } = directory;
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<PersonRole | 'all'>('all');
  const [editing, setEditing] = useState<DirectoryPerson | null>(null);
  const [deleting, setDeleting] = useState<DirectoryPerson | null>(null);
  const [inviting, setInviting] = useState(false);
  // the person whose change is being saved; their row's controls wait for it
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, notify] = useNotice();

  const people = state.kind === 'ready' ? state.people : [];
  // the account role decides what may be changed; someone not found in the directory gets the least access
  const actor: AccountRole = people.find((p) => p.email === myEmail)?.accountRole ?? 'Employee';
  const manages = canEditDetails(actor);
  const query = q.trim().toLowerCase();
  const rows = people.filter(
    (p) => (roleFilter === 'all' || p.role === roleFilter) && (!query || [p.employeeId ?? '', p.name, p.email, p.roleLabel].some((v) => v.toLowerCase().includes(query))),
  );
  const listRef = useListFlip<HTMLTableSectionElement>(`${roleFilter}|${query}`);

  const save = async (person: DirectoryPerson, change: () => Promise<void>, done: string) => {
    setSaving(person.id);
    try {
      await change();
      notify(done);
    } catch (error) {
      notify(saveFailedMessage(error as ApiError));
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <PageHead title="People" sub={manages ? 'Manage users and roles in your organisation.' : 'Everyone in the organisation.'}>
        {state.kind === 'ready' && inviteChoices(actor).length > 0 && (
          <button type="button" className={btnClass('light')} onClick={() => setInviting(true)}>
            <BtnLabel icon="plus">Add people</BtnLabel>
          </button>
        )}
      </PageHead>
      <section className="p-card" aria-label="People directory" aria-busy={state.kind === 'loading' || undefined}>
        <div className="p-toolbar is-split">
          <div className="p-chips" role="group" aria-label="Show role">
            {FILTERS.map((r) => (
              <button key={r} type="button" aria-pressed={roleFilter === r} onClick={() => setRoleFilter(r)}>
                {r === 'all' ? 'All' : ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <SearchField value={q} onChange={setQ} label="Search people" placeholder="Search by name, email, ID or role" />
        </div>
        {state.kind === 'loading' ? (
          <p className="p-muted" role="status">
            Loading the directory…
          </p>
        ) : state.kind === 'error' ? (
          <div role="alert">
            <Empty icon="alert" title="The directory didn’t load">
              {LOAD_FAILED[state.error.kind]}
            </Empty>
            {state.error.kind !== 'signed-out' && (
              <button type="button" className={btnClass('light', { small: true })} onClick={directory.retry}>
                <BtnLabel icon="refresh">Try again</BtnLabel>
              </button>
            )}
          </div>
        ) : rows.length ? (
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
                  {manages && <th scope="col">Assign role</th>}
                  {manages && (
                    <th scope="col" className="is-end">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody ref={listRef}>
                {rows.map((p) => {
                  const self = p.email === myEmail;
                  // nobody changes their own role or deletes themselves here, even where the backend would let them
                  const choices = self ? [] : roleChoices(actor, p.accountRole);
                  const deletable = !self && canDelete(actor, p.accountRole);
                  const editable = canEditPerson(actor, p.accountRole);
                  const busy = saving === p.id;
                  return (
                    <tr key={p.id} data-flip={p.id}>
                      <td className="is-mono">{p.employeeId ?? <span className="p-dim">-</span>}</td>
                      <td className="is-strong">
                        {p.name}
                        {self && <span className="p-you">You</span>}
                      </td>
                      <td>{p.email}</td>
                      <td>
                        <Badge kind={p.role}>{p.roleLabel}</Badge>
                        {p.status === 'inactive' && <Badge kind="inactive">Inactive</Badge>}
                      </td>
                      <td>
                        {p.phone || (
                          <span className="p-dim" title="Not set">
                            -
                          </span>
                        )}
                      </td>
                      <td>
                        {p.team || p.stream ? (
                          [p.team, p.stream && STREAM_LABEL[p.stream]].filter(Boolean).join(' · ')
                        ) : (
                          <span className="p-dim">Not set yet</span>
                        )}
                      </td>
                      {manages && (
                        <td>
                          {choices.length ? (
                            <label>
                              <span className="sr-only">Role for {p.name}</span>
                              <select
                                className="p-select"
                                value={p.accountRole}
                                disabled={busy}
                                onChange={(e) => {
                                  const next = e.target.value as AccountRole;
                                  void save(p, () => directory.changeRole(p.id, next), `${p.name} is now ${roleLabel(next).toLowerCase()}.`);
                                }}
                              >
                                {choices.map((r) => (
                                  <option key={r} value={r}>
                                    {roleLabel(r)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : (
                            <span className="p-dim">{p.roleLabel}</span>
                          )}
                        </td>
                      )}
                      {manages && (
                        <td className="is-end p-row-actions">
                          <button
                            type="button"
                            className={btnClass('ghost', { small: true })}
                            disabled={busy || !editable}
                            title={editable ? undefined : 'Your role can’t change this person’s details'}
                            onClick={() => setEditing(p)}
                          >
                            <BtnLabel icon="edit">
                              Details<span className="sr-only"> for {p.name}</span>
                            </BtnLabel>
                          </button>
                          <button
                            type="button"
                            className={btnClass('ghost', { small: true })}
                            disabled={busy || !deletable}
                            title={deletable ? undefined : self ? "You can't delete your own account" : 'Your role can’t delete this account'}
                            onClick={() => setDeleting(p)}
                          >
                            <BtnLabel>
                              Delete<span className="sr-only"> {p.name}</span>
                            </BtnLabel>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="users" title={people.length ? 'Nobody matches that search' : 'Nobody is in the directory yet'} />
        )}
        {notice}
      </section>

      {inviting && (
        <InviteModal
          roles={inviteChoices(actor)}
          listed={(email) => people.some((p) => p.email.toLowerCase() === email)}
          invite={directory.invite}
          onClose={() => setInviting(false)}
          onSent={(email) => notify(`Invite sent to ${email}. They’ll appear in the list after their first sign-in.`)}
        />
      )}
      {editing && (
        <DetailsModal
          person={editing}
          onClose={() => setEditing(null)}
          onSave={(details) => void save(editing, () => directory.saveDetails(editing.id, details), `${details.fullName ?? editing.name}’s details were saved.`)}
        />
      )}
      {deleting && (
        <DeleteAccountModal
          person={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const person = deleting;
            setDeleting(null);
            void save(person, () => directory.remove(person.id), `${person.name}’s account was deleted.`);
          }}
        />
      )}
    </>
  );
}

/** Asks before deleting an account, since the login goes at once and the portal can't bring it back. */
export function DeleteAccountModal({ person, onClose, onConfirm }: { person: DirectoryPerson; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal
      title={`Delete ${person.name}’s account?`}
      icon="alert"
      onClose={onClose}
      onSubmit={onConfirm}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel>Delete account</BtnLabel>
          </button>
        </>
      }
    >
      <p>
        {person.name} ({person.email}) won’t be able to sign in any more. Their login is removed straight away, and this can’t be undone from the
        portal.
      </p>
    </Modal>
  );
}

const INVITE_FAILED: Record<ApiError['kind'], string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then send the invite.',
  forbidden: 'Your role can’t invite people with that role.',
  'not-found': 'The invite service wasn’t found on the server.',
  conflict: 'An account with that email or username already exists.',
  'bad-request': 'Enter their name and a valid email address.',
  unavailable: 'We couldn’t reach the employee records, so no invite was sent. Try again in a moment.',
};

/**
 * Invites someone: the backend makes their login with a temporary password and emails it. The window stays open
 * while it sends, and keeps what was typed if something goes wrong.
 */
export function InviteModal({
  roles,
  listed,
  invite,
  onClose,
  onSent,
}: {
  roles: AccountRole[];
  listed: (email: string) => boolean;
  invite: (person: { name: string; email: string; role: AccountRole }) => Promise<void>;
  onClose: () => void;
  onSent: (email: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AccountRole>(roles.includes('Employee') ? 'Employee' : roles[0]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  // the login exists but the email failed: sending again is safe, the backend just makes a fresh temporary password
  const [emailFailed, setEmailFailed] = useState(false);

  const send = async () => {
    if (sending) return;
    const mail = email.trim().toLowerCase();
    if (!name.trim()) return setError('Enter their full name.');
    if (!EMAIL_SHAPE.test(mail)) return setError('Enter a valid email address.');
    // inviting someone who already has an account would reset their password to a temporary one and lock them out
    if (listed(mail)) return setError('Someone with that email is already in the list.');
    setError('');
    setSending(true);
    try {
      await invite({ name: name.trim(), email: mail, role });
      onSent(mail);
      onClose();
    } catch (e) {
      const failure = e as ApiError;
      if (inviteEmailFailed(failure)) {
        setEmailFailed(true);
        setError('Their login was made, but the invite email couldn’t be sent. Send it again; they’ll get a new temporary password.');
      } else {
        setError(INVITE_FAILED[failure.kind]);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      title="Add New User"
      icon="users"
      onClose={onClose}
      onSubmit={() => void send()}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')} disabled={sending}>
            <BtnLabel>{sending ? 'Sending…' : emailFailed ? 'Send again' : 'Send Invite'}</BtnLabel>
          </button>
        </>
      }
    >
      <label className="p-field">
        <span>Name</span>
        <input value={name} disabled={sending || emailFailed} onChange={(e) => (setName(e.target.value), setError(''))} placeholder="Full name" autoFocus />
      </label>
      <label className="p-field">
        <span>Email</span>
        <input type="email" value={email} disabled={sending || emailFailed} onChange={(e) => (setEmail(e.target.value), setError(''))} placeholder="name@company.com" />
      </label>
      <label className="p-field">
        <span>Role</span>
        <select className="p-select" value={role} disabled={sending || emailFailed} onChange={(e) => setRole(e.target.value as AccountRole)}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
      </label>
      <p className="p-field-hint">They get an email with a temporary password. Set their stream and team with Details after their first sign-in.</p>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

const TEAM_MAX = 80;

/**
 * Name, stream, team and join date. The name is sent only when it changed, and the backend also changes it in
 * Keycloak; the join date too, so the company app's records are never touched by a save that didn't change it.
 */
function DetailsModal({
  person,
  onClose,
  onSave,
}: {
  person: DirectoryPerson;
  onClose: () => void;
  onSave: (details: { fullName?: string; stream: Stream | null; team: string; joinedOn?: string | null }) => void;
}) {
  const [name, setName] = useState(person.name);
  const [nameError, setNameError] = useState('');
  const [stream, setStream] = useState<Stream | ''>(person.stream ?? '');
  const [team, setTeam] = useState(person.team ?? '');
  const [joined, setJoined] = useState(person.joined ?? '');
  const [joinedError, setJoinedError] = useState('');
  const today = localDay();
  return (
    <Modal
      title={`${person.name}’s details`}
      icon="users"
      onClose={onClose}
      onSubmit={() => {
        const fullName = cleanName(name);
        if (!fullName) return setNameError(`Enter a name of ${NAME_MIN} to ${NAME_MAX} characters.`);
        const problem = joinDateProblem(joined, today);
        if (problem) return setJoinedError(problem);
        onSave({
          ...(fullName !== person.name && { fullName }),
          stream: stream || null,
          team: team.trim(),
          ...(joined !== (person.joined ?? '') && { joinedOn: joined || null }),
        });
        onClose();
      }}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel>Save</BtnLabel>
          </button>
        </>
      }
    >
      <label className="p-field">
        <span>Name</span>
        <input
          value={name}
          maxLength={NAME_MAX + 20}
          onChange={(e) => (setName(e.target.value), setNameError(''))}
          autoComplete="off"
          aria-invalid={!!nameError || undefined}
          aria-describedby={nameError ? 'details-name-err' : undefined}
          autoFocus
        />
        {nameError && (
          <span id="details-name-err" className="p-error" role="alert">
            {nameError}
          </span>
        )}
      </label>
      <label className="p-field">
        <span>Stream</span>
        <select className="p-select" value={stream} onChange={(e) => setStream(e.target.value as Stream | '')}>
          <option value="">Not set</option>
          {STREAMS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="p-field">
        <span>Team</span>
        <input value={team} maxLength={TEAM_MAX} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. Platform" />
      </label>
      <label className="p-field">
        <span>Joined (first working day)</span>
        <input
          type="date"
          value={joined}
          min={JOIN_EARLIEST}
          max={latestJoinDate(today)}
          onChange={(e) => (setJoined(e.target.value), setJoinedError(''))}
          aria-invalid={!!joinedError || undefined}
          aria-describedby={joinedError ? 'details-joined-err' : 'details-joined-hint'}
        />
        {joinedError ? (
          <span id="details-joined-err" className="p-error" role="alert">
            {joinedError}
          </span>
        ) : (
          <span id="details-joined-hint" className="p-field-hint">
            Shown on their ID card and as work anniversaries on everyone’s calendar. Clear it to remove it.
          </span>
        )}
      </label>
    </Modal>
  );
}
