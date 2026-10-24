import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { allLectures, summarise, type Course } from '../../lmsData';
import { useCovers, useRemoteLearning, type CourseInput, type LearningCourse, type LearningState, type Student } from '../../learning';
import { managesPortal, useSession } from '../../session';
import { usePeopleById, usePortal } from '../../store';

/**
 * Where the learning pages get their courses and send what people do: the demo's in-browser samples, or the
 * backend (learning.ts) once the portal is connected. The pages are the same either way; only this differs.
 */
export interface LearningSource {
  connected: boolean;
  /** Connected: still loading, or failed (the shell shows that instead of the pages). */
  status: Exclude<LearningState, { kind: 'ready' }> | { kind: 'ready' };
  retry: () => void;
  /** Every course this person may see, their own unpublished ones included. */
  courses: Course[];
  /** Live courses, newest first: the catalogue. */
  catalogue: Course[];
  /** The courses this person is enrolled in, latest enrollment first. */
  enrolledIn: Course[];
  isLive: (c: Course) => boolean;
  /** '' for an educator who has left. */
  educatorName: (c: Course) => string;
  stats: (c: Course) => { average: number; ratingCount: number; students: number };
  progress: (c: Course) => Progress;
  /** These resolve when saved, and reject with an ApiError when the backend refuses. */
  enroll: (c: Course) => Promise<void>;
  setLectureDone: (c: Course, lectureId: string, done: boolean) => Promise<void>;
  rate: (c: Course, stars: number) => Promise<void>;

  // educators
  /** The courses this person may change: their own (an admin's: every course). */
  teaching: Course[];
  /** Who enrolled in those, latest first; undefined while loading, null when it didn't load. */
  students: Student[] | null | undefined;
  /** Connected only: courses can be edited, unpublished and deleted (the demo only adds them). */
  canManage: boolean;
  /** Resolves with the new course's id, and whether its cover (if any) was saved too. The demo keeps the price; connected, courses are free. */
  publish: (input: CourseInput & { price: number; discount: number }, cover?: Cover) => Promise<{ id: string; coverSaved: boolean }>;
  save: (c: Course, input: CourseInput) => Promise<void>;
  setPublished: (c: Course, published: boolean) => Promise<void>;
  setCover: (c: Course, cover: File | null) => Promise<void>;
  remove: (c: Course) => Promise<void>;
}

/** A picked cover: the file to upload, and an address to show it from meanwhile. */
export interface Cover {
  file: File;
  url: string;
}

const notInDemo = () => Promise.reject(new Error('The demo only adds courses.'));

export interface Progress {
  enrolled: boolean;
  done: number;
  total: number;
  isDone: (lectureId: string) => boolean;
  /** This person's stars, 0 for none. */
  rating: number;
  /** Every lecture is open to them: enrolled, or (connected) allowed to change the course. */
  watchesAll: boolean;
}

const Learning = createContext<LearningSource | null>(null);

export function useLearning() {
  const source = useContext(Learning);
  if (!source) throw new Error('useLearning() is only for pages inside the learning shell.');
  return source;
}

/** The demo: the samples in the portal's store, kept only in this browser. */
export function DemoLearning({ children }: { children: ReactNode }) {
  const { me, courses, enrollments, completed, ratings, enroll, setLectureDone, rateCourse, addCourse } = usePortal();
  const byId = usePeopleById();
  const source = useMemo<LearningSource>(() => {
    const enrolled = (c: Course) => enrollments.some((e) => e.courseId === c.id && e.personId === me.id);
    const teaching = courses.filter((c) => c.educatorId === me.id);
    const titles = new Map(teaching.map((c) => [c.id, c.title]));
    return {
      connected: false,
      status: { kind: 'ready' },
      retry: () => {},
      courses,
      catalogue: [...courses].sort((a, b) => b.published.localeCompare(a.published)),
      enrolledIn: enrollments
        .filter((e) => e.personId === me.id)
        .map((e) => courses.find((c) => c.id === e.courseId))
        .filter((c): c is Course => !!c),
      isLive: () => true,
      educatorName: (c) => byId.get(c.educatorId)?.name ?? '',
      stats: (c) => {
        const its = ratings.filter((r) => r.courseId === c.id);
        const average = its.length ? its.reduce((n, r) => n + r.stars, 0) / its.length : 0;
        return { average, ratingCount: its.length, students: enrollments.filter((e) => e.courseId === c.id).length };
      },
      progress: (c) => {
        const isDone = (lectureId: string) => completed.has(`${me.id}:${lectureId}`);
        return {
          enrolled: enrolled(c),
          done: allLectures(c).filter((l) => isDone(l.id)).length,
          total: allLectures(c).length,
          isDone,
          rating: ratings.find((r) => r.courseId === c.id && r.personId === me.id)?.stars ?? 0,
          watchesAll: enrolled(c),
        };
      },
      enroll: async (c) => enroll(c.id),
      setLectureDone: async (_c, lectureId, done) => setLectureDone(lectureId, done),
      rate: async (c, stars) => rateCourse(c.id, stars),
      teaching,
      students: enrollments
        .filter((e) => titles.has(e.courseId))
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((e) => ({ courseId: e.courseId, courseTitle: titles.get(e.courseId)!, personId: e.personId, name: byId.get(e.personId)?.name ?? '', email: byId.get(e.personId)?.email ?? '', date: e.date })),
      canManage: false,
      publish: async ({ price, discount, ...input }, cover) => ({
        id: addCourse({ ...input, summary: summarise(input.description[0] ?? ''), price, discount, icon: 'book', tone: 'violet', thumbUrl: cover?.url }).id,
        coverSaved: true,
      }),
      save: notInDemo,
      setPublished: notInDemo,
      setCover: notInDemo,
      remove: notInDemo,
    };
  }, [me.id, courses, enrollments, completed, ratings, byId, enroll, setLectureDone, rateCourse, addCourse]);
  return <Learning.Provider value={source}>{children}</Learning.Provider>;
}

/** Connected: the backend's courses, with this person's progress and rating as the backend keeps them. */
export function RemoteLearning({ children }: { children: ReactNode }) {
  const role = useSession()?.role;
  const remote = useRemoteLearning(!!role && managesPortal(role));
  const { state, retry, enroll, markLecture, rate } = remote;
  const courses = useCovers(state.kind === 'ready' ? state.courses : []);
  const course = (c: Course) => c as LearningCourse;
  // rebuilt on every render: the covers arriving make a new list each time anyway
  const source: LearningSource = {
    connected: true,
    status: state.kind === 'ready' ? { kind: 'ready' } : state,
    retry,
    courses,
    catalogue: courses.filter((c) => c.isPublished),
    enrolledIn: courses.filter((c) => c.mine.enrolled).sort((a, b) => (b.mine.enrolledAt ?? '').localeCompare(a.mine.enrolledAt ?? '')),
    isLive: (c) => course(c).isPublished,
    educatorName: (c) => course(c).educatorName,
    stats: (c) => ({ average: course(c).rating.average, ratingCount: course(c).rating.count, students: course(c).students }),
    progress: (c) => {
      const { mine, canChange } = course(c);
      const lectures = allLectures(c);
      const done = new Set(mine.completed);
      return {
        enrolled: mine.enrolled,
        done: lectures.filter((l) => done.has(l.id)).length,
        total: lectures.length,
        isDone: (lectureId) => done.has(lectureId),
        rating: mine.rating,
        watchesAll: mine.enrolled || canChange,
      };
    },
    enroll: (c) => enroll(c.id),
    setLectureDone: (c, lectureId, done) => markLecture(c.id, lectureId, done),
    rate: (c, stars) => rate(c.id, stars),
    teaching: courses.filter((c) => c.canChange),
    students: remote.students,
    canManage: true,
    publish: (input, cover) => remote.publish(input, cover?.file),
    save: (c, input) => remote.save(c.id, input),
    setPublished: (c, published) => remote.setPublished(c.id, published),
    setCover: (c, cover) => remote.setCover(c.id, cover),
    remove: (c) => remote.remove(c.id),
  };
  return <Learning.Provider value={source}>{children}</Learning.Provider>;
}
