/**
 * The example interview on HR OPS → Interview: what a candidate sees, played once when the page opens. Its lines follow
 * the real interview (OpenInterviewer's lib/prompts/interview.ts): five phases, an invitation to introduce yourself
 * first, and a technical question about which line of a small piece of code is wrong. The people and answers are made
 * up; the page labels it as an example.
 */

export const PREVIEW_PHASES = ['Introduction', 'Education', 'Project', 'Functionality', 'Ending'] as const;
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
  {
    id: 'code',
    from: 'ai',
    phase: 'Functionality',
    text: 'Thanks, Asha. One line in this loop is wrong. Which line, and how would you fix it?',
    code: ['let total = 0;', 'const items = await getCart();', 'for (let i = 0; i <= items.length; i++) {', '  total += items[i].price;', '}'],
    bugLine: 3,
  },
];

type Change = { at: number } & ({ typing: string } | { show: string } | { highlight: true });

/** What changes when, in ms from the start. Each moment leaves time to read the line before it. */
export const PREVIEW_TIMELINE: Change[] = [
  { at: 0, typing: 'intro' },
  { at: 800, show: 'intro' },
  { at: 2100, show: 'reply' },
  { at: 3400, typing: 'code' },
  { at: 4200, show: 'code' },
  { at: 5200, highlight: true },
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
