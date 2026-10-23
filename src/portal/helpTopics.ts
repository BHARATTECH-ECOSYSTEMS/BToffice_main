import type { PortalIconName } from './data';
import type { DirectoryPerson } from './people';
import { managesPortal, type Role } from './session';

/**
 * The Help window's topics. The demo and the connected portal behave differently (passwords, emails, what saves), so
 * each has its own answers; the connected ones follow the backend's role rules (people.ts, the task routes).
 */

/** Who a topic is for when it is not everyone (leave it unset): admins and sub admins ("manager"), or admins only. */
type Audience = 'manager' | 'admin';

export interface HelpTopic {
  q: string;
  a: string;
  link?: { to: string; label: string };
  audience?: Audience;
  /** Only for the role named here (e.g. the employee's own status switch). */
  only?: Role;
}

export interface HelpGroup {
  title: string;
  icon: PortalIconName;
  topics: HelpTopic[];
}

const OPEN_POLICIES: HelpTopic = {
  q: 'Where do I accept company policies?',
  a: 'Open Policy & Compliance, read each document and accept it. Documents waiting for you are marked To review.',
  link: { to: '/portal/policy', label: 'Open Policy & Compliance' },
};
const NOT_CONNECTED_TOOL: HelpTopic = {
  q: 'A tool says “Not connected yet”',
  a: 'Its web address hasn’t been set up yet. Once it is, the button opens the tool directly in a new tab.',
  link: { to: '/portal/resources', label: 'See all resources' },
};
const WORKSPACE: HelpTopic = {
  q: 'What is Workspace?',
  a: 'Workspace opens Huly.io, the team’s place for projects, chat and documents. You can also reach it from Integrated Workspace on the dashboard.',
};
const EMAIL_OR_ROLE: HelpTopic = { q: 'Why can’t I change my email or role?', a: 'Both come from your company account. Ask an admin if your role is wrong.' };
const WHERE_TO_START: HelpTopic = {
  q: 'Where do I start?',
  a: 'Your dashboard shows your tasks, your calendar and your workspace tools. The bar along the top lists every section, and the ones with an arrow, like Resources, open a menu of their own. Settings, Help and Sign out are under your name in the top right.',
  link: { to: '/portal', label: 'Open the dashboard' },
};
const VERIFY_LINK = { to: '/portal/verification/company', label: 'Open Company Verification' };
const VERIFY_STEPS =
  'Under HR OPS, open Verification. Start a new request, tick off each document as you check it, then mark it verified. Verifying needs every document ticked, a rejection needs a note, and every step is recorded in the file’s activity.';

// Every answer describes what the demo does; anything not connected yet says so.
const DEMO_HELP: HelpGroup[] = [
  {
    title: 'Getting started',
    icon: 'grid',
    topics: [
      WHERE_TO_START,
      { q: 'How do I mark myself active or inactive?', a: 'Use the Active / Inactive switch at the top of your dashboard. Green means active, red means inactive, and your admins see the same colour in their team list.', only: 'employee', link: { to: '/portal', label: 'Go to my dashboard' } },
      { q: 'How do I update a task?', a: 'Under My tasks on your dashboard, change a task’s status to To do, In progress or Done. Your progress figure updates as you go.', only: 'employee' },
    ],
  },
  {
    title: 'Your account',
    icon: 'users',
    topics: [
      { q: 'How do I change my name or photo?', a: 'Open Settings, then Profile. Upload a PNG, JPG or WebP photo up to 5 MB; it’s cropped to a square. Save changes to update your name everywhere.', link: { to: '/portal/settings?tab=profile', label: 'Open Profile settings' } },
      { q: 'How do I change my password?', a: 'Open Settings, then Password. The checklist shows what the new password still needs. Password changes aren’t connected to the sign-in system yet, so for now your password stays the same.', link: { to: '/portal/settings?tab=password', label: 'Open Password settings' } },
      { q: 'Can I choose which emails I get?', a: 'Yes, from the bell next to your name at the top. Your choices are saved in this browser. Emails aren’t being sent yet, so the switches take effect once email is connected.' },
      EMAIL_OR_ROLE,
    ],
  },
  {
    title: 'Tools and learning',
    icon: 'book',
    topics: [
      NOT_CONNECTED_TOOL,
      WORKSPACE,
      { q: 'How do courses work?', a: 'In the LMS Platform, open a course and enroll. Preview lectures are open to everyone; the rest unlock once you enroll. Mark lectures as done to track your progress, and rate the course when you finish.', link: { to: '/portal/lms', label: 'Open the LMS' } },
      OPEN_POLICIES,
    ],
  },
  {
    title: 'Managing the team',
    icon: 'shield',
    topics: [
      { q: 'What can admins and sub admins do?', a: 'Both can add people, create and assign tasks, issue certificates, publish policies and add resources.', audience: 'manager' },
      { q: 'What can’t a sub admin do?', a: 'Sub admins can’t delete anything, change anyone’s role, or open admin-only tools such as Invoice Builder and HR OPS. Those stay with admins.', audience: 'manager' },
      { q: 'How do I verify a company or an employee?', a: VERIFY_STEPS, audience: 'admin', link: VERIFY_LINK },
    ],
  },
  {
    title: 'Good to know',
    icon: 'alert',
    topics: [
      { q: 'Why did my changes disappear?', a: 'The portal isn’t connected to a server yet, so changes last only until the page reloads or you sign out. Nothing you do here is lost from a real system.' },
    ],
  },
];

// The portal on the company backend: what saves where, and who may do what there.
const CONNECTED_HELP: HelpGroup[] = [
  {
    title: 'Getting started',
    icon: 'grid',
    topics: [
      WHERE_TO_START,
      { q: 'How do I mark myself active or inactive?', a: 'Your status comes from your company account, and your dashboard card shows it. If it’s wrong, ask an admin.', only: 'employee', link: { to: '/portal', label: 'Go to my dashboard' } },
      { q: 'How do I update a task?', a: 'Under My tasks on your dashboard, change a task’s status, or open the task to download its brief and hand in your work, which marks it Done. Whoever gave you the task is told.', only: 'employee', link: { to: '/portal', label: 'Go to my dashboard' } },
    ],
  },
  {
    title: 'Your account',
    icon: 'users',
    topics: [
      { q: 'How do I change my name or photo?', a: 'Open Settings, then Profile, to upload or remove your photo; it’s saved to your account, so it shows on any device. Your name is on your certificates, so only an admin can change it, from the People page; ask one if it’s wrong.', link: { to: '/portal/settings?tab=profile', label: 'Open Profile settings' } },
      { q: 'How do I change my password?', a: 'Open Settings, then Password. The checklist shows what the new password still needs (no $ sign for now). Once it’s changed, every other sign-in ends and you sign in again with the new password.', link: { to: '/portal/settings?tab=password', label: 'Open Password settings' } },
      { q: 'Can I choose which emails I get?', a: 'Yes: open the bell next to your name and press the gear. The switches are saved to your account. The bell lists everything either way; the switches only choose which emails you get.' },
      EMAIL_OR_ROLE,
    ],
  },
  {
    title: 'Tools and learning',
    icon: 'book',
    topics: [
      NOT_CONNECTED_TOOL,
      WORKSPACE,
      { q: 'How do courses work?', a: 'Learning isn’t connected to the company system yet, so its courses are samples to try out, and nothing you do there is kept.', link: { to: '/portal/lms', label: 'Open Learning' } },
      OPEN_POLICIES,
    ],
  },
  {
    title: 'Managing the team',
    icon: 'shield',
    topics: [
      { q: 'What can admins do?', a: 'Admins add employees and interns, change the roles of sub admins, employees and interns or remove them, give tasks, issue certificates, publish policies, add resources and run HR OPS. Only a Super Admin can add, change or remove admins.', only: 'admin' },
      { q: 'What can a sub admin do?', a: 'Sub admins see everyone in People, give tasks to employees and interns, and change or delete the tasks they gave. Adding or removing people, changing roles, certificates, policies, resources and HR OPS stay with admins.', only: 'subadmin' },
      { q: 'How do I verify a company or an employee?', a: `${VERIFY_STEPS} This desk still shows sample data until it’s connected.`, audience: 'admin', link: VERIFY_LINK },
    ],
  },
  {
    title: 'Good to know',
    icon: 'alert',
    topics: [
      { q: 'Which pages save my changes?', a: 'People, Tasks, Certificates, Policy & Compliance, Resources, the bell, your photo and your password are saved to the company system. Pages marked “Sample data” and calendar events last only until you reload. e-Office check-ins stay in this browser for now.' },
    ],
  },
];

const visibleTo = (t: HelpTopic, role: Role) =>
  (!t.only || t.only === role) && (!t.audience || (t.audience === 'manager' ? managesPortal(role) : role === 'admin'));

/** The groups `role` sees, narrowed to the topics matching `query` (question or answer); empty groups are dropped. */
export function helpGroups(connected: boolean, role: Role, query: string): HelpGroup[] {
  const q = query.trim().toLowerCase();
  return (connected ? CONNECTED_HELP : DEMO_HELP)
    .map((g) => ({ ...g, topics: g.topics.filter((t) => visibleTo(t, role) && (!q || `${t.q} ${t.a}`.toLowerCase().includes(q))) }))
    .filter((g) => g.topics.length);
}

/** The real admins and super admins to ask, by name, leaving out the reader. */
export const helpAdmins = (people: DirectoryPerson[], myEmail: string) =>
  people.filter((p) => (p.accountRole === 'Admin' || p.accountRole === 'Superadmin') && p.email.toLowerCase() !== myEmail.toLowerCase()).map((p) => p.name);
