import { test } from 'node:test';
import assert from 'node:assert/strict';
import { learningPlatform, readToolLinks } from '../../src/portal/toolLinks';
import { menuGroups, type TopItem } from '../../src/portal/portalMenu';
import { emailKinds } from '../../src/portal/notifications';
import { NOTIFICATION_KINDS, type Role } from '../../src/portal/session';
import { helpGroups } from '../../src/portal/helpTopics';

// Owner's 3B (2026-10-25): when the portal is connected and the LMS Platform (MERN LMS) has an address, Learning opens
// it in a new tab instead of the portal's own course pages. The demo keeps its own pages.

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

test('the "Course updates" email switch is offered only while courses are the portal’s own', () => {
  assert.deepEqual(emailKinds(false), NOTIFICATION_KINDS);
  const kinds = emailKinds(true).map((k) => k.id);
  assert.ok(!kinds.includes('courses'));
  assert.equal(kinds.length, NOTIFICATION_KINDS.length - 1);
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

test('without the LMS Platform, Help is as before', () => {
  for (const role of ROLES) {
    assert.deepEqual(topics(role), topics(role, undefined));
    const saves = topics(role).find((t) => t.q === 'Which pages save my changes?')!;
    assert.ok(saves.a.includes('courses and your progress in them'), role);
    assert.ok(topics(role).filter((t) => t.q === 'How do courses work?').every((t) => t.link?.to === '/portal/lms' && !t.link.href), role);
  }
});
