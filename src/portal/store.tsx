import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  SEED_CERTIFICATES,
  SEED_LINKS,
  SEED_PEOPLE,
  SEED_POLICIES,
  SEED_TASKS,
  type Acceptance,
  type Certificate,
  type CertificateType,
  type LinkResource,
  type Person,
  type PersonRole,
  type PolicyDoc,
  type Task,
  type TaskStatus,
} from './data';
import { SEED_COMPLETED, SEED_COURSES, SEED_ENROLLMENTS, SEED_RATINGS, type Course, type Enrollment, type Rating } from './lmsData';
import type { Session } from './session';

/**
 * The portal's data while there is no backend: sample records held in memory, so adding, deleting and
 * assigning can be tried out. Everything resets on reload. Each action here maps one-to-one onto the API
 * call that will replace it.
 */

const today = () => new Date().toISOString().slice(0, 10);
let counter = 100;
const nextId = (prefix: string) => `${prefix}${++counter}`;

function usePortalState(session: Session) {
  // The signed-in person is part of the directory, so tasks and certificates can be assigned to them.
  const [people, setPeople] = useState<Person[]>(() =>
    SEED_PEOPLE.some((p) => p.email === session.email)
      ? SEED_PEOPLE
      : [{ id: 'EMP0', name: session.name, email: session.email, role: session.role, phone: '', team: 'BharatTech', status: 'active' }, ...SEED_PEOPLE]
  );
  const [certificates, setCertificates] = useState<Certificate[]>(SEED_CERTIFICATES);
  const [links, setLinks] = useState<LinkResource[]>(SEED_LINKS);
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [policies, setPolicies] = useState<PolicyDoc[]>(SEED_POLICIES);
  const [acceptances, setAcceptances] = useState<Acceptance[]>([]);

  // The demo role switch changes who the signed-in person is in the directory too.
  useEffect(() => {
    setPeople((list) => list.map((p) => (p.email === session.email && p.role !== session.role ? { ...p, role: session.role } : p)));
  }, [session.email, session.role]);

  const me = people.find((p) => p.email === session.email) ?? people[0];

  const invitePerson = useCallback((name: string, email: string, role: PersonRole) => {
    setPeople((list) => {
      const max = list.reduce((n, p) => Math.max(n, Number(p.id.replace(/\D/g, '')) || 0), 0);
      return [...list, { id: `EMP${max + 1}`, name, email, role, phone: '', team: 'BharatTech', status: 'invited' }];
    });
  }, []);
  const setPersonRole = useCallback((id: string, role: PersonRole) => setPeople((list) => list.map((p) => (p.id === id ? { ...p, role } : p))), []);
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

  // Learning platform. Completed lectures are stored as "personId:lectureId" so a lookup is one Set check.
  const [courses, setCourses] = useState<Course[]>(SEED_COURSES);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(SEED_ENROLLMENTS);
  const [completed, setCompleted] = useState<Set<string>>(() => new Set(SEED_COMPLETED.map((c) => `${c.personId}:${c.lectureId}`)));
  const [ratings, setRatings] = useState<Rating[]>(SEED_RATINGS);

  const enroll = useCallback(
    (courseId: string) =>
      setEnrollments((list) => (list.some((e) => e.courseId === courseId && e.personId === me.id) ? list : [...list, { courseId, personId: me.id, date: today() }])),
    [me.id]
  );
  const setLectureDone = useCallback(
    (lectureId: string, done: boolean) =>
      setCompleted((set) => {
        const next = new Set(set);
        if (done) next.add(`${me.id}:${lectureId}`);
        else next.delete(`${me.id}:${lectureId}`);
        return next;
      }),
    [me.id]
  );
  /** Publishes a course taught by the signed-in person; returns it so the caller can link to it. */
  const addCourse = useCallback(
    (draft: Omit<Course, 'id' | 'educatorId' | 'published'>) => {
      const course: Course = { ...draft, id: nextId('course-'), educatorId: me.id, published: today() };
      setCourses((list) => [course, ...list]);
      return course;
    },
    [me.id]
  );
  const rateCourse = useCallback(
    (courseId: string, stars: number) =>
      setRatings((list) => [...list.filter((r) => !(r.courseId === courseId && r.personId === me.id)), { courseId, personId: me.id, stars }]),
    [me.id]
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
    removePerson,
    issueCertificate,
    removeCertificate,
    addLink,
    removeLink,
    assignLink,
    addTask,
    setTaskStatus,
    removeTask,
    addPolicy,
    removePolicy,
    acceptPolicy,
    courses,
    enrollments,
    completed,
    ratings,
    enroll,
    setLectureDone,
    rateCourse,
    addCourse,
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

/** Looks people up by id, for tables that store only the id. */
export function usePeopleById() {
  const { people } = usePortal();
  return useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
}

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
