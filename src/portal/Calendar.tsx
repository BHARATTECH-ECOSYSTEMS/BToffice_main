import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { EVENT_KINDS, VERIFICATION_STALE_DAYS, type EventKind, type Task, type TaskStatus } from './data';
import { localDay } from './eoffice';
import { managesPortal, useSession } from './session';
import { usePeopleById, usePortal } from './store';
import { btnClass, BtnLabel, Modal, PIcon } from './ui';
import { api, ApiError } from './api';
import { eventFailedMessage, useEvents, type EventDraft } from './events';
import { plural, workAnniversaries, type Joiner } from './dashboard';
import { useRemoteVerifications, type RemoteVerification } from './verifications';

/**
 * The dashboard calendar: the month on the left, the picked day's agenda and what comes next on the right.
 * Everything on it comes from the portal's own records: open tasks, the events admins add, work anniversaries from
 * joining dates and, for managers, the follow-ups the job board and the verification desk need. Nothing is invented.
 */

type ItemKind = 'task' | 'event' | 'people' | 'followup';
interface CalItem {
  id: string;
  date: string;
  kind: ItemKind;
  title: string;
  meta: string;
  /** "HH:MM" for timed events. */
  time?: string;
  /** Where the item is dealt with, for follow-ups. */
  to?: string;
  /** Set on events, with what's needed to change or cancel them from here when this person may. */
  event?: { id: string; draft: EventDraft; canChange: boolean };
}

const KIND_ORDER: ItemKind[] = ['event', 'task', 'followup', 'people'];
const KIND_LABEL: Record<ItemKind, string> = { task: 'Tasks', event: 'Events', people: 'People', followup: 'Follow-ups' };
const STATUS_LABEL: Record<TaskStatus, string> = { todo: 'To do', doing: 'In progress', done: 'Done' };
const EVENT_LABEL = Object.fromEntries(EVENT_KINDS.map((k) => [k.id, k.label])) as Record<EventKind, string>;
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
// how far ahead "Coming up" looks, and how much of it it shows
const AHEAD_DAYS = 45;
const AHEAD_MAX = 4;
const TITLE_MAX = 80;

const dateOf = (iso: string) => new Date(`${iso}T00:00:00`);
const addDays = (iso: string, n: number) => {
  const d = dateOf(iso);
  d.setDate(d.getDate() + n);
  return localDay(d.getTime());
};
// built once: toLocaleDateString with options builds a fresh formatter on every call, and the grid labels every day
const MONTH_LONG_YEAR = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });
const DAY_LONG = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
const DAY_SHORT = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const DAY_NUMBER = new Intl.DateTimeFormat('en-IN', { day: 'numeric' });
const MONTH_SHORT = new Intl.DateTimeFormat('en-IN', { month: 'short' });
const dayLabel = (iso: string, f: Intl.DateTimeFormat) => f.format(dateOf(iso));

// With the backend connected, the job board is still the demo's samples, so its follow-ups stay off the calendar
// until those records come from the backend. (The verification desk's follow-ups come from the backend; see below.)
const SAMPLE_RECORDS = !api;

/**
 * Without `tasks` the calendar has no task dates and no "Task" in its legend. Connected, `joiners` is the backend's
 * directory, for first days and work anniversaries; without it (still loading, or it failed) there are none.
 */
export function CalendarCard({ tasks, joiners, notify }: { tasks?: Task[]; joiners?: Joiner[]; notify: (text: string) => void }) {
  const role = useSession()!.role;
  const manager = managesPortal(role);
  const { events, people, jobs, verifications, addEvent, removeEvent } = usePortal();
  const byId = usePeopleById();
  const today = localDay();
  const [offset, setOffset] = useState(0);
  // which way the last month change went, so the new month slides in from that side; none on first draw
  const [dir, setDir] = useState<'prev' | 'next' | undefined>();
  const [picked, setPicked] = useState(today);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CalItem | null>(null);
  const [cancelling, setCancelling] = useState<CalItem | null>(null);

  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const monthLabel = MONTH_LONG_YEAR.format(month);
  const iso = (d: number) => localDay(new Date(month.getFullYear(), month.getMonth(), d).getTime());
  const monthStart = iso(1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  // connected, the month's events and everything "Coming up" can reach from any of its days, in one request per month
  const remote = useEvents(monthStart, addDays(iso(lastDay), AHEAD_DAYS));
  // the verification desk is admin-only, so its follow-ups are too; connected, they come from the backend's requests
  const companyChecks = useRemoteVerifications('company', role === 'admin');
  const employeeChecks = useRemoteVerifications('employee', role === 'admin');
  const outsideRequests = useRemoteVerifications('employment', role === 'admin');
  const followUpRequests = useMemo(
    () =>
      api
        ? [companyChecks.state, employeeChecks.state, outsideRequests.state].flatMap((s) => (s.kind === 'ready' ? s.requests : []))
        : SAMPLE_RECORDS
          ? verifications
          : [],
    [companyChecks.state, employeeChecks.state, outsideRequests.state, verifications],
  );
  const shownEvents = useMemo(
    () =>
      api
        ? remote.state.kind === 'ready'
          ? remote.state.events
          : []
        : events.map((e) => ({ ...e, canChange: manager })),
    [remote.state, events, manager],
  );

  // Moving a month picks today in the current month, else that month's first day, so the agenda always matches it.
  const goTo = (to: number) => {
    const first = localDay(new Date(now.getFullYear(), now.getMonth() + to, 1).getTime());
    setDir(to < offset ? 'prev' : 'next');
    setOffset(to);
    setPicked(to === 0 ? today : first);
  };

  // Everything from the month's first day to the end of "Coming up" (which always reaches past the month's end).
  const rangeEnd = addDays(picked, AHEAD_DAYS);
  const items = useMemo(() => {
    const out: CalItem[] = [];
    const inRange = (d: string) => d >= monthStart && d <= rangeEnd;
    for (const t of tasks ?? []) {
      if (!inRange(t.due)) continue;
      const who = manager ? `${t.assigneeName ?? byId.get(t.assigneeId)?.name ?? 'Removed user'} · ` : '';
      out.push({ id: `t-${t.id}`, date: t.due, kind: 'task', title: t.title, meta: `Task · ${who}${STATUS_LABEL[t.status]}` });
    }
    for (const e of shownEvents) {
      if (!inRange(e.date)) continue;
      const event = { id: e.id, draft: { title: e.title, kind: e.kind, date: e.date, time: e.time }, canChange: e.canChange };
      out.push({ id: `e-${e.id}`, date: e.date, kind: 'event', title: e.title, meta: EVENT_LABEL[e.kind], time: e.time || undefined, event });
    }
    for (const a of workAnniversaries(api ? (joiners ?? []) : people, monthStart, rangeEnd)) out.push({ ...a, kind: 'people' });
    if (manager && SAMPLE_RECORDS) {
      for (const j of jobs) {
        if (j.open && j.closes && inRange(j.closes)) out.push({ id: `j-${j.id}`, date: j.closes, kind: 'followup', title: j.title, meta: 'Applications close', to: '/portal/community' });
      }
    }
    if (role === 'admin') {
      for (const v of followUpRequests) {
        if (v.status !== 'pending') continue;
        const date = addDays(v.requested, VERIFICATION_STALE_DAYS);
        if (!inRange(date)) continue;
        const person = (v as RemoteVerification).person;
        const subject =
          v.kind === 'company' ? v.company : v.kind === 'employment' ? v.candidate : person ? (person.removed ? 'Removed user' : person.name) : (byId.get(v.personId)?.name ?? 'Removed user');
        const page = v.kind === 'employment' ? 'requests' : v.kind;
        out.push({ id: `v-${v.id}`, date, kind: 'followup', title: subject, meta: 'Verification follow-up', to: `/portal/verification/${page}?file=${v.id}` });
      }
    }
    // timed events first, by time; then by kind, so a day always reads in the same order
    return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '99').localeCompare(b.time ?? '99') || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  }, [tasks, shownEvents, people, joiners, jobs, followUpRequests, byId, manager, role, monthStart, rangeEnd]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const it of items) map.set(it.date, [...(map.get(it.date) ?? []), it]);
    return map;
  }, [items]);
  const dayItems = byDate.get(picked) ?? [];
  const ahead = items.filter((it) => it.date > picked).slice(0, AHEAD_MAX);
  const kinds = KIND_ORDER.filter((k) => (k !== 'followup' || (manager && SAMPLE_RECORDS)) && (k !== 'people' || !api || joiners) && (k !== 'task' || tasks));

  // Weeks start on Sunday; the grid is filled out to whole weeks with the neighbouring months' days, greyed out.
  const lead = month.getDay();
  const prevDays = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
  const trail = (7 - ((lead + lastDay) % 7)) % 7;

  // the demo removes at once; connected, a cancel tells everyone, so it asks first (the window below)
  const remove = (it: CalItem) => {
    if (api) return setCancelling(it);
    removeEvent(it.event!.id);
    notify(`Removed “${it.title}” from everyone’s calendar.`);
  };

  /** Shows a saved event: jumps to its month and day. */
  const showDay = (date: string) => {
    const target = dateOf(date);
    const to = (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth();
    if (to !== offset) {
      setDir(to < offset ? 'prev' : 'next');
      setOffset(to);
    }
    setPicked(date);
  };

  const save = async (draft: EventDraft, it: CalItem | null) => {
    if (!api) {
      // the demo has no changing; it adds to this browser's calendar
      addEvent(draft);
    } else if (it) {
      await remote.change(it.event!.id, draft);
    } else {
      await remote.add(draft);
    }
    showDay(draft.date);
    notify(
      api
        ? `“${draft.title}” is ${it ? 'changed' : 'on everyone’s calendar'} now. Everyone is told in their bell and by email.`
        : `“${draft.title}” is on everyone’s calendar now.`,
    );
  };

  return (
    <section className="p-card p-cal" aria-labelledby="cal">
      <div className="p-card-head">
        <h2 id="cal" className="p-card-title">
          <PIcon name="calendar" /> Calendar &amp; schedules
        </h2>
        <div className="p-cal-tools">
          <div className="p-cal-nav">
            <button type="button" className="p-icon-btn is-flip" onClick={() => goTo(offset - 1)} aria-label="Previous month">
              <PIcon name="chevron" />
            </button>
            <p className="p-cal-month" aria-live="polite">
              {monthLabel}
            </p>
            <button type="button" className="p-icon-btn" onClick={() => goTo(offset + 1)} aria-label="Next month">
              <PIcon name="chevron" />
            </button>
          </div>
          {manager && (
            <button type="button" className={btnClass('light', { small: true })} onClick={() => setAdding(true)}>
              <BtnLabel icon="plus">Add event</BtnLabel>
            </button>
          )}
        </div>
      </div>

      <div className="p-cal-body">
        <div className="p-cal-month-col">
          <div key={offset} className="p-cal-grid" data-dir={dir}>
            {WEEKDAYS.map((w) => (
              <span key={w} className="p-cal-dow" aria-hidden="true">
                {w}
              </span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`p${i}`} className="p-cal-day is-other" aria-hidden="true">
                {prevDays - lead + 1 + i}
              </span>
            ))}
            {Array.from({ length: lastDay }, (_, i) => {
              const d = iso(i + 1);
              const on = byDate.get(d) ?? [];
              const dots = KIND_ORDER.filter((k) => on.some((it) => it.kind === k));
              return (
                <button
                  key={d}
                  type="button"
                  className={`p-cal-day${d === today ? ' is-today' : ''}`}
                  aria-pressed={d === picked}
                  aria-current={d === today ? 'date' : undefined}
                  aria-label={`${dayLabel(d, DAY_LONG)}${on.length ? `, ${plural(on.length, 'item')}` : ''}`}
                  onClick={() => setPicked(d)}
                >
                  {i + 1}
                  {dots.length > 0 && (
                    <span className="p-cal-dots" aria-hidden="true">
                      {dots.map((k) => (
                        <i key={k} data-kind={k} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
            {Array.from({ length: trail }, (_, i) => (
              <span key={`n${i}`} className="p-cal-day is-other" aria-hidden="true">
                {i + 1}
              </span>
            ))}
          </div>
          <ul className="p-cal-legend" aria-label="What the dots mean">
            {kinds.map((k) => (
              <li key={k}>
                <i data-kind={k} aria-hidden="true" />
                {KIND_LABEL[k]}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-cal-agenda">
          <section aria-labelledby="cal-day">
            <h3 id="cal-day" className="p-cal-heading">
              {picked === today && <span className="p-cal-today">Today</span>}
              {dayLabel(picked, DAY_SHORT)}
            </h3>
            <div key={picked} className="p-cal-day-items">
              {dayItems.length ? (
                <ul className="p-cal-items">
                  {dayItems.map((it) => (
                    <AgendaItem
                      key={it.id}
                      item={it}
                      onRemove={it.event?.canChange ? () => remove(it) : undefined}
                      onEdit={api && it.event?.canChange ? () => setEditing(it) : undefined}
                    />
                  ))}
                </ul>
              ) : (
                <p className="p-cal-empty">Nothing on this day.</p>
              )}
              {remote.state.kind === 'error' && (
                <p className="p-cal-empty" role="alert">
                  The events didn’t load.{' '}
                  <button type="button" className="p-text-btn" onClick={remote.retry}>
                    Try again
                  </button>
                </p>
              )}
            </div>
          </section>
          <section aria-labelledby="cal-ahead" className="p-cal-ahead">
            <h3 id="cal-ahead" className="p-cal-heading is-small">
              Coming up
            </h3>
            {ahead.length ? (
              <ul className="p-cal-items is-compact">
                {ahead.map((it) => (
                  <AgendaItem key={it.id} item={it} showDate />
                ))}
              </ul>
            ) : (
              <p className="p-cal-empty">Nothing in the next {AHEAD_DAYS} days.</p>
            )}
          </section>
        </div>
      </div>

      {(adding || editing) && (
        <EventWindow
          initial={editing?.event?.draft ?? { title: '', kind: 'meeting', date: picked < today && api ? today : picked, time: '' }}
          changing={!!editing}
          earliest={api ? today : undefined}
          onClose={() => (setAdding(false), setEditing(null))}
          onSave={(draft) => save(draft, editing)}
        />
      )}
      {cancelling && (
        <CancelEvent
          title={cancelling.title}
          onClose={() => setCancelling(null)}
          onConfirm={async () => {
            await remote.cancel(cancelling.event!.id);
            notify(`“${cancelling.title}” was cancelled. Everyone is told in their bell and by email.`);
          }}
        />
      )}
    </section>
  );
}

function AgendaItem({ item, showDate = false, onRemove, onEdit }: { item: CalItem; showDate?: boolean; onRemove?: () => void; onEdit?: () => void }) {
  return (
    <li className="p-cal-item" data-kind={item.kind}>
      {showDate && (
        <span className="p-cal-item-date">
          <strong>{dayLabel(item.date, DAY_NUMBER)}</strong>
          {dayLabel(item.date, MONTH_SHORT)}
        </span>
      )}
      <i className="p-cal-item-dot" aria-hidden="true" />
      <span className="p-cal-item-text">
        {item.to ? (
          <Link to={item.to} className="p-cal-item-title">
            {item.title}
          </Link>
        ) : (
          <strong className="p-cal-item-title" title={item.title}>
            {item.title}
          </strong>
        )}
        {/* the compact list has no room for a time column, so its time rides in the second line */}
        <small>{showDate && item.time ? `${item.meta} · ${item.time}` : item.meta}</small>
      </span>
      {item.time && !showDate && <span className="p-cal-item-time">{item.time}</span>}
      {onEdit && (
        <button type="button" className="p-icon-btn" onClick={onEdit} aria-label={`Change ${item.title}`}>
          <PIcon name="edit" size={14} />
        </button>
      )}
      {onRemove && (
        <button type="button" className="p-icon-btn is-danger" onClick={onRemove} aria-label={`${api ? 'Cancel' : 'Remove'} ${item.title}`}>
          <PIcon name="close" size={14} />
        </button>
      )}
    </li>
  );
}

/**
 * Adding an event, or changing one (`changing`, with its details filled in). The window stays open until the save has
 * worked, so a refusal (a date that has passed, say) is shown here and nothing typed is lost.
 */
function EventWindow({
  initial,
  changing,
  earliest,
  onClose,
  onSave,
}: {
  initial: EventDraft;
  changing: boolean;
  /** yyyy-mm-dd: the first day that may be picked (connected: today) */
  earliest?: string;
  onClose: () => void;
  onSave: (draft: EventDraft) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial.title);
  const [kind, setKind] = useState<EventKind>(initial.kind);
  const [day, setDay] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={changing ? 'Change the event' : 'Add an event'}
      icon="calendar"
      onClose={onClose}
      onSubmit={() => {
        if (busy) return;
        const name = title.trim();
        if (!name) return setError('Give the event a name.');
        if (name.length > TITLE_MAX) return setError(`Keep the name under ${TITLE_MAX} characters.`);
        if (!day) return setError('Pick the date.');
        if (earliest && day < earliest) return setError('That day has already passed. Pick today or a later day.');
        setBusy(true);
        onSave({ title: name, kind, date: day, time }).then(onClose, (e: unknown) => {
          setBusy(false);
          setError(eventFailedMessage(e instanceof ApiError ? e : new ApiError('unavailable')));
        });
      }}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>{changing ? 'Keep as it was' : 'Cancel'}</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')} disabled={busy}>
            <BtnLabel>{busy ? 'Saving…' : changing ? 'Save changes' : 'Add event'}</BtnLabel>
          </button>
        </>
      }
    >
      <label className="p-field">
        <span>Name</span>
        <input value={title} onChange={(e) => (setTitle(e.target.value), setError(''))} maxLength={TITLE_MAX} placeholder="For example, Team sync" autoFocus />
      </label>
      <label className="p-field">
        <span>Type</span>
        <select className="p-select" value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>
          {EVENT_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <div className="p-form-row">
        <label className="p-field">
          <span>Date</span>
          <input type="date" value={day} min={earliest} onChange={(e) => (setDay(e.target.value), setError(''))} />
        </label>
        <label className="p-field">
          <span>Time (optional)</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <p className="p-field-hint">
        {api
          ? `Everyone sees it on their calendar and is told in their bell and by email${changing ? ' that it changed' : ''}.`
          : 'Everyone in the portal sees it on their calendar. Nobody is emailed.'}
      </p>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

/** Cancelling tells everyone, so it is asked once more. */
function CancelEvent({ title, onClose, onConfirm }: { title: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title="Cancel this event for everyone?"
      icon="calendar"
      onClose={onClose}
      onSubmit={() => {
        if (busy) return;
        setBusy(true);
        onConfirm().then(onClose, (e: unknown) => {
          setBusy(false);
          setError(eventFailedMessage(e instanceof ApiError ? e : new ApiError('unavailable')));
        });
      }}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Keep it</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')} disabled={busy}>
            <BtnLabel>{busy ? 'Cancelling…' : 'Cancel the event'}</BtnLabel>
          </button>
        </>
      }
    >
      <p>
        <strong>{title}</strong> comes off everyone’s calendar, and everyone is told in their bell and by email.
      </p>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
