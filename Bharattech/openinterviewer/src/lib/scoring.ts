// The answer score on an interview (owner, 2026-10-28): every project question, every fixed question and the three
// code snippets. The server picks the questions and pairs each with the candidate's final answer; the AI only says
// correct / partly / wrong for each; the percentages are worked out here (correct 1, partly ½, wrong 0), so the same
// verdicts always give the same score.

export type ScoreKind = 'project' | 'fixed' | 'code';
export type Verdict = 'correct' | 'partly' | 'wrong';

export interface ScoredQuestion {
  id: string;            // Q1, Q2, … in interview order: the AI answers by these
  kind: ScoreKind;
  step: string;
  label: string;         // short enough for the score list ("Snippet 2 of 3: Backend")
  question: string;
  answer: string;
  bug?: string;          // a code snippet's planted bug and fix (the AI's hidden note)
}

export interface Scorecard {
  overall: number;                               // 0-100
  byKind: Partial<Record<ScoreKind, number>>;    // 0-100 per kind that has a scored question
  items: { id: string; kind: ScoreKind; label: string; verdict: Verdict; reason: string }[];
  scored: number;                                // questions with a usable verdict
  total: number;                                 // questions asked and answered
  // an interview held before answers were scored: worked out later from its transcript, with no planted bug on record
  estimated?: true;
}

type Exchange = { step?: string; question: string; answer: string; note?: string };

const kindOf = (step = ''): ScoreKind | null =>
  step === 'deepdive' ? 'project' : step.startsWith('core:') ? 'fixed' : step.startsWith('snippet:') ? 'code' : null;

const POINTS: Record<Verdict, number> = { correct: 1, partly: 0.5, wrong: 0 };

function labelOf(kind: ScoreKind, question: string) {
  const text = question.replace(/\r/g, '').trim();
  if (kind === 'code') return text.match(/Snippet \d of 3:\s*\w+/i)?.[0] ?? 'Code snippet';
  // the question itself, without the acknowledgement lines before it
  const asked = text.split('\n').map((line) => line.trim()).filter(Boolean).find((line) => line.includes('?')) ?? text;
  return asked.length > 200 ? `${asked.slice(0, 197)}...` : asked;
}

/**
 * The scored questions, each with the candidate's final answer. A turn holds the candidate's answer and the question
 * that followed it, so a question is answered by the next turn; a re-asked question keeps both answers, and an answer
 * sent again after an AI failure ('retry') replaces the one before it.
 */
export function scoredQuestions(exchanges: Exchange[]): ScoredQuestion[] {
  const out: ScoredQuestion[] = [];
  exchanges.forEach((exchange, i) => {
    const kind = kindOf(exchange.step);
    if (!kind) return;
    const answers: string[] = [];
    for (let j = i + 1; j < exchanges.length; j++) {
      if (exchanges[j - 1].step === 'retry' && j - 1 > i) answers.pop();
      answers.push(exchanges[j].answer);
      if (exchanges[j].step !== 'reask' && exchanges[j].step !== 'retry') break;
    }
    const answer = answers.filter((a) => a.trim()).join(' / ');
    if (!answer) return;
    out.push({
      id: `Q${out.length + 1}`,
      kind,
      step: exchange.step!,
      label: labelOf(kind, exchange.question),
      question: exchange.question.slice(0, 1500),
      answer: answer.slice(0, 1500),
      ...(kind === 'code' && exchange.note && { bug: exchange.note })
    });
  });
  return out;
}

const percent = (points: number[]) => Math.round((100 * points.reduce((a, b) => a + b, 0)) / points.length);

type Item = Scorecard['items'][number];
type RawVerdict = { id: string; verdict: Verdict; reason: string; kind?: string };

// the AI's verdicts by question id; an unknown verdict or a missing id leaves that question unscored
function verdictsById(verdicts: unknown[]): Map<string, RawVerdict> {
  const byId = new Map<string, RawVerdict>();
  for (const v of verdicts as any[]) {
    const verdict = String(v?.verdict ?? '').trim().toLowerCase() as Verdict;
    if (typeof v?.id === 'string' && verdict in POINTS) {
      byId.set(v.id, { id: v.id, verdict, reason: String(v.reason ?? '').slice(0, 300), kind: String(v.kind ?? '').trim().toLowerCase() });
    }
  }
  return byId;
}

function cardFrom(items: Item[], total: number): Scorecard | null {
  if (!items.length) return null;
  const byKind: Scorecard['byKind'] = {};
  for (const kind of ['project', 'fixed', 'code'] as ScoreKind[]) {
    const ofKind = items.filter((item) => item.kind === kind);
    if (ofKind.length) byKind[kind] = percent(ofKind.map((item) => POINTS[item.verdict]));
  }
  return { overall: percent(items.map((item) => POINTS[item.verdict])), byKind, items, scored: items.length, total };
}

/** The scorecard from the AI's verdicts ([{id, verdict, reason}]); null when no question got a usable verdict. */
export function buildScorecard(questions: ScoredQuestion[], verdicts: unknown): Scorecard | null {
  if (!Array.isArray(verdicts) || !questions.length) return null;
  const byId = verdictsById(verdicts);
  const items = questions.flatMap((q) => {
    const v = byId.get(q.id);
    return v ? [{ id: q.id, kind: q.kind, label: q.label, verdict: v.verdict, reason: v.reason }] : [];
  });
  return cardFrom(items, questions.length);
}

/* ── interviews held before answers were scored ── */

/** One interviewer message from an old transcript and every reply the candidate gave to it. */
export interface TranscriptPair {
  id: string;            // P1, P2, … in transcript order: the AI answers by these
  label: string;
  question: string;
  answer: string;
}

type Message = { role?: string; content?: unknown };

/** Pairs each interviewer message with the candidate's replies before the next one; a message with no reply is left out. */
export function transcriptPairs(messages: Message[]): TranscriptPair[] {
  const out: TranscriptPair[] = [];
  const list = Array.isArray(messages) ? messages : [];
  list.forEach((message, i) => {
    if (message?.role === 'user') return;
    const replies: string[] = [];
    for (let j = i + 1; j < list.length && list[j]?.role === 'user'; j++) replies.push(String(list[j].content ?? '').trim());
    const answer = replies.filter(Boolean).join(' / ');
    if (!answer) return;
    const question = String(message?.content ?? '').trim();
    const hasCode = question.includes('```');
    out.push({
      id: `P${out.length + 1}`,
      label: hasCode ? 'Code question' : labelOf('project', question),
      // a code question keeps its code whole; prose is cut shorter, so a long old interview stays within one request
      question: question.slice(0, hasCode ? 1200 : 500),
      answer: answer.slice(0, 600)
    });
  });
  return out;
}

/**
 * The scorecard for an older interview: only the pairs the AI found scorable (kind project, fixed or code) count;
 * null when it found none.
 */
export function buildEstimatedScorecard(pairs: TranscriptPair[], verdicts: unknown): Scorecard | null {
  if (!Array.isArray(verdicts) || !pairs.length) return null;
  const byId = verdictsById(verdicts);
  const items = pairs.flatMap((p): Item[] => {
    const v = byId.get(p.id);
    const kind = v?.kind as ScoreKind;
    return v && (kind === 'project' || kind === 'fixed' || kind === 'code')
      ? [{ id: p.id, kind, label: p.label, verdict: v.verdict, reason: v.reason }]
      : [];
  });
  const card = cardFrom(items, items.length);
  return card && { ...card, estimated: true };
}

/** An interview's score: the one its summary carries (interviews scored at the end), else the estimated one kept beside it. */
export function scorecardOf(interview: { synthesis?: { scorecard?: Scorecard } | null; scorecard?: Scorecard | null }): Scorecard | null {
  return interview?.synthesis?.scorecard ?? interview?.scorecard ?? null;
}
