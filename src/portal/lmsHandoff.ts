import { useEffect } from 'react';
import { auth } from './auth';
import { LMS_PLATFORM } from './lmsPlatform';

/**
 * Hands the portal's sign-in to the LMS Platform tab it opens (owner's fix A, 1A 2A, 2026-10-25), so someone signed in
 * with an Employee ID never meets Keycloak's own page, which takes only a work email or username.
 *
 * The portal opens the LMS without anything in the address and keeps a handle on that tab. The LMS tab asks the tab
 * that opened it ("ready"); the portal answers only a message from the LMS's exact address and from the tab it opened
 * itself, and only to that address (postMessage). Signed out, it answers "none" and the LMS shows its own sign-in
 * screen. The LMS cuts its link back to the portal once it has its answer (MERN client, src/auth/handoff.js).
 */

export const HANDOFF = { ready: 'bt-lms-ready', tokens: 'bt-lms-tokens' } as const;
export interface HandoffTokens {
  access: string;
  refresh: string;
  id?: string;
}
interface MessageLike {
  origin: string;
  source: unknown;
  data: unknown;
}
interface TabLike {
  postMessage(data: unknown, targetOrigin: string): void;
}
export interface HandoffEnv {
  open(url: string): TabLike | null;
  listen(callback: (e: MessageLike) => void): () => void;
  later(fn: () => void, ms: number): void;
}

/** How long the portal waits for the new tab to ask (it asks as soon as its page has loaded). */
const LISTEN_MS = 20000;

type Click = { button: number; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean };
/** With a modifier or the middle button people mean a background tab or a window: the browser's own, no hand-over. */
export const isPlainClick = (e: Click) => e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;

export const isReady = (e: MessageLike, tab: unknown, lmsOrigin: string) =>
  e.source === tab && e.origin === lmsOrigin && (e.data as { type?: unknown } | null)?.type === HANDOFF.ready;

const originOf = (url: string) => {
  try {
    const { protocol, origin } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? origin : null;
  } catch {
    return null;
  }
};

const browserEnv: HandoffEnv = {
  // no "noopener": the LMS tab needs its way back to ask, and cuts it itself once answered
  open: (url) => window.open(url, '_blank'),
  listen: (callback) => {
    const on = (e: MessageEvent) => callback(e);
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  },
  later: (fn, ms) => void window.setTimeout(fn, ms),
};

/**
 * Opens `href` in a new tab and answers its one request for the sign-in. 'blocked' or 'skipped' leave it to the
 * plain link (the LMS then shows its own sign-in screen).
 */
export function handOver(href: string, tokens: () => Promise<HandoffTokens | null>, env: HandoffEnv = browserEnv): 'opened' | 'blocked' | 'skipped' {
  const lmsOrigin = originOf(href);
  if (!lmsOrigin) return 'skipped';
  const tab = env.open(href);
  if (!tab) return 'blocked';
  const stop = env.listen((e) => {
    if (!isReady(e, tab, lmsOrigin)) return;
    stop();
    void tokens()
      .catch(() => null)
      .then((t) => tab.postMessage(t ? { type: HANDOFF.tokens, ...t } : { type: HANDOFF.tokens, none: true }, lmsOrigin));
  });
  env.later(stop, LISTEN_MS);
  return 'opened';
}

/** Every link to the LMS Platform in the portal (top bar, phone menu, the "Learning has moved" page) hands over. */
export function useLmsHandoff() {
  useEffect(() => {
    if (!LMS_PLATFORM || !auth) return;
    const target = new URL(LMS_PLATFORM).href;
    const signIn = auth;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || !isPlainClick(e)) return;
      const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.href !== target) return;
      if (handOver(link.href, () => signIn.handoverTokens()) === 'opened') e.preventDefault();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
