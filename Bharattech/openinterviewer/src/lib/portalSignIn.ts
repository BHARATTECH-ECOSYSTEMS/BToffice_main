// How the login page signs a researcher in by itself (owner's 1B, 2026-10-27): opened from the portal with a pass, the
// pass goes first; only when it is refused is the company sign-in (Keycloak) tried. The two used to run at once, so a
// refused pass flashed its error and the company sign-in then went through behind it.

export type Attempt = { ok: boolean; error?: string };

export type PortalSignIn = { ok: true; by: 'pass' | 'sso' } | { ok: false; error?: string };

export async function signInFromPortal({
  launchToken,
  tryLaunch,
  trySso
}: {
  launchToken: string | null;
  tryLaunch: (token: string) => Promise<Attempt>;
  trySso: () => Promise<Attempt>;
}): Promise<PortalSignIn> {
  let refused: string | undefined;
  if (launchToken) {
    const pass = await tryLaunch(launchToken);
    if (pass.ok) return { ok: true, by: 'pass' };
    refused = pass.error;
  }

  const sso = await trySso();
  if (sso.ok) return { ok: true, by: 'sso' };
  // without a pass, not being signed in to the company is the normal case: the password form shows, with no error
  return refused ? { ok: false, error: refused } : { ok: false };
}
