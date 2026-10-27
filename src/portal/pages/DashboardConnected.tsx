import { useState } from 'react';
import { Link } from 'react-router';
import { PERSON_STATUS_LABEL } from '../data';
import { BUSY_MESSAGE, type ApiError } from '../api';
import type { useCertificates } from '../certificates';
import { canDelete, canEditDetails, inviteChoices, roleChoices, roleLabel, type AccountRole, type DirectoryPerson, type useDirectory } from '../people';
import { useSession } from '../session';
import { formatDate } from '../store';
import { Badge, btnClass, BtnLabel, DELETE_MS, Empty, initials, Modal, SearchField, useListFlip, useNotice, useReel } from '../ui';
import { DeleteAccountModal, InviteModal, saveFailedMessage } from './PeopleConnected';

/**
 * The dashboard's panels with the real sign-in: the team from the backend's directory, with the changes the backend
 * allows (the same rules and windows as People), and the latest certificates. Dashboard.tsx picks these over the
 * sample panels when the backend is connected.
 */

type Directory = ReturnType<typeof useDirectory>;
type Certificates = ReturnType<typeof useCertificates>;

/** A panel whose records didn't load: why, and a way to try again unless the sign-in itself has ended. */
function LoadFailed({ what, error, retry }: { what: string; error: ApiError; retry: () => void }) {
  return (
    <div role="alert">
      <Empty icon="alert" title={`The ${what} didn’t load`}>
        {error.kind === 'signed-out'
          ? 'Your sign-in has ended. Sign out and sign in again.'
          : error.kind === 'forbidden'
            ? `Your account isn’t allowed to see the ${what}.`
            : error.kind === 'busy'
              ? BUSY_MESSAGE
              : 'We couldn’t reach the employee records. Check your connection and try again.'}
      </Empty>
      {error.kind !== 'signed-out' && (
        <button type="button" className={btnClass('light', { small: true })} onClick={retry}>
          <BtnLabel icon="refresh">Try again</BtnLabel>
        </button>
      )}
    </div>
  );
}

export function ConnectedTeamPanel({ directory }: { directory: Directory }) {
  const myEmail = useSession()!.email;
  const { state } = directory;
  const [q, setQ] = useState('');
  const [inviting, setInviting] = useState(false);
  const [managing, setManaging] = useState<DirectoryPerson | null>(null);
  const [deleting, setDeleting] = useState<DirectoryPerson | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, notify] = useNotice();
  // no row to play it on here: the confirm window's own Delete account plays the reel, then the window closes (owner's 2A)
  const [deletingNow, playDelete] = useReel(DELETE_MS);

  const people = state.kind === 'ready' ? state.people : [];
  // as on People: the account role decides what may be changed, and someone not in the directory gets the least access
  const actor: AccountRole = people.find((p) => p.email === myEmail)?.accountRole ?? 'Employee';
  const manages = canEditDetails(actor);
  const invites = inviteChoices(actor);
  const query = q.trim().toLowerCase();
  const rows = people.filter((p) => !query || [p.employeeId ?? '', p.name, p.email, p.roleLabel].some((v) => v.toLowerCase().includes(query)));
  const teamRows = useListFlip<HTMLTableSectionElement>(query);
  // nobody manages their own account here, even where the backend would let them
  const manageable = (p: DirectoryPerson) => p.email !== myEmail && (roleChoices(actor, p.accountRole).length > 0 || canDelete(actor, p.accountRole));

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

  /** A save made from the Manage window: a refusal goes back to the window to show (owner's 4A). */
  const saveHere = async (person: DirectoryPerson, change: () => Promise<void>, done: string) => {
    setSaving(person.id);
    try {
      await change();
      notify(done);
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="p-card" aria-labelledby="team" aria-busy={state.kind === 'loading' || undefined}>
      <div className="p-card-head">
        <div>
          <h2 id="team" className="p-card-title">
            {manages ? 'Manage team' : 'Team'}
          </h2>
          <p className="p-muted">
            {actor === 'Superadmin'
              ? 'Change roles, invite people or delete accounts.'
              : manages
                ? 'You manage sub admins, employees and interns. Admin accounts can’t be managed from here.'
                : 'Everyone in the organisation. Only admins can change roles or accounts.'}
          </p>
        </div>
        {state.kind === 'ready' && invites.length > 0 && (
          <button type="button" className={btnClass('primary')} onClick={() => setInviting(true)}>
            <BtnLabel icon="plus">Add user</BtnLabel>
          </button>
        )}
      </div>
      <SearchField value={q} onChange={setQ} label="Search the team" placeholder="Search by name, email, ID or role" />
      {state.kind === 'loading' ? (
        <p className="p-muted" role="status">
          Loading the team…
        </p>
      ) : state.kind === 'error' ? (
        <LoadFailed what="team" error={state.error} retry={directory.retry} />
      ) : rows.length ? (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
                {manages && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody ref={teamRows}>
              {rows.map((p) => (
                <tr key={p.id} data-flip={p.id}>
                  <td className="is-strong">
                    <span className="p-person">
                      <span className="p-avatar is-soft is-small" aria-hidden="true">
                        {initials(p.name)}
                      </span>
                      {p.name}
                      {p.email === myEmail && <span className="p-you">You</span>}
                    </span>
                  </td>
                  <td>
                    <Badge kind={p.role}>{p.roleLabel}</Badge>
                  </td>
                  <td>{p.email}</td>
                  <td>
                    <Badge kind={p.status}>{PERSON_STATUS_LABEL[p.status]}</Badge>
                  </td>
                  {manages && (
                    <td>
                      <button
                        type="button"
                        className={btnClass('ghost', { small: true })}
                        onClick={() => setManaging(p)}
                        disabled={saving === p.id || !manageable(p)}
                        title={manageable(p) ? undefined : p.email === myEmail ? "You can't manage your own account" : 'Your role can’t manage this account'}
                      >
                        <BtnLabel icon="edit">
                          Manage<span className="sr-only"> {p.name}</span>
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
        <Empty icon="users" title={people.length ? 'Nobody matches that search' : 'Nobody is in the directory yet'} />
      )}
      {notice}
      {inviting && (
        <InviteModal
          roles={invites}
          listed={(email) => people.some((p) => p.email.toLowerCase() === email)}
          invite={directory.invite}
          onClose={() => setInviting(false)}
          onSent={(email) => notify(`Invite sent to ${email}. They’ll appear in the team after their first sign-in.`)}
        />
      )}
      {managing && (
        <ManageAccountModal
          person={managing}
          roles={roleChoices(actor, managing.accountRole)}
          deletable={canDelete(actor, managing.accountRole)}
          onClose={() => setManaging(null)}
          onSave={(role) => saveHere(managing, () => directory.changeRole(managing.id, role), `${managing.name} is now ${roleLabel(role).toLowerCase()}.`)}
          onDelete={() => (setDeleting(managing), setManaging(null))}
        />
      )}
      {deleting && (
        <DeleteAccountModal
          person={deleting}
          going={deletingNow === deleting.id}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            // Enter (the window's form) and the bin both confirm; a second press while it plays does nothing
            if (deletingNow) return;
            const person = deleting;
            await playDelete(person.id, (played) => save(person, () => directory.remove(person.id, played), `${person.name}’s account was deleted.`));
            setDeleting(null);
          }}
        />
      )}
    </section>
  );
}

/** Change someone's role, or go on to delete their account; only what the backend allows the signed-in role is offered. */
function ManageAccountModal({
  person,
  roles,
  deletable,
  onClose,
  onSave,
  onDelete,
}: {
  person: DirectoryPerson;
  roles: AccountRole[];
  deletable: boolean;
  onClose: () => void;
  /** Rejects with an ApiError when the backend refuses: the window stays open and says why. */
  onSave: (role: AccountRole) => Promise<void>;
  onDelete: () => void;
}) {
  const [role, setRole] = useState<AccountRole>(person.accountRole);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  return (
    <Modal
      title={`Manage ${person.name}`}
      icon="edit"
      onClose={onClose}
      onSubmit={async () => {
        if (saving) return;
        setSaving(true);
        setFailure('');
        try {
          if (role !== person.accountRole) await onSave(role);
          onClose();
        } catch (e) {
          // the window stays open with the chosen role, and says why
          setFailure(saveFailedMessage(e as ApiError));
        } finally {
          setSaving(false);
        }
      }}
      footer={
        <>
          {deletable && (
            <button type="button" className={btnClass('ghost')} onClick={onDelete}>
              <BtnLabel>Delete account</BtnLabel>
            </button>
          )}
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')} disabled={!roles.length || saving}>
            <BtnLabel>{saving ? 'Saving…' : 'Save'}</BtnLabel>
          </button>
        </>
      }
    >
      {failure && (
        <p className="p-error" role="alert">
          {failure}
        </p>
      )}
      <p className="p-modal-text">{person.email}</p>
      {roles.length ? (
        <label className="p-field">
          <span>Role</span>
          <select className="p-select" value={role} onChange={(e) => setRole(e.target.value as AccountRole)} autoFocus>
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="p-field-hint">Your role can’t change {person.name}’s role.</p>
      )}
    </Modal>
  );
}

/** The latest certificates; issuing and the full history are on Certificates. Only shown to admins and superadmins. */
export function ConnectedCertificatesPanel({ certificates }: { certificates: Certificates }) {
  const { state } = certificates;
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const list = state.kind === 'ready' ? state.certificates : [];
  const rows = list
    .filter((c) => !query || c.title.toLowerCase().includes(query) || c.recipient?.name.toLowerCase().includes(query))
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .slice(0, 5);
  const certRows = useListFlip<HTMLTableSectionElement>(query);
  return (
    <section className="p-card" aria-labelledby="cert-mgmt" aria-busy={state.kind === 'loading' || undefined}>
      <div className="p-card-head">
        <div>
          <h2 id="cert-mgmt" className="p-card-title">
            Certificate management
          </h2>
          <p className="p-muted">The five most recent are shown; issuing and the full history are on Certificates.</p>
        </div>
        <Link to="/portal/certificates" className={btnClass('primary')}>
          <BtnLabel icon="plus">Generate certificate</BtnLabel>
        </Link>
      </div>
      <SearchField value={q} onChange={setQ} label="Search certificates" placeholder="Search by type or person" />
      {state.kind === 'loading' ? (
        <p className="p-muted" role="status">
          Loading the certificates…
        </p>
      ) : state.kind === 'error' ? (
        <LoadFailed what="certificates" error={state.error} retry={certificates.retry} />
      ) : rows.length ? (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th scope="col">Certificate</th>
                <th scope="col">Issued to</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody ref={certRows}>
              {rows.map((c) => (
                <tr key={c.id} data-flip={c.id}>
                  <td className="is-strong">{c.title}</td>
                  <td>{c.recipient?.name ?? 'Removed user'}</td>
                  <td>{c.issuedAt ? formatDate(c.issuedAt) : <span className="p-dim">-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="award" title={list.length ? 'No certificates found' : 'No certificates issued yet'}>
          {list.length ? 'Try clearing the search.' : 'Generate one from Certificates.'}
        </Empty>
      )}
    </section>
  );
}
