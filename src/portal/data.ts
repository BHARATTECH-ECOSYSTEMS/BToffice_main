import type { Role } from './session';

/**
 * Sample data for the employee portal until the backend exists.
 *
 * Every person, email and record below is made up (emails use example.com, which is reserved for examples).
 * Real names and emails from the old system's screenshots are deliberately NOT copied here.
 */

export type PersonRole = Role | 'intern';

export interface Person {
  id: string;
  name: string;
  email: string;
  role: PersonRole;
  phone: string;
  team: string;
  status: 'active' | 'invited';
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
  { id: 'coder', name: 'Coder', navLabel: 'Workspace', category: 'Tool', body: 'Open the BharatTech coding workspace.', tags: ['Windows', 'macOS'], url: '', icon: 'code', inNav: true, openLabel: 'Open', caption: "Don't have an app yet?", secondary: { label: 'Install / Update app', url: '', icon: 'download' } },
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
  | 'upload' | 'link' | 'home' | 'alert' | 'eye' | 'download' | 'share' | 'refresh' | 'filter' | 'edit' | 'chart' | 'play' | 'lock';
