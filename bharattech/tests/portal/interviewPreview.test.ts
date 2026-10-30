import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREVIEW_MESSAGES, PREVIEW_PHASES, PREVIEW_TIMELINE, LAST_STEP, previewState, startStep } from '../../src/portal/interviewPreview';

// Interview page redesign (owner's 1A 2A 3A 4A): beside the button, a window shows what a candidate sees, and it plays
// one short example interview once when the page opens. The lines follow the real interview, in the order the
// interview tool's server keeps (OpenInterviewer's lib/interviewFlow.ts, rebuilt 2026-10-28): an introduction, the
// candidate's project, the AI's questions about it, the researcher's own questions, then code with one wrong line.
// The owner's A (2026-10-30): each of the five bars is named, and the example walks through every one of them.

const byId = (id: string) => PREVIEW_MESSAGES.find((m) => m.id === id)!;

test('the five steps are the real interview’s, in its order', () => {
  assert.deepEqual(PREVIEW_PHASES, ['Introduction', 'Project', 'Project questions', 'Your questions', 'Code']);
});

test('every step has its question in the example, and the messages come in step order', () => {
  const order = PREVIEW_MESSAGES.map((m) => PREVIEW_PHASES.indexOf(m.phase));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  for (const phase of PREVIEW_PHASES) {
    const first = PREVIEW_MESSAGES.find((m) => m.phase === phase);
    assert.ok(first, `${phase} has no message`);
    assert.equal(first.from, 'ai', `${phase} starts with the AI asking`);
  }
});

test('it opens with an introduction and ends on a code question with line numbers', () => {
  assert.match(byId('intro').text, /introduce yourself/i);
  assert.doesNotMatch(byId('intro').text, /what is your name/i);

  const code = byId('code');
  assert.equal(code.phase, 'Code');
  assert.equal(PREVIEW_MESSAGES.at(-1), code);
  assert.match(code.text, /which line/i);
  assert.ok(code.code && code.code.length >= 3);
  // the line that lights up really is the wrong one: the loop runs one step past the end
  assert.ok(code.bugLine! >= 1 && code.bugLine! <= code.code!.length);
  assert.match(code.code![code.bugLine! - 1], /<= items\.length/);
});

test('the bar moves one step at a time and never skips one', () => {
  const index = (step: number) => PREVIEW_PHASES.indexOf(previewState(step).phase);
  assert.equal(index(0), 0);
  for (let step = 1; step <= LAST_STEP; step++) {
    const move = index(step) - index(step - 1);
    assert.ok(move === 0 || move === 1, `step ${step} moves the bar by ${move}`);
  }
  assert.equal(index(LAST_STEP), PREVIEW_PHASES.length - 1);
});

test('the AI types (dots) before each of its lines; replies just appear; the wrong line lights up last', () => {
  for (const m of PREVIEW_MESSAGES) {
    const shownAt = PREVIEW_TIMELINE.findIndex((c) => 'show' in c && c.show === m.id);
    assert.ok(shownAt >= 0, `${m.id} is never shown`);
    const typedJustBefore = shownAt > 0 && 'typing' in PREVIEW_TIMELINE[shownAt - 1] && (PREVIEW_TIMELINE[shownAt - 1] as { typing: string }).typing === m.id;
    assert.equal(typedJustBefore, m.from === 'ai', `${m.id}: dots ${m.from === 'ai' ? 'missing' : 'not expected'}`);
  }
  const all = (step: number) => PREVIEW_MESSAGES.map((m) => previewState(step).status[m.id]);
  assert.ok(all(0).every((s) => s === 'hidden'));
  assert.equal(previewState(1).status.intro, 'typing');
  assert.ok(all(LAST_STEP - 1).every((s) => s === 'shown'));
  assert.equal(previewState(LAST_STEP - 1).highlight, false);
  assert.equal(previewState(LAST_STEP).highlight, true);
});

test('it takes about fourteen seconds, with time to read each line', () => {
  const at = PREVIEW_TIMELINE.map((t) => t.at);
  assert.equal(at[0], 0);
  for (let i = 1; i < at.length; i++) assert.ok(at[i] - at[i - 1] >= 500, `step ${i} comes ${at[i] - at[i - 1]} ms after the last`);
  assert.ok(at.at(-1)! <= 15000);
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
