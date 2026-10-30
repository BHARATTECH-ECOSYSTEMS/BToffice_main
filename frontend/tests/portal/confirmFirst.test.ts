import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Review 2026-10-26 W3 and W4 (owner's 1A and 2A): deleting a job, removing a referral, turning an applicant down
// (which emails them) and marking someone as left (which switches off their sign-in) all happened on one click. The
// animated delete button also stayed on "Deleting" when the backend refused, until a reload. Now each asks first in a
// window, the same way Policy asks before deleting a document, and the plain button works again after a refusal.
// Since 2026-10-27 (owner's 1A 4A) the buttons play the bin or the wave again, but only once the window is confirmed,
// and a refusal stops the reel (deleteReels.test.ts); the asking first stays.

const jobs = readFileSync('src/portal/pages/CommunityJobs.tsx', 'utf8');
const community = readFileSync('src/portal/pages/Community.tsx', 'utf8');
const people = readFileSync('src/portal/pages/PeopleConnected.tsx', 'utf8');

test('deleting a job asks first, and only the window deletes it', () => {
  // the bin only asks: it has no onDone of its own
  assert.doesNotMatch(jobs, /<DeleteButton[^>]*onDone/);
  assert.match(jobs, /<DeleteButton srText=\{job\.title\} disabled=\{deletingNow !== job\.id && busy\} going=\{deletingNow === job\.id\} onAsk=\{\(\) => setDeleting\(true\)\} \/>/);
  assert.match(jobs, /title=\{`Delete \$\{job\.title\}\?`\}/);
  assert.equal((jobs.match(/source\.remove\(job\.id, played\)/g) || []).length, 1);
  assert.match(jobs, /setDeleting\(false\);\s+void playDelete\(job\.id, \(played\) => run\(async \(\) => \(await source\.remove\(job\.id, played\)/);
});

test('removing a referral asks first, and the button works again if the backend refuses', () => {
  assert.doesNotMatch(community, /<DeleteButton[^>]*onDone/);
  assert.match(community, /disabled=\{removingNow !== r\.id && removingId === r\.id\}\s+going=\{removingNow === r\.id\}\s+onAsk=\{\(\) => setRemoving\(r\)\}/);
  assert.match(community, /title=\{`Remove \$\{removing\.title\}\?`\}/);
  assert.equal((community.match(/removeReferral\(r\.id, played\)/g) || []).length, 1);
  // whatever the answer, the row's button is usable again
  assert.match(community, /\} finally \{\s+setRemovingId\(null\);/);
});

test('turning an applicant down asks first, and says when they will be emailed', () => {
  assert.match(jobs, /if \(to === 'declined'\) return setDeclining\(a\);/);
  assert.match(jobs, /void move\(a, 'declined'\);/);
  assert.match(jobs, /source\.connected && declining\.hasPersonalEmail/);
  assert.match(jobs, /emailed to say so/);
});

test('marking someone as left asks first, and only the window does it', () => {
  assert.doesNotMatch(people, /<WaveButton[^>]*onDone/);
  assert.match(people, /disabled=\{leavingNow !== p\.id && \(busy \|\| !!cantLeave\)\}[\s\S]{0,400}onAsk=\{\(\) => setLeaving\(p\)\}/);
  assert.match(people, /<LeaveModal/);
  assert.equal((people.match(/markLeft\(person, played\)/g) || []).length, 1);
  assert.match(people, /setLeaving\(null\);\s+void playLeave\(person\.id, \(played\) => markLeft\(person, played\)\);/);
  // the window says what happens: the community, the sign-in, the ID documents
  assert.match(people, /moves to the \{STREAM_LABEL\[person\.stream!\]\} community today and their sign-in is switched off now/);
  assert.match(people, /Their ID documents are deleted\{' '\}\s+\{ID_RETENTION_DAYS\} days later/);
});
