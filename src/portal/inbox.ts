import { authConfig } from './auth';
import type { Verification } from './data';

/**
 * Verification requests sent from the public website. Outside companies use the footer form instead of emailing
 * someone at Bharattech, so every request lands in one place (HR OPS → Verification Requests).
 * - Connected (authConfig set), the form posts to the backend's public /verification-requests, which needs no
 *   sign-in, files the request and emails the requester a receipt (sendEmploymentRequest).
 * - In the demo, requests are held in this tab's memory and the portal picks them up when it opens, so they are
 *   gone after a reload (submitEmploymentRequest).
 */

export type EmploymentRequestDraft = Pick<
  Extract<Verification, { kind: 'employment' }>,
  'requesterCompany' | 'requesterName' | 'requesterEmail' | 'candidate' | 'employeeId' | 'designation' | 'from' | 'to'
>;

/** "2026-10-15T14:05" in the viewer's own time zone, matching how a request's log is read back. */
export const localMinute = () => {
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`;
};

const received: Verification[] = [];
let count = 0;

/** Files a request from the website and returns its reference, which the requester is shown. */
export function submitEmploymentRequest(draft: EmploymentRequestDraft) {
  const id = `VR${++count}`;
  const from = `${draft.requesterName} (${draft.requesterCompany})`;
  received.unshift({
    ...draft,
    kind: 'employment',
    id,
    status: 'pending',
    done: [],
    note: '',
    requestedBy: from,
    requested: localMinute().slice(0, 10),
    log: [{ at: localMinute(), by: from, text: 'Sent the request from the website' }],
  });
  return id;
}

/** The requests sent so far in this tab, newest first. */
export const receivedRequests = (): Verification[] => [...received];

/** Whether the footer form goes to the company's backend (else it's the demo's, kept in this tab). */
export const sendsToBackend = !!authConfig;

export type SendResult = { ok: true; reference: string } | { ok: false; message: string };
const UNREACHABLE = 'We couldn’t send your request just now. Try again in a moment, or email our HR team.';

/**
 * Posts the form to the backend, with no sign-in: the website's visitors aren't signed in. `website` is the hidden
 * field people never see, sent as it was filled (only something automatic fills it in). Resolves with the reference
 * the requester is shown, '' when the backend quietly turned a bot away, or the backend's own reason for refusing.
 */
export async function sendEmploymentRequest(
  draft: EmploymentRequestDraft,
  website: string,
  { base = authConfig?.api ?? '', request = (input: string, init: RequestInit) => fetch(input, init) }: { base?: string; request?: (input: string, init: RequestInit) => Promise<Response> } = {},
): Promise<SendResult> {
  let res: Response;
  try {
    res = await request(`${base}/verification-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...draft, consent: true, website }),
    });
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
  const body = (await res.json().catch(() => null)) as { reference?: unknown; message?: unknown } | null;
  if (res.ok) return { ok: true, reference: typeof body?.reference === 'string' ? body.reference : '' };
  // a refused field, or too many from here: the backend says what to do
  if ((res.status === 400 || res.status === 429) && typeof body?.message === 'string' && body.message.trim()) return { ok: false, message: body.message.trim() };
  return { ok: false, message: UNREACHABLE };
}
