import { api, type ApiError } from '../api';
import { useJobs, type JobDraft, type RemoteApplicant } from '../community';
import type { ApplicationStage, InternalJob } from '../data';
import { usePeopleById, usePortal } from '../store';

/**
 * Where the internal jobs come from and where admins' changes go: the demo's in-browser samples, or the backend
 * (community.ts) once the portal is connected. Connected, posting and each step email the people concerned, and
 * the answers say whether those emails went.
 */
export type SourceApplicant = RemoteApplicant;
export type SourceJob = InternalJob & { emailed?: number; failed?: number; applicants?: SourceApplicant[] };

export interface JobsSource {
  connected: boolean;
  status: { kind: 'ready' } | { kind: 'loading' } | { kind: 'error'; error: ApiError };
  retry: () => void;
  jobs: SourceJob[];
  /** These resolve when saved and reject with an ApiError when the backend refuses. */
  post: (draft: JobDraft) => Promise<SourceJob>;
  setOpen: (id: string, open: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  addApplicant: (jobId: string, personId: string) => Promise<void>;
  /** emailed: whether this step's email went (connected only); needsInvite: rejoined without a sign-in account. */
  move: (jobId: string, applicant: SourceApplicant, to: ApplicationStage, instructions?: string) => Promise<{ emailed?: boolean; needsInvite?: boolean }>;
}

const READY = { kind: 'ready' } as const;

/** `on` is false for people who don't see internal jobs, so the page never asks the backend on their behalf. */
export function useJobsSource(on: boolean): JobsSource {
  const portal = usePortal();
  const byId = usePeopleById();
  const remote = useJobs(on);

  if (api) {
    const { state } = remote;
    return {
      connected: true,
      status: state.kind === 'ready' || state.kind === 'off' ? READY : state,
      retry: remote.retry,
      jobs: state.kind === 'ready' ? state.jobs : [],
      post: remote.post,
      setOpen: async (id, open) => void (await remote.setOpen(id, open)),
      remove: remote.remove,
      addApplicant: async (jobId, personId) => void (await remote.addApplicant(jobId, personId)),
      move: async (jobId, applicant, to, instructions) => {
        const { emailed, needsInvite } = await remote.move(jobId, applicant.id, applicant.stage, to, instructions);
        return { emailed, needsInvite };
      },
    };
  }
  return {
    connected: false,
    status: READY,
    retry: () => {},
    jobs: portal.jobs.map((job) => ({
      ...job,
      applicants: portal.applications
        .filter((a) => a.jobId === job.id)
        .map((a) => ({
          id: a.id,
          personId: a.personId,
          name: byId.get(a.personId)?.name ?? 'Removed user',
          stage: a.stage,
          updated: a.updated,
          hasPersonalEmail: !!portal.alumni.find((x) => x.id === a.personId)?.personalEmail,
        })),
    })),
    post: async (draft) => portal.postJob({ ...draft, closes: draft.closes || undefined }),
    setOpen: async (id, open) => portal.setJobOpen(id, open),
    remove: async (id) => portal.removeJob(id),
    addApplicant: async (jobId, personId) => portal.addApplicant(jobId, personId),
    move: async (_jobId, applicant, to) => (portal.moveApplication(applicant.id, to), {}),
  };
}
