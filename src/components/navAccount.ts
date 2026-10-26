import { initials } from '../portal/names';

/**
 * What the public top bar shows for the signed-in person: their initials and a label naming whose portal opens; null
 * when nobody is signed in, and the bar keeps "Employee login". An account without a name goes by its email.
 */
export function navAccount(session: { name: string; email: string } | null) {
  if (!session) return null;
  const who = session.name.trim() || session.email;
  return { initials: initials(who), label: `Open portal (signed in as ${who})` };
}
