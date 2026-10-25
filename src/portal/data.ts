import type { HueName } from '../gl/palette';
import type { Role } from './session';
import { readToolLinks, withToolLinks } from './toolLinks';

/**
 * Sample data for the employee portal until the backend exists.
 *
 * Every person, email and record below is made up (emails use example.com, which is reserved for examples).
 * Real names and emails from the old system's screenshots are deliberately NOT copied here.
 */

export type PersonRole = Role | 'intern';
/** `invited` = added but not signed in yet; `inactive` = an admin switched the account off. */
export type PersonStatus = 'active' | 'inactive' | 'invited';
export const ROLE_LABEL: Record<PersonRole, string> = { admin: 'Admin', subadmin: 'Sub Admin', employee: 'Employee', intern: 'Intern' };
export const PERSON_STATUS_LABEL: Record<PersonStatus, string> = { active: 'Active', inactive: 'Inactive', invited: 'Invited' };
export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Person {
  id: string;
  name: string;
  email: string;
  role: PersonRole;
  phone: string;
  team: string;
  /** The line of work they're in; it decides which community they join when they leave. */
  stream: Stream;
  status: PersonStatus;
  /** First working day (ISO). Someone still invited has none yet. */
  joined?: string;
  /** Where they work; when unset, the company's head office (HQ in content.ts). */
  office?: string;
  /**
   * The personal email they gave when joining the community ahead of leaving. Marking them as left carries it into
   * the community with them, so they are reachable from day one.
   */
  personalEmail?: string;
}

/* ── Community: people who have left, grouped by the stream they worked in ── */

export type Stream = 'tech' | 'operations' | 'hr' | 'finance';
export const STREAMS: { id: Stream; label: string }[] = [
  { id: 'tech', label: 'Tech' },
  { id: 'operations', label: 'Operations' },
  { id: 'hr', label: 'HR' },
  { id: 'finance', label: 'Finance' },
];
export const STREAM_LABEL = Object.fromEntries(STREAMS.map((s) => [s.id, s.label])) as Record<Stream, string>;
/** Each stream's colour on the Community wall (a member card's stripe, ring and badge), one per stream. */
export const STREAM_TONE: Record<Stream, HueName> = { tech: 'violet', operations: 'tangerine', hr: 'saffron', finance: 'ink' };

/**
 * Someone who has left. Marking a person as left moves them here, into their stream's community. Their work email
 * stops working when they go, so an admin adds the personal email the community reaches them on.
 */
export type Alumnus = Person & { left: string; personalEmail?: string };

/** A former colleague back in the directory after rejoining: active again, with today as their join date. */
export function rejoinedPerson(former: Alumnus, today: string): Person {
  // the personal email stays, as on the backend: it's how they were reached while away
  const { left: _left, ...person } = former;
  return { ...person, status: 'active', joined: today };
}

/**
 * An internal job posting (IJP): an opening at Bharattech offered back to former colleagues in one stream. Those
 * who apply and meet its criteria take a short knowledge check instead of an interview, and on passing they come
 * back into the directory.
 */
export type WorkMode = 'onsite' | 'hybrid' | 'remote';
export const WORK_MODE_LABEL: Record<WorkMode, string> = { onsite: 'On-site', hybrid: 'Hybrid', remote: 'Remote' };

export interface InternalJob {
  id: string;
  stream: Stream;
  title: string;
  /** What the role involves, in a line or two. */
  about: string;
  location: string;
  mode: WorkMode;
  /** Free text, like "2+ years". */
  experience: string;
  openings: number;
  /** The last day to apply (ISO); none means until it's filled. */
  closes?: string;
  /** What someone needs to be considered, one line each. */
  criteria: string[];
  /** What the knowledge check that replaces the interview covers. */
  check: string;
  /** Where former colleagues send their application, since they can't sign in yet. */
  applyEmail: string;
  postedBy: string;
  posted: string;
  open: boolean;
}

/** Where an application to an internal job is: applied → meets criteria → knowledge check sent → rejoined, or declined. */
export type ApplicationStage = 'applied' | 'eligible' | 'checking' | 'rejoined' | 'declined';

export interface JobApplication {
  id: string;
  jobId: string;
  /** The former colleague who applied (an Alumnus id; it stays the same after they rejoin). */
  personId: string;
  stage: ApplicationStage;
  /** When the stage last changed (ISO date). */
  updated: string;
}

/** A job opening passed on to former colleagues in one stream. */
export interface Referral {
  id: string;
  stream: Stream;
  title: string;
  company: string;
  /** An https link to the opening, or empty. */
  link: string;
  note: string;
  postedBy: string;
  posted: string;
}

// Sample records only: every person, company and link here is made up.
export const SEED_ALUMNI: Alumnus[] = [
  { id: 'EMP9', name: 'Neha Kapoor', email: 'neha.kapoor@example.com', role: 'employee', phone: '', team: 'BharatTech', stream: 'tech', status: 'inactive', left: '2026-06-30', personalEmail: 'neha.kapoor.home@example.net' },
  { id: 'EMP10', name: 'Vikram Joshi', email: 'vikram.joshi@example.com', role: 'employee', phone: '', team: 'BharatTech', stream: 'operations', status: 'inactive', left: '2026-03-31' },
  { id: 'EMP11', name: 'Farah Khan', email: 'farah.khan@example.com', role: 'employee', phone: '', team: 'BharatTech', stream: 'finance', status: 'inactive', left: '2025-12-15' },
  { id: 'EMP12', name: 'Aditya Bose', email: 'aditya.bose@example.com', role: 'subadmin', phone: '', team: 'BharatTech', stream: 'hr', status: 'inactive', left: '2026-08-14' },
  { id: 'EMP13', name: 'Tanvi Shah', email: 'tanvi.shah@example.com', role: 'intern', phone: '', team: 'BharatTech', stream: 'tech', status: 'inactive', left: '2025-11-30' },
];
export const SEED_JOBS: InternalJob[] = [
  {
    id: 'J1',
    stream: 'tech',
    title: 'Frontend Engineer (sample)',
    about: 'Build the screens of the Origin platform with the product team: the employee portal, dashboards and the public site.',
    location: 'Kanpur',
    mode: 'hybrid',
    experience: '1+ year',
    openings: 2,
    closes: '2026-11-15',
    criteria: ['Worked with us for at least a year', 'Left in good standing', 'Comfortable with React and TypeScript'],
    check: 'A 45-minute online test on React, TypeScript and how we build the portal, sent to your personal email. Pass it and you rejoin.',
    applyEmail: 'hello@bharattechorigin.com',
    postedBy: 'Aanya Sharma',
    posted: '2026-10-12',
    open: true,
  },
];
export const SEED_APPLICATIONS: JobApplication[] = [{ id: 'A1', jobId: 'J1', personId: 'EMP9', stage: 'applied', updated: '2026-10-14' }];
export const SEED_REFERRALS: Referral[] = [
  { id: 'R1', stream: 'tech', title: 'Backend Engineer (Go)', company: 'Northwind Logistics', link: 'https://northwind.example.com/careers', note: 'Their platform team is hiring two people; ask for Meghna in the referral.', postedBy: 'Aanya Sharma', posted: '2026-10-11' },
  { id: 'R2', stream: 'finance', title: 'Senior Accounts Executive', company: 'Contoso Analytics', link: '', note: 'Bengaluru office, hybrid.', postedBy: 'Arjun Rao', posted: '2026-10-06' },
  { id: 'R3', stream: 'operations', title: 'Operations Lead', company: 'Fabrikam Components', link: 'https://fabrikam.example.com/jobs', note: '', postedBy: 'Aanya Sharma', posted: '2026-09-28' },
];

export const SEED_PEOPLE: Person[] = [
  { id: 'EMP1', joined: '2023-04-03', name: 'Aanya Sharma', email: 'aanya.sharma@example.com', role: 'admin', phone: '', team: 'BharatTech', stream: 'hr', status: 'active' },
  { id: 'EMP2', joined: '2024-01-15', name: 'Kabir Mehta', email: 'kabir.mehta@example.com', role: 'employee', phone: '', team: 'BharatTech', stream: 'tech', status: 'active' },
  { id: 'EMP3', joined: '2024-07-01', name: 'Ishita Verma', email: 'ishita.verma@example.com', role: 'employee', phone: '', team: 'BharatTech', stream: 'tech', status: 'active' },
  { id: 'EMP4', joined: '2024-11-18', name: 'Rohan Iyer', email: 'rohan.iyer@example.com', role: 'employee', phone: '', team: 'BharatTech', stream: 'tech', status: 'active' },
  { id: 'EMP5', joined: '2026-06-02', name: 'Meera Nair', email: 'meera.nair@example.com', role: 'intern', phone: '', team: 'BharatTech', stream: 'operations', status: 'active' },
  { id: 'EMP6', joined: '2023-08-21', name: 'Arjun Rao', email: 'arjun.rao@example.com', role: 'admin', phone: '', team: 'BharatTech', stream: 'operations', status: 'active' },
  { id: 'EMP7', joined: '2025-02-10', name: 'Sana Qureshi', email: 'sana.qureshi@example.com', role: 'employee', phone: '', team: 'BharatTech', stream: 'tech', status: 'active' },
  { id: 'EMP8', joined: '2026-07-01', name: 'Dev Malhotra', email: 'dev.malhotra@example.com', role: 'intern', phone: '', team: 'BharatTech', stream: 'finance', status: 'active' },
];

export const CERTIFICATE_TYPES = [
  { id: 'bonafide', name: 'Bonafide Certificate', body: 'Official proof of enrollment and institutional association.' },
  { id: 'character', name: 'Character Certificate', body: 'Verification of conduct and profile details.' },
  { id: 'transfer', name: 'Transfer Certificate', body: 'For migration, transfer, or an institutional exit.' },
  { id: 'completion', name: 'Course Completion', body: 'Certificate for successful completion of a programme.' },
] as const;

export type CertificateType = (typeof CERTIFICATE_TYPES)[number]['id'];

export interface Certificate {
  id: string;
  type: CertificateType;
  recipientId: string;
  issuedBy: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
}

export const SEED_CERTIFICATES: Certificate[] = [
  { id: 'C-1010', type: 'bonafide', recipientId: 'EMP5', issuedBy: 'Aanya Sharma', date: '2026-10-08' },
  { id: 'C-1009', type: 'transfer', recipientId: 'EMP8', issuedBy: 'Arjun Rao', date: '2026-09-29' },
  { id: 'C-1008', type: 'completion', recipientId: 'EMP3', issuedBy: 'Aanya Sharma', date: '2026-09-18' },
  { id: 'C-1007', type: 'character', recipientId: 'EMP2', issuedBy: 'Aanya Sharma', date: '2026-09-02' },
  { id: 'C-1006', type: 'bonafide', recipientId: 'EMP4', issuedBy: 'Arjun Rao', date: '2026-08-21' },
  { id: 'C-1005', type: 'completion', recipientId: 'EMP7', issuedBy: 'Arjun Rao', date: '2026-08-04' },
  { id: 'C-1004', type: 'bonafide', recipientId: 'EMP5', issuedBy: 'Aanya Sharma', date: '2026-07-15' },
  { id: 'C-1003', type: 'character', recipientId: 'EMP8', issuedBy: 'Aanya Sharma', date: '2026-06-30' },
];

/**
 * Company tools the portal opens. Addresses come from the site settings (toolLinks.ts); a tool without one shows
 * "not connected yet".
 */
export interface Tool {
  id: string;
  name: string;
  /** The sidebar's label, where it differs from the name. */
  navLabel?: string;
  category: string;
  body: string;
  tags: [string, string];
  url: string;
  icon: PortalIconName;
  /** The main button's label on its Resources card ("Open" or "Open Platform"). */
  openLabel?: string;
  /** The short line between the card's two buttons. */
  caption?: string;
  /** The card's second, outlined button: the installer, the plain web address, or a sub-page. Empty url = not connected. */
  secondary?: { label: string; url: string; icon: PortalIconName };
  /** Only shown to admins. */
  adminOnly?: boolean;
  /** Shown in the sidebar (the rest are reached from Resources). */
  inNav?: boolean;
  /** Only in the sidebar, with no card on Resources. */
  navOnly?: boolean;
}

const web = (icon: PortalIconName) => ({ label: 'Direct Web Access', url: '', icon });

const BASE_TOOLS: Tool[] = [
  { id: 'eoffice', name: 'e-Office', category: 'Virtual office', body: 'The online office the team works from during the day.', tags: ['Daily check-in', 'Team rooms'], url: '', icon: 'home', openLabel: 'Open' },
  { id: 'huly', name: 'Huly.io', navLabel: 'Workspace', category: 'Team workspace', body: 'Projects, chat and documents for the whole team in one place.', tags: ['Projects & chat', 'Documents'], url: '', icon: 'users', inNav: true, openLabel: 'Open', secondary: web('users') },
  { id: 'coder', name: 'Coder', category: 'Tool', body: 'Open the BharatTech coding workspace.', tags: ['Windows', 'macOS'], url: '', icon: 'code', openLabel: 'Open', caption: "Don't have an app yet?", secondary: { label: 'Install / Update app', url: '', icon: 'download' } },
  { id: 'filesync', name: 'File Transfer', category: 'Files', body: 'Send large files with WeTransfer, a public service outside the company.', tags: ['Large files', 'Public service'], url: '', icon: 'transfer', inNav: true, navOnly: true },
  { id: 'plane', name: 'Plane', navLabel: 'Projects (Plane)', category: 'Project management', body: 'Agile project management with issues, cycles and modules.', tags: ['Kanban & cycles', 'SSO ready'], url: '', icon: 'kanban', inNav: true, caption: 'Self-Hosted Workspace Suite', secondary: web('kanban') },
  { id: 'securo', name: 'Securo', navLabel: 'Securo (Finance)', category: 'Personal finance', body: 'Track accounts, spending, budgets and transactions.', tags: ['Accounts & budgets', 'SSO ready'], url: '', icon: 'shield', inNav: true, caption: 'Self-Hosted Finance Suite', secondary: web('shield') },
  { id: 'chatwoot', name: 'Chatwoot', navLabel: 'Chatwoot Support', category: 'Support & engagement', body: 'Customer engagement with live chat and shared inboxes.', tags: ['Live chat', 'SSO ready'], url: '', icon: 'chat', inNav: true, caption: 'Omnichannel Customer Support', secondary: web('chat') },
  { id: 'screego', name: 'Server (Screego)', navLabel: 'Screen Share (Server)', category: 'Screen sharing', body: 'Low-latency, high-resolution screen sharing in multi-user rooms.', tags: ['WebRTC HD', 'Multi-user rooms'], url: '', icon: 'screen', inNav: true, caption: 'Developer Screen Share Suite', secondary: web('screen') },
  { id: 'invoice', name: 'Invoice Builder', category: 'Finance & invoicing', body: 'Offline-first invoicing and quotations with PDF export.', tags: ['PDF export', 'Desktop app'], url: '', icon: 'invoice', inNav: true, adminOnly: true, caption: 'Self-Hosted Finance Suite', secondary: { label: 'Invoices & Quotes', url: '', icon: 'file' } },
  { id: 'librechat', name: 'LibreChat', category: 'AI assistant', body: 'The BharatTech AI assistant, signed in with company SSO.', tags: ['GPT & Claude', 'SSO ready'], url: '', icon: 'spark', openLabel: 'Open', caption: 'Enterprise AI & Code Assistant', secondary: web('spark') },
  { id: 'excalidraw', name: 'Excalidraw', category: 'Whiteboard & diagrams', body: 'A shared whiteboard for sketches, wireframes and architecture flows.', tags: ['Hand-drawn', 'Self-hosted'], url: '', icon: 'pen', caption: 'Collaborative Sketching Suite', secondary: web('pen') },
  { id: 'lobehub', name: 'LobeHub', category: 'AI agents', body: 'A multi-model AI workspace with custom agents and plugins.', tags: ['Keycloak SSO', 'Multi-agent'], url: '', icon: 'layers', caption: 'Autonomous AI Agent Hub', secondary: web('layers') },
  { id: 'hrms', name: 'HRMS', category: 'HR management', body: 'Directory, leave and attendance, payroll and performance.', tags: ['Leave & attendance', 'SSO'], url: '', icon: 'users' },
];

export const TOOLS: Tool[] = withToolLinks(BASE_TOOLS, readToolLinks(import.meta.env as Record<string, string | undefined> | undefined));

export const toolById = (id: string) => TOOLS.find((t) => t.id === id);

export interface LinkResource {
  id: string;
  name: string;
  url: string;
  assignedTo: string[];
}

export const SEED_LINKS: LinkResource[] = [
  { id: 'L1', name: 'React documentation', url: 'https://react.dev/learn', assignedTo: [] },
  { id: 'L2', name: 'Class Central', url: 'https://www.classcentral.com/', assignedTo: [] },
];

/* ── HR OPS: verification requests ── */

export type VerificationStatus = 'pending' | 'verified' | 'rejected';
/** A request still pending after this many days is flagged on the desk and needs a follow-up on the calendar. */
export const VERIFICATION_STALE_DAYS = 7;

/** The documents an admin ticks off before a request can be marked verified. */
export const COMPANY_CHECKS = [
  { id: 'registration', label: 'Registration certificate' },
  { id: 'tax', label: 'GST / tax registration' },
  { id: 'address', label: 'Registered address' },
  { id: 'bank', label: 'Bank account details' },
  { id: 'director', label: 'Director identity' },
] as const;
/**
 * The government IDs an employee uploads for their verification, from the link HR sends. Both are required: PAN is
 * what lets us show their employment. PDFs only, 1 MB at most. They are personal data, so they are deleted
 * automatically ID_RETENTION_DAYS after the person leaves; only their basic record stays.
 */
export const ID_DOCS = [
  { id: 'aadhaar', label: 'Aadhaar card', hint: 'A masked Aadhaar, with only the last 4 digits showing, is enough and is safer.' },
  { id: 'pan', label: 'PAN card', hint: 'Needed to show your employment with us.' },
] as const;
export type IdDocKind = (typeof ID_DOCS)[number]['id'];
/** The Aadhaar and PAN checks are the uploads above, so they share ids: a check knows which file it is about. */
export const EMPLOYEE_CHECKS = [
  ...ID_DOCS.map(({ id, label }) => ({ id, label })),
  { id: 'education', label: 'Education certificates' },
  { id: 'employment', label: 'Previous employment' },
  { id: 'references', label: 'References' },
];
/**
 * Connected, the employee also uploads education certificates (at least one of three) and a previous employer's
 * letter; each file has the check it proves. Ids and checks match the backend's (models/Verification.js DOCUMENTS).
 * The demo keeps only Aadhaar and PAN (ID_DOCS).
 */
export const VERIFICATION_FILES = [
  ...ID_DOCS.map((d) => ({ ...d, check: d.id, required: true })),
  { id: 'degree', check: 'education', label: 'Degree certificate', hint: 'Your highest degree or diploma.', required: false },
  { id: 'marksheet', check: 'education', label: 'Final marksheet', hint: 'The final year’s marksheet of that degree.', required: false },
  { id: 'class12', check: 'education', label: 'Class 12 marksheet', hint: 'Your 12th standard marksheet.', required: false },
  { id: 'experience', check: 'employment', label: 'Relieving or experience letter', hint: 'From your last employer.', required: false },
] as const;
export type FileKind = (typeof VERIFICATION_FILES)[number]['id'];
/** Checks that may be marked "Not applicable" with a reason (HR), or as a first job (the employee). */
export const SKIPPABLE_CHECKS = ['employment'] as const;
export type SkippableCheck = (typeof SKIPPABLE_CHECKS)[number];
export const NA_REASON_MAX = 300;

export const ID_DOC_MAX_MB = 1;
export const ID_RETENTION_DAYS = 60;
export interface IdDocument {
  personId: string;
  kind: IdDocKind;
  fileName: string;
  size: number;
  /** A browser object URL: the file only lives in this tab until there is a backend. */
  url: string;
  uploaded: string;
}

/** For a request from another company asking us to confirm that someone worked here. */
export const EMPLOYMENT_CHECKS = [
  { id: 'record', label: 'Found in our records' },
  { id: 'dates', label: 'Dates of employment match' },
  { id: 'designation', label: 'Designation matches' },
  { id: 'consent', label: 'Candidate consent on file' },
] as const;

interface VerificationBase {
  id: string;
  status: VerificationStatus;
  /** Ids of the checks already ticked off. */
  done: string[];
  note: string;
  requestedBy: string;
  requested: string;
  decidedBy?: string;
  decided?: string;
  /** What happened, oldest first: the audit trail a verification has to keep. */
  log: { at: string; by: string; text: string }[];
}
export type Verification =
  | (VerificationBase & { kind: 'company'; company: string; registration: string; website: string; contactEmail: string })
  | (VerificationBase & { kind: 'employee'; personId: string })
  // sent in from the website's footer form; from/to are months ("2024-03"), an empty `to` means still here
  | (VerificationBase & {
      kind: 'employment';
      requesterCompany: string;
      requesterName: string;
      requesterEmail: string;
      candidate: string;
      employeeId: string;
      designation: string;
      from: string;
      to: string;
    });
export type VerificationKind = Verification['kind'];

// Sample records only: every company, number and address here is made up.
export const SEED_VERIFICATIONS: Verification[] = [
  {
    kind: 'company', id: 'V1', company: 'Northwind Logistics Pvt Ltd', registration: 'DEMO-CIN-0001', website: 'https://northwind.example.com', contactEmail: 'accounts@northwind.example.com',
    status: 'pending', done: ['registration', 'tax'], note: '', requestedBy: 'Aanya Sharma', requested: '2026-10-08',
    log: [
      { at: '2026-10-08T10:12', by: 'Aanya Sharma', text: 'Opened the request' },
      { at: '2026-10-09T15:40', by: 'Aanya Sharma', text: 'Checked Registration certificate' },
      { at: '2026-10-09T15:42', by: 'Aanya Sharma', text: 'Checked GST / tax registration' },
    ],
  },
  {
    kind: 'company', id: 'V2', company: 'Contoso Analytics LLP', registration: 'DEMO-LLPIN-0002', website: 'https://contoso.example.com', contactEmail: 'legal@contoso.example.com',
    status: 'verified', done: ['registration', 'tax', 'address', 'bank', 'director'], note: 'All documents match the registry.', requestedBy: 'Aanya Sharma', requested: '2026-09-22', decidedBy: 'Arjun Rao', decided: '2026-09-29',
    log: [
      { at: '2026-09-22T09:30', by: 'Aanya Sharma', text: 'Opened the request' },
      { at: '2026-09-25T12:05', by: 'Arjun Rao', text: 'Checked all 5 documents' },
      { at: '2026-09-29T11:20', by: 'Arjun Rao', text: 'Marked verified' },
    ],
  },
  {
    kind: 'company', id: 'V3', company: 'Fabrikam Components', registration: 'DEMO-CIN-0003', website: '', contactEmail: 'hello@fabrikam.example.com',
    status: 'rejected', done: ['registration'], note: 'Tax registration number did not match the company name.', requestedBy: 'Arjun Rao', requested: '2026-09-15', decidedBy: 'Arjun Rao', decided: '2026-09-18',
    log: [
      { at: '2026-09-15T14:00', by: 'Arjun Rao', text: 'Opened the request' },
      { at: '2026-09-16T10:15', by: 'Arjun Rao', text: 'Checked Registration certificate' },
      { at: '2026-09-18T16:45', by: 'Arjun Rao', text: 'Rejected' },
    ],
  },
  {
    kind: 'employee', id: 'V4', personId: 'EMP8', status: 'pending', done: ['education', 'references'], note: '', requestedBy: 'Aanya Sharma', requested: '2026-10-10',
    log: [
      { at: '2026-10-10T09:05', by: 'Aanya Sharma', text: 'Opened the request' },
      { at: '2026-10-12T11:30', by: 'Aanya Sharma', text: 'Checked Education certificates' },
      { at: '2026-10-12T11:34', by: 'Aanya Sharma', text: 'Checked References' },
    ],
  },
  {
    kind: 'employee', id: 'V5', personId: 'EMP7', status: 'verified', done: ['aadhaar', 'pan', 'education', 'employment', 'references'], note: '', requestedBy: 'Aanya Sharma', requested: '2026-09-01', decidedBy: 'Aanya Sharma', decided: '2026-09-09',
    log: [
      { at: '2026-09-01T10:00', by: 'Aanya Sharma', text: 'Opened the request' },
      { at: '2026-09-08T17:10', by: 'Aanya Sharma', text: 'Checked all 5 documents' },
      { at: '2026-09-09T09:45', by: 'Aanya Sharma', text: 'Marked verified' },
    ],
  },
  {
    kind: 'employee', id: 'V6', personId: 'EMP5', status: 'pending', done: [], note: '', requestedBy: 'Arjun Rao', requested: '2026-10-13',
    log: [{ at: '2026-10-13T13:25', by: 'Arjun Rao', text: 'Opened the request' }],
  },
  {
    kind: 'employment', id: 'V7', requesterCompany: 'Tailspin Consulting', requesterName: 'Priya Desai', requesterEmail: 'hr@tailspin.example.com',
    candidate: 'Neha Kapoor', employeeId: '', designation: 'Data Analyst', from: '2024-02', to: '2026-06',
    status: 'pending', done: ['consent'], note: '', requestedBy: 'Priya Desai (Tailspin Consulting)', requested: '2026-10-14',
    log: [
      { at: '2026-10-14T11:02', by: 'Priya Desai (Tailspin Consulting)', text: 'Sent the request from the website' },
      { at: '2026-10-14T16:20', by: 'Aanya Sharma', text: 'Checked Candidate consent on file' },
    ],
  },
  {
    kind: 'employment', id: 'V8', requesterCompany: 'Wingtip Background Checks', requesterName: 'Rahul Menon', requesterEmail: 'verify@wingtip.example.com',
    candidate: 'Sana Qureshi', employeeId: 'EMP7', designation: 'Research Engineer', from: '2025-01', to: '',
    status: 'verified', done: ['record', 'dates', 'designation', 'consent'], note: 'Currently employed; dates and designation confirmed.', requestedBy: 'Rahul Menon (Wingtip Background Checks)', requested: '2026-10-02', decidedBy: 'Arjun Rao', decided: '2026-10-03',
    log: [
      { at: '2026-10-02T09:40', by: 'Rahul Menon (Wingtip Background Checks)', text: 'Sent the request from the website' },
      { at: '2026-10-03T10:15', by: 'Arjun Rao', text: 'Checked all 4 items' },
      { at: '2026-10-03T10:16', by: 'Arjun Rao', text: 'Marked verified' },
    ],
  },
];

export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  title: string;
  assigneeId: string;
  /** The person's name when it comes with the task (from the backend); the demo looks it up by assigneeId. */
  assigneeName?: string;
  due: string;
  status: TaskStatus;
}

export const SEED_TASKS: Task[] = [
  { id: 'T1', title: 'Finish the onboarding checklist', assigneeId: 'EMP5', due: '2026-10-20', status: 'doing' },
  { id: 'T2', title: 'Review the edge inference benchmark', assigneeId: 'EMP3', due: '2026-10-23', status: 'todo' },
  { id: 'T3', title: 'Update the sensor fusion notes', assigneeId: 'EMP4', due: '2026-10-12', status: 'done' },
];

/* ── Calendar events: added by admins, shown on everyone's calendar ── */

export type EventKind = 'holiday' | 'meeting' | 'training' | 'deadline';
export const EVENT_KINDS: { id: EventKind; label: string }[] = [
  { id: 'meeting', label: 'Meeting' },
  { id: 'training', label: 'Training' },
  { id: 'deadline', label: 'Deadline' },
  { id: 'holiday', label: 'Holiday' },
];
export interface CalendarEvent {
  id: string;
  title: string;
  kind: EventKind;
  date: string;
  /** "HH:MM", or empty for an all-day event. */
  time: string;
  addedBy: string;
}
// Samples only, so the calendar has something to show until HR adds the real dates.
export const SEED_EVENTS: CalendarEvent[] = [
  { id: 'E1', title: 'Team sync (sample)', kind: 'meeting', date: '2026-10-20', time: '10:00', addedBy: 'Aanya Sharma' },
  { id: 'E2', title: 'Security awareness session (sample)', kind: 'training', date: '2026-10-27', time: '15:00', addedBy: 'Arjun Rao' },
  { id: 'E3', title: 'Quarterly reports due (sample)', kind: 'deadline', date: '2026-10-30', time: '', addedBy: 'Aanya Sharma' },
  { id: 'E4', title: 'Office closed (sample)', kind: 'holiday', date: '2026-11-09', time: '', addedBy: 'Aanya Sharma' },
];

export type PolicyCategory = 'policy' | 'compliance';

export interface PolicyDoc {
  id: string;
  name: string;
  category: PolicyCategory;
  pages: number;
  fileName: string;
  /** Object URL of the uploaded file, kept only while the page is open. Sample documents have none. */
  fileUrl?: string;
}

export const SEED_POLICIES: PolicyDoc[] = [
  { id: 'P1', name: 'Code of conduct (sample)', category: 'policy', pages: 6, fileName: 'code-of-conduct.pdf' },
  { id: 'P2', name: 'Data handling standard (sample)', category: 'compliance', pages: 11, fileName: 'data-handling.pdf' },
];

export interface Acceptance {
  personId: string;
  docId: string;
  date: string;
}

/** A prompt-injection attempt reported by SecuPrompt. */
export interface SecurityEvent {
  id: string;
  personName: string;
  email: string;
  action: 'blocked' | 'sanitized';
  /** ISO date and time. */
  at: string;
}

// Kept here so data.ts stays free of React; the icon component lives in ui.tsx.
export type PortalIconName =
  | 'grid' | 'users' | 'cap' | 'book' | 'code' | 'transfer' | 'kanban' | 'shield' | 'chat' | 'screen' | 'invoice'
  | 'award' | 'file' | 'clipboard' | 'spark' | 'pen' | 'layers' | 'plus' | 'search' | 'external'
  | 'check' | 'clock' | 'target' | 'key' | 'calendar' | 'chevron' | 'close' | 'logout'
  | 'upload' | 'link' | 'home' | 'alert' | 'eye' | 'download' | 'share' | 'refresh' | 'filter' | 'edit' | 'chart' | 'play' | 'lock' | 'settings' | 'help';
