import type { Role } from './session';

/**
 * Sample data for the employee portal until the backend exists.
 *
 * Every person, email and record below is made up (emails use example.com, which is reserved for examples).
 * Real names and emails from the old system's screenshots are deliberately NOT copied here.
 */

export type PersonRole = Role | 'intern';
/** `invited` = added but not signed in yet; `inactive` = an admin switched the account off. */
export type PersonStatus = 'active' | 'inactive' | 'invited';

export interface Person {
  id: string;
  name: string;
  email: string;
  role: PersonRole;
  phone: string;
  team: string;
  status: PersonStatus;
}

export const SEED_PEOPLE: Person[] = [
  { id: 'EMP1', name: 'Aanya Sharma', email: 'aanya.sharma@example.com', role: 'admin', phone: '', team: 'BharatTech', status: 'active' },
  { id: 'EMP2', name: 'Kabir Mehta', email: 'kabir.mehta@example.com', role: 'employee', phone: '', team: 'BharatTech', status: 'active' },
  { id: 'EMP3', name: 'Ishita Verma', email: 'ishita.verma@example.com', role: 'employee', phone: '', team: 'BharatTech', status: 'active' },
  { id: 'EMP4', name: 'Rohan Iyer', email: 'rohan.iyer@example.com', role: 'employee', phone: '', team: 'BharatTech', status: 'active' },
  { id: 'EMP5', name: 'Meera Nair', email: 'meera.nair@example.com', role: 'intern', phone: '', team: 'BharatTech', status: 'active' },
  { id: 'EMP6', name: 'Arjun Rao', email: 'arjun.rao@example.com', role: 'admin', phone: '', team: 'BharatTech', status: 'active' },
  { id: 'EMP7', name: 'Sana Qureshi', email: 'sana.qureshi@example.com', role: 'employee', phone: '', team: 'BharatTech', status: 'active' },
  { id: 'EMP8', name: 'Dev Malhotra', email: 'dev.malhotra@example.com', role: 'intern', phone: '', team: 'BharatTech', status: 'active' },
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
 * Self-hosted tools the portal opens. Each `url` is empty until the real address is known: fill them in here
 * (or move them to VITE_ environment variables per deployment). An empty url shows "not connected yet".
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

export const TOOLS: Tool[] = [
  { id: 'huly', name: 'Huly.io', navLabel: 'Workspace', category: 'Team workspace', body: 'Projects, chat and documents for the whole team in one place.', tags: ['Projects & chat', 'Documents'], url: '', icon: 'users', inNav: true, openLabel: 'Open', secondary: web('users') },
  { id: 'coder', name: 'Coder', category: 'Tool', body: 'Open the BharatTech coding workspace.', tags: ['Windows', 'macOS'], url: '', icon: 'code', openLabel: 'Open', caption: "Don't have an app yet?", secondary: { label: 'Install / Update app', url: '', icon: 'download' } },
  { id: 'filesync', name: 'File Transfer', category: 'Files', body: 'Send large files between teammates and devices.', tags: ['Peer to peer', 'Self-hosted'], url: '', icon: 'transfer', inNav: true, navOnly: true },
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

/** The documents an admin ticks off before a request can be marked verified. */
export const COMPANY_CHECKS = [
  { id: 'registration', label: 'Registration certificate' },
  { id: 'tax', label: 'GST / tax registration' },
  { id: 'address', label: 'Registered address' },
  { id: 'bank', label: 'Bank account details' },
  { id: 'director', label: 'Director identity' },
] as const;
export const EMPLOYEE_CHECKS = [
  { id: 'identity', label: 'Government ID' },
  { id: 'address', label: 'Address proof' },
  { id: 'education', label: 'Education certificates' },
  { id: 'employment', label: 'Previous employment' },
  { id: 'references', label: 'References' },
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
  | (VerificationBase & { kind: 'employee'; personId: string });
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
    kind: 'employee', id: 'V4', personId: 'EMP8', status: 'pending', done: ['identity', 'address'], note: '', requestedBy: 'Aanya Sharma', requested: '2026-10-10',
    log: [
      { at: '2026-10-10T09:05', by: 'Aanya Sharma', text: 'Opened the request' },
      { at: '2026-10-12T11:30', by: 'Aanya Sharma', text: 'Checked Government ID' },
      { at: '2026-10-12T11:34', by: 'Aanya Sharma', text: 'Checked Address proof' },
    ],
  },
  {
    kind: 'employee', id: 'V5', personId: 'EMP7', status: 'verified', done: ['identity', 'address', 'education', 'employment', 'references'], note: '', requestedBy: 'Aanya Sharma', requested: '2026-09-01', decidedBy: 'Aanya Sharma', decided: '2026-09-09',
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
];

export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  title: string;
  assigneeId: string;
  due: string;
  status: TaskStatus;
}

export const SEED_TASKS: Task[] = [
  { id: 'T1', title: 'Finish the onboarding checklist', assigneeId: 'EMP5', due: '2026-10-20', status: 'doing' },
  { id: 'T2', title: 'Review the edge inference benchmark', assigneeId: 'EMP3', due: '2026-10-23', status: 'todo' },
  { id: 'T3', title: 'Update the sensor fusion notes', assigneeId: 'EMP4', due: '2026-10-12', status: 'done' },
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
  | 'award' | 'file' | 'clipboard' | 'spark' | 'pen' | 'layers' | 'plus' | 'search' | 'trash' | 'external'
  | 'check' | 'clock' | 'target' | 'trend' | 'key' | 'calendar' | 'chevron' | 'menu' | 'close' | 'logout'
  | 'upload' | 'link' | 'home' | 'alert' | 'eye' | 'download' | 'share' | 'refresh' | 'filter' | 'edit' | 'chart' | 'play' | 'lock' | 'settings' | 'help' | 'bell';
