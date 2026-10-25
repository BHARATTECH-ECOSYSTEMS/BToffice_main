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
  /** `href`: an outside address, opened in a new tab instead of the portal page `to`. */
  link?: { to: string; label: string; href?: string };
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
      { q: 'How does e-Office attendance work?', a: 'Press “Join e-Office” on your dashboard when you start and “Leave” when you stop; you can join again later, and the card adds up your time for the day. It’s saved to your account, in India time. If you forget to leave, the visit ends at midnight and is marked “No check-out”; ask an admin to correct it. Your days are under My attendance. Admins and sub admins see everyone’s.', link: { to: '/portal/attendance', label: 'Open attendance' } },
    ],
  },
  {
    title: 'Your account',
    icon: 'users',
    topics: [
      { q: 'How do I change my name or photo?', a: 'Open Settings, then Profile, to upload or remove your photo; it’s saved to your account, so it shows on any device. Your name is on your certificates, so only an admin can change it, from the People page; ask one if it’s wrong.', link: { to: '/portal/settings?tab=profile', label: 'Open Profile settings' } },
      { q: 'Where does my join date come from?', a: 'An admin sets your first working day from the People page. It shows on your Profile and ID card (valid for three years from joining, renewed every three years) and as your work anniversary on the calendar. Until it’s set, your ID card says “Not on file”; ask an admin if it’s missing or wrong.' },
      { q: 'How do I change my password?', a: 'Open Settings, then Password. The checklist shows what the new password still needs. Once it’s changed, every other sign-in ends and you sign in again with the new password. Forgot it? Press “Forgot password?” on the sign-in window and we’ll email you a link that works once, for 30 minutes.', link: { to: '/portal/settings?tab=password', label: 'Open Password settings' } },
      { q: 'Can I choose which emails I get?', a: 'Yes: open the bell next to your name and press the gear. The switches are saved to your account. The bell lists everything either way; the switches only choose which emails you get.' },
      EMAIL_OR_ROLE,
      { q: 'What is the Community?', a: 'Everyone who has left Bharattech, grouped by the stream they worked in; everyone sees their names and when they left. Your work email stops when you leave, so you can give a personal email on the Community page now: when you leave, the community reaches you there. Only admins see it, and you can change or remove it any time.', link: { to: '/portal/community', label: 'Open Community' } },
    ],
  },
  {
    title: 'Tools and learning',
    icon: 'book',
    topics: [
      NOT_CONNECTED_TOOL,
      WORKSPACE,
      { q: 'How do courses work?', a: 'Every course in Learning is free. Open one and enroll; lectures marked Preview are open before that. Mark lectures as done and rate the course from the player: your enrollments, progress and rating are saved to your account.', only: 'employee', link: { to: '/portal/lms', label: 'Open Learning' } },
      { q: 'How do courses work?', a: 'Every course in Learning is free. Enroll in any course; your progress and rating are saved to your account. You can publish courses too (View as educator, then Add course); a new course goes live at once and everyone is told in their bell. You change, unpublish or delete your own courses from My courses; admins can change any.', audience: 'manager', link: { to: '/portal/lms', label: 'Open Learning' } },
      OPEN_POLICIES,
    ],
  },
  {
    title: 'Managing the team',
    icon: 'shield',
    topics: [
      { q: 'What can admins do?', a: 'Admins add employees and interns, change the roles of sub admins, employees and interns or remove them, give tasks, issue certificates, publish policies, add resources and run HR OPS. Only a Super Admin can add, change or remove admins.', only: 'admin' },
      {
        q: 'How do I invite someone?',
        a: 'On People, press “Add people” and give their name, work email and role. They get an email with a temporary password and the sign-in link, and join the People list at their first sign-in. Until then they’re under Pending invites, where you can send the invite again (with a new temporary password) or cancel it, so the emailed password stops working. Admins invite employees and interns; a Super Admin invites any role.',
        audience: 'admin',
        link: { to: '/portal/people', label: 'Open People' },
      },
      {
        q: 'How do I correct someone’s attendance?',
        a: 'Open Attendance, pick the day, open the person and press Correct on a visit that has ended. Give the times they really came in and left (India time, on that day) and why; the change and its reason stay on the visit, and the person sees them. You correct the same people you may edit in People, and yourself.',
        audience: 'admin',
        link: { to: '/portal/attendance', label: 'Open attendance' },
      },
      { q: 'What can a sub admin do?', a: 'Sub admins see everyone in People, give tasks to employees and interns, and change or delete the tasks they gave. Adding or removing people, changing roles, certificates, policies, resources and HR OPS stay with admins.', only: 'subadmin' },
      {
        q: 'How do I verify a company or an employee?',
        a: `${VERIFY_STEPS} Company and employee requests are saved to the company system; a decided one is kept as the record, so only a pending request can be deleted. When you open an employee’s request, they’re asked in their bell and by email to upload their Aadhaar, PAN, education certificates and a previous employer’s letter in their Profile; each of those checks can be ticked once its file is there, Previous employment can instead be marked not applicable with a reason, and every time an admin opens a file it’s recorded in the request’s activity. Verification Requests come from other companies through the website’s form; you get a bell note for each, and your decision is emailed to them as a plain yes or no about the details they sent, never your note.`,
        audience: 'admin',
        link: VERIFY_LINK,
      },
      {
        q: 'How do I mark someone as left?',
        a: 'On the People page, press “Mark as left” on their row (their stream must be set first, since it picks their community). They move to the Community that day, their sign-in is switched off, and their ID documents are deleted 60 days later. Their Employee ID, tasks and certificates stay. Marked someone by mistake? Press “Bring back” on their Community card. Super Admins can mark admins as left; admins can mark sub admins, employees and interns.',
        audience: 'admin',
        link: { to: '/portal/people', label: 'Open People' },
      },
      {
        q: 'How do internal jobs work?',
        a: 'On the Community page, press “Post an internal job”: it’s emailed to every member of that community with a personal email. Former colleagues apply by email; add each applicant to the job from its card. Mark whether they meet the criteria (“Not this time” sends a kind email with no reason), then send the knowledge check: you type the test link or instructions and it’s emailed to them. If they pass, “Passed, rejoin” brings them back to People with the same Employee ID, today as their join date, and an email on how to sign in. Close a posting to stop adding applicants.',
        audience: 'admin',
        link: { to: '/portal/community', label: 'Open Community' },
      },
      {
        q: 'What are internal job postings?',
        a: 'Roles at Bharattech offered to former colleagues first, on the Community page. You can see the postings; admins post them, add the people who apply, and run the knowledge checks.',
        only: 'subadmin',
        link: { to: '/portal/community', label: 'Open Community' },
      },
      {
        q: 'How do I share a referral?',
        a: 'On the Community page, press “Share a referral” and give the role, the company, the community it’s for, and a link or note if you have one. Every member of that community with a personal email gets it by email, one email each, and the list shows how many it reached. Sub admins see the list too. Removing a referral doesn’t take back the emails already sent.',
        audience: 'admin',
        link: { to: '/portal/community', label: 'Open Community' },
      },
    ],
  },
  {
    title: 'Good to know',
    icon: 'alert',
    topics: [
      { q: 'Which pages save my changes?', a: 'People, Tasks, Certificates, Policy & Compliance, Resources, calendar events, join dates, courses and your progress in them, verifications (including requests from other companies), the Community’s members, personal emails, referrals and internal jobs, e-Office check-ins, the bell, your photo and your password are saved to the company system. Pages marked “Sample data” last only until you reload.' },
    ],
  },
];

// When courses live in the LMS Platform (owner's 3B), its answers replace the ones about the portal's own Learning pages.
const PLATFORM_STUDENT =
  'Courses are in the LMS Platform, which opens in a new tab when you choose Learning in the top bar. Sign in there with your work email and your portal password. Every course is free: open one and enroll; lectures marked Preview are open before that. The LMS Platform keeps your enrollments and progress.';
const PLATFORM_MANAGER =
  'Courses are in the LMS Platform, which opens in a new tab when you choose Learning in the top bar. Sign in there with your work email and your portal password. Every course is free. To publish one, choose View as Educator, then Add Course: it goes live at once. Courses can’t be changed or removed there yet, so check a course before you publish it.';

function onPlatform(t: HelpTopic, href: string): HelpTopic {
  if (t.q === 'How do courses work?')
    return { ...t, a: t.audience === 'manager' ? PLATFORM_MANAGER : PLATFORM_STUDENT, link: { to: '/portal/lms', label: 'Open the LMS Platform', href } };
  if (t.q === 'Which pages save my changes?')
    return { ...t, a: `${t.a.replace('courses and your progress in them, ', '')} The LMS Platform keeps your courses, enrollments and progress itself.` };
  return t;
}

const visibleTo = (t: HelpTopic, role: Role) =>
  (!t.only || t.only === role) && (!t.audience || (t.audience === 'manager' ? managesPortal(role) : role === 'admin'));

/**
 * The groups `role` sees, narrowed to the topics matching `query` (question or answer); empty groups are dropped.
 * `platform`: the LMS Platform's address when Learning opens it (connected only).
 */
export function helpGroups(connected: boolean, role: Role, query: string, platform?: string): HelpGroup[] {
  const q = query.trim().toLowerCase();
  const groups = connected ? CONNECTED_HELP : DEMO_HELP;
  return (platform && connected ? groups.map((g) => ({ ...g, topics: g.topics.map((t) => onPlatform(t, platform)) })) : groups)
    .map((g) => ({ ...g, topics: g.topics.filter((t) => visibleTo(t, role) && (!q || `${t.q} ${t.a}`.toLowerCase().includes(q))) }))
    .filter((g) => g.topics.length);
}

/** The real admins and super admins to ask, by name, leaving out the reader. */
export const helpAdmins = (people: DirectoryPerson[], myEmail: string) =>
  people.filter((p) => (p.accountRole === 'Admin' || p.accountRole === 'Superadmin') && p.email.toLowerCase() !== myEmail.toLowerCase()).map((p) => p.name);
