import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { learningPlatform, readToolLinks } from '../../src/portal/toolLinks';
import { menuGroups, type TopItem } from '../../src/portal/portalMenu';
import { EMAIL_KINDS } from '../../src/portal/notifications';
import { type Role } from '../../src/portal/session';
import { helpGroups } from '../../src/portal/helpTopics';

// Owner's 3B (2026-10-25): when the portal is connected and the LMS Platform (MERN LMS) has an address, Learning opens
// it in a new tab. Its own course pages were deleted on 2026-10-26 (owner's 2-1A): without the LMS Platform, Learning
// says courses are there and it isn't connected.

const PLATFORM = 'https://lms.example.test';
const ROLES: Role[] = ['admin', 'subadmin', 'employee'];
const topics = (role: Role, platform?: string) => helpGroups(true, role, '', platform).flatMap((g) => g.topics);

test('the LMS Platform address is read from VITE_LMS_PLATFORM_URL, trimmed, web addresses only', () => {
  assert.equal(readToolLinks({ VITE_LMS_PLATFORM_URL: ' https://lms.example.test ' }).lmsPlatform, PLATFORM);
  assert.equal(readToolLinks({ VITE_LMS_PLATFORM_URL: 'javascript:alert(1)' }).lmsPlatform, undefined);
  assert.equal(readToolLinks({}).lmsPlatform, undefined);
});

test('Learning goes to the LMS Platform only when the portal is connected and the address is set', () => {
  assert.equal(learningPlatform({ lmsPlatform: PLATFORM }, true), PLATFORM);
  // the demo has no Keycloak accounts to sign in to the LMS Platform with
  assert.equal(learningPlatform({ lmsPlatform: PLATFORM }, false), undefined);
  assert.equal(learningPlatform({}, true), undefined);
});

test('a top-bar page with an address of its own keeps it, so the phone menu opens it in a new tab too', () => {
  const items: TopItem[] = [
    { key: 'overview', label: 'Overview', to: '/portal', tone: 'saffron', fx: 'drop' },
    { key: 'learning', label: 'Learning', to: '/portal/lms', href: PLATFORM, tone: 'tangerine', fx: 'tilt' },
  ];
  const [pages] = menuGroups(items);
  assert.equal(pages.links.find((l) => l.label === 'Learning')?.href, PLATFORM);
  assert.equal(pages.links.find((l) => l.label === 'Overview')?.href, undefined);
});

test('there is no "Course updates" email switch: the portal has no courses of its own', () => {
  assert.ok(!EMAIL_KINDS.some((k) => String(k.id) === 'courses'));
});

test('Help sends everyone to the LMS Platform for courses, with its address', () => {
  for (const role of ROLES) {
    const courses = topics(role, PLATFORM).filter((t) => t.q === 'How do courses work?');
    assert.equal(courses.length, 1, role);
    assert.match(courses[0].a, /LMS Platform/, role);
    assert.match(courses[0].a, /new tab/, role);
    assert.equal(courses[0].link?.href, PLATFORM, role);
  }
  const manager = topics('admin', PLATFORM).find((t) => t.q === 'How do courses work?')!;
  // MERN LMS can add courses but not change or remove them (owner's G1A)
  assert.match(manager.a, /can’t be changed or removed there yet/);
});

test('"Which pages save" no longer counts courses as saved by the portal when they live in the LMS Platform', () => {
  for (const role of ROLES) {
    const saves = topics(role, PLATFORM).find((t) => t.q === 'Which pages save my changes?')!;
    assert.ok(!saves.a.includes('courses and your progress in them'), role);
    assert.match(saves.a, /LMS Platform keeps your courses/, role);
  }
});

test('without the LMS Platform, Help says courses are there and it isn’t connected, in the demo too', () => {
  for (const role of ROLES) {
    for (const connected of [true, false]) {
      const all = helpGroups(connected, role, '').flatMap((g) => g.topics);
      const courses = all.filter((t) => t.q === 'How do courses work?');
      assert.equal(courses.length, 1, role);
      assert.match(courses[0].a, /LMS Platform/, role);
      assert.match(courses[0].a, /isn’t connected here/, role);
      assert.equal(courses[0].link?.to, '/portal/lms', role);
      assert.equal(courses[0].link?.href, undefined, role);
      assert.ok(!all.some((t) => /courses and your progress|Every course in Learning/.test(t.a)), role);
    }
  }
});

test('the old Learning pages are gone: no files, no routes, no styles, no calls to /api/learning', () => {
  for (const file of ['src/portal/pages/lms', 'src/portal/learning.ts', 'src/portal/lmsData.ts']) assert.equal(existsSync(file), false, file);
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.doesNotMatch(app, /pages\/lms/);
  // every /portal/lms address (old bell notes link to courses) lands on the note saying where courses are
  assert.match(app, /\{ path: 'lms\/\*', lazy: page\(loadResources, 'LearningElsewhere'\) \}/);
  const note = readFileSync('src/portal/pages/Resources.tsx', 'utf8');
  assert.match(note, /LMS_PLATFORM\s*\?\s*'Choose Learning in the top bar/);
  const css = readFileSync('src/styles/portal.css', 'utf8');
  for (const cls of ['p-player', 'p-course-grid', 'p-lms-hero', 'p-buy', 'p-stars', 'p-draft-chapter']) assert.doesNotMatch(css, new RegExp(`\\.${cls}(?![\\w-])`), cls);
  assert.doesNotMatch(css, /@keyframes (p-done-in|p-check-draw)/);
  const store = readFileSync('src/portal/store.tsx', 'utf8');
  assert.doesNotMatch(store, /SEED_COURSES|rateCourse|setLectureDone/);
  for (const file of ['src/portal/api.ts', 'src/portal/myLearning.ts', 'src/portal/pages/MyLearningPanel.tsx']) assert.doesNotMatch(readFileSync(file, 'utf8'), /['`]\/learning\//, file);
});
