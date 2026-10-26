import { ApiError, BUSY_MESSAGE } from './api';

/**
 * HR OPS → Interview: opens OpenInterviewer (the AI interview tool) in a new tab, signed in. The backend hands an
 * Admin or Super Admin a pass that works once, for 60 seconds (POST /api/openinterviewer/launch-token), and the
 * tool's login page turns it into its own session.
 */

export const INTERVIEW_LAUNCH_PATH = '/openinterviewer/launch-token';

/** The part of a browser tab the launch uses (window.open's result), so tests can stand in for it. */
export interface LaunchTab {
  opener: unknown;
  location: { replace(url: string): void };
  close(): void;
}

export type LaunchResult = { ok: true } | { ok: false; message: string };

// the backend's reply when BHARATTECH_LAUNCH_SECRET isn't set (routes/openInterviewerRoutes.js)
const NOT_SET_UP = 'OpenInterviewer launch secret is not configured';

const FAILED: Record<ApiError['kind'], string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'Only Admins and Super Admins can open the interview tool.',
  'not-found': 'The interview tool isn’t connected to the company system yet.',
  conflict: 'We couldn’t open the interview tool. Try again in a moment.',
  'bad-request': 'We couldn’t open the interview tool. Try again in a moment.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the company system, so the interview tool didn’t open. Try again in a moment.',
};

const failedMessage = (e: ApiError) =>
  e.message === NOT_SET_UP ? 'The interview tool isn’t set up on the company system yet. Ask whoever runs it to add its launch setting.' : FAILED[e.kind];

/** The address the backend sent, if it is a web address; anything else (javascript:, nothing) is not followed. */
export function launchAddress(reply: unknown): string | null {
  const url = (reply as { launchUrl?: unknown } | null)?.launchUrl;
  if (typeof url !== 'string') return null;
  try {
    return /^https?:$/.test(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}

/**
 * Call it straight from the click: the tab is opened before anything is awaited (later, the browser treats it as a
 * pop-up and blocks it), and a pass is only asked for once there is a tab to spend it in.
 */
export async function openInterviewTool(
  post: (path: string, body: object) => Promise<unknown>,
  openTab: () => LaunchTab | null = () => window.open('', '_blank'),
): Promise<LaunchResult> {
  const tab = openTab();
  if (!tab) return { ok: false, message: 'Your browser blocked the new tab. Allow pop-ups for this site, then press the button again.' };
  // the tool's page gets no handle back to the signed-in portal
  tab.opener = null;

  let address: string | null;
  try {
    address = launchAddress(await post(INTERVIEW_LAUNCH_PATH, {}));
  } catch (error) {
    tab.close();
    return { ok: false, message: failedMessage(error instanceof ApiError ? error : new ApiError('unavailable')) };
  }
  if (!address) {
    tab.close();
    return { ok: false, message: FAILED.unavailable };
  }

  // replace, not assign: Back in the new tab doesn't return to an empty page
  tab.location.replace(address);
  return { ok: true };
}
