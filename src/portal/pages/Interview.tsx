import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { openInterviewTool } from '../interview';
import { LAST_STEP, PREVIEW_MESSAGES, PREVIEW_PHASES, PREVIEW_TIMELINE, previewState, startStep, type MessageStatus, type PreviewMessage } from '../interviewPreview';
import { useScrollBox } from '../scrollBox';
import { useSession } from '../session';
import { btnClass, BtnLabel, PageHead, PortalNotFound } from '../ui';

const SUB = 'AI interviews for candidates, in OpenInterviewer.';

// what happens, in order (so the numbers mean something)
const STEPS = [
  { title: 'Set up a role', body: 'Job title, what the role needs, and how long its links stay open.' },
  { title: 'Send each candidate a link', body: 'A private link that works once. No account needed.' },
  { title: 'Read the results', body: 'Every transcript, with an AI summary of what stood out.' },
];

/**
 * HR OPS → Interview, for Admins and Super Admins (the backend's rule for the launch). The tool runs on its own site,
 * so this page opens it in a new tab, signed in as the person (interview.ts), and shows what a candidate sees.
 */
export function Interview() {
  const role = useSession()!.role;
  const [opening, setOpening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (role !== 'admin') return <PortalNotFound />;

  const client = api;
  const open = async () => {
    if (!client) return;
    setOpening(true);
    setProblem(null);
    const result = await openInterviewTool(client.post);
    setOpening(false);
    if (!result.ok) setProblem(result.message);
  };

  return (
    <>
      <PageHead title="Interview" sub={SUB} />
      <section className="p-card p-iv">
        <div className="p-iv-lead">
          <h2 className="p-iv-title">First-round interviews, without booking a single call.</h2>
          <p className="p-muted p-iv-intro">
            Each candidate takes the interview when it suits them. An AI asks one question at a time, follows up on what they say, and ends
            with a short coding question.
          </p>

          {client ? (
            <div className="p-iv-actions">
              <button type="button" className={btnClass('primary')} onClick={open} disabled={opening}>
                <BtnLabel arrow="up-right">{opening ? 'Opening…' : 'Open interview tool'}</BtnLabel>
                <span className="sr-only"> (opens in a new tab)</span>
              </button>
              <p className="p-resource-caption">Opens in a new tab, signed in as you.</p>
            </div>
          ) : (
            <p className="p-iv-offline">
              <strong>Not connected here.</strong> The interview tool opens in a new tab, signed in as you, once this portal is connected to the
              company system.
            </p>
          )}
          {problem && (
            <p className="p-error" role="alert">
              {problem}
            </p>
          )}

          <ol className="p-iv-steps">
            {STEPS.map((s) => (
              <li key={s.title}>
                <strong>{s.title}</strong>
                <span>{s.body}</span>
              </li>
            ))}
          </ol>
        </div>

        <InterviewPreview />
      </section>
    </>
  );
}

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The example interview (interviewPreview.ts), played once when the page opens and again on Replay. Every line is in
 * the page from the start (screen readers read it whole, and nothing below moves); the timeline only reveals them.
 */
function InterviewPreview() {
  const [reduced] = useState(prefersReducedMotion);
  const [step, setStep] = useState(() => startStep(reduced));
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduced) return;
    setStep(0);
    const timers = PREVIEW_TIMELINE.map((change, i) => window.setTimeout(() => setStep(i + 1), change.at));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [run, reduced]);

  const { status, highlight, phase } = previewState(step);
  const phaseIndex = PREVIEW_PHASES.indexOf(phase);
  const chat = useRef<HTMLDivElement>(null);
  const chatScrolls = useScrollBox(chat);

  // the whole interview is taller than the window, so the window follows the newest line as it appears
  useEffect(() => {
    const box = chat.current;
    if (!box || reduced) return;
    const seen = box.querySelectorAll<HTMLElement>('.p-iv-msg:not([data-status="hidden"])');
    const latest = seen[seen.length - 1];
    const top = latest ? Math.max(0, latest.offsetTop + latest.offsetHeight + 16 - box.clientHeight) : 0;
    box.scrollTo({ top, behavior: step ? 'smooth' : 'auto' });
  }, [step, reduced]);

  return (
    <figure className="p-iv-preview" aria-label="Example of what a candidate sees">
      <div className="p-iv-window">
        <header className="p-iv-window-head">
          <span className="p-iv-window-title">What the candidate sees</span>
          <span className="p-iv-example">Example</span>
        </header>
        <ol className="p-iv-phase" aria-label="Interview steps">
          {PREVIEW_PHASES.map((p, i) => (
            <li key={p} data-on={i <= phaseIndex || undefined} aria-current={i === phaseIndex ? 'step' : undefined}>
              {p}
            </li>
          ))}
        </ol>
        <div className="p-iv-chat" ref={chat} data-lenis-prevent={chatScrolls || undefined}>
          {PREVIEW_MESSAGES.map((m) => (
            <PreviewBubble key={m.id} message={m} status={status[m.id]} lit={highlight} />
          ))}
        </div>
      </div>
      <figcaption className="p-iv-caption">
        <span>Made-up example, in the order of the real interview.</span>
        {!reduced && (
          <button
            type="button"
            className={btnClass('ghost', { small: true })}
            onClick={() => setRun((r) => r + 1)}
            // keeps its place while the example plays, so nothing shifts when it appears
            data-hidden={step < LAST_STEP || undefined}
            tabIndex={step < LAST_STEP ? -1 : undefined}
          >
            <BtnLabel icon="refresh">Replay</BtnLabel>
          </button>
        )}
      </figcaption>
    </figure>
  );
}

function PreviewBubble({ message, status, lit }: { message: PreviewMessage; status: MessageStatus; lit: boolean }) {
  return (
    <div className="p-iv-msg" data-from={message.from} data-status={status}>
      {message.from === 'ai' && (
        <span className="p-iv-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
      <div className="p-iv-bubble">
        <span className="p-iv-who">{message.from === 'ai' ? 'AI interviewer' : 'Candidate'}</span>
        <p>{message.text}</p>
        {message.code && (
          <pre className="p-iv-code">
            {message.code.map((line, i) => (
              <span key={i} className="p-iv-line" data-bug={i + 1 === message.bugLine || undefined} data-lit={(lit && i + 1 === message.bugLine) || undefined}>
                <span className="p-iv-ln">{i + 1}</span>
                <code>{line}</code>
              </span>
            ))}
          </pre>
        )}
      </div>
    </div>
  );
}
