'use client';

import { Award } from 'lucide-react';
import type { Scorecard, ScoreKind, Verdict } from '@/lib/scoring';

// How many of the candidate's answers were correct (lib/scoring.ts), at the top of an interview's Synthesis & Insights.

const KIND_LABEL: Record<ScoreKind, string> = {
  project: 'Project Questions',
  fixed: "Hiring Team's Questions",
  code: 'Code Review'
};

const VERDICT: Record<Verdict, { label: string; className: string }> = {
  correct: { label: 'Correct', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  partly: { label: 'Partly', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  wrong: { label: 'Wrong', className: 'bg-red-50 text-red-700 border-red-200' }
};

export function ScoreCard({ scorecard }: { scorecard: Scorecard }) {
  const count = (verdict: Verdict) => scorecard.items.filter((item) => item.verdict === verdict).length;
  const kinds = (['project', 'fixed', 'code'] as ScoreKind[]).filter((kind) => scorecard.byKind[kind] !== undefined);
  const unscored = scorecard.total - scorecard.scored;

  return (
    <section aria-labelledby="answer-score" className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h3 id="answer-score" className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Award size={16} className="text-blue-600" aria-hidden="true" />
            Answer Score
          </h3>
          <p className="mt-1 text-4xl font-bold text-slate-900 tabular-nums">{scorecard.overall}%</p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {count('correct')} correct, {count('partly')} partly correct, {count('wrong')} wrong of {scorecard.scored} answers
            {unscored > 0 && ` (${unscored} not scored)`}
          </p>
          {scorecard.estimated && (
            <p className="mt-1 text-xs font-medium text-amber-700">
              Estimated from the transcript: this interview was held before answers were scored, so no planted bugs were on record.
            </p>
          )}
        </div>

        <div className="grid flex-1 gap-2.5 min-w-[13rem] max-w-sm">
          {kinds.map((kind) => (
            <div key={kind}>
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>{KIND_LABEL[kind]}</span>
                <span className="tabular-nums">{scorecard.byKind[kind]}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100" aria-hidden="true">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${scorecard.byKind[kind]}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-5 border-t border-slate-100 divide-y divide-slate-100">
        {scorecard.items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 py-3">
            <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold ${VERDICT[item.verdict].className}`}>
              {VERDICT[item.verdict].label}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 break-words">{item.label}</p>
              {item.reason && <p className="mt-0.5 text-xs font-medium text-slate-500 break-words">{item.reason}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
