import { useCallback, useEffect, useState } from 'react';
import { api, apiBase, ApiError } from './api';
import { STREAMS, type PersonRole, type PersonStatus, type Stream } from './data';
import { readAccountRole, roleBadge, roleLabel } from './people';

/**
 * The signed-in person's own record from the backend (GET /api/user/me), in the portal's terms. Fields the account
 * doesn't have yet (an admin hasn't set the stream, say) are undefined, and the page says "Not set yet".
 */
export interface AccountProfile {
  name: string;
  email: string;
  employeeId?: string;
  /** Which badge to show; a superadmin wears the admin one. */
  role: PersonRole;
  /** The account's own role, so an intern reads "Intern" and a superadmin "Super Admin". */
  roleLabel: string;
  stream?: Stream;
  team?: string;
  status: PersonStatus;
  phone?: string;
  workPhone?: string;
  photo?: string;
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

/** Only web addresses become an <img> source: a full http(s) address, or a file the backend serves from /uploads/. */
function photoUrl(value: unknown, base: string) {
  const path = text(value);
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/uploads/')) return new URL(path, base).toString();
  return undefined;
}

export function toAccountProfile(raw: unknown, base: string): AccountProfile {
  const p = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const email = text(p.email);
  if (!email) throw new ApiError('unavailable', 'The backend’s answer isn’t a profile.');
  const accountRole = readAccountRole(p.role);
  return {
    name: text(p.fullName) ?? text(p.username) ?? email,
    email,
    employeeId: text(p.employeeId),
    role: roleBadge(accountRole),
    roleLabel: roleLabel(accountRole),
    stream: STREAMS.find((s) => s.id === p.stream)?.id,
    team: text(p.team),
    status: p.isBanned === true ? 'inactive' : 'active',
    phone: text(p.phone) ?? text(p.phoneNumber),
    workPhone: text(p.workPhone),
    photo: photoUrl(p.profilePicture, base),
  };
}

export type ProfileState =
  | { kind: 'off' }
  | { kind: 'loading' }
  | { kind: 'ready'; profile: AccountProfile }
  | { kind: 'error'; error: ApiError };

/** Loads the signed-in person's profile; `off` with the demo sign-in. `retry` loads it again after an error. */
export function useAccountProfile() {
  const [state, setState] = useState<ProfileState>(api ? { kind: 'loading' } : { kind: 'off' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!api || !apiBase) return;
    const base = apiBase;
    // a reply that arrives after the page was left (or after a newer retry) is dropped
    let current = true;
    setState({ kind: 'loading' });
    api
      .get<unknown>('/user/me')
      .then((raw) => toAccountProfile(raw, base))
      .then(
        (profile) => current && setState({ kind: 'ready', profile }),
        (error: unknown) => current && setState({ kind: 'error', error: error instanceof ApiError ? error : new ApiError('unavailable') }),
      );
    return () => {
      current = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return [state, retry] as const;
}
