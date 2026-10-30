import { CERTIFICATE_TYPES, ROLE_LABEL, STREAM_LABEL, type PersonRole, type PersonStatus, type PortalIconName, type Stream } from './data';
import { ACCOUNT_ROLES, roleLabel, type DirectoryPerson } from './people';
import type { AccountProfile } from './profile';
import type { IssuedCertificate } from './certificates';

/** "1 item", "3 items". */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The dashboard's numbers and the ID card's person, worked out from the backend's records (the directory, the
 * certificates and the signed-in person's profile). Nothing here is made up: a figure that hasn't loaded has no value.
 */

/** What the ID card prints. The demo's Person fits it as it is; a real account becomes one through toCardPerson. */
export interface CardPerson {
  /** The Employee ID; unset for an account that hasn't been given one yet. */
  id?: string;
  name: string;
  email: string;
  role: PersonRole;
  /** The account's own role name ("Super Admin"); the badge's name otherwise. */
  roleLabel?: string;
  stream?: Stream;
  team?: string;
  status: PersonStatus;
  phone?: string;
  /** First working day (ISO); a real account has one once an admin sets it. */
  joined?: string;
  office?: string;
}

export const toCardPerson = (profile: AccountProfile): CardPerson => ({
  id: profile.employeeId,
  name: profile.name,
  email: profile.email,
  role: profile.role,
  roleLabel: profile.roleLabel,
  stream: profile.stream,
  team: profile.team,
  status: profile.status,
  phone: profile.phone,
  ...(profile.joined && { joined: profile.joined }),
});

const roleName = (person: CardPerson) => person.roleLabel ?? ROLE_LABEL[person.role];

/** "Intern, Operations stream", or just the role while no stream is set. */
export const cardRoleLine = (person: CardPerson) => (person.stream ? `${roleName(person)}, ${STREAM_LABEL[person.stream]} stream` : roleName(person));

/**
 * The person as a MECARD, the short contact format phone cameras offer to save as a contact. It carries only what
 * the card already shows in print, and leaves out the office (the same for everyone): less data means fewer, larger
 * QR squares that a camera reads more easily. Once there is a public verification page, point the QR at that.
 */
export function contactCard(person: CardPerson) {
  // MECARD reserves these characters; a backslash before one keeps it as text
  const esc = (v: string) => v.replace(/([\\;,:"])/g, '\\$1');
  const fields = [
    `N:${esc(person.name)}`,
    'ORG:Bharattech Origin',
    `TITLE:${esc(roleName(person))}`,
    `EMAIL:${esc(person.email)}`,
    person.phone && `TEL:${esc(person.phone)}`,
    person.id && `NOTE:${esc(`Employee ID ${person.id}`)}`,
  ];
  return `MECARD:${fields.filter(Boolean).join(';')};;`;
}

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface Joiner {
  id: string;
  name: string;
  /** First working day, "YYYY-MM-DD". */
  joined?: string;
  status?: PersonStatus;
}

/**
 * The calendar's people dates from `from` to `to` (both "YYYY-MM-DD"): each first day and work anniversary in that
 * stretch. Invited people haven't joined yet; someone without a join date has nothing to show.
 */
export function workAnniversaries(people: Joiner[], from: string, to: string) {
  const out: { id: string; date: string; title: string; meta: string }[] = [];
  const years = [Number(from.slice(0, 4)), Number(to.slice(0, 4))];
  for (const p of people) {
    if (p.status === 'invited' || !p.joined) continue;
    for (let y = years[0]; y <= years[1]; y++) {
      const date = `${y}${p.joined.slice(4)}`;
      const served = y - Number(p.joined.slice(0, 4));
      // a 29 February joiner has no date in other years; skip rather than move it
      if (date < from || date > to || served < 0 || isoDay(new Date(`${date}T00:00:00`)) !== date) continue;
      out.push({ id: `p-${p.id}-${y}`, date, title: p.name, meta: served === 0 ? 'First day' : `Work anniversary · ${plural(served, 'year')}` });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** How many were issued today or in the days before it, `days` in all, by this browser's calendar. */
export function issuedInLastDays(certificates: IssuedCertificate[], days: number, today = new Date()) {
  const from = isoDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1)));
  // an unreadable date is stored as '' and never counts
  return certificates.filter((c) => c.issuedAt >= from).length;
}

export interface Figure {
  label: string;
  icon: PortalIconName;
  /** Unset while it loads, or when it couldn't load. */
  value?: number;
}

/**
 * The greeting's figures for admins and sub admins. Sub admins can't list everyone's certificates (the backend
 * allows that to admins only), so theirs leave the certificate figures out.
 */
export function managerFigures(
  { people, certificates, showCertificates }: { people?: DirectoryPerson[]; certificates?: IssuedCertificate[]; showCertificates: boolean },
  today = new Date(),
): Figure[] {
  return [
    { label: 'Users', icon: 'users', value: people?.length },
    ...(showCertificates
      ? ([
          { label: 'Certificates', icon: 'award', value: certificates?.length },
          { label: 'Last 30 days', icon: 'check', value: certificates && issuedInLastDays(certificates, 30, today) },
        ] satisfies Figure[])
      : []),
    // the backend marks a blocked account inactive
    { label: 'Inactive accounts', icon: 'lock', value: people?.filter((p) => p.status === 'inactive').length },
  ];
}

export type BreakdownRow = { label: string; value: number };

export const peopleByRole = (people: DirectoryPerson[]): BreakdownRow[] =>
  ACCOUNT_ROLES.map((role) => ({ label: roleLabel(role), value: people.filter((p) => p.accountRole === role).length }));

/** One row per type the website knows; a title it doesn't know is left out of the rows. */
export const certificatesByType = (certificates: IssuedCertificate[]): BreakdownRow[] =>
  CERTIFICATE_TYPES.map((t) => ({ label: t.name, value: certificates.filter((c) => c.title === t.name).length }));
