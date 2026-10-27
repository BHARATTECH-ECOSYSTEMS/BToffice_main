import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Every Delete and Mark as left plays its reel (owner's 1A 2A 3B 4A, 2026-10-27): the button still asks first in a
// window (review W3/W4), the reel plays once the window is confirmed while the backend works, the row goes only after
// the reel (afterReel in the store), and a refusal resets the button. Inside a window (a task, the Dashboard's staff
// details), the window's own delete button plays the reel and the window then closes.

const read = (f: string) => readFileSync(f, 'utf8');
const page = (name: string) => read(`src/portal/pages/${name}.tsx`);

test('the bin and wave buttons can ask first and play when told to', () => {
  const ui = read('src/portal/ui.tsx');
  assert.match(ui, /export function DeleteButton\(\{[\s\S]{0,200}onAsk,[\s\S]{0,40}going: goingNow,/);
  assert.match(ui, /onClick=\{going \? undefined : \(onAsk \?\? start\)\}/);
  assert.match(ui, /export function useReel\(ms: number\)/);
  const wave = page('People');
  assert.match(wave, /export function WaveButton\(\{[^}]*onAsk[^}]*going: goingNow[^}]*\}/);
  assert.match(wave, /onClick=\{waving \? undefined : \(onAsk \?\? \(\(\) => play\(onDone!\)\)\)\}/);
});

const STORES: [string, RegExp][] = [
  ['people', /remove: \(id: string, played\?: Promise<unknown>\) => act\(\(\) => afterReel\(api!\.del\(`\/user\/\$\{id\}`\), played\)\)/],
  ['people', /markLeft: \(id: string, played\?: Promise<unknown>\) => act\(\(\) => afterReel\(api!\.post\(/],
  ['certificates', /remove: \(id: string, played\?: Promise<unknown>\) => act\(\(\) => afterReel\(api!\.del\(/],
  ['policies', /remove: \(id: string, played\?: Promise<unknown>\) => act\(\(\) => afterReel\(api!\.del\(/],
  ['resources', /remove: \(id: string, played\?: Promise<unknown>\) => act\(\(\) => afterReel\(api!\.del\(/],
  ['tasks', /remove: \(id: string, played\?: Promise<unknown>\) => act\(\(\) => afterReel\(api!\.del\(/],
  ['community', /remove: \(id: string, played\?: Promise<unknown>\) => act\(\(\) => afterReel\(communityCalls\(api!\)\.removeReferral\(id\), played\)\)/],
  ['community', /remove: \(id: string, played\?: Promise<unknown>\) => act\(\(\) => afterReel\(communityCalls\(api!\)\.removeJob\(id\), played\)\)/],
];

test('each store removes the row only after the reel has played', () => {
  for (const [store, pattern] of STORES) assert.match(read(`src/portal/${store}.ts`), pattern, store);
});

test('People: Mark as left waves and Delete drops into the bin, each after its window', () => {
  const p = page('PeopleConnected');
  assert.match(p, /<WaveButton[\s\S]{0,600}going=\{leavingNow === p\.id\}[\s\S]{0,600}onAsk=\{\(\) => setLeaving\(p\)\}/);
  assert.match(p, /<DeleteButton[\s\S]{0,600}going=\{deletingNow === p\.id\}[\s\S]{0,600}onAsk=\{\(\) => setDeleting\(p\)\}/);
  assert.match(p, /setDeleting\(null\);\s+void playDelete\(person\.id, \(played\) => save\(person, \(\) => directory\.remove\(person\.id, played\)/);
  assert.match(p, /setLeaving\(null\);\s+void playLeave\(person\.id, \(played\) => markLeft\(person, played\)\)/);
  assert.match(p, /await directory\.markLeft\(person\.id, played\)/);
});

test('Certificates, Policy and referrals play the bin on the row after the window', () => {
  const certs = page('CertificatesConnected');
  assert.match(certs, /<DeleteButton[\s\S]{0,600}going=\{deletingNow === c\.id\}[\s\S]{0,200}onAsk=\{\(\) => setDeleting\(c\)\}/);
  assert.match(certs, /void playDelete\(c\.id, \(played\) => remove\(c, played\)\)/);
  assert.match(certs, /await certificates\.remove\(c\.id, played\)/);
  const policy = page('PolicyConnected');
  assert.match(policy, /<DeleteButton[\s\S]{0,600}going=\{deletingNow === d\.id\}[\s\S]{0,200}onAsk=\{\(\) => setDeleting\(d\)\}/);
  assert.match(policy, /void playDelete\(d\.id, \(played\) => run\(d\.id, \(\) => policies\.remove\(d\.id, played\)/);
  const community = page('Community');
  assert.match(community, /<DeleteButton[\s\S]{0,600}label="Remove"[\s\S]{0,600}going=\{removingNow === r\.id\}[\s\S]{0,200}onAsk=\{\(\) => setRemoving\(r\)\}/);
  assert.match(community, /await playRemove\(r\.id, \(played\) => removeReferral\(r\.id, played\)\)/);
});

test('a resource link and a job posting play the bin on their own Delete after the window', () => {
  const res = page('ResourcesConnected');
  assert.match(res, /<DeleteButton[\s\S]{0,600}going=\{deletingNow === link\.id\}[\s\S]{0,200}onAsk=\{\(\) => setDeleting\(true\)\}/);
  assert.match(res, /void playDelete\(link\.id, \(played\) => run\(\(\) => resources\.remove\(link\.id, played\)/);
  const jobs = page('CommunityJobs');
  assert.match(jobs, /<DeleteButton[\s\S]{0,600}going=\{deletingNow === job\.id\}[\s\S]{0,200}onAsk=\{\(\) => setDeleting\(true\)\}/);
  assert.match(jobs, /void playDelete\(job\.id, \(played\) => run\(async \(\) => \(await source\.remove\(job\.id, played\)/);
  assert.match(read('src/portal/pages/jobsSource.ts'), /remove: \(id: string, played\?: Promise<unknown>\) => Promise<void>;/);
});

test("inside a window the window's own delete button plays the reel, then the window closes", () => {
  const tasks = page('TasksConnected');
  assert.match(tasks, /<DeleteButton label="Delete task"[\s\S]{0,200}going=\{deletingNow === task\.id\}/);
  assert.match(tasks, /playDelete\(task\.id, \(played\) => run\(\(\) => tasks\.remove\(task\.id, played\), 'Task deleted\.', true\)\)/);
  const dash = page('DashboardConnected');
  assert.match(dash, /<DeleteAccountModal[\s\S]{0,200}going=\{deletingNow === deleting\.id\}/);
  assert.match(dash, /await playDelete\(person\.id, \(played\) => save\(person, \(\) => directory\.remove\(person\.id, played\)/);
  const modal = page('PeopleConnected');
  assert.match(modal, /export function DeleteAccountModal\(\{ person, going, onClose, onConfirm \}/);
  // only where it plays here (the Dashboard); on People the window closes and the row plays it
  assert.match(modal, /going === undefined \? \([\s\S]{0,200}Delete account[\s\S]{0,120}\) : \(\s+<DeleteButton label="Delete account" going=\{going\} onAsk=\{onConfirm\} \/>/);
});

test("while a button's reel plays it isn't greyed out by the row's own wait", () => {
  const p = page('PeopleConnected');
  assert.match(p, /disabled=\{deletingNow !== p\.id && \(busy \|\| !deletable\)\}/);
  assert.match(p, /disabled=\{leavingNow !== p\.id && \(busy \|\| !!cantLeave\)\}/);
});
