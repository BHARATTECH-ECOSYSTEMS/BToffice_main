import type { PortalIconName } from './data';

/**
 * Sample courses for the learning platform (LMS) until its backend is connected.
 *
 * Every course, educator and record is made up. Lecture videos are empty: the player says so plainly
 * instead of showing a broken video, and educators will add real YouTube links later.
 */

export interface Lecture {
  id: string;
  title: string;
  minutes: number;
  /** A YouTube address, checked by `youtubeId` before it is embedded. Empty until an educator adds one. */
  videoUrl: string;
  /** Watchable before enrolling. */
  preview: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  lectures: Lecture[];
}

export interface Course {
  id: string;
  title: string;
  /** One line under the title. */
  summary: string;
  /** Longer description, one string per paragraph (plain text, never HTML). */
  description: string[];
  educatorId: string;
  /** Full price before any discount, in CURRENCY. 0 means free. */
  price: number;
  /** Percent off, 0–100. */
  discount: number;
  icon: PortalIconName;
  tone: 'violet' | 'tangerine' | 'saffron' | 'ink';
  /** An uploaded cover image (an object URL, kept only while the page is open). Without one, a generated cover is shown. */
  thumbUrl?: string;
  /** ISO date. */
  published: string;
  chapters: Chapter[];
}

export interface Enrollment {
  courseId: string;
  personId: string;
  date: string;
}

export interface Rating {
  courseId: string;
  personId: string;
  stars: number;
}

export const CURRENCY = 'USD';

let lectureCounter = 0;
const lec = (title: string, minutes: number, preview = false): Lecture => ({ id: `LEC${++lectureCounter}`, title, minutes, videoUrl: '', preview });
const ch = (id: string, title: string, lectures: Lecture[]): Chapter => ({ id, title, lectures });

export const SEED_COURSES: Course[] = [
  {
    id: 'docker',
    title: 'Docker for developers',
    summary: 'Package, run and ship apps in containers.',
    description: [
      'Start from what a container is and why it beats "it works on my machine". Then write Dockerfiles, keep images small, and wire several services together with Compose.',
      'By the end you can containerise one of your own projects and run it the same way on any machine.',
    ],
    educatorId: 'EMP1',
    price: 5,
    discount: 0,
    icon: 'layers',
    tone: 'violet',
    published: '2025-12-29',
    chapters: [
      ch('docker-1', 'Containers in plain words', [lec('What a container is', 12, true), lec('Images, containers and registries', 22)]),
      ch('docker-2', 'Writing Dockerfiles', [lec('Your first Dockerfile', 18), lec('Smaller images with multi-stage builds', 25), lec('Caching layers', 14)]),
      ch('docker-3', 'Compose', [lec('Running an app and its database together', 30)]),
    ],
  },
  {
    id: 'node-backend',
    title: 'Backend development with Node.js',
    summary: 'Build a REST API with Express, validation and tests.',
    description: [
      'Build a small API from an empty folder: routes, request validation, error handling and a database layer.',
      'Each chapter ends with a working step, so you always have something that runs.',
    ],
    educatorId: 'EMP1',
    price: 0,
    discount: 0,
    icon: 'code',
    tone: 'saffron',
    published: '2026-01-14',
    chapters: [
      ch('node-1', 'Getting started', [lec('How a request reaches your code', 15, true), lec('Express in ten minutes', 10)]),
      ch('node-2', 'A real API', [lec('Routes and controllers', 24), lec('Validating input', 19), lec('Errors the client can act on', 17)]),
      ch('node-3', 'Testing', [lec('Testing routes end to end', 28)]),
    ],
  },
  {
    id: 'react-basics',
    title: 'React fundamentals',
    summary: 'Components, state and effects, explained with small examples.',
    description: [
      'Learn how React thinks: components as functions of state, props flowing down and events flowing up.',
      'Covers state, effects and when you do not need one, lists and keys, and forms.',
    ],
    educatorId: 'EMP6',
    price: 0,
    discount: 0,
    icon: 'grid',
    tone: 'violet',
    published: '2026-02-03',
    chapters: [
      ch('react-1', 'Thinking in components', [lec('Your first component', 11, true), lec('Props', 14)]),
      ch('react-2', 'State and effects', [lec('useState', 16), lec('Effects, and when to skip them', 21)]),
      ch('react-3', 'Lists and forms', [lec('Lists and keys', 13), lec('Controlled forms', 18)]),
    ],
  },
  {
    id: 'mern',
    title: 'Full-stack MERN bootcamp',
    summary: 'MongoDB, Express, React and Node in one project.',
    description: [
      'Put the whole stack together in one project: a React front end talking to an Express API backed by MongoDB.',
      'Includes sign-in, protected routes, and deploying the finished app.',
    ],
    educatorId: 'EMP6',
    price: 20,
    discount: 25,
    icon: 'layers',
    tone: 'tangerine',
    published: '2026-03-11',
    chapters: [
      ch('mern-1', 'Project setup', [lec('The plan for the project', 9, true), lec('Repository and tooling', 16)]),
      ch('mern-2', 'Back end', [lec('Modelling data in MongoDB', 26), lec('The API', 34)]),
      ch('mern-3', 'Front end', [lec('Pages and routing', 22), lec('Talking to the API', 27)]),
      ch('mern-4', 'Shipping it', [lec('Sign-in and protected routes', 31), lec('Deploying', 20)]),
    ],
  },
  {
    id: 'git-teams',
    title: 'Git and GitHub for teams',
    summary: 'Branches, pull requests and reviews without the fear.',
    description: ['Everyday Git for working in a team: branches, commits that explain themselves, pull requests, reviews, and fixing mistakes safely.'],
    // taught by the signed-in person, so the educator pages have something to show
    educatorId: 'EMP0',
    price: 0,
    discount: 0,
    icon: 'kanban',
    tone: 'ink',
    published: '2026-04-20',
    chapters: [
      ch('git-1', 'Everyday Git', [lec('Commits that explain themselves', 12, true), lec('Branches', 15)]),
      ch('git-2', 'Working together', [lec('Pull requests and reviews', 20), lec('Undoing mistakes safely', 18)]),
    ],
  },
  {
    id: 'secure-coding',
    title: 'Secure coding basics',
    summary: 'The common web vulnerabilities and how to avoid them.',
    description: [
      'Walk through the mistakes behind most security incidents: injection, cross-site scripting, broken access control and leaked secrets.',
      'Each one comes with a small vulnerable example and the fix.',
    ],
    educatorId: 'EMP6',
    price: 0,
    discount: 0,
    icon: 'shield',
    tone: 'saffron',
    published: '2026-06-02',
    chapters: [
      ch('sec-1', "Input you can't trust", [lec('SQL injection', 17, true), lec('Cross-site scripting', 19, true)]),
      ch('sec-2', 'Who may do what', [lec('Broken access control', 22), lec('Keeping secrets out of code', 14)]),
    ],
  },
  {
    id: 'edge-ai',
    title: 'Edge AI: running models on device',
    summary: 'Shrink, quantise and deploy models to small hardware.',
    description: ['Take a trained model and make it run on a small device: quantisation, pruning, benchmarking, and the trade-offs between speed and accuracy.'],
    educatorId: 'EMP0',
    price: 15,
    discount: 10,
    icon: 'spark',
    tone: 'tangerine',
    published: '2026-08-18',
    chapters: [
      ch('edge-1', 'Why on device', [lec('Latency, privacy and cost', 14, true)]),
      ch('edge-2', 'Making models smaller', [lec('Quantisation', 26), lec('Pruning', 21), lec('Benchmarking honestly', 80)]),
    ],
  },
];

// Made-up activity so the pages aren't empty. EMP0 is the signed-in person when their email isn't in the sample directory.
export const SEED_ENROLLMENTS: Enrollment[] = [
  { courseId: 'react-basics', personId: 'EMP0', date: '2026-10-02' },
  { courseId: 'docker', personId: 'EMP2', date: '2026-09-21' },
  { courseId: 'node-backend', personId: 'EMP3', date: '2026-09-25' },
  { courseId: 'mern', personId: 'EMP4', date: '2026-10-05' },
  { courseId: 'react-basics', personId: 'EMP5', date: '2026-10-09' },
  { courseId: 'secure-coding', personId: 'EMP7', date: '2026-10-12' },
  { courseId: 'git-teams', personId: 'EMP2', date: '2026-09-30' },
  { courseId: 'git-teams', personId: 'EMP8', date: '2026-10-08' },
  { courseId: 'edge-ai', personId: 'EMP3', date: '2026-10-11' },
  { courseId: 'edge-ai', personId: 'EMP5', date: '2026-10-14' },
];

// The first two lectures of React fundamentals.
export const SEED_COMPLETED: { personId: string; lectureId: string }[] = SEED_COURSES.find((c) => c.id === 'react-basics')!
  .chapters[0].lectures.map((l) => ({ personId: 'EMP0', lectureId: l.id }));

export const SEED_RATINGS: Rating[] = [
  { courseId: 'docker', personId: 'EMP2', stars: 4 },
  { courseId: 'react-basics', personId: 'EMP5', stars: 5 },
  { courseId: 'node-backend', personId: 'EMP3', stars: 4 },
  { courseId: 'secure-coding', personId: 'EMP7', stars: 5 },
];

export const COURSE_INCLUDES = [
  'Lifetime access to all course materials',
  'Certificate of completion',
  'Downloadable resources and assignments',
  'Access to instructor Q&A and community',
  'Regular course updates and new content',
];

export const allLectures = (c: Course) => c.chapters.flatMap((chapter) => chapter.lectures);
export const totalMinutes = (lectures: Lecture[]) => lectures.reduce((n, l) => n + l.minutes, 0);
export const finalPrice = (c: Course) => Math.round(c.price * (100 - c.discount)) / 100;

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** 34 → "34 minutes", 80 → "1 hour, 20 minutes", 120 → "2 hours". */
export function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return plural(m, 'minute');
  return m ? `${plural(h, 'hour')}, ${plural(m, 'minute')}` : plural(h, 'hour');
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY });
/** An amount of money, always as a number ("$0.00"): for totals such as earnings. */
export const formatMoney = (amount: number) => money.format(amount);
/** A course's price: "Free" when it costs nothing. */
export const formatPrice = (amount: number) => (amount === 0 ? 'Free' : money.format(amount));

/**
 * The video id from a YouTube address, or null. Only youtube.com/watch, youtu.be and youtube.com/embed
 * addresses are accepted, and the id must look like one, so nothing else can end up in the player's iframe.
 */
export function youtubeId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.replace(/^www\./, '');
  const id =
    host === 'youtu.be' ? parsed.pathname.slice(1) : host === 'youtube.com' ? (parsed.pathname === '/watch' ? parsed.searchParams.get('v') : parsed.pathname.match(/^\/embed\/([^/]+)$/)?.[1]) : null;
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}
