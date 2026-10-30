import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toVerification } from '../../src/portal/verifications';
import { toDirectory } from '../../src/portal/people';
import { nameChangeHint } from '../../src/portal/profile';

// Review 2026-10-26 low list, portal (the small fixes): the calendar's legend left out Follow-ups when connected; a
// photo that failed to load was never tried again; a company's website was made a link without checking it's a web
// address; People had one "saving" slot for the whole table, and told you apart by email without ignoring capitals;
// a task's brief and the work handed in shared one file; Settings told an Admin an admin could change their name; and
// the demo showed Sub Admins buttons the real portal doesn't give them.

const read = (file: string) => readFileSync(file, 'utf8');

test("the calendar's legend lists Follow-ups wherever they're shown: the demo's managers and, connected, admins", () => {
  const src = read('src/portal/Calendar.tsx');
  assert.match(src, /k !== 'followup' \|\| role === 'admin' \|\| \(manager && SAMPLE_RECORDS\)/);
});

test('a photo that fails to load is tried again a minute later', () => {
  const src = read('src/portal/myPhoto.ts');
  assert.match(src, /const PHOTO_RETRY_MS = 60_000;/);
  assert.match(src, /window\.setTimeout\(\(\) => state\.email === email && !state\.url && void load\(email\), PHOTO_RETRY_MS\);/);
});

const company = { id: '6ad8bc3dd430c9b545aa3001', kind: 'company', status: 'pending', done: [], note: '', openedBy: 'Test Admin', openedAt: '2026-10-20T05:30:00.000Z', log: [], company: 'Northwind', registration: 'U1', contactEmail: 'a@northwind.example.com' };

test("a company's website is kept only as a web address, so a stored oddity is never a link", () => {
  const ok = toVerification({ ...company, website: 'https://northwind.example.com/' });
  assert.equal(ok?.kind === 'company' && ok.website, 'https://northwind.example.com/');
  for (const website of ['javascript:alert(1)', 'data:text/html,hi', 'northwind.example.com']) {
    const v = toVerification({ ...company, website });
    assert.equal(v?.kind === 'company' && v.website, '', website);
  }
});

test('People keeps a saving mark per person, so two saves at once never mix', () => {
  const src = read('src/portal/pages/PeopleConnected.tsx');
  assert.match(src, /useState<ReadonlySet<string>>\(new Set\(\)\)/);
  assert.match(src, /const busy = saving\.has\(p\.id\);/);
  assert.doesNotMatch(src, /setSaving\(null\)/);
});

test('directory emails are read in lower case, as the sign-in keeps yours, so "Is this me?" ignores capitals', () => {
  const [row] = toDirectory([{ id: 'u1', fullName: 'Asha Rao', email: 'Asha.Rao@Example.TEST', role: 'Admin' }]);
  assert.equal(row.email, 'asha.rao@example.test');
});

test("a task's brief and the work handed in are picked separately", () => {
  const src = read('src/portal/pages/TasksConnected.tsx');
  assert.match(src, /const \[briefFile, setBriefFile\] = useState<File \| null>\(null\);/);
  assert.match(src, /const \[workFile, setWorkFile\] = useState<File \| null>\(null\);/);
  assert.match(src, /tasks\.attachBrief\(task\.id, briefFile\)/);
  assert.match(src, /tasks\.handIn\(task\.id, workFile, notes\)/);
});

test("Settings says who can change your name, by your own role", () => {
  assert.match(nameChangeHint('Super Admin'), /you can change it on the People page/i);
  assert.match(nameChangeHint('Admin'), /only a Super Admin can change it/i);
  assert.match(nameChangeHint('Employee'), /only an admin can change it/i);
  assert.match(nameChangeHint(undefined), /only an admin can change it/i);
  assert.match(read('src/portal/pages/Settings.tsx'), /hint=\{nameChangeHint\(roleLabel\)\}/);
});

test('the demo gives Sub Admins the same buttons as the real portal: no adding people, resources, policies or certificates', () => {
  assert.match(read('src/portal/pages/People.tsx'), /\{isAdmin && \(\s*<button type="button" className=\{btnClass\('light'\)\} onClick=\{\(\) => setInviting\(true\)\}>/);
  assert.match(read('src/portal/pages/Resources.tsx'), /\{role === 'admin' && \(\s*<button type="button" className=\{btnClass\('light'\)\} onClick=\{\(\) => setAdding\(true\)\}>/);
  assert.match(read('src/portal/pages/Policy.tsx'), /\{role === 'admin' && \(\s*<button type="button" className=\{btnClass\('light'\)\} onClick=\{\(\) => setUploading\(true\)\}>/);
  assert.match(read('src/portal/pages/Certificates.tsx'), /const canIssue = useSession\(\)!\.role === 'admin';/);
  const dashboard = read('src/portal/pages/Dashboard.tsx');
  assert.match(dashboard, /\{isAdmin && \(\s*<Link to="\/portal\/certificates" className=\{btnClass\('primary'\)\}>/);
  assert.match(dashboard, /\{isAdmin && \(\s*<button type="button" className=\{btnClass\('primary'\)\} onClick=\{\(\) => setInviting\(true\)\}>/);
});
