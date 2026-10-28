import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { EMAIL_SHAPE, ID_RETENTION_DAYS, ROLE_LABEL, STREAM_LABEL, STREAMS, type PersonRole, type Stream } from '../data';
import { api, ApiError, BUSY_MESSAGE, failedText } from '../api';
import {
  accountFailedMessage,
  blockProblem,
  canDelete,
  canEditDetails,
  canMarkLeft,
  canEditPerson,
  cleanName,
  inviteChoices,
  JOIN_EARLIEST,
  joinDateProblem,
  latestJoinDate,
  NAME_MAX,
  NAME_MIN,
  inviteEmailFailed,
  pendingInviteFailedMessage,
  resetLinkProblem,
  roleBadge,
  roleChoices,
  roleLabel,
  useDirectory,
  usePendingInvites,
  type AccountRole,
  type DirectoryPerson,
  type PendingInvite,
} from '../people';
import { personPhotoCalls, personPhotoProblem, PHOTO_MAX_MB, PHOTO_TYPES, photoFileProblem, toJpeg, toSquare } from '../photos';
import type { PhotoSource } from '../profile';
import { formatDate } from '../store';
import { useSession } from '../session';
import { localDay } from '../eoffice';
import { Badge, btnClass, BtnLabel, DELETE_MS, DeleteButton, Empty, initials, Modal, PageHead, SearchField, useListFlip, useNotice, useReel } from '../ui';
import { WAVE_MS, WaveButton } from './People';
import { communityFailedMessage } from '../community';

/**
 * The People page with the real sign-in: the backend's directory, and for admins and superadmins the changes and
 * invites the backend allows them (src/portal/people.ts), including "Mark as left", which moves someone to their
 * stream's community. Sub admins, employees and interns see the list only.
 */

const SAVE_FAILED: Record<ApiError['kind'], string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'The employee records didn’t allow that change for your role.',
  'not-found': 'That person isn’t in the employee records any more. The list has been refreshed.',
  conflict: 'That change clashes with another account.',
  'bad-request': 'That change wasn’t accepted.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the employee records, so nothing was changed. Try again in a moment.',
};
/** What to tell someone when a change was refused; the backend's own words for refused input are more useful. */
export const saveFailedMessage = (e: ApiError) => (e.kind === 'bad-request' && e.message !== e.kind ? e.message : failedText(e, SAVE_FAILED));

const LOAD_FAILED: Record<ApiError['kind'], string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again to see the directory.',
  forbidden: 'Your account isn’t allowed to see the directory.',
  'not-found': 'The directory wasn’t found on the server.',
  conflict: 'We couldn’t load the directory. Please try again.',
  'bad-request': 'We couldn’t load the directory. Please try again.',
  busy: BUSY_MESSAGE,
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
  const [blocking, setBlocking] = useState<DirectoryPerson | null>(null);
  const [resetting, setResetting] = useState<DirectoryPerson | null>(null);
  const [leaving, setLeaving] = useState<DirectoryPerson | null>(null);
  const [inviting, setInviting] = useState(false);
  // the people whose changes are being saved; each row's controls wait for its own
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());
  const startSaving = (id: string) => setSaving((s) => new Set(s).add(id));
  const doneSaving = (id: string) =>
    setSaving((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  const [notice, notify] = useNotice();
  // the row whose Delete or Mark as left is playing its reel while the backend works (owner's 1A 4A, 2026-10-27)
  const [deletingNow, playDelete] = useReel(DELETE_MS);
  const [leavingNow, playLeave] = useReel(WAVE_MS);

  const people = state.kind === 'ready' ? state.people : [];
  // the account role decides what may be changed; someone not found in the directory gets the least access
  const actor: AccountRole = people.find((p) => p.email === myEmail)?.accountRole ?? 'Employee';
  const pending = usePendingInvites(state.kind === 'ready' && inviteChoices(actor).length > 0);
  const manages = canEditDetails(actor);
  const query = q.trim().toLowerCase();
  const rows = people.filter(
    (p) => (roleFilter === 'all' || p.role === roleFilter) && (!query || [p.employeeId ?? '', p.name, p.email, p.roleLabel].some((v) => v.toLowerCase().includes(query))),
  );
  const listRef = useListFlip<HTMLTableSectionElement>(`${roleFilter}|${query}`);

  const save = async (person: DirectoryPerson, change: () => Promise<void>, done: string, failed = saveFailedMessage) => {
    startSaving(person.id);
    try {
      await change();
      notify(done);
    } catch (error) {
      notify(failed(error as ApiError));
    } finally {
      doneSaving(person.id);
    }
  };

  /** A save made from a window: the row waits for it, and a refusal goes back to the window to show (owner's 4A). */
  const saveHere = async (person: DirectoryPerson, change: () => Promise<void>, done: string) => {
    startSaving(person.id);
    try {
      await change();
      notify(done);
    } finally {
      doneSaving(person.id);
    }
  };

  // Block / Unblock also switch their sign-in; the backend's refusals say what to do next, so they're shown as sent
  const setBlocked = (person: DirectoryPerson, blocked: boolean) =>
    void save(
      person,
      () => directory.setBlocked(person.id, blocked),
      blocked ? `${person.name} is blocked and signed out everywhere.` : `${person.name} is unblocked and can sign in again.`,
      accountFailedMessage,
    );

  const sendResetLink = async (person: DirectoryPerson) => {
    startSaving(person.id);
    try {
      notify(await directory.sendResetLink(person.id));
    } catch (error) {
      notify(accountFailedMessage(error as ApiError));
    } finally {
      doneSaving(person.id);
    }
  };

  const markLeft = async (person: DirectoryPerson, played?: Promise<unknown>) => {
    startSaving(person.id);
    try {
      await directory.markLeft(person.id, played);
      notify(`${person.name} has left and joined the ${STREAM_LABEL[person.stream!]} community. Their sign-in is switched off.`);
    } catch (error) {
      notify(communityFailedMessage(error as ApiError));
    } finally {
      doneSaving(person.id);
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
              {failedText(state.error, LOAD_FAILED)}
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
                  const cantLeave = canMarkLeft(actor, p, self);
                  const blocked = p.status === 'inactive';
                  const busy = saving.has(p.id);
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
                        {blocked && <Badge kind="inactive">Blocked</Badge>}
                      </td>
                      <td className="is-nowrap">
                        {p.phone || (
                          <span className="p-dim" title="Not set">
                            -
                          </span>
                        )}
                        {p.phone && p.phoneHidden && <span className="p-phone-hidden">Hidden from colleagues</span>}
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
                          <WaveButton
                            srText={p.name}
                            disabled={leavingNow !== p.id && (busy || !!cantLeave)}
                            title={cantLeave || undefined}
                            going={leavingNow === p.id}
                            onAsk={() => setLeaving(p)}
                          />
                          <DeleteButton
                            small
                            srText={p.name}
                            disabled={deletingNow !== p.id && (busy || !deletable)}
                            title={deletable ? undefined : self ? "You can't delete your own account" : 'Your role can’t delete this account'}
                            going={deletingNow === p.id}
                            onAsk={() => setDeleting(p)}
                          />
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
      {state.kind === 'ready' && inviteChoices(actor).length > 0 && <PendingInvites pending={pending} invite={directory.invite} notify={notify} />}

      {inviting && (
        <InviteModal
          roles={inviteChoices(actor)}
          listed={(email) => people.some((p) => p.email.toLowerCase() === email)}
          invite={directory.invite}
          onClose={() => {
            setInviting(false);
            // a new invite (or one whose email failed) shows up under Pending invites
            void pending.reload();
          }}
          onSent={(email) => notify(`Invite sent to ${email}. They’ll appear in the list after their first sign-in.`)}
        />
      )}
      {editing && (
        <DetailsModal
          person={editing}
          photoProblem={personPhotoProblem(actor, editing.accountRole, editing.email === myEmail)}
          access={{
            blockProblem: blockProblem(actor, editing, editing.email === myEmail),
            resetProblem: resetLinkProblem(actor, editing, editing.email === myEmail),
            onBlock: () => (setEditing(null), setBlocking(editing)),
            onUnblock: () => (setEditing(null), setBlocked(editing, false)),
            onResetLink: () => (setEditing(null), setResetting(editing)),
          }}
          onClose={() => setEditing(null)}
          onSave={(details) => saveHere(editing, () => directory.saveDetails(editing.id, details), `${details.fullName ?? editing.name}’s details were saved.`)}
        />
      )}
      {deleting && (
        <DeleteAccountModal
          person={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const person = deleting;
            setDeleting(null);
            void playDelete(person.id, (played) => save(person, () => directory.remove(person.id, played), `${person.name}’s account was deleted.`));
          }}
        />
      )}
      {blocking && (
        <BlockAccountModal
          person={blocking}
          onClose={() => setBlocking(null)}
          onConfirm={() => {
            const person = blocking;
            setBlocking(null);
            setBlocked(person, true);
          }}
        />
      )}
      {leaving && (
        <LeaveModal
          person={leaving}
          onClose={() => setLeaving(null)}
          onConfirm={() => {
            const person = leaving;
            setLeaving(null);
            void playLeave(person.id, (played) => markLeft(person, played));
          }}
        />
      )}
      {resetting && (
        <ResetLinkModal
          person={resetting}
          onClose={() => setResetting(null)}
          onConfirm={() => {
            const person = resetting;
            setResetting(null);
            void sendResetLink(person);
          }}
        />
      )}
    </>
  );
}

/**
 * The invites nobody has accepted yet (admins and superadmins, for the roles they may invite): sending one again emails
 * a new temporary password; cancelling deletes the unused login, so the emailed password stops working. Someone
 * appears in the directory above at their first sign-in, and leaves this list then.
 */
function PendingInvites({
  pending,
  invite,
  notify,
}: {
  pending: ReturnType<typeof usePendingInvites>;
  invite: (person: { name: string; email: string; role: AccountRole }) => Promise<void>;
  notify: (text: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<PendingInvite | null>(null);
  const [resending, setResending] = useState<PendingInvite | null>(null);
  const { state } = pending;

  const sendAgain = async (p: PendingInvite) => {
    setResending(null);
    setBusy(p.id);
    try {
      await invite({ name: p.name, email: p.email, role: p.role });
      notify(`Invite sent again to ${p.email}, with a new temporary password.`);
    } catch (error) {
      notify(inviteEmailFailed(error as ApiError) ? 'The invite email couldn’t be sent. Try again in a moment.' : failedText(error as ApiError, INVITE_FAILED));
    } finally {
      setBusy(null);
      void pending.reload();
    }
  };
  const cancel = async (p: PendingInvite) => {
    setCancelling(null);
    setBusy(p.id);
    try {
      await pending.cancel(p.id);
      notify(`The invite to ${p.email} was cancelled. The password we emailed them no longer works.`);
    } catch (error) {
      notify(pendingInviteFailedMessage(error as ApiError));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="p-card" aria-labelledby="pending-invites" aria-busy={state.kind === 'loading' || undefined}>
      <div className="p-card-head">
        <h2 id="pending-invites" className="p-card-title">
          Pending invites
        </h2>
      </div>
      {state.kind === 'loading' || state.kind === 'off' ? (
        <p className="p-muted" role="status">
          Loading the invites…
        </p>
      ) : state.kind === 'error' ? (
        <div role="alert">
          <p className="p-muted">{pendingInviteFailedMessage(state.error)}</p>
          <button type="button" className={btnClass('light', { small: true })} onClick={() => void pending.reload()}>
            <BtnLabel icon="refresh">Try again</BtnLabel>
          </button>
        </div>
      ) : state.invites.length ? (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Invited</th>
                <th scope="col" className="is-end">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {state.invites.map((p) => (
                <tr key={p.id}>
                  <td className="is-strong">{p.name}</td>
                  <td>{p.email}</td>
                  <td>
                    <Badge kind={roleBadge(p.role)}>{roleLabel(p.role)}</Badge>
                  </td>
                  <td>
                    {p.invitedAt ? formatDate(localDay(p.invitedAt)) : <span className="p-dim">-</span>}
                    {p.expired && <span className="p-due-flag is-late">Expired: send again</span>}
                  </td>
                  <td className="is-end p-row-actions">
                    <button type="button" className={btnClass('ghost', { small: true })} disabled={busy === p.id} onClick={() => setResending(p)}>
                      <BtnLabel icon="refresh">
                        Send again<span className="sr-only"> to {p.email}</span>
                      </BtnLabel>
                    </button>
                    <button type="button" className={btnClass('ghost', { small: true })} disabled={busy === p.id} onClick={() => setCancelling(p)}>
                      <BtnLabel>
                        Cancel invite<span className="sr-only"> to {p.email}</span>
                      </BtnLabel>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-muted">Nobody is waiting to accept an invite.</p>
      )}
      {resending && (
        <Modal
          title={`Send ${resending.name} a new invite?`}
          icon="refresh"
          onClose={() => setResending(null)}
          onSubmit={() => void sendAgain(resending)}
          footer={
            <>
              <button type="button" className={btnClass('ghost')} onClick={() => setResending(null)}>
                <BtnLabel>Cancel</BtnLabel>
              </button>
              <button type="submit" className={btnClass('primary')}>
                <BtnLabel icon="refresh">Send again</BtnLabel>
              </button>
            </>
          }
        >
          <p>
            We’ll email {resending.email} a new temporary password, and their old temporary password stops working. The invite lasts 12 hours from now.
          </p>
        </Modal>
      )}
      {cancelling && (
        <Modal
          title={`Cancel the invite to ${cancelling.name}?`}
          icon="alert"
          onClose={() => setCancelling(null)}
          onSubmit={() => void cancel(cancelling)}
          footer={
            <>
              <button type="button" className={btnClass('ghost')} onClick={() => setCancelling(null)}>
                <BtnLabel>Keep it</BtnLabel>
              </button>
              <button type="submit" className={btnClass('primary')}>
                <BtnLabel>Cancel invite</BtnLabel>
              </button>
            </>
          }
        >
          <p>
            The temporary password we emailed to {cancelling.email} stops working, and their unused login is removed. You can invite them again later.
          </p>
        </Modal>
      )}
    </section>
  );
}

/**
 * Asks before deleting an account, since the login goes at once and the portal can't bring it back. Its own button is
 * the bin: on People the window closes and the row's button plays it; where there's no row (the Dashboard), `going`
 * plays it here while the backend deletes, and the window closes after (owner's 2A, 2026-10-27).
 */
export function DeleteAccountModal({ person, going, onClose, onConfirm }: { person: DirectoryPerson; going?: boolean; onClose: () => void; onConfirm: () => void }) {
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
          {going === undefined ? (
            <button type="submit" className={btnClass('primary')}>
              <BtnLabel>Delete account</BtnLabel>
            </button>
          ) : (
            <DeleteButton label="Delete account" going={going} onAsk={onConfirm} />
          )}
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

/** Asks before blocking, since it signs them out of everything at once. */
function BlockAccountModal({ person, onClose, onConfirm }: { person: DirectoryPerson; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal
      title={`Block ${person.name}?`}
      icon="alert"
      onClose={onClose}
      onSubmit={onConfirm}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel>Block account</BtnLabel>
          </button>
        </>
      }
    >
      <p>
        {person.name} ({person.email}) is signed out everywhere now and can’t sign in to the portal, or to any other app that uses the company sign-in,
        until you press Unblock. Their records, tasks and certificates stay as they are.
      </p>
    </Modal>
  );
}

/** Asks before marking someone as left, since their sign-in is switched off at once. */
function LeaveModal({ person, onClose, onConfirm }: { person: DirectoryPerson; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal
      title={`Mark ${person.name} as left?`}
      icon="alert"
      onClose={onClose}
      onSubmit={onConfirm}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel icon="logout">Mark as left</BtnLabel>
          </button>
        </>
      }
    >
      <p>
        {person.name} moves to the {STREAM_LABEL[person.stream!]} community today and their sign-in is switched off now. Their ID documents are deleted{' '}
        {ID_RETENTION_DAYS} days later. An admin can bring them back from the community.
      </p>
    </Modal>
  );
}

/** Asks before emailing someone a reset link, so a mis-click doesn't land in their inbox. */
function ResetLinkModal({ person, onClose, onConfirm }: { person: DirectoryPerson; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal
      title={`Send ${person.name} a reset link?`}
      icon="key"
      onClose={onClose}
      onSubmit={onConfirm}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel>Send reset link</BtnLabel>
          </button>
        </>
      }
    >
      <p>
        We’ll email {person.email} a link to choose a new password. It works once, for 30 minutes, and replaces any earlier link. Their current
        password keeps working until they use it.
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
  busy: BUSY_MESSAGE,
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
        // someone who left comes back through the Community, and the backend says so
        setError(failure.kind === 'conflict' && (failure.details as { code?: unknown } | undefined)?.code === 'left' ? failure.message : failedText(failure, INVITE_FAILED));
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
/** Block / Unblock and "Send reset link" for this person, with why each can't be used ('' when it can). */
interface SignInAccess {
  blockProblem: string;
  resetProblem: string;
  onBlock: () => void;
  onUnblock: () => void;
  onResetLink: () => void;
}

function DetailsModal({
  person,
  photoProblem,
  access,
  onClose,
  onSave,
}: {
  person: DirectoryPerson;
  photoProblem: string;
  access: SignInAccess;
  onClose: () => void;
  /** Rejects with an ApiError when the backend refuses: the window stays open and says why. */
  onSave: (details: { fullName?: string; stream: Stream | null; team: string; joinedOn?: string | null }) => Promise<void>;
}) {
  const [name, setName] = useState(person.name);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [nameError, setNameError] = useState('');
  const [stream, setStream] = useState<Stream | ''>(person.stream ?? '');
  const [team, setTeam] = useState(person.team ?? '');
  const [joined, setJoined] = useState(person.joined ?? '');
  const [joinedError, setJoinedError] = useState('');
  // the photo field's remove, waiting for "Remove photo"; its confirm is drawn after this window's form (see below)
  const [removingPhoto, setRemovingPhoto] = useState<(() => void) | null>(null);
  const today = localDay();
  return (
    <>
      <Modal
        title={`${person.name}’s details`}
        icon="users"
        onClose={onClose}
        onSubmit={async () => {
          if (saving) return;
          const fullName = cleanName(name);
          if (!fullName) return setNameError(`Enter a name of ${NAME_MIN} to ${NAME_MAX} characters.`);
          const problem = joinDateProblem(joined, today);
          if (problem) return setJoinedError(problem);
          setSaving(true);
          setFailure('');
          try {
            await onSave({
              ...(fullName !== person.name && { fullName }),
              stream: stream || null,
              team: team.trim(),
              ...(joined !== (person.joined ?? '') && { joinedOn: joined || null }),
            });
            onClose();
          } catch (e) {
            // the window stays open with what was typed, and says why
            setFailure(saveFailedMessage(e as ApiError));
          } finally {
            setSaving(false);
          }
        }}
        footer={
          <>
            <button type="button" className={btnClass('ghost')} onClick={onClose}>
              <BtnLabel>Cancel</BtnLabel>
            </button>
            <button type="submit" className={btnClass('primary')} disabled={saving}>
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
        <PhotoField person={person} problem={photoProblem} onAskRemove={(remove) => setRemovingPhoto(() => remove)} />
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
        <div className="p-field" role="group" aria-labelledby="details-signin">
          <span id="details-signin">Sign-in</span>
          <div className="p-row-actions">
            <button
              type="button"
              className={btnClass('ghost', { small: true })}
              disabled={!!access.blockProblem}
              title={access.blockProblem || undefined}
              onClick={person.status === 'inactive' ? access.onUnblock : access.onBlock}
            >
              <BtnLabel icon="lock">{person.status === 'inactive' ? 'Unblock' : 'Block account'}</BtnLabel>
            </button>
            <button type="button" className={btnClass('ghost', { small: true })} disabled={!!access.resetProblem} title={access.resetProblem || undefined} onClick={access.onResetLink}>
              <BtnLabel icon="key">Send reset link</BtnLabel>
            </button>
          </div>
          <span className="p-field-hint">
            {person.status === 'inactive'
              ? 'Blocked: they can’t sign in to the portal or any app that uses the company sign-in until you unblock them.'
              : 'Blocking signs them out everywhere until you unblock them. A reset link lets them choose a new password.'}
          </span>
        </div>
      </Modal>
      {/* outside the Details window: it is a form, and a window's form inside it never reached React in Chrome, so the
          browser submitted it and reloaded the page (re-check 2026-10-27) */}
      {removingPhoto && (
        <Modal
          title={`Remove ${person.name}’s photo?`}
          icon="alert"
          onClose={() => setRemovingPhoto(null)}
          onSubmit={() => (setRemovingPhoto(null), removingPhoto())}
          footer={
            <>
              <button type="button" className={btnClass('ghost')} onClick={() => setRemovingPhoto(null)}>
                <BtnLabel>Keep it</BtnLabel>
              </button>
              <button type="submit" className={btnClass('primary')}>
                <BtnLabel>Remove photo</BtnLabel>
              </button>
            </>
          }
        >
          <p>Their initials show instead, everywhere, and they’re told in their bell.</p>
        </Modal>
      )}
    </>
  );
}

// a stored photo needs the sign-in token, which an <img> can't send, so it's fetched and shown from memory
const photoUrl = async (source: PhotoSource | undefined) =>
  !source ? undefined : source.kind === 'web' ? source.url : URL.createObjectURL(await api!.getFile(source.path));

/**
 * Their photo in Details. A change is saved at once, not with Save, like Block and Send reset link; the backend
 * tells them in their bell.
 */
function PhotoField({ person, problem, onAskRemove }: { person: DirectoryPerson; problem: string; onAskRemove: (remove: () => void) => void }) {
  const calls = useMemo(() => personPhotoCalls(api!), []);
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    let open = true;
    calls
      .load(person.id)
      .then(photoUrl)
      .then((loaded) => (open ? setUrl(loaded) : loaded?.startsWith('blob:') && URL.revokeObjectURL(loaded)))
      // their initials stand in; a change still works
      .catch((e) => console.warn('Their photo did not load:', e));
    return () => {
      open = false;
    };
  }, [calls, person.id]);
  // each shown photo is let go once it's replaced or the window closes
  useEffect(() => () => void (url?.startsWith('blob:') && URL.revokeObjectURL(url)), [url]);

  const change = async (work: () => Promise<string | undefined>, message: string) => {
    setBusy(true);
    setError('');
    setDone('');
    try {
      setUrl(await work());
      setDone(message);
    } catch (e) {
      setError(e instanceof ApiError ? accountFailedMessage(e) : 'That image couldn’t be read. Try another file.');
    } finally {
      setBusy(false);
    }
  };

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const fileProblem = photoFileProblem(file);
    if (fileProblem) return setError(fileProblem);
    void change(async () => photoUrl(await calls.save(person.id, await toJpeg(await toSquare(file)))), `Photo saved. ${person.name} is told in their bell.`);
  };

  const remove = () => void change(async () => (await calls.remove(person.id), undefined), `Photo removed. ${person.name} is told in their bell.`);

  return (
    <div className="p-field" role="group" aria-labelledby="details-photo">
      <span id="details-photo">Photo</span>
      <div className="p-set-photo" aria-busy={busy || undefined}>
        <span className="p-avatar is-large" aria-hidden="true">
          {url ? <img src={url} alt="" /> : initials(person.name)}
        </span>
        <button type="button" className={btnClass('ghost', { small: true })} disabled={busy || !!problem} title={problem || undefined} onClick={() => input.current?.click()}>
          <BtnLabel icon="upload">{busy ? 'Saving…' : url ? 'Change' : 'Upload'}</BtnLabel>
        </button>
        {url && !problem && (
          <button type="button" className="p-text-btn is-danger" disabled={busy} onClick={() => onAskRemove(remove)}>
            Remove
          </button>
        )}
        <input ref={input} type="file" accept={PHOTO_TYPES.join(',')} onChange={pick} hidden />
      </div>
      {error ? (
        <span className="p-error" role="alert">
          {error}
        </span>
      ) : (
        <span className="p-field-hint" role="status">
          {done || problem || `PNG, JPG or WebP, up to ${PHOTO_MAX_MB} MB. Saved at once; they’re told in their bell.`}
        </span>
      )}
    </div>
  );
}
