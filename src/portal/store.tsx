import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  SEED_ALUMNI,
  SEED_CERTIFICATES,
  SEED_LINKS,
  SEED_PEOPLE,
  SEED_POLICIES,
  SEED_REFERRALS,
  SEED_TASKS,
  SEED_EVENTS,
  SEED_JOBS,
  SEED_APPLICATIONS,
  COMPANY_CHECKS,
  EMPLOYEE_CHECKS,
  EMPLOYMENT_CHECKS,
  SEED_VERIFICATIONS,
  documentsDeleteOn,
  ID_RETENTION_DAYS,
  rejoinedPerson,
  type Acceptance,
  type ApplicationStage,
  type InternalJob,
  type JobApplication,
  type IdDocKind,
  type IdDocument,
  type Alumnus,
  type CalendarEvent,
  type Certificate,
  type CertificateType,
  type LinkResource,
  type Person,
  type PersonRole,
  type PersonStatus,
  type PolicyDoc,
  type Referral,
  type Stream,
  type Task,
  type TaskStatus,
  type Verification,
  type VerificationStatus,
} from './data';
import { indiaToday } from './attendance';
import { localMinute, receivedRequests } from './inbox';
import type { Session } from './session';

/**
 * The portal's data while there is no backend: sample records held in memory, so adding, deleting and
 * assigning can be tried out. Everything resets on reload. Each action here maps one-to-one onto the API
 * call that will replace it.
 */

// India's date, as the real portal and the backend count days
const today = () => indiaToday();
let counter = 100;

// Verification requests, uploaded ID documents and deletion dates outlive a sign-out (but not a reload): HR opens a
// request, signs out, and the employee signs in to upload, so both sides must see the same records. Everything else
// in the portal still starts fresh with each sign-in.
const kept: { verifications?: Verification[]; documents?: IdDocument[]; deleted?: Record<string, string> } = {};
const nextId = (prefix: string) => `${prefix}${++counter}`;

function usePortalState(session: Session) {
  // The signed-in person is part of the directory, so tasks and certificates can be assigned to them.
  const [people, setPeople] = useState<Person[]>(() =>
    SEED_PEOPLE.some((p) => p.email === session.email)
      ? SEED_PEOPLE
      : [{ id: 'EMP0', name: session.name, email: session.email, role: session.role, phone: '', team: 'BharatTech', stream: 'tech', status: 'active', joined: today() }, ...SEED_PEOPLE]
  );
  const [certificates, setCertificates] = useState<Certificate[]>(SEED_CERTIFICATES);
  const [links, setLinks] = useState<LinkResource[]>(SEED_LINKS);
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [policies, setPolicies] = useState<PolicyDoc[]>(SEED_POLICIES);
  const [acceptances, setAcceptances] = useState<Acceptance[]>([]);

  // The demo role switch and a name change in Settings update the signed-in person in the directory too.
  useEffect(() => {
    setPeople((list) =>
      list.map((p) => (p.email === session.email && (p.role !== session.role || p.name !== session.name) ? { ...p, role: session.role, name: session.name } : p))
    );
  }, [session.email, session.role, session.name]);

  const me = people.find((p) => p.email === session.email) ?? people[0];

  // People who have left. Ids keep counting past them, so a new person never reuses a former colleague's id.
  const [alumni, setAlumni] = useState<Alumnus[]>(SEED_ALUMNI);
  const invitePerson = useCallback(
    (name: string, email: string, role: PersonRole, stream: Stream) => {
      setPeople((list) => {
        const max = [...list, ...alumni].reduce((n, p) => Math.max(n, Number(p.id.replace(/\D/g, '')) || 0), 0);
        return [...list, { id: `EMP${max + 1}`, name, email, role, phone: '', team: 'BharatTech', stream, status: 'invited' }];
      });
    },
    [alumni]
  );
  // Leaving moves a person out of the directory and into their stream's community, in one step, so nobody has to
  // remember to add them. Their tasks and certificates keep pointing at them (usePeopleById still finds them).
  const markLeft = useCallback(
    (id: string, left: string, stream: Stream) => {
      const person = people.find((p) => p.id === id);
      if (!person) return;
      setPeople((list) => list.filter((p) => p.id !== id));
      setAlumni((list) => [{ ...person, stream, status: 'inactive', left }, ...list]);
    },
    [people]
  );
  const setPersonRole = useCallback((id: string, role: PersonRole) => setPeople((list) => list.map((p) => (p.id === id ? { ...p, role } : p))), []);
  const setPersonStatus = useCallback((id: string, status: PersonStatus) => setPeople((list) => list.map((p) => (p.id === id ? { ...p, status } : p))), []);
  const removePerson = useCallback((id: string) => {
    setPeople((list) => list.filter((p) => p.id !== id));
    setTasks((list) => list.filter((t) => t.assigneeId !== id));
  }, []);

  const issueCertificate = useCallback(
    (type: CertificateType, recipientId: string) => {
      const cert: Certificate = { id: nextId('C-'), type, recipientId, issuedBy: session.name, date: today() };
      setCertificates((list) => [cert, ...list]);
      return cert;
    },
    [session.name]
  );
  const removeCertificate = useCallback((id: string) => setCertificates((list) => list.filter((c) => c.id !== id)), []);

  const addLink = useCallback((name: string, url: string) => setLinks((list) => [...list, { id: nextId('L'), name, url, assignedTo: [] }]), []);
  const removeLink = useCallback((id: string) => setLinks((list) => list.filter((l) => l.id !== id)), []);
  const assignLink = useCallback(
    (id: string, personId: string) =>
      setLinks((list) => list.map((l) => (l.id === id && !l.assignedTo.includes(personId) ? { ...l, assignedTo: [...l.assignedTo, personId] } : l))),
    []
  );

  const addTask = useCallback((title: string, assigneeId: string, due: string) => setTasks((list) => [{ id: nextId('T'), title, assigneeId, due, status: 'todo' }, ...list]), []);
  const setTaskStatus = useCallback((id: string, status: TaskStatus) => setTasks((list) => list.map((t) => (t.id === id ? { ...t, status } : t))), []);
  const removeTask = useCallback((id: string) => setTasks((list) => list.filter((t) => t.id !== id)), []);

  // Calendar events: an admin adds them and everyone's calendar shows them.
  const [events, setEvents] = useState<CalendarEvent[]>(SEED_EVENTS);
  const addEvent = useCallback(
    (draft: Omit<CalendarEvent, 'id' | 'addedBy'>) => setEvents((list) => [...list, { ...draft, id: nextId('E'), addedBy: session.name }]),
    [session.name]
  );
  const removeEvent = useCallback((id: string) => setEvents((list) => list.filter((e) => e.id !== id)), []);

  const addPolicy = useCallback((doc: Omit<PolicyDoc, 'id'>) => setPolicies((list) => [...list, { ...doc, id: nextId('P') }]), []);
  const removePolicy = useCallback((id: string) => {
    setPolicies((list) => {
      const gone = list.find((d) => d.id === id);
      if (gone?.fileUrl) URL.revokeObjectURL(gone.fileUrl);
      return list.filter((d) => d.id !== id);
    });
    setAcceptances((list) => list.filter((a) => a.docId !== id));
  }, []);
  const acceptPolicy = useCallback(
    (docId: string) =>
      setAcceptances((list) => (list.some((a) => a.docId === docId && a.personId === me.id) ? list : [...list, { docId, personId: me.id, date: today() }])),
    [me.id]
  );

  // HR OPS verification requests. Every change is also written to the request's log, the audit trail a
  // verification has to keep. A decision records who made it and when; reopening clears both.
  // requests sent from the website's footer form in this tab come first, newest on top
  const [verifications, setVerifications] = useState<Verification[]>(() =>
    kept.verifications
      ? [...receivedRequests().filter((r) => !kept.verifications!.some((v) => v.id === r.id)), ...kept.verifications]
      : [...receivedRequests(), ...SEED_VERIFICATIONS]
  );
  useEffect(() => void (kept.verifications = verifications), [verifications]);
  const entry = useCallback((text: string) => ({ at: localMinute(), by: session.name, text }), [session.name]);
  const requestVerification = useCallback(
    (draft: { kind: 'company'; company: string; registration: string; website: string; contactEmail: string } | { kind: 'employee'; personId: string }) => {
      const id = nextId('V');
      setVerifications((list) => [{ ...draft, id, status: 'pending', done: [], note: '', requestedBy: session.name, requested: today(), log: [entry('Opened the request')] } as Verification, ...list]);
      return id;
    },
    [session.name, entry]
  );
  const setVerificationCheck = useCallback(
    (id: string, check: string, done: boolean) =>
      setVerifications((list) =>
        list.map((v) => {
          if (v.id !== id) return v;
          const checks: readonly { id: string; label: string }[] = v.kind === 'company' ? COMPANY_CHECKS : v.kind === 'employee' ? EMPLOYEE_CHECKS : EMPLOYMENT_CHECKS;
          const label = checks.find((c) => c.id === check)?.label ?? check;
          return { ...v, done: done ? [...new Set([...v.done, check])] : v.done.filter((c) => c !== check), log: [...v.log, entry(`${done ? 'Checked' : 'Unchecked'} ${label}`)] };
        })
      ),
    [entry]
  );
  const decideVerification = useCallback(
    (id: string, status: VerificationStatus, note: string) =>
      setVerifications((list) =>
        list.map((v) => {
          if (v.id !== id) return v;
          const log = [...v.log, entry(status === 'pending' ? 'Reopened' : status === 'verified' ? 'Marked verified' : 'Rejected')];
          return status === 'pending' ? { ...v, status, note, log, decidedBy: undefined, decided: undefined } : { ...v, status, note, log, decidedBy: session.name, decided: today() };
        })
      ),
    [session.name, entry]
  );
  const removeVerification = useCallback((id: string) => setVerifications((list) => list.filter((v) => v.id !== id)), []);

  // ID documents uploaded by employees for their verification. Replacing one frees the old file.
  const [documents, setDocuments] = useState<IdDocument[]>(() => kept.documents ?? []);
  // personId -> the day their documents were deleted, so the record can say so
  const [deleted, setDeleted] = useState<Record<string, string>>(() => kept.deleted ?? {});
  useEffect(() => void (kept.documents = documents), [documents]);
  useEffect(() => void (kept.deleted = deleted), [deleted]);
  const uploadDocument = useCallback(
    (kind: IdDocKind, file: File) => {
      const doc: IdDocument = { personId: me.id, kind, fileName: file.name, size: file.size, url: URL.createObjectURL(file), uploaded: today() };
      setDocuments((list) => {
        list.filter((d) => d.personId === me.id && d.kind === kind).forEach((d) => URL.revokeObjectURL(d.url));
        return [...list.filter((d) => !(d.personId === me.id && d.kind === kind)), doc];
      });
      // the employee's own upload goes on the request's record too
      setVerifications((list) =>
        list.map((v) => (v.kind === 'employee' && v.personId === me.id && v.status === 'pending' ? { ...v, log: [...v.log, entry(`Uploaded ${kind === 'pan' ? 'PAN card' : 'Aadhaar card'}`)] } : v))
      );
    },
    [me.id, entry]
  );
  // The 60-day rule: once ID_RETENTION_DAYS have passed since someone's last working day, their ID documents are
  // deleted automatically and the deletion is logged. Their name, dates and verification result stay.
  // With a backend this is a daily server job; here it runs whenever the portal's data changes.
  useEffect(() => {
    const due = new Set(alumni.filter((a) => documentsDeleteOn(a.left) <= today()).map((a) => a.id));
    const gone = documents.filter((d) => due.has(d.personId));
    if (!gone.length) return;
    gone.forEach((d) => URL.revokeObjectURL(d.url));
    const people = new Set(gone.map((d) => d.personId));
    setDocuments((list) => list.filter((d) => !people.has(d.personId)));
    setDeleted((map) => ({ ...map, ...Object.fromEntries([...people].map((id) => [id, today()])) }));
    setVerifications((list) =>
      list.map((v) =>
        v.kind === 'employee' && people.has(v.personId)
          ? { ...v, log: [...v.log, { at: localMinute(), by: 'System', text: `Deleted the ID documents automatically, ${ID_RETENTION_DAYS} days after they left` }] }
          : v
      )
    );
  }, [alumni, documents]);

  // Job referrals shared with former colleagues, newest first.
  const [referrals, setReferrals] = useState<Referral[]>(SEED_REFERRALS);
  const removeReferral = useCallback((id: string) => setReferrals((list) => list.filter((r) => r.id !== id)), []);
  // Joining ahead of leaving: the person keeps their personal email on their own record until they leave, when
  // markLeft carries it into the community with the rest of them. An empty email takes them off the list again.
  const joinCommunity = useCallback(
    (id: string, personalEmail: string) => setPeople((list) => list.map((p) => (p.id === id ? { ...p, personalEmail: personalEmail || undefined } : p))),
    []
  );
  const setPersonalEmail = useCallback(
    (id: string, personalEmail: string) => setAlumni((list) => list.map((a) => (a.id === id ? { ...a, personalEmail: personalEmail || undefined } : a))),
    []
  );

  // Internal job postings for former colleagues, and who has applied to each.
  const [jobs, setJobs] = useState<InternalJob[]>(SEED_JOBS);
  const [applications, setApplications] = useState<JobApplication[]>(SEED_APPLICATIONS);
  const postJob = useCallback(
    (draft: Omit<InternalJob, 'id' | 'postedBy' | 'posted' | 'open'>) => {
      const job: InternalJob = { ...draft, id: nextId('J'), postedBy: session.name, posted: today(), open: true };
      setJobs((list) => [job, ...list]);
      return job;
    },
    [session.name]
  );
  const setJobOpen = useCallback((id: string, open: boolean) => setJobs((list) => list.map((j) => (j.id === id ? { ...j, open } : j))), []);
  const removeJob = useCallback((id: string) => {
    setJobs((list) => list.filter((j) => j.id !== id));
    setApplications((list) => list.filter((a) => a.jobId !== id));
  }, []);
  const addApplicant = useCallback(
    (jobId: string, personId: string) =>
      setApplications((list) => (list.some((a) => a.jobId === jobId && a.personId === personId) ? list : [...list, { id: nextId('A'), jobId, personId, stage: 'applied', updated: today() }])),
    []
  );
  // Coming back is leaving in reverse: out of the community, into the directory as active, with the same id.
  const rejoin = useCallback(
    (id: string) => {
      const former = alumni.find((a) => a.id === id);
      if (!former) return;
      setAlumni((list) => list.filter((a) => a.id !== id));
      setPeople((list) => [...list, rejoinedPerson(former, today())]);
    },
    [alumni]
  );
  /** Moves an application on. Passing the knowledge check ('rejoined') brings the person back into the directory. */
  const moveApplication = useCallback(
    (id: string, stage: ApplicationStage) => {
      const application = applications.find((a) => a.id === id);
      if (!application) return;
      setApplications((list) => list.map((a) => (a.id === id ? { ...a, stage, updated: today() } : a)));
      if (stage === 'rejoined') rejoin(application.personId);
    },
    [applications, rejoin]
  );

  return {
    me,
    people,
    certificates,
    links,
    tasks,
    policies,
    acceptances,
    invitePerson,
    setPersonRole,
    setPersonStatus,
    removePerson,
    alumni,
    markLeft,
    referrals,
    removeReferral,
    setPersonalEmail,
    joinCommunity,
    jobs,
    applications,
    postJob,
    setJobOpen,
    removeJob,
    addApplicant,
    moveApplication,
    issueCertificate,
    removeCertificate,
    addLink,
    removeLink,
    assignLink,
    addTask,
    setTaskStatus,
    removeTask,
    events,
    addEvent,
    removeEvent,
    addPolicy,
    removePolicy,
    acceptPolicy,
    verifications,
    requestVerification,
    setVerificationCheck,
    decideVerification,
    removeVerification,
    documents,
    deleted,
    uploadDocument,
  };
}

type PortalData = ReturnType<typeof usePortalState>;
const PortalContext = createContext<PortalData | null>(null);

export function PortalDataProvider({ session, children }: { session: Session; children: ReactNode }) {
  const data = usePortalState(session);
  return <PortalContext.Provider value={data}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const data = useContext(PortalContext);
  if (!data) throw new Error('usePortal must be used inside PortalDataProvider');
  return data;
}

/** Looks people up by id, for tables that store only the id. Includes people who have left, so their old tasks,
 * certificates and verifications still show their name. */
export function usePeopleById() {
  const { people, alumni } = usePortal();
  return useMemo(() => new Map<string, Person>([...people, ...alumni].map((p) => [p.id, p])), [people, alumni]);
}

// Built once, since toLocaleDateString with options builds a new formatter on every call. format() throws on an
// invalid date where toLocaleDateString returned "Invalid Date", so the guard keeps that text.
const DATE_FMT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const formatDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? 'Invalid Date' : DATE_FMT.format(d);
};
export const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
