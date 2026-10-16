import type { Verification } from './data';

/**
 * Verification requests sent from the public website, waiting for the portal. Outside companies use the footer form
 * instead of emailing someone at Bharattech, so every request lands in one place (HR OPS → Verification Requests).
 * There is no backend yet: requests are held in this tab's memory and the portal picks them up when it opens, so
 * they are gone after a reload. With a backend this module becomes one POST from the form.
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
