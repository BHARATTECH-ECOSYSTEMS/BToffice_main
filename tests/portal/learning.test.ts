import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courseBody, coverStore, learningFailedMessage, toCourse, toCourses, toStudents } from '../../src/portal/learning';
import { summarise } from '../../src/portal/lmsData';
import { ApiError } from '../../src/portal/api';

// GET /api/learning/courses, one course as the local backend returns it (controllers/learningController.js view)
const docker = {
  id: '6ad8bc3dd430c9b545aa2a01',
  title: 'Docker for developers',
  description: ['Package, run and ship apps in containers.', 'By the end you can containerise a project.'],
  educator: { id: '6ad8bc3dd430c9b545aa2844', name: 'Test Subadmin' },
  published: true,
  publishedAt: '2026-10-23T09:30:00.000Z',
  thumbnail: '/api/learning/courses/6ad8bc3dd430c9b545aa2a01/thumbnail?v=6ad8bc3dd430c9b545aa2b07',
  chapters: [
    {
      id: '6ad8bc3dd430c9b545aa2c01',
      title: 'Basics',
      lectures: [
        { id: '6ad8bc3dd430c9b545aa2d01', title: 'What a container is', minutes: 12, preview: true, videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        { id: '6ad8bc3dd430c9b545aa2d02', title: 'Images', minutes: 20, preview: false, videoUrl: '' },
      ],
    },
  ],
  students: 3,
  rating: { average: 4.5, count: 2 },
  mine: { enrolled: true, enrolledAt: '2026-10-23T10:00:00.000Z', completed: ['6ad8bc3dd430c9b545aa2d01'], rating: 5 },
  canChange: false,
};

test("the backend's course becomes what the learning pages show, free and with a generated look", () => {
  const course = toCourse(docker)!;
  assert.equal(course.id, docker.id);
  assert.equal(course.title, 'Docker for developers');
  assert.equal(course.summary, 'Package, run and ship apps in containers.');
  assert.deepEqual(course.description, docker.description);
  assert.equal(course.educatorId, docker.educator.id);
  assert.equal(course.educatorName, 'Test Subadmin');
  assert.equal([course.price, course.discount].join(), '0,0');
  assert.equal(course.icon, 'book');
  assert.ok(['violet', 'tangerine', 'saffron', 'ink'].includes(course.tone));
  assert.equal(course.published, '2026-10-23');
  assert.equal(course.isPublished, true);
  assert.equal(course.thumbPath, '/learning/courses/6ad8bc3dd430c9b545aa2a01/thumbnail?v=6ad8bc3dd430c9b545aa2b07');
  assert.deepEqual(course.chapters, [
    {
      id: '6ad8bc3dd430c9b545aa2c01',
      title: 'Basics',
      lectures: [
        { id: '6ad8bc3dd430c9b545aa2d01', title: 'What a container is', minutes: 12, preview: true, videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        { id: '6ad8bc3dd430c9b545aa2d02', title: 'Images', minutes: 20, preview: false, videoUrl: '' },
      ],
    },
  ]);
  assert.deepEqual([course.students, course.rating], [3, { average: 4.5, count: 2 }]);
  assert.deepEqual(course.mine, { enrolled: true, enrolledAt: '2026-10-23', completed: ['6ad8bc3dd430c9b545aa2d01'], rating: 5 });
  assert.equal(course.canChange, false);
});

test('the same course always gets the same cover colour', () => {
  assert.equal(toCourse(docker)!.tone, toCourse({ ...docker, title: 'Renamed' })!.tone);
});

test('only YouTube addresses reach the player, and only the backend’s own cover address is fetched', () => {
  const lecture = (videoUrl: unknown) => ({ ...docker, chapters: [{ ...docker.chapters[0], lectures: [{ ...docker.chapters[0].lectures[0], videoUrl }] }] });
  for (const bad of ['javascript:alert(1)', 'https://evil.example/watch?v=dQw4w9WgXcQ', 42, null]) {
    assert.equal(toCourse(lecture(bad))!.chapters[0].lectures[0].videoUrl, '', String(bad));
  }
  for (const thumbnail of ['https://evil.example/x.png', '/api/user/6ad8bc3dd430c9b545aa2844/photo?v=6ad8bc3dd430c9b545aa2b07', '', undefined]) {
    assert.equal(toCourse({ ...docker, thumbnail })!.thumbPath, undefined, String(thumbnail));
  }
});

test('missing progress reads as not enrolled; canChange is only true when the backend says so', () => {
  const course = toCourse({ ...docker, mine: undefined, canChange: 'yes', rating: null, students: 'many' })!;
  assert.deepEqual(course.mine, { enrolled: false, enrolledAt: undefined, completed: [], rating: 0 });
  assert.equal(course.canChange, false);
  assert.deepEqual([course.students, course.rating], [0, { average: 0, count: 0 }]);
  for (const rating of [0, 6, 2.5, '5']) assert.equal(toCourse({ ...docker, mine: { ...docker.mine, rating } })!.mine.rating, 0, String(rating));
});

test('a removed educator reads as an empty name, which the pages show as a former educator', () => {
  assert.equal(toCourse({ ...docker, educator: { id: 'x', name: '' } })!.educatorName, '');
});

test('a broken course is left out instead of breaking the catalogue', () => {
  const rows = toCourses([
    docker,
    { ...docker, id: '' },
    { ...docker, title: '  ' },
    { ...docker, chapters: 'none' },
    { ...docker, chapters: [{ id: 'c', title: 'No lectures', lectures: 'x' }] },
    null,
    'junk',
  ]);
  assert.deepEqual(rows.map((r) => r.id), [docker.id]);
});

test('a broken lecture is dropped from its chapter, and a chapter left empty is dropped too', () => {
  const course = toCourse({
    ...docker,
    chapters: [
      {
        id: 'c1',
        title: 'Kept',
        lectures: [
          docker.chapters[0].lectures[0],
          { id: '', title: 'x', minutes: 1 },
          { id: 'l3', title: 'y', minutes: 'ten' },
          { id: 'l5', title: 'none', minutes: 0 },
          { id: 'l6', title: 'half', minutes: 2.5 },
          { id: 'l7', title: 'too long', minutes: 601 },
        ],
      },
      { id: 'c2', title: 'Emptied', lectures: [{ id: 'l4', title: '', minutes: 3 }] },
    ],
  })!;
  assert.deepEqual(course.chapters.map((c) => [c.id, c.lectures.map((l) => l.id)]), [['c1', ['6ad8bc3dd430c9b545aa2d01']]]);
});

test('an answer that is not a list is an error, not an empty catalogue', () => {
  for (const raw of [null, { message: 'hi' }, 'oops']) {
    assert.throws(() => toCourses(raw), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
  }
});

test("the summary is the first paragraph, cut at a word near 120 characters", () => {
  assert.equal(summarise('Short.'), 'Short.');
  const long = `${'word '.repeat(30)}end`;
  const cut = summarise(long);
  assert.ok(cut.length <= 121 && cut.endsWith('…'));
  assert.ok(!cut.includes('wor…'));
});

test("a refusal shows the backend's own words; anything else a plain explanation", () => {
  assert.equal(learningFailedMessage(new ApiError('forbidden', 'Enroll in the course first.')), 'Enroll in the course first.');
  assert.equal(learningFailedMessage(new ApiError('bad-request', 'Give 1 to 5 stars.')), 'Give 1 to 5 stars.');
  assert.match(learningFailedMessage(new ApiError('not-found', 'not-found')), /isn’t available/);
  assert.match(learningFailedMessage(new ApiError('unavailable')), /couldn’t reach/);
});

// GET /api/learning/students, as the local backend returns it
const enrolled = {
  courseId: '6ad8bc3dd430c9b545aa2a01',
  courseTitle: 'Docker for developers',
  person: { id: '6ad8bc3dd430c9b545aa2845', name: 'Test Intern', email: 'test.intern@example.test' },
  enrolledAt: '2026-10-23T10:00:00.000Z',
};

test("the backend's enrollments become the educator's student rows", () => {
  assert.deepEqual(toStudents([enrolled]), [
    { courseId: '6ad8bc3dd430c9b545aa2a01', courseTitle: 'Docker for developers', personId: '6ad8bc3dd430c9b545aa2845', name: 'Test Intern', email: 'test.intern@example.test', date: '2026-10-23' },
  ]);
});

test('a removed person reads as an empty name and email; a broken row is left out', () => {
  const rows = toStudents([
    { ...enrolled, person: { id: 'x', name: '', email: '' } },
    { ...enrolled, courseId: '' },
    { ...enrolled, enrolledAt: 'never' },
    null,
  ]);
  assert.deepEqual(rows.map((r) => [r.name, r.email]), [['', '']]);
  assert.throws(() => toStudents({}), (e: unknown) => e instanceof ApiError && e.kind === 'unavailable');
});

test('a course is sent with only what the backend reads, keeping the ids it gave and leaving out the form’s own', () => {
  const body = courseBody({
    title: '  Docker  ',
    description: ['One.', 'Two.'],
    chapters: [
      {
        id: '6ad8bc3dd430c9b545aa2c01',
        title: 'Basics',
        lectures: [
          { id: '6ad8bc3dd430c9b545aa2d01', title: 'Kept', minutes: 12, videoUrl: 'https://youtu.be/9bZkp7q19f0', preview: true },
          { id: 'e3b0c442-98fc-4c14-9afb-f4c8996fb924', title: 'New', minutes: 5, videoUrl: 'https://youtu.be/9bZkp7q19f0', preview: false },
        ],
      },
      { id: 'a1b2c3d4-0000-4000-8000-000000000000', title: 'Added', lectures: [{ id: 'f00', title: 'Also new', minutes: 1, videoUrl: 'https://youtu.be/9bZkp7q19f0', preview: false }] },
    ],
  });
  assert.deepEqual(body, {
    title: 'Docker',
    description: ['One.', 'Two.'],
    chapters: [
      {
        id: '6ad8bc3dd430c9b545aa2c01',
        title: 'Basics',
        lectures: [
          { id: '6ad8bc3dd430c9b545aa2d01', title: 'Kept', minutes: 12, videoUrl: 'https://youtu.be/9bZkp7q19f0', preview: true },
          { title: 'New', minutes: 5, videoUrl: 'https://youtu.be/9bZkp7q19f0', preview: false },
        ],
      },
      { title: 'Added', lectures: [{ title: 'Also new', minutes: 1, videoUrl: 'https://youtu.be/9bZkp7q19f0', preview: false }] },
    ],
  });
});

// Covers are fetched with the sign-in (an <img> can't send it), so the store downloads each once and tells every page
// showing covers when one arrives. A fake fetch that answers only when told to, so arrivals can be ordered.
function fakeFetch() {
  const calls: string[] = [];
  const pending = new Map<string, { ok: (blob: Blob) => void; fail: (error: Error) => void }>();
  const fetchFile = (path: string) =>
    new Promise<Blob>((ok, fail) => {
      calls.push(path);
      pending.set(path, { ok, fail });
    });
  const settle = () => new Promise((r) => setTimeout(r, 0));
  const arrive = async (path: string) => {
    pending.get(path)!.ok(new Blob([path]));
    await settle();
  };
  const fail = async (path: string) => {
    pending.get(path)!.fail(new Error('down'));
    await settle();
  };
  return { calls, fetchFile, arrive, fail };
}
const coverPaths = Array.from({ length: 8 }, (_, i) => `/learning/courses/c${i}/thumbnail?v=t${i}`);

test('cover store: eight covers arriving one by one are each fetched once and each announced', async () => {
  const net = fakeFetch();
  const store = coverStore(net.fetchFile, (blob) => `blob:${blob.size}`);
  let told = 0;
  store.subscribe(() => told++);

  store.want(coverPaths);
  store.want(coverPaths); // the page redraws while they're still on their way
  assert.equal(net.calls.length, 8);

  for (const [i, path] of [...coverPaths].reverse().entries()) {
    await net.arrive(path);
    assert.equal(told, i + 1, `told about arrival ${i + 1}`);
    assert.equal(store.version(), i + 1);
  }
  assert.ok(coverPaths.every((p) => store.url(p)?.startsWith('blob:')), 'all eight covers ready');

  store.want(coverPaths);
  assert.equal(net.calls.length, 8, 'a cover that arrived is never fetched again');
});

test('cover store: a page that stops listening is not told, the others still are', async () => {
  const net = fakeFetch();
  const store = coverStore(net.fetchFile, () => 'blob:x');
  let catalogue = 0;
  let coursePage = 0;
  const stopCatalogue = store.subscribe(() => catalogue++);
  store.subscribe(() => coursePage++);

  store.want(coverPaths.slice(0, 2));
  await net.arrive(coverPaths[0]);
  stopCatalogue(); // the catalogue closed; the course page asked for the same covers
  store.want(coverPaths.slice(0, 2));
  await net.arrive(coverPaths[1]);

  assert.deepEqual([catalogue, coursePage], [1, 2]);
  assert.equal(net.calls.length, 2);
});

test('cover store: a cover that failed stays out and is tried again the next time it is wanted', async () => {
  const net = fakeFetch();
  const store = coverStore(net.fetchFile, () => 'blob:x');
  let told = 0;
  store.subscribe(() => told++);
  const warn = console.warn;
  console.warn = () => {};
  try {
    store.want([coverPaths[0]]);
    await net.fail(coverPaths[0]);
  } finally {
    console.warn = warn;
  }
  assert.equal(store.url(coverPaths[0]), undefined);
  assert.equal(told, 0, 'nothing new to show');

  store.want([coverPaths[0]]);
  await net.arrive(coverPaths[0]);
  assert.equal(net.calls.length, 2);
  assert.equal(store.url(coverPaths[0]), 'blob:x');
  assert.equal(told, 1);
});
