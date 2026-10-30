// The "Preview Mode - Participant View" bar (owner's I1A, 2026-10-27): it showed for every real candidate too, with an
// "Exit Preview" button that sent them to the researcher's setup page. It is for the researcher's own Preview only:
// a candidate always comes in through their link, which the page keeps (participantToken); a Preview has none.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { showsPreviewBanner } = require('@/lib/previewBanner');

test("the researcher's Preview shows the bar on the participant pages", () => {
  for (const pathname of ['/consent', '/interview', '/synthesis', '/export']) {
    assert.equal(showsPreviewBanner({ viewMode: 'participant', participantToken: null, pathname }), true, pathname);
  }
});

test('a candidate who came in through their link never sees it', () => {
  for (const pathname of ['/consent', '/interview', '/synthesis', '/export']) {
    assert.equal(showsPreviewBanner({ viewMode: 'participant', participantToken: 'their-link', pathname }), false, pathname);
  }
});

test('not on the researcher pages, and not outside participant view', () => {
  assert.equal(showsPreviewBanner({ viewMode: 'participant', participantToken: null, pathname: '/setup' }), false);
  assert.equal(showsPreviewBanner({ viewMode: 'researcher', participantToken: null, pathname: '/interview' }), false);
  assert.equal(showsPreviewBanner({ viewMode: 'participant', participantToken: null, pathname: null }), false);
});

test('the bar uses this rule, and Preview forgets a link left in this browser before it starts', () => {
  const banner = readFileSync('src/components/PreviewBanner.tsx', 'utf8');
  assert.match(banner, /if \(!showsPreviewBanner\(\{ viewMode, participantToken, pathname \}\)\) \{\s+return null;/);
  const setup = readFileSync('src/components/StudySetup.tsx', 'utf8');
  assert.match(setup, /setParticipantToken\(null\);\s+setViewMode\('participant'\);\s+setStep\('consent'\);\s+router\.push\('\/consent'\);/);
});
