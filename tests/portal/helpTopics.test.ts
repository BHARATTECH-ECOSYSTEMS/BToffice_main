import { test } from 'node:test';
import assert from 'node:assert/strict';
import { helpAdmins, helpGroups } from '../../src/portal/helpTopics';
import { toDirectory } from '../../src/portal/people';
import type { Role } from '../../src/portal/session';

const directory = toDirectory([
  { id: 'a1', name: 'Sana Iyer', email: 'sana@example.test', role: 'Superadmin' },
  { id: 'a2', name: 'Ravi Menon', email: 'Ravi@Example.test', role: 'Admin' },
  { id: 'a3', name: 'Asha Rao', email: 'asha@example.test', role: 'Subadmin' },
  { id: 'a4', name: 'Dev Shah', email: 'dev@example.test', role: 'Employee' },
  { id: 'a5', name: 'Mira Das', email: 'mira@example.test', role: 'Intern' },
]);

const ROLES: Role[] = ['admin', 'subadmin', 'employee'];
const questions = (connected: boolean, role: Role) => helpGroups(connected, role, '').flatMap((g) => g.topics.map((t) => t.q));
const answers = (connected: boolean, role: Role) => helpGroups(connected, role, '').flatMap((g) => g.topics.map((t) => t.a));

test('Help names the real admins and super admins, never the reader', () => {
  assert.deepEqual(helpAdmins(directory, 'dev@example.test'), ['Sana Iyer', 'Ravi Menon']);
  // the reader's own email may differ in case from the directory's
  assert.deepEqual(helpAdmins(directory, 'ravi@example.TEST'), ['Sana Iyer']);
  assert.deepEqual(helpAdmins([], 'dev@example.test'), []);
});

test('each role sees only its own connected topics', () => {
  const employee = questions(true, 'employee');
  assert.ok(employee.includes('How do I mark myself active or inactive?'));
  assert.ok(employee.includes('How do I update a task?'));
  assert.ok(!employee.includes('What can admins do?'));
  assert.ok(!employee.includes('What can a sub admin do?'));

  const subadmin = questions(true, 'subadmin');
  assert.ok(subadmin.includes('What can a sub admin do?'));
  assert.ok(!subadmin.includes('What can admins do?'));
  assert.ok(!subadmin.includes('How do I update a task?'));

  const admin = questions(true, 'admin');
  assert.ok(admin.includes('What can admins do?'));
  assert.ok(admin.includes('How do I verify a company or an employee?'));
  assert.ok(!subadmin.includes('How do I verify a company or an employee?'));
  assert.ok(!employee.includes('How do I verify a company or an employee?'));
});

test('connected answers never repeat what only the demo says', () => {
  const demoOnly = [/aren’t connected to the sign-in system/i, /saved in this browser\. emails/i, /isn’t connected to a server/i, /active \/ inactive switch/i];
  for (const role of ROLES) {
    for (const a of answers(true, role)) {
      for (const phrase of demoOnly) assert.doesNotMatch(a, phrase, `${role}: ${a}`);
    }
  }
});

test('the sub admin answer keeps to what the backend lets a sub admin do', () => {
  const topic = helpGroups(true, 'subadmin', '')
    .flatMap((g) => g.topics)
    .find((t) => t.q === 'What can a sub admin do?');
  assert.ok(topic);
  // everything they can't do is named as staying with admins, never offered as theirs
  const [can] = topic.a.split('stay with admins');
  assert.doesNotMatch(can, /issue certificates|publish policies|add people|add resources|change roles/i);
});

test('connected, your photo is saved to the account and only an admin renames you', () => {
  const a = answers(true, 'employee').join(' ');
  assert.match(a, /only an admin can change it/i);
  assert.doesNotMatch(a, /photo shows only in this browser|name or photo from Settings/i);
});

test('connected, everyone learns that an admin sets the join date, and that it saves', () => {
  for (const role of ['employee', 'subadmin', 'admin'] as const) assert.ok(questions(true, role).includes('Where does my join date come from?'), role);
  assert.ok(!questions(false, 'employee').includes('Where does my join date come from?'));
  const saves = answers(true, 'employee').find((a) => a.startsWith('People, Tasks'));
  assert.match(saves ?? '', /join dates/);
});

test('connected, courses are explained as free and saved, not as samples', () => {
  const topic = (role: Role) => helpGroups(true, role, 'courses work').flatMap((g) => g.topics).find((t) => t.q === 'How do courses work?');
  for (const role of ['employee', 'subadmin', 'admin'] as const) {
    const a = topic(role)?.a ?? '';
    assert.match(a, /free/i, role);
    assert.match(a, /saved to your account/i, role);
    assert.doesNotMatch(a, /samples|isn’t connected/i, role);
  }
  assert.match(topic('subadmin')?.a ?? '', /publish/i);
  assert.doesNotMatch(topic('employee')?.a ?? '', /publish/i);
  const saves = answers(true, 'employee').find((a) => a.startsWith('People, Tasks'));
  assert.match(saves ?? '', /courses/);
});

test('connected, everyone learns what the Community is; only admins how to mark someone as left', () => {
  for (const role of ['employee', 'subadmin', 'admin'] as const) assert.ok(questions(true, role).includes('What is the Community?'), role);
  const community = helpGroups(true, 'employee', 'Community').flatMap((g) => g.topics).find((t) => t.q === 'What is the Community?');
  assert.match(community?.a ?? '', /personal email/i);
  assert.doesNotMatch(community?.a ?? '', /bring (them )?back/i, 'how admins undo it is for admins');

  assert.ok(questions(true, 'admin').includes('How do I mark someone as left?'));
  for (const role of ['employee', 'subadmin'] as const) assert.ok(!questions(true, role).includes('How do I mark someone as left?'), role);
  const leaving = helpGroups(true, 'admin', 'left').flatMap((g) => g.topics).find((t) => t.q === 'How do I mark someone as left?');
  assert.match(leaving?.a ?? '', /sign-in/i);
  assert.match(leaving?.a ?? '', /60 days/);
  assert.match(leaving?.a ?? '', /Bring back/);

  const saves = answers(true, 'employee').find((a) => a.startsWith('People, Tasks'));
  assert.match(saves ?? '', /the Community/);
});

test('connected, admins learn how a referral is shared and emailed; nobody else is offered it', () => {
  assert.ok(questions(true, 'admin').includes('How do I share a referral?'));
  for (const role of ['employee', 'subadmin'] as const) assert.ok(!questions(true, role).includes('How do I share a referral?'), role);
  const topic = helpGroups(true, 'admin', 'referral').flatMap((g) => g.topics).find((t) => t.q === 'How do I share a referral?');
  assert.match(topic?.a ?? '', /personal email/i);
  assert.match(topic?.a ?? '', /one email each|one each/i);
  assert.match(topic?.a ?? '', /doesn’t take (.* )?back/i);
  const saves = answers(true, 'admin').find((a) => a.startsWith('People, Tasks'));
  assert.match(saves ?? '', /referrals/);
});

test('connected, admins learn how internal jobs run end to end; sub admins what they see; employees nothing', () => {
  const admin = helpGroups(true, 'admin', '').flatMap((g) => g.topics).find((t) => t.q === 'How do internal jobs work?');
  assert.ok(admin, 'admins get the full answer');
  for (const part of [/emailed/i, /add .*applicant/i, /knowledge check/i, /join date/i, /not this time/i]) assert.match(admin.a, part);
  const sub = helpGroups(true, 'subadmin', '').flatMap((g) => g.topics).find((t) => t.q === 'What are internal job postings?');
  assert.ok(sub, 'sub admins get their own answer');
  assert.match(sub.a, /admins/i);
  assert.ok(!questions(true, 'subadmin').includes('How do internal jobs work?'));
  for (const q of ['How do internal jobs work?', 'What are internal job postings?']) assert.ok(!questions(true, 'employee').includes(q), q);
  const saves = answers(true, 'admin').find((a) => a.startsWith('People, Tasks'));
  assert.match(saves ?? '', /internal jobs/);
});

test('the demo keeps its own answers', () => {
  assert.ok(questions(false, 'employee').includes('Why did my changes disappear?'));
  assert.ok(!questions(true, 'employee').includes('Why did my changes disappear?'));
  assert.ok(questions(true, 'employee').includes('Which pages save my changes?'));
});

test('searching filters both question and answer', () => {
  const hits = helpGroups(true, 'employee', 'PASSWORD').flatMap((g) => g.topics.map((t) => t.q));
  assert.ok(hits.includes('How do I change my password?'));
  assert.ok(!hits.includes('How do I update a task?'));
  assert.deepEqual(helpGroups(true, 'employee', 'zzzz-nothing'), []);
});
