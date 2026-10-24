import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { api, ApiError, BUSY_MESSAGE } from './api';
import { summarise, youtubeId, type Chapter, type Course, type Lecture } from './lmsData';

/**
 * The learning platform on the backend (/api/learning). Every course is free. Everyone signed in sees the live ones
 * and enrolls; lecture videos come only where this person may watch (previews, courses they're enrolled in, courses
 * they may change). The backend also says, per course, this person's progress and rating, and whether they may
 * change it (admins any, a sub admin their own).
 */

export interface LearningCourse extends Course {
  /** '' for an educator who has left. */
  educatorName: string;
  /** The cover's address under the API root, fetched with the sign-in; unset for a generated cover. */
  thumbPath?: string;
  isPublished: boolean;
  canChange: boolean;
  students: number;
  rating: { average: number; count: number };
  mine: { enrolled: boolean; enrolledAt?: string; completed: string[]; rating: number };
}

const TONES: Course['tone'][] = ['violet', 'tangerine', 'saffron', 'ink'];
// the same course keeps the same colour, without storing one
const toneOf = (id: string) => TONES[[...id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 9973, 0) % TONES.length];
// exactly the address the backend's cover store writes (learningController thumbnailOf), relative to the API root
const THUMB = /^\/api(\/learning\/courses\/[0-9a-f]{24}\/thumbnail\?v=[0-9a-f]{24})$/;
const MINUTES_MAX = 600;

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const record = (value: unknown) => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined);
const count = (value: unknown) => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0);
/** The day in this browser's calendar, "YYYY-MM-DD", of an ISO moment. */
const dayOf = (value: unknown) => {
  const t = typeof value === 'string' ? Date.parse(value) : NaN;
  if (Number.isNaN(t)) return undefined;
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function toLecture(raw: unknown): Lecture | null {
  const l = record(raw);
  const id = text(l?.id);
  const title = text(l?.title);
  const minutes = l?.minutes;
  if (!l || !id || !title || typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 1 || minutes > MINUTES_MAX) return null;
  // only a YouTube address can reach the player's iframe; anything else reads as a video not added yet
  const videoUrl = typeof l.videoUrl === 'string' && youtubeId(l.videoUrl) ? l.videoUrl : '';
  return { id, title, minutes, videoUrl, preview: l.preview === true };
}

function toChapter(raw: unknown): Chapter | null {
  const c = record(raw);
  const id = text(c?.id);
  const title = text(c?.title);
  if (!c || !id || !title || !Array.isArray(c.lectures)) return null;
  const lectures = c.lectures.map(toLecture).filter((l): l is Lecture => !!l);
  return lectures.length ? { id, title, lectures } : null;
}

/** One course as the pages show it, or null when the backend's entry is broken. */
export function toCourse(raw: unknown): LearningCourse | null {
  const c = record(raw);
  const id = text(c?.id);
  const title = text(c?.title);
  if (!c || !id || !title || !Array.isArray(c.chapters)) return null;
  const chapters = c.chapters.map(toChapter).filter((ch): ch is Chapter => !!ch);
  if (!chapters.length) return null;
  const description = Array.isArray(c.description) ? c.description.map(text).filter((p): p is string => !!p) : [];
  const educator = record(c.educator);
  const rating = record(c.rating);
  const average = typeof rating?.average === 'number' && rating.average >= 0 && rating.average <= 5 ? rating.average : 0;
  const mine = record(c.mine);
  const stars = mine?.rating;
  const thumbPath = typeof c.thumbnail === 'string' ? c.thumbnail.match(THUMB)?.[1] : undefined;
  return {
    id,
    title,
    summary: summarise(description[0] ?? ''),
    description,
    educatorId: text(educator?.id) ?? '',
    educatorName: text(educator?.name) ?? '',
    // courses are free: there's nothing to charge
    price: 0,
    discount: 0,
    icon: 'book',
    tone: toneOf(id),
    published: dayOf(c.publishedAt) ?? '',
    chapters,
    ...(thumbPath ? { thumbPath } : {}),
    isPublished: c.published === true,
    canChange: c.canChange === true,
    students: count(c.students),
    rating: { average, count: count(rating?.count) },
    mine: {
      enrolled: mine?.enrolled === true,
      enrolledAt: dayOf(mine?.enrolledAt),
      completed: Array.isArray(mine?.completed) ? mine.completed.filter((v): v is string => typeof v === 'string') : [],
      rating: typeof stars === 'number' && Number.isInteger(stars) && stars >= 1 && stars <= 5 ? stars : 0,
    },
  };
}

export function toCourses(raw: unknown): LearningCourse[] {
  if (!Array.isArray(raw)) throw new ApiError('unavailable', 'The backend’s answer isn’t a list of courses.');
  // one broken course shouldn't take the whole catalogue down
  return raw.map(toCourse).filter((c): c is LearningCourse => !!c);
}

/** Someone enrolled in a course the signed-in educator may change. */
export interface Student {
  courseId: string;
  courseTitle: string;
  personId: string;
  /** '' (with the email) for someone who has left. */
  name: string;
  email: string;
  /** yyyy-mm-dd */
  date: string;
}

export function toStudents(raw: unknown): Student[] {
  if (!Array.isArray(raw)) throw new ApiError('unavailable', 'The backend’s answer isn’t a list of students.');
  const rows: Student[] = [];
  for (const entry of raw) {
    const e = record(entry);
    const person = record(e?.person);
    const courseId = text(e?.courseId);
    const date = dayOf(e?.enrolledAt);
    if (!e || !courseId || !date || !person) continue;
    rows.push({ courseId, courseTitle: text(e.courseTitle) ?? '', personId: text(person.id) ?? '', name: text(person.name) ?? '', email: text(person.email) ?? '', date });
  }
  return rows;
}

/** What a course form holds: the parts the backend reads when publishing or saving. */
export interface CourseInput {
  title: string;
  description: string[];
  chapters: Chapter[];
}

// ids the backend gave; the form's own (for chapters and lectures added in it) mean "new" and stay out
const BACKEND_ID = /^[0-9a-f]{24}$/;
const keepId = (id: string) => (BACKEND_ID.test(id) ? { id } : {});

/** The body for POST/PATCH /learning/courses: only what the backend reads, ids only where it gave them. */
export const courseBody = (input: CourseInput) => ({
  title: input.title.trim(),
  description: input.description,
  chapters: input.chapters.map((c) => ({
    ...keepId(c.id),
    title: c.title,
    lectures: c.lectures.map((l) => ({ ...keepId(l.id), title: l.title, minutes: l.minutes, videoUrl: l.videoUrl, preview: l.preview })),
  })),
});

const FAILED: Record<ApiError['kind'], string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'Your role can’t do that.',
  'not-found': 'That course isn’t available any more. The courses have been refreshed.',
  conflict: 'That change clashes with another one. The courses have been refreshed.',
  'bad-request': 'That wasn’t accepted.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the learning platform, so nothing was saved. Try again in a moment.',
};
/** What to say when something was refused; the backend's own words are clearest for refused input and roles. */
export const learningFailedMessage = (e: ApiError) => ((e.kind === 'bad-request' || e.kind === 'forbidden') && e.message !== e.kind ? e.message : FAILED[e.kind]);

export type LearningState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; courses: LearningCourse[] } | { kind: 'error'; error: ApiError };

const asApiError = (error: unknown) => (error instanceof ApiError ? error : new ApiError('unavailable'));

/**
 * The courses this person may see; `off` with the demo sign-in. With `teaches`, also who enrolled in the courses they
 * may change (undefined until loaded). Each change answers with the course as it now is, which replaces the one on
 * screen; publishing or deleting loads everything again, as does an action on a course that has gone. They throw an
 * ApiError when the backend refuses.
 */
export function useRemoteLearning(teaches: boolean) {
  const [state, setState] = useState<LearningState>(api ? { kind: 'loading' } : { kind: 'off' });
  // undefined while loading, null when it failed
  const [students, setStudents] = useState<Student[] | null | undefined>();

  const load = useCallback(async () => {
    if (!api) return;
    try {
      setState({ kind: 'ready', courses: toCourses(await api.get<unknown>('/learning/courses')) });
    } catch (error) {
      setState({ kind: 'error', error: asApiError(error) });
    }
    if (teaches) {
      // the educator pages say when this didn't load; the courses still work without it
      setStudents(await api.get<unknown>('/learning/students').then(toStudents, () => null));
    }
  }, [teaches]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (change: () => Promise<unknown>) => {
      try {
        const course = toCourse(await change());
        if (course) setState((s) => (s.kind === 'ready' ? { kind: 'ready', courses: s.courses.map((c) => (c.id === course.id ? course : c)) } : s));
      } catch (error) {
        const e = asApiError(error);
        if (e.kind === 'not-found') void load();
        throw e;
      }
    },
    [load],
  );

  /** A change after which the whole list is loaded again (a course added or gone changes more than one row). */
  const actThenLoad = useCallback(
    async <T>(change: () => Promise<T>) => {
      try {
        return await change();
      } catch (error) {
        throw asApiError(error);
      } finally {
        await load();
      }
    },
    [load],
  );

  const path = (id: string) => `/learning/courses/${encodeURIComponent(id)}`;
  const coverForm = (cover: Blob) => {
    const form = new FormData();
    form.append('thumbnail', cover);
    return form;
  };
  return {
    state,
    students,
    retry: () => void load(),
    enroll: (id: string) => act(() => api!.post(`${path(id)}/enroll`, {})),
    markLecture: (id: string, lectureId: string, done: boolean) => act(() => api!.put(`${path(id)}/lectures/${encodeURIComponent(lectureId)}`, { done })),
    rate: (id: string, stars: number) => act(() => api!.put(`${path(id)}/rating`, { stars })),
    /**
     * Publishes the course, then uploads its cover. The course is live as soon as the first part works, so a cover
     * that fails doesn't fail the whole (which would invite publishing it twice): `coverSaved` says how it went.
     */
    publish: (input: CourseInput, cover?: Blob) =>
      actThenLoad(async () => {
        const course = toCourse(await api!.post('/learning/courses', courseBody(input)));
        if (!course) throw new ApiError('unavailable');
        const coverSaved = !cover || (await api!.putForm(`${path(course.id)}/thumbnail`, coverForm(cover)).then(() => true, () => false));
        return { id: course.id, coverSaved };
      }),
    save: (id: string, input: CourseInput) => act(() => api!.patch(path(id), courseBody(input))),
    setPublished: (id: string, published: boolean) => act(() => api!.patch(path(id), { published })),
    setCover: (id: string, cover: Blob | null) => act(() => (cover ? api!.putForm(`${path(id)}/thumbnail`, coverForm(cover)) : api!.del(`${path(id)}/thumbnail`))),
    remove: (id: string) =>
      actThenLoad(async () => {
        await api!.del(path(id));
      }),
  };
}

/**
 * Covers need the sign-in token, which an <img> can't send, so each is fetched once and kept in memory. A cover's
 * address changes (?v=) when it's replaced, so an address that arrived is never fetched again; one that failed is
 * tried again the next time a page wants it. Every arrival is announced to every page showing covers: a page that
 * redraws or closes while covers are on their way must not stop the others from appearing.
 */
export function coverStore(fetchFile: (path: string) => Promise<Blob>, toUrl: (blob: Blob) => string = (blob) => URL.createObjectURL(blob)) {
  const ready = new Map<string, string>();
  const loading = new Set<string>();
  const listeners = new Set<() => void>();
  let arrivals = 0;
  return {
    url: (path: string) => ready.get(path),
    version: () => arrivals,
    want(paths: string[]) {
      for (const path of paths) {
        if (ready.has(path) || loading.has(path)) continue;
        loading.add(path);
        fetchFile(path)
          .then(
            (blob) => {
              ready.set(path, toUrl(blob));
              arrivals++;
              listeners.forEach((listener) => listener());
            },
            (error) => console.warn('A course cover did not load:', error),
          )
          .finally(() => loading.delete(path));
      }
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const covers = api ? coverStore((path) => api!.getFile(path)) : null;
const noCovers = () => () => {};
const noArrivals = () => 0;

/** The courses with their covers filled in as they arrive (generated covers until then, or if one fails). */
export function useCovers(courses: LearningCourse[]) {
  useSyncExternalStore(covers ? covers.subscribe : noCovers, covers ? covers.version : noArrivals);
  const key = courses
    .map((c) => c.thumbPath)
    .filter((p): p is string => !!p && !covers?.url(p))
    .join('|');
  useEffect(() => {
    if (covers && key) covers.want(key.split('|'));
  }, [key]);
  return courses.map((c) => {
    const thumbUrl = c.thumbPath ? covers?.url(c.thumbPath) : undefined;
    return thumbUrl ? { ...c, thumbUrl } : c;
  });
}
