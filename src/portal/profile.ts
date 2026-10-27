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
  /** Whether colleagues see the phone numbers (People, colleague view); yes unless the person said no. */
  showPhone: boolean;
  photo?: PhotoSource;
}

// the backend's rule (userController readPhone): 10 digits, typed with spaces or hyphens, +91 or a leading 0 in front
const INDIAN_NUMBER = /^(?:\+91|0)?\d{10}$/;
const PHONE_FORMAT = /^\+?[\d\s-]+$/;

/** Why a typed phone number would be refused, or null when it's fine (an empty box clears the number). */
export function phoneProblem(value: string): string | null {
  const typed = value.trim();
  if (!typed) return null;
  const ok = typed.length <= 20 && PHONE_FORMAT.test(typed) && INDIAN_NUMBER.test(typed.replace(/[\s-]/g, ''));
  return ok ? null : 'Enter a 10-digit Indian number, like +91 98765 43210.';
}

/** Saves the signed-in person's own phone numbers and whether colleagues see them. */
export async function saveMyPhones(change: { phone: string; workPhone: string; showPhone: boolean }) {
  if (!api) throw new ApiError('unavailable');
  return toAccountProfile(await api.patch<unknown>('/user/me', { phone: change.phone.trim(), workPhone: change.workPhone.trim(), showPhone: change.showPhone }));
}

/**
 * Where a person's photo comes from: one saved to their account (fetched from the backend with the sign-in, since an
 * <img> can't send it), or a full web address (the company's old sign-up photos).
 */
/** An email split before its @, so a narrow column can break it there; null for anything else. */
export function emailParts(value: string | undefined): [string, string] | null {
  const at = value?.indexOf('@') ?? -1;
  return value && at > 0 ? [value.slice(0, at), value.slice(at)] : null;
}

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
    showPhone: (p.privacySettings as { showPhone?: unknown } | undefined)?.showPhone !== false,
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

/**
 * Who can change your name, for Settings: a Super Admin changes anyone's under People → Details, their own included; an
 * Admin can't change their own (only those below them), so theirs takes a Super Admin.
 */
export function nameChangeHint(label: string | undefined) {
  const where = 'Shown on your profile, tasks and certificates.';
  if (label === 'Super Admin') return `${where} You can change it on the People page, under Details.`;
  if (label === 'Admin') return `${where} Only a Super Admin can change it, on the People page.`;
  return `${where} Only an admin can change it, on the People page.`;
}
