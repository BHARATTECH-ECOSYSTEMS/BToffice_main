import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Review 2026-10-26 W3 (owner's 1A): deleting a job and removing a referral happened on one click, and the animated
// delete button stayed on "Deleting" when the backend refused, until a reload. Now each asks first in a window, the
// same way Policy asks before deleting a document, and the plain button works again after a refusal.

const jobs = readFileSync('src/portal/pages/CommunityJobs.tsx', 'utf8');
const community = readFileSync('src/portal/pages/Community.tsx', 'utf8');

test('deleting a job asks first, and only the window deletes it', () => {
  assert.doesNotMatch(jobs, /DeleteButton/);
  assert.match(jobs, /disabled=\{busy\} onClick=\{\(\) => setDeleting\(true\)\}/);
  assert.match(jobs, /title=\{`Delete \$\{job\.title\}\?`\}/);
  assert.equal((jobs.match(/source\.remove\(job\.id\)/g) || []).length, 1);
  assert.match(jobs, /setDeleting\(false\);\s+void run\(async \(\) => \(await source\.remove\(job\.id\)/);
});

test('removing a referral asks first, and the button works again if the backend refuses', () => {
  assert.doesNotMatch(community, /<DeleteButton/);
  assert.match(community, /disabled=\{removingId === r\.id\} onClick=\{\(\) => setRemoving\(r\)\}/);
  assert.match(community, /title=\{`Remove \$\{removing\.title\}\?`\}/);
  assert.equal((community.match(/await removeReferral\(/g) || []).length, 1);
  // whatever the answer, the row's button is usable again
  assert.match(community, /\} finally \{\s+setRemovingId\(null\);/);
});
