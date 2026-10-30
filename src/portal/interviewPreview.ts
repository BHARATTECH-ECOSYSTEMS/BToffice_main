/**
 * The example interview on HR OPS → Interview: what a candidate sees, played once when the page opens. It walks through
 * the real interview's five steps, in the order the interview tool's server keeps them (OpenInterviewer's
 * lib/interviewFlow.ts): an invitation to introduce yourself, the candidate's project, the AI's questions about it, the
 * researcher's own questions, then code with one wrong line. The people and answers are made up; the page labels it as
 * an example.
 */

export const PREVIEW_PHASES = ['Introduction', 'Project', 'Project questions', 'Your questions', 'Code'] as const;
export type PreviewPhase = (typeof PREVIEW_PHASES)[number];

export interface PreviewMessage {
  id: string;
  from: 'ai' | 'candidate';
  phase: PreviewPhase;
  text: string;
  /** A short piece of code shown with line numbers, for the technical questions. */
  code?: string[];
  /** The line (from 1) the question is about; it lights up at the end. */
  bugLine?: number;
}

export const PREVIEW_MESSAGES: PreviewMessage[] = [
  { id: 'intro', from: 'ai', phase: 'Introduction', text: 'Let’s get started. Could you introduce yourself?' },
  {
    id: 'reply',
    from: 'candidate',
    phase: 'Introduction',
    text: 'Hi, I’m Asha. I build APIs with Node and React, and I finished my B.Tech this year.',
  },
  { id: 'project', from: 'ai', phase: 'Project', text: 'Tell me about a project you’re proud of. What did it do, and what was your part?' },
  {
    id: 'project-reply',
    from: 'candidate',
    phase: 'Project',
    text: 'An order tracker for a local shop. I wrote the Node API and most of the React screens.',
  },
  { id: 'follow-up', from: 'ai', phase: 'Project questions', text: 'If two staff edit the same order at once, what does your API do?' },
  {
    id: 'follow-up-reply',
    from: 'candidate',
    phase: 'Project questions',
    text: 'Each save sends the order’s version. If it changed in between, the API refuses and asks them to reload.',
  },
  { id: 'yours', from: 'ai', phase: 'Your questions', text: 'Could you start within a month of an offer?' },
  { id: 'yours-reply', from: 'candidate', phase: 'Your questions', text: 'Yes, from the first of next month.' },
  {
    id: 'code',
    from: 'ai',
    phase: 'Code',
    text: 'Thanks, Asha. Last part: one line in this loop is wrong. Which line, and how would you fix it?',
    code: ['let total = 0;', 'const items = await getCart();', 'for (let i = 0; i <= items.length; i++) {', '  total += items[i].price;', '}'],
    bugLine: 3,
  },
];

type Change = { at: number } & ({ typing: string } | { show: string } | { highlight: true });

/** What changes when, in ms from the start. Each moment leaves time to read the line before it. */
export const PREVIEW_TIMELINE: Change[] = [
  { at: 0, typing: 'intro' },
  { at: 800, show: 'intro' },
  { at: 2000, show: 'reply' },
  { at: 3100, typing: 'project' },
  { at: 3900, show: 'project' },
  { at: 5100, show: 'project-reply' },
  { at: 6200, typing: 'follow-up' },
  { at: 7000, show: 'follow-up' },
  { at: 8200, show: 'follow-up-reply' },
  { at: 9300, typing: 'yours' },
  { at: 10100, show: 'yours' },
  { at: 11000, show: 'yours-reply' },
  { at: 12000, typing: 'code' },
  { at: 12800, show: 'code' },
  { at: 13900, highlight: true },
];

/** The step after every change has happened: the example complete. */
export const LAST_STEP = PREVIEW_TIMELINE.length;

export type MessageStatus = 'hidden' | 'typing' | 'shown';

/** How the example looks after the first `step` changes of the timeline. */
export function previewState(step: number) {
  const applied = PREVIEW_TIMELINE.slice(0, Math.max(0, Math.min(step, LAST_STEP)));
  const status: Record<string, MessageStatus> = Object.fromEntries(PREVIEW_MESSAGES.map((m) => [m.id, 'hidden']));
  let highlight = false;
  let phase: PreviewPhase = PREVIEW_MESSAGES[0].phase;
  for (const change of applied) {
    if ('highlight' in change) highlight = true;
    else {
      const id = 'typing' in change ? change.typing : change.show;
      status[id] = 'typing' in change ? 'typing' : 'shown';
      phase = PREVIEW_MESSAGES.find((m) => m.id === id)!.phase;
    }
  }
  return { status, highlight, phase };
}

/** Where the example starts: with reduced motion it is shown complete instead of played. */
export const startStep = (reducedMotion: boolean) => (reducedMotion ? LAST_STEP : 0);
