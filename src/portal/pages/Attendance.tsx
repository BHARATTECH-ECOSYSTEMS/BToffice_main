import { useEffect, useRef, useState } from 'react';
import { api, type ApiError } from '../api';
import {
  attendanceFailedMessage,
  correctionProblem,
  correctVisit,
  formatMinutes,
  indiaClock,
  indiaTime,
  indiaToday,
  rangeProblem,
  REASON_MAX,
  useAttendanceDay,
  useMyAttendance,
  usePersonHistory,
  type AttendanceDay,
  type DayRange,
  type DayRow,
  type Loaded,
  type Visit,
} from '../attendance';
import { managesPortal, useSession } from '../session';
import { formatDate } from '../store';
import { Badge, btnClass, BtnLabel, Empty, Modal, PageHead, Stat, useNotice } from '../ui';

/**
 * e-Office attendance (attendance.ts): everyone sees their own days (the last 30, or any dates they pick, up to 400
 * at a time); admins and sub admins also see everyone's
 * day (who's in now, first in, last out, time in) and one person's history; admins correct a finished visit's times
 * with a reason, where the backend says they may. Times are India time, as the backend keeps its days. The demo keeps
 * check-ins in the browser only, so it has no history to show.
 */
export function Attendance() {
  const session = useSession()!;
  const manager = managesPortal(session.role);
  const [tab, setTab] = useState<'team' | 'mine'>(manager ? 'team' : 'mine');

  if (!api) {
    return (
      <>
        <PageHead title="Attendance" sub="Your visits to the e-Office." />
        <section className="p-card">
          <Empty icon="clock" title="Not kept in the demo">
            Here, check-ins stay in this browser for the day. Connected to the company system, every visit is saved and shows up here.
          </Empty>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHead title="Attendance" sub={manager ? 'Who’s in the e-Office, day by day, and each person’s visits. Times are India time.' : 'Your visits to the e-Office, in India time. Pick any dates to look further back.'}>
        {manager && (
          <div className="p-tabs" role="tablist" aria-label="Attendance">
            <button type="button" role="tab" aria-selected={tab === 'team'} onClick={() => setTab('team')}>
              Team
            </button>
            <button type="button" role="tab" aria-selected={tab === 'mine'} onClick={() => setTab('mine')}>
              My attendance
            </button>
          </div>
        )}
      </PageHead>
      {manager && tab === 'team' ? <TeamDay /> : <MyDays />}
    </>
  );
}

function LoadFailed({ what, error, retry }: { what: string; error: ApiError; retry: () => void }) {
  return (
    <div role="alert">
      <Empty icon="alert" title={`${what} didn’t load`}>
        {attendanceFailedMessage(error)}
      </Empty>
      {error.kind !== 'signed-out' && (
        <button type="button" className={btnClass('light', { small: true })} onClick={retry}>
          <BtnLabel icon="refresh">Try again</BtnLabel>
        </button>
      )}
    </div>
  );
}

const lastThirtyDays = (): DayRange => ({ from: shiftDay(indiaToday(), -30), to: indiaToday() });

/** From and to for a history (owner's 4A); the list follows as soon as the two make a range the backend takes. */
function RangePicker({ range, onChange, label }: { range: DayRange; onChange: (range: DayRange) => void; label: string }) {
  const today = indiaToday();
  const [draft, setDraft] = useState(range);
  const problem = rangeProblem(draft, today);
  const set = (next: DayRange) => {
    setDraft(next);
    if (!rangeProblem(next, today)) onChange(next);
  };
  return (
    <div className="p-att-range">
      <div className="p-att-pick" role="group" aria-label={label}>
        <label className="p-field is-tight">
          <span className="sr-only">From</span>
          <input type="date" value={draft.from} max={draft.to || today} aria-invalid={!!problem || undefined} onChange={(e) => set({ ...draft, from: e.target.value })} />
        </label>
        <span className="p-dim" aria-hidden="true">
          to
        </span>
        <label className="p-field is-tight">
          <span className="sr-only">To</span>
          <input type="date" value={draft.to} min={draft.from || undefined} max={today} aria-invalid={!!problem || undefined} onChange={(e) => set({ ...draft, to: e.target.value })} />
        </label>
      </div>
      {problem && (
        <p className="p-error" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}

function MyDays() {
  const [range, setRange] = useState(lastThirtyDays);
  const mine = useMyAttendance(range);
  const { state } = mine;
  return (
    <section className="p-card" aria-labelledby="my-days" aria-busy={state.kind === 'loading' || undefined}>
      <div className="p-card-head">
        <h2 id="my-days" className="p-card-title">
          My attendance
        </h2>
        <RangePicker range={range} onChange={setRange} label="Show my attendance between" />
      </div>
      <Days state={state} retry={mine.retry} what="Your attendance" empty="No visits between these dates. Join the e-Office from your dashboard to start." />
    </section>
  );
}

function TeamDay() {
  const [day, setDay] = useState(indiaToday);
  const overview = useAttendanceDay(day, true);
  const [person, setPerson] = useState<DayRow | null>(null);
  const { state } = overview;
  const rows = state.kind === 'ready' ? state.value.people : [];
  const isToday = day === indiaToday();
  return (
    <>
      <div className="p-stats is-three">
        <Stat icon="home" label="In now" hint={isToday ? 'Checked in at the moment' : 'Only for today'} value={state.kind === 'ready' ? (isToday ? state.value.inNow : '-') : '…'} />
        <Stat icon="users" label="Came in" hint="At least one visit that day" value={state.kind === 'ready' ? rows.filter((r) => r.visits.length).length : '…'} tone="saffron" />
        <Stat icon="clock" label="Not in" hint="No visit that day" value={state.kind === 'ready' ? rows.filter((r) => !r.visits.length).length : '…'} tone="tangerine" />
      </div>
      <section className="p-card" aria-labelledby="team-day" aria-busy={state.kind === 'loading' || undefined}>
        <div className="p-card-head">
          <h2 id="team-day" className="p-card-title">
            {isToday ? 'Today' : formatDate(day)}
          </h2>
          <div className="p-att-pick">
            <label className="p-field is-tight">
              <span className="sr-only">Day</span>
              <input type="date" value={day} max={indiaToday()} onChange={(e) => e.target.value && (setDay(e.target.value), setPerson(null))} />
            </label>
            <button type="button" className={btnClass('ghost', { small: true })} onClick={overview.retry}>
              <BtnLabel icon="refresh">Refresh</BtnLabel>
            </button>
          </div>
        </div>
        {state.kind === 'loading' ? (
          <p className="p-muted" role="status">
            Loading the day…
          </p>
        ) : state.kind === 'error' ? (
          <LoadFailed what="The day" error={state.error} retry={overview.retry} />
        ) : state.kind === 'ready' && rows.length ? (
          <div className="p-table-wrap">
            <table className="p-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Status</th>
                  <th scope="col">First in</th>
                  <th scope="col">Last out</th>
                  <th scope="col">Time in</th>
                  <th scope="col">
                    <span className="sr-only">History</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="is-strong">
                      {r.name}
                      {r.employeeId && <span className="p-dim is-mono"> · {r.employeeId}</span>}
                    </td>
                    <td>
                      {r.inNow ? <Badge kind="active">In now</Badge> : r.visits.length ? <Badge kind="done">Left</Badge> : <Badge kind="soft">Not in</Badge>}
                      {r.noCheckOut && (
                        <>
                          {' '}
                          <Badge kind="todo">No check-out</Badge>
                        </>
                      )}
                    </td>
                    <td>{r.firstIn ? indiaTime(r.firstIn) : '-'}</td>
                    <td>{r.lastOut ? indiaTime(r.lastOut) : '-'}</td>
                    <td className="is-mono">{r.visits.length ? formatMinutes(r.minutes) : '-'}</td>
                    <td className="is-end">
                      <button type="button" className="p-link" onClick={() => setPerson(r)}>
                        History<span className="sr-only"> of {r.name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="users" title="Nobody on staff yet" />
        )}
      </section>
      {person && <PersonDays key={person.id} person={person} onCorrected={overview.reload} onClose={() => setPerson(null)} />}
    </>
  );
}

function PersonDays({ person, onCorrected, onClose }: { person: DayRow; onCorrected: () => void; onClose: () => void }) {
  const [range, setRange] = useState(lastThirtyDays);
  const history = usePersonHistory(person.id, range);
  const [fixing, setFixing] = useState<{ visit: Visit; day: string } | null>(null);
  const [notice, notify] = useNotice();
  const ref = useRef<HTMLElement>(null);
  // a block body: newer browsers' scrollIntoView returns a promise, which React would take for the cleanup
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);
  const { state } = history;
  const canCorrect = state.kind === 'ready' && state.value.person.canCorrect;
  return (
    <section ref={ref} className="p-card" aria-labelledby="person-days" aria-busy={state.kind === 'loading' || undefined}>
      <div className="p-card-head">
        <h2 id="person-days" className="p-card-title">
          {person.name}
        </h2>
        <div className="p-att-pick">
          <RangePicker range={range} onChange={setRange} label={`Show ${person.name}’s attendance between`} />
          <button type="button" className={btnClass('ghost', { small: true })} onClick={onClose}>
            <BtnLabel>Close</BtnLabel>
          </button>
        </div>
      </div>
      {notice}
      <Days
        state={state.kind === 'ready' ? { kind: 'ready', value: state.value.days } : state}
        retry={history.retry}
        what="Their attendance"
        empty="No visits between these dates."
        onCorrect={canCorrect ? (visit, day) => setFixing({ visit, day }) : undefined}
      />
      {fixing && (
        <CorrectVisit
          name={person.name}
          day={fixing.day}
          visit={fixing.visit}
          onClose={() => setFixing(null)}
          onSaved={() => {
            setFixing(null);
            notify('Corrected. The change and its reason are kept on the visit.');
            void history.reload();
            onCorrected();
          }}
        />
      )}
    </section>
  );
}

const shiftDay = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/** A list of days, newest first, each with its visits and any corrections; `onCorrect` offers Correct on ended visits. */
function Days({
  state,
  retry,
  what,
  empty,
  onCorrect,
}: {
  state: Loaded<{ days: AttendanceDay[] } | AttendanceDay[]>;
  retry: () => void;
  what: string;
  empty: string;
  onCorrect?: (visit: Visit, day: string) => void;
}) {
  if (state.kind === 'loading' || state.kind === 'off') {
    return (
      <p className="p-muted" role="status">
        Loading…
      </p>
    );
  }
  if (state.kind === 'error') return <LoadFailed what={what} error={state.error} retry={retry} />;
  const days = Array.isArray(state.value) ? state.value : state.value.days;
  if (!days.length) return <Empty icon="calendar" title="No visits yet">{empty}</Empty>;
  return (
    <ul className="p-att-days">
      {days.map((d) => (
        <li key={d.day}>
          <div className="p-att-day-head">
            <span className="is-strong">{d.day === indiaToday() ? 'Today' : formatDate(d.day)}</span>
            {d.noCheckOut && <Badge kind="todo">No check-out</Badge>}
            <span className="p-att-total">{formatMinutes(d.minutes)}</span>
          </div>
          <ul className="p-att-visits">
            {d.visits.map((v) => (
              <li key={v.id}>
                <span>
                  {indiaTime(v.inAt)} – {v.outAt === null ? 'now' : indiaTime(v.outAt)}
                  {v.noCheckOut && <span className="p-dim">{v.corrections.length ? ' (no check-out; corrected below)' : ' (ended at midnight, no check-out)'}</span>}
                </span>
                {onCorrect && v.outAt !== null && (
                  <button type="button" className="p-link" onClick={() => onCorrect(v, d.day)}>
                    Correct
                  </button>
                )}
                {v.corrections.map((c, i) => (
                  <p key={i} className="p-att-fix">
                    Corrected by {c.byName || 'an admin'}: “{c.reason}” (was {indiaTime(c.from.inAt)} – {c.from.outAt === null ? '…' : indiaTime(c.from.outAt)})
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function CorrectVisit({ name, day, visit, onClose, onSaved }: { name: string; day: string; visit: Visit; onClose: () => void; onSaved: () => void }) {
  const [inTime, setInTime] = useState(indiaClock(visit.inAt));
  const [outTime, setOutTime] = useState(visit.outAt === null ? '' : indiaClock(visit.outAt));
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const change = (set: (v: string) => void) => (e: { target: { value: string } }) => (set(e.target.value), setError(''));
  const save = async () => {
    const draft = { day, inTime, outTime, reason };
    const problem = correctionProblem(draft, Date.now());
    if (problem) return setError(problem);
    setSaving(true);
    try {
      await correctVisit(visit.id, draft);
      onSaved();
    } catch (e) {
      setError(attendanceFailedMessage(e as ApiError));
      setSaving(false);
    }
  };
  return (
    <Modal
      title={`Correct ${name}’s visit`}
      icon="clock"
      onClose={onClose}
      onSubmit={() => void save()}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')} disabled={saving}>
            <BtnLabel>{saving ? 'Saving…' : 'Save correction'}</BtnLabel>
          </button>
        </>
      }
    >
      <p className="p-muted">
        {formatDate(day)}, India time. Both times must be on this day.
      </p>
      <label className="p-field">
        <span>Came in</span>
        <input type="time" value={inTime} onChange={change(setInTime)} required />
      </label>
      <label className="p-field">
        <span>Left</span>
        <input type="time" value={outTime} onChange={change(setOutTime)} required />
      </label>
      <label className="p-field">
        <span>Why (they’ll see this)</span>
        <textarea value={reason} onChange={change(setReason)} rows={2} maxLength={REASON_MAX} placeholder="e.g. Forgot to leave; confirmed with them" />
      </label>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
