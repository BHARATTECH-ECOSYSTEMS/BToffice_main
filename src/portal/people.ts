import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, BUSY_MESSAGE } from './api';
import { ROLE_LABEL, STREAMS, type PersonRole, type PersonStatus, type Stream } from './data';

/**
 * The people directory from the backend (GET /api/user/directory) and the admin actions on it. The permission
 * helpers copy the backend's own rules (canAssignRole and canDeleteUser in the backend's userController.js), so the
 * page only offers what the backend will accept. The backend still checks every change itself.
 */

export const ACCOUNT_ROLES = ['Superadmin', 'Admin', 'Subadmin', 'Employee', 'Intern'] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

const ROLE_VIEW: Record<AccountRole, { role: PersonRole; label: string }> = {
  Superadmin: { role: 'admin', label: 'Super Admin' },
  Admin: { role: 'admin', label: ROLE_LABEL.admin },
  Subadmin: { role: 'subadmin', label: ROLE_LABEL.subadmin },
  Employee: { role: 'employee', label: ROLE_LABEL.employee },
  Intern: { role: 'intern', label: ROLE_LABEL.intern },
};

/** The backend writes roles a few ways ("Superadmin", "super-admin", "SUBADMIN"); unknown ones get the least access. */
export function readAccountRole(value: unknown): AccountRole {
  const key = (typeof value === 'string' ? value : '').toLowerCase().replace(/[-_\s]/g, '');
  return ACCOUNT_ROLES.find((r) => r.toLowerCase() === key) ?? 'Employee';
}

/** Which badge an account role wears (a superadmin wears the admin one) and what it reads. */
export const roleBadge = (role: AccountRole) => ROLE_VIEW[role].role;
export const roleLabel = (role: AccountRole) => ROLE_VIEW[role].label;

const MANAGED_BY_ADMIN: AccountRole[] = ['Subadmin', 'Employee', 'Intern'];

/** The roles `actor` may give someone who is `target` now; empty when they can't change it. */
export function roleChoices(actor: AccountRole, target: AccountRole): AccountRole[] {
  if (actor === 'Superadmin') return [...ACCOUNT_ROLES];
  if (actor === 'Admin' && MANAGED_BY_ADMIN.includes(target)) return [...MANAGED_BY_ADMIN];
  return [];
}

export function canDelete(actor: AccountRole, target: AccountRole) {
  if (actor === 'Superadmin') return target !== 'Superadmin';
  return actor === 'Admin' && MANAGED_BY_ADMIN.includes(target);
}

/**
 * Why `actor` can't mark this person as left, or '' when they can. The backend's rule: whoever may delete them,
 * never themselves, and only once their stream (which picks their community) is set.
 */
export function canMarkLeft(actor: AccountRole, target: { accountRole: AccountRole; stream?: Stream }, self: boolean) {
  if (self) return "You can't mark yourself as left";
  if (actor !== 'Superadmin' && actor !== 'Admin') return 'Only admins can mark someone as left';
  if (!canDelete(actor, target.accountRole)) return `${roleLabel(target.accountRole)} accounts can't be marked as left by your role`;
  if (!target.stream) return 'Set their stream in Details first: it decides which community they join';
  return '';
}

/** The roles `actor` may invite someone as (the backend's canInviteRole). */
export function inviteChoices(actor: AccountRole): AccountRole[] {
  if (actor === 'Superadmin') return [...ACCOUNT_ROLES];
  return actor === 'Admin' ? ['Employee', 'Intern'] : [];
}

/** Stream and team go through the backend's admin-only edit route. */
export const canEditDetails = (actor: AccountRole) => actor === 'Superadmin' || actor === 'Admin';

/** Whose name, stream and team `actor` may change (the backend's canEditUser): a superadmin anyone, an admin those below. */
export const canEditPerson = (actor: AccountRole, target: AccountRole) => actor === 'Superadmin' || (actor === 'Admin' && MANAGED_BY_ADMIN.includes(target));

export const NAME_MIN = 2;
export const NAME_MAX = 60;

/** A name as the backend stores it (its readFullName): trimmed and single-spaced; null when it would be refused. */
export function cleanName(value: string) {
  const name = value.replace(/\s+/g, ' ').trim();
  if (/[\u0000-\u001f\u007f]/.test(name)) return null;
  return name.length >= NAME_MIN && name.length <= NAME_MAX ? name : null;
}

export interface DirectoryPerson {
  /** The backend's id for the person, used by the admin actions. */
  id: string;
  employeeId?: string;
  name: string;
  email: string;
  accountRole: AccountRole;
  role: PersonRole;
  roleLabel: string;
  phone?: string;
  workPhone?: string;
  stream?: Stream;
  team?: string;
  /** First working day, "YYYY-MM-DD", once an admin has set it. */
  joined?: string;
  status: PersonStatus;
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

/** A join date as the backend keeps it: a real day written "YYYY-MM-DD" (so "2023-02-29" is not one), else unset. */
export function readJoinDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  return day.getUTCFullYear() === y && day.getUTCMonth() === m - 1 && day.getUTCDate() === d ? value : undefined;
}

// the backend's range (models/User.js): earlier is a typo; up to a year ahead lets someone be set up before they start
export const JOIN_EARLIEST = '1990-01-01';
export const latestJoinDate = (today: string) => `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;

/** Why the backend would refuse this join date, or '' when it's fine. An empty value clears the date. */
export function joinDateProblem(value: string, today: string) {
  if (!value) return '';
  const day = readJoinDate(value);
  return day && day >= JOIN_EARLIEST && day <= latestJoinDate(today) ? '' : 'Pick a day from 1990 up to a year from today.';
}

export function toDirectory(raw: unknown): DirectoryPerson[] {
  if (!Array.isArray(raw)) throw new ApiError('unavailable', 'The backend’s answer isn’t a list of people.');
  const rows: DirectoryPerson[] = [];
  for (const entry of raw) {
    const p = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const id = text(p.id);
    const email = text(p.email);
    // one broken record shouldn't take the whole directory down
    if (!id || !email) continue;
    const accountRole = readAccountRole(p.role);
    rows.push({
      id,
      employeeId: text(p.employeeId),
      name: text(p.name) ?? email,
      email,
      accountRole,
      role: roleBadge(accountRole),
      roleLabel: roleLabel(accountRole),
      phone: text(p.phone),
      workPhone: text(p.workPhone),
      stream: STREAMS.find((s) => s.id === p.stream)?.id,
      team: text(p.team),
      joined: readJoinDate(p.joinedOn),
      status: p.status === 'inactive' ? 'inactive' : 'active',
    });
  }
  return rows;
}

export type DirectoryState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; people: DirectoryPerson[] } | { kind: 'error'; error: ApiError };

const asApiError = (error: unknown) => (error instanceof ApiError ? error : new ApiError('unavailable'));

/**
 * Loads the directory; `off` with the demo sign-in. The actions save to the backend, then load the directory again,
 * so the page always shows what the backend actually stored. They throw an ApiError when the backend refuses.
 */
export function useDirectory() {
  const [state, setState] = useState<DirectoryState>(api ? { kind: 'loading' } : { kind: 'off' });

  // `quiet` keeps the current list on screen while it reloads after a change
  const load = useCallback(async (quiet = false) => {
    if (!api) return;
    if (!quiet) setState({ kind: 'loading' });
    try {
      setState({ kind: 'ready', people: toDirectory(await api.get<unknown>('/user/directory')) });
    } catch (error) {
      setState({ kind: 'error', error: asApiError(error) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (change: () => Promise<unknown>) => {
      try {
        await change();
      } catch (error) {
        throw asApiError(error);
      } finally {
        await load(true);
      }
    },
    [load],
  );

  return {
    state,
    retry: () => void load(),
    changeRole: (id: string, role: AccountRole) => act(() => api!.patch(`/user/${id}`, { role })),
    saveDetails: (id: string, details: { fullName?: string; stream: Stream | null; team: string; joinedOn?: string | null }) => act(() => api!.patch(`/user/${id}`, details)),
    remove: (id: string) => act(() => api!.del(`/user/${id}`)),
    /** Moves them to their stream's community and switches their sign-in off (community.ts has the rest). */
    markLeft: (id: string) => act(() => api!.post(`/community/leave/${encodeURIComponent(id)}`, {})),
    /**
     * Creates the person's login with a temporary password and emails it to them. They join the directory at their
     * first sign-in, so there's nothing to reload.
     */
    invite: async (person: { name: string; email: string; role: AccountRole }) => {
      try {
        await api!.post('/invite/send-invite', person, { timeoutMs: INVITE_TIMEOUT_MS });
      } catch (error) {
        throw asApiError(error);
      }
    },
  };
}

// sending the invite email can take a while; the backend itself waits up to 20 s for the mail server
const INVITE_TIMEOUT_MS = 60_000;

/** True when the backend made the login but couldn't send the email; sending the invite again is safe. */
export const inviteEmailFailed = (error: ApiError) => {
  const details = error.details as { inviteEmailSent?: unknown; keycloakSynced?: unknown } | undefined;
  return details?.inviteEmailSent === false && details.keycloakSynced === true;
};

/**
 * An invite nobody has accepted yet (GET /api/invite/pending): a login still waiting for its first password. The
 * backend lists only the roles this admin may invite, newest first.
 */
export interface PendingInvite {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  /** ms, or null when Keycloak didn't say */
  invitedAt: number | null;
}

export function toPendingInvites(raw: unknown): PendingInvite[] {
  if (!Array.isArray(raw)) throw new ApiError('unavailable', 'The backend’s answer isn’t a list of invites.');
  return raw.flatMap((entry) => {
    const p = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const id = text(p.id);
    const email = text(p.email);
    if (!id || !email) return [];
    const at = typeof p.invitedAt === 'string' ? Date.parse(p.invitedAt) : NaN;
    return [{ id, name: text(p.name) ?? email, email, role: readAccountRole(p.role), invitedAt: Number.isNaN(at) ? null : at }];
  });
}

const PENDING_FAILED: Record<ApiError['kind'], string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'Your role can’t cancel this invite.',
  'not-found': 'That invite isn’t pending any more. The list has been refreshed.',
  conflict: 'They’ve already accepted the invite. The list has been refreshed.',
  'bad-request': 'That wasn’t accepted.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the employee records, so nothing was changed. Try again in a moment.',
};
/** What to say when cancelling (or loading) pending invites failed; the backend's own words are clearest for refusals. */
export const pendingInviteFailedMessage = (e: ApiError) =>
  (e.kind === 'forbidden' || e.kind === 'not-found' || e.kind === 'conflict') && e.message !== e.kind ? e.message : PENDING_FAILED[e.kind];

export type PendingInvitesState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; invites: PendingInvite[] } | { kind: 'error'; error: ApiError };

/** The invites nobody has accepted yet; `on` false never asks (people who can't invite). */
export function usePendingInvites(on: boolean) {
  const [state, setState] = useState<PendingInvitesState>(api && on ? { kind: 'loading' } : { kind: 'off' });
  const load = useCallback(async () => {
    if (!api || !on) return setState({ kind: 'off' });
    try {
      setState({ kind: 'ready', invites: toPendingInvites(await api.get<unknown>('/invite/pending')) });
    } catch (error) {
      setState({ kind: 'error', error: asApiError(error) });
    }
  }, [on]);
  useEffect(() => {
    void load();
  }, [load]);
  return {
    state,
    reload: load,
    /** Deletes the unused login, so the emailed password stops working; reloads either way. */
    cancel: async (id: string) => {
      try {
        await api!.del(`/invite/pending/${encodeURIComponent(id)}`);
      } catch (error) {
        throw asApiError(error);
      } finally {
        await load();
      }
    },
  };
}
