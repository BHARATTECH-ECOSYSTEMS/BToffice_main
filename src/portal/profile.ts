import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';
import { STREAMS, type PersonRole, type PersonStatus, type Stream } from './data';
import { readAccountRole, readJoinDate, roleBadge, roleLabel } from './people';

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
  /** First working day, "YYYY-MM-DD", once an admin has set it. */
  joined?: string;
  status: PersonStatus;
  phone?: string;
  workPhone?: string;
  photo?: PhotoSource;
}

/**
 * Where a person's photo comes from: one saved to their account (fetched from the backend with the sign-in, since an
 * <img> can't send it), or a full web address (the company's old sign-up photos).
 */
export type PhotoSource = { kind: 'stored'; path: string } | { kind: 'web'; url: string };

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

// exactly the address the backend's photo store writes (userController storePhoto), relative to the API root
const STORED_PHOTO = /^\/api(\/user\/[0-9a-f]{24}\/photo\?v=[0-9a-f]{24})$/;

/** Anything else (the old broken /uploads/ paths, other kinds of address) is no photo. */
export function photoSource(value: unknown): PhotoSource | undefined {
  const address = text(value);
  if (!address) return undefined;
  const stored = STORED_PHOTO.exec(address);
  if (stored) return { kind: 'stored', path: stored[1] };
  if (/^https:\/\//i.test(address)) return { kind: 'web', url: address };
  return undefined;
}

export function toAccountProfile(raw: unknown): AccountProfile {
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
    joined: readJoinDate(p.joinedOn),
    status: p.isBanned === true ? 'inactive' : 'active',
    phone: text(p.phone) ?? text(p.phoneNumber),
    workPhone: text(p.workPhone),
    photo: photoSource(p.profilePicture),
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
    if (!api) return;
    // a reply that arrives after the page was left (or after a newer retry) is dropped
    let current = true;
    setState({ kind: 'loading' });
    api
      .get<unknown>('/user/me')
      .then(toAccountProfile)
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
