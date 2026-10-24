import { api, type ApiError } from '../api';
import { useCommunityMembers, useMyPersonalEmail, type CommunityMember } from '../community';
import { usePortal } from '../store';

/**
 * Where the Community page gets its members and sends what people do: the demo's in-browser samples, or the backend
 * (community.ts) once the portal is connected. Referrals and internal jobs are still the demo's (Parts 2 and 3).
 */
export type SourceMember = CommunityMember & {
  /** Their old work email, when the page has it (the demo), so a personal email can't repeat it. */
  workEmail?: string;
};

export interface CommunitySource {
  connected: boolean;
  status: { kind: 'ready' } | { kind: 'loading' } | { kind: 'error'; error: ApiError };
  retry: () => void;
  /** Loads the members again without a loading state (after someone rejoined through a job). */
  refresh: () => void;
  members: SourceMember[];
  /** Connected only: brings a member back to People; resolves with whether they need an invite to sign in. */
  bringBack: ((id: string) => Promise<{ needsInvite: boolean }>) | null;
  /** Saves a member's personal email (empty removes it); rejects with an ApiError when the backend refuses. */
  setPersonalEmail: (id: string, email: string) => Promise<void>;
  /** The demo checks this itself; connected, the backend does (a 409). */
  emailTaken: (email: string, exceptId: string) => boolean;
}

const READY = { kind: 'ready' } as const;

export function useCommunitySource(): CommunitySource {
  const portal = usePortal();
  const remote = useCommunityMembers();

  if (api) {
    const { state } = remote;
    return {
      connected: true,
      status: state.kind === 'ready' || state.kind === 'off' ? READY : state,
      retry: remote.retry,
      refresh: remote.refresh,
      members: state.kind === 'ready' ? state.members : [],
      bringBack: remote.bringBack,
      setPersonalEmail: async (id, email) => void (await remote.setPersonalEmail(id, email)),
      emailTaken: () => false,
    };
  }
  return {
    connected: false,
    status: READY,
    retry: () => {},
    // the demo's store updates the wall by itself
    refresh: () => {},
    members: portal.alumni.map((a) => ({ id: a.id, name: a.name, stream: a.stream, left: a.left, employeeId: a.id, personalEmail: a.personalEmail, canBringBack: false, workEmail: a.email })),
    bringBack: null,
    setPersonalEmail: async (id, email) => portal.setPersonalEmail(id, email),
    emailTaken: (email, exceptId) => portal.alumni.some((a) => a.id !== exceptId && a.personalEmail?.toLowerCase() === email),
  };
}

/**
 * The signed-in person's own personal email for joining ahead of leaving: kept on their record in the demo, on the
 * backend once connected. `email` is undefined while it loads.
 */
export function useOwnPersonalEmail(on: boolean) {
  const { me, people, alumni, joinCommunity } = usePortal();
  const remote = useMyPersonalEmail(on);
  if (api) return { email: remote.email, error: remote.error, save: async (value: string) => void (await remote.save(value)), emailTaken: () => false };
  return {
    email: me.personalEmail ?? '',
    error: null,
    save: async (value: string) => joinCommunity(me.id, value),
    emailTaken: (email: string) => [...people, ...alumni].some((p) => p.id !== me.id && p.personalEmail?.toLowerCase() === email),
  };
}
