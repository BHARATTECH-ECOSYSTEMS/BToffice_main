// The portal hands its sign-in to the LMS tab it opens (owner's fix A, 2026-10-25), so someone signed in to the portal
// with an Employee ID is not sent to Keycloak's own page, which only takes a work email or username. This tab asks
// the tab that opened it, and accepts an answer only from the portal's exact address and from that very tab. The
// portal's side is pk-redesign-thread-story/src/portal/lmsHandoff.ts; the two message names must match.

export const HANDOFF = { ready: "bt-lms-ready", tokens: "bt-lms-tokens" };

/** How long to wait for the portal's answer before showing this app's own sign-in screen. */
const WAIT_MS = 1500;

/** An http(s) address's origin, or null. */
export function originOf(url) {
  try {
    const { protocol, origin } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? origin : null;
  } catch {
    return null;
  }
}

/** Keycloak sends people back here with `state` (or `error`) after its page: the portal has already been asked. */
export const isSignInReturn = (href) => /[#&?](state|error)=/.test(href);

/**
 * Asks the portal tab that opened this one for its sign-in. Resolves { access, refresh, id } or null: opened directly,
 * no portal address set, the portal signed out, a malformed answer, or no answer in time.
 */
export function askPortal({ opener, portalOrigin, listen, later, timeoutMs = WAIT_MS }) {
  return new Promise((resolve) => {
    if (!opener || !portalOrigin) return resolve(null);
    let done = false;
    let stop = () => {};
    const finish = (value) => {
      if (done) return;
      done = true;
      stop();
      resolve(value);
    };
    stop = listen((e) => {
      if (e.origin !== portalOrigin || e.source !== opener || e.data?.type !== HANDOFF.tokens) return;
      const { access, refresh, id } = e.data;
      finish(typeof access === "string" && typeof refresh === "string" ? { access, refresh, id: typeof id === "string" ? id : undefined } : null);
    });
    later(() => finish(null), timeoutMs);
    try {
      // a tab at any other address never receives this: the browser drops it
      opener.postMessage({ type: HANDOFF.ready }, portalOrigin);
    } catch {
      finish(null);
    }
  });
}
