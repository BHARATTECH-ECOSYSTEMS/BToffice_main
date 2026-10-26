import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREVIEW_MESSAGES, PREVIEW_PHASES, PREVIEW_TIMELINE, LAST_STEP, previewState, startStep } from '../../src/portal/interviewPreview';

// Interview page redesign (owner's 1A 2A 3A 4A): beside the button, a window shows what a candidate sees, and it plays
// one short example interview once when the page opens. The lines follow the real interview (OpenInterviewer's
// lib/prompts/interview.ts): it opens by inviting the candidate to introduce themselves (never "What is your name?"),
// and the technical part asks which line of a small piece of code is wrong.

const byId = (id: string) => PREVIEW_MESSAGES.find((m) => m.id === id)!;

test('the example follows the real interview: an introduction first, then a code question with line numbers', () => {
  assert.deepEqual(PREVIEW_PHASES, ['Introduction', 'Education', 'Project', 'Functionality', 'Ending']);
  assert.deepEqual(PREVIEW_MESSAGES.map((m) => [m.from, m.phase]), [
    ['ai', 'Introduction'],
    ['candidate', 'Introduction'],
    ['ai', 'Functionality'],
  ]);
  assert.match(byId('intro').text, /introduce yourself/i);
  assert.doesNotMatch(byId('intro').text, /what is your name/i);

  const code = byId('code');
  assert.match(code.text, /which line/i);
  assert.ok(code.code && code.code.length >= 3);
  // the line that lights up really is the wrong one: the loop runs one step past the end
  assert.ok(code.bugLine! >= 1 && code.bugLine! <= code.code!.length);
  assert.match(code.code![code.bugLine! - 1], /<= items\.length/);
});

test('the example plays in order: dots, the question, the reply, dots, the code question, then the line lights up', () => {
  const states = Array.from({ length: LAST_STEP + 1 }, (_, step) => previewState(step));
  const status = (step: number) => PREVIEW_MESSAGES.map((m) => states[step].status[m.id]);

  assert.deepEqual(status(0), ['hidden', 'hidden', 'hidden']);
  assert.deepEqual(status(1), ['typing', 'hidden', 'hidden']);
  assert.deepEqual(status(2), ['shown', 'hidden', 'hidden']);
  assert.deepEqual(status(3), ['shown', 'shown', 'hidden']);
  assert.deepEqual(status(4), ['shown', 'shown', 'typing']);
  assert.deepEqual(status(5), ['shown', 'shown', 'shown']);
  assert.equal(states[5].highlight, false);
  assert.deepEqual(status(LAST_STEP), ['shown', 'shown', 'shown']);
  assert.equal(states[LAST_STEP].highlight, true);

  // the header follows the phase being asked
  assert.equal(states[0].phase, 'Introduction');
  assert.equal(states[2].phase, 'Introduction');
  assert.equal(states[LAST_STEP].phase, 'Functionality');
});

test('it takes about six seconds, with time to read each line', () => {
  const at = PREVIEW_TIMELINE.map((t) => t.at);
  assert.equal(at[0], 0);
  for (let i = 1; i < at.length; i++) assert.ok(at[i] - at[i - 1] >= 500, `step ${i} comes ${at[i] - at[i - 1]} ms after the last`);
  assert.ok(at.at(-1)! <= 6500);
  assert.equal(LAST_STEP, PREVIEW_TIMELINE.length);
});

test('with reduced motion the example is shown complete, without playing', () => {
  assert.equal(startStep(true), LAST_STEP);
  assert.equal(startStep(false), 0);
});

test('a step past the end or before the start stays within the example', () => {
  assert.deepEqual(previewState(99), previewState(LAST_STEP));
  assert.deepEqual(previewState(-3), previewState(0));
});
