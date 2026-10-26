import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AUDIENCE_DETAIL, BUILD_FOR, ECOSYSTEM, MISSION, POSITIONING, PRINCIPLES, VISION } from '../../src/content';

// Gap audit group D, Part 1 (owner's 1A 2A 3A 4A 8A, 2026-10-26): the public site says what the company's own written
// brief says (bharattech-origin-overview.md in the company bundle), and nothing it can't back up.

const source = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8');

test("About carries the brief's vision, mission and six principles, word for word", () => {
  assert.equal(VISION.line, 'To make intelligence as accessible as information.');
  assert.match(VISION.body, /^Bharattech Origin envisions a future where intelligence is no longer confined to isolated AI applications\./);
  assert.equal(
    MISSION,
    'To transform artificial intelligence from isolated models into a unified intelligence ecosystem capable of continuous learning, persistent memory, autonomous reasoning, and global collaboration.',
  );
  assert.deepEqual(PRINCIPLES, [
    'Intelligence should remember.',
    'Intelligence should evolve.',
    'Intelligence should collaborate.',
    'Intelligence should remain trustworthy.',
    'Intelligence should be accessible.',
    'Intelligence should serve humanity.',
  ]);
  const about = source('pages/About.tsx');
  for (const shown of ['{VISION.line}', '{VISION.body}', '{MISSION}', '{PRINCIPLES.map((principle']) assert.ok(about.includes(shown), shown);
});

test('About lists all ten audiences from the brief; the home section keeps its six', () => {
  assert.deepEqual(BUILD_FOR, [
    'Researchers',
    'Scientists',
    'Developers',
    'Enterprises',
    'Governments',
    'Educational institutions',
    'Defense organizations',
    'Startups',
    'Innovators',
    'Students',
  ]);
  assert.match(source('pages/About.tsx'), /BUILD_FOR\.map/);
  assert.equal(AUDIENCE_DETAIL.length, 6);
});

test("Who we are opens with the company's positioning line; the typo and the unbacked quote are gone", () => {
  assert.equal(
    POSITIONING,
    'Bharattech Origin is not building another AI model. We are building the intelligence infrastructure on which future AI systems can collaborate, evolve, and create new capabilities together.',
  );
  const about = source('pages/About.tsx');
  assert.match(about, /\{POSITIONING\}/);
  assert.doesNotMatch(about, /Techecosystem/);
  assert.doesNotMatch(about, /When India innovates/);
});

test('claims no company file backs up are reworded', () => {
  const content = source('content.ts');
  for (const claim of [/SOC ?2/i, /100% sovereign/i, /22\+ official languages/i, /HIPAA/i]) assert.doesNotMatch(content, claim, String(claim));
});

test('the home Capabilities heading carries the slogan', () => {
  const capabilities = source('sections/Capabilities.tsx');
  assert.match(capabilities, /lines=\{\['One intelligence\.', 'Infinite capabilities\.'\]\}/);
  assert.doesNotMatch(capabilities, /'Fifteen capabilities\.'/);
});

test('the Research story says the domains are one ecosystem, and invites researchers to Careers', () => {
  assert.equal(ECOSYSTEM.line, 'The six research domains are not independent products. Instead, they form a single intelligence ecosystem.');
  assert.deepEqual(ECOSYSTEM.points, [
    'Research improves every model.',
    'Memory is shared intelligently.',
    'Specialized systems collaborate.',
    'Knowledge flows continuously.',
    'New capabilities emerge through interaction.',
  ]);
  const story = source('components/research/ResearchStory.tsx');
  assert.match(story, /ECOSYSTEM\.points\.map/);
  assert.match(story, /<Link to="\/careers"[^>]*>[\s\S]*?Join as a researcher/);
});
