import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { EVENT_KINDS, VERIFICATION_STALE_DAYS, type EventKind, type Task, type TaskStatus } from './data';
import { localDay } from './eoffice';
import { plural } from './lmsData';
import { managesPortal, useSession } from './session';
import { usePeopleById, usePortal } from './store';
import { btnClass, BtnLabel, Modal, PIcon } from './ui';
import { api } from './api';
import { ownEvents } from './dashboard';

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
  /** Set on events, so an admin can remove them from here. */
  eventId?: string;
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

// With the backend connected, the directory, job board and verification desk here are still the demo's samples, so
// their dates (anniversaries, first days, follow-ups) stay off the calendar until those records come from the backend.
const SAMPLE_RECORDS = !api;

/** Without `tasks` (they aren't connected to the backend yet) the calendar has no task dates and no "Task" in its legend. */
export function CalendarCard({ tasks, notify }: { tasks?: Task[]; notify: (text: string) => void }) {
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

  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const monthLabel = MONTH_LONG_YEAR.format(month);
  const iso = (d: number) => localDay(new Date(month.getFullYear(), month.getMonth(), d).getTime());
  const monthStart = iso(1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

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
      const who = manager ? `${byId.get(t.assigneeId)?.name ?? 'Removed user'} · ` : '';
      out.push({ id: `t-${t.id}`, date: t.due, kind: 'task', title: t.title, meta: `Task · ${who}${STATUS_LABEL[t.status]}` });
    }
    for (const e of SAMPLE_RECORDS ? events : ownEvents(events)) {
      if (inRange(e.date)) out.push({ id: `e-${e.id}`, date: e.date, kind: 'event', title: e.title, meta: EVENT_LABEL[e.kind], time: e.time || undefined, eventId: e.id });
    }
    // work anniversaries, and the first day of anyone joining in this stretch; invited people haven't joined yet
    const years = [Number(monthStart.slice(0, 4)), Number(rangeEnd.slice(0, 4))];
    for (const p of SAMPLE_RECORDS ? people : []) {
      if (p.status === 'invited' || !p.joined) continue;
      for (let y = years[0]; y <= years[1]; y++) {
        const date = `${y}${p.joined.slice(4)}`;
        const served = y - Number(p.joined.slice(0, 4));
        // a 29 February joiner has no date in other years; skip rather than move it
        if (!inRange(date) || served < 0 || localDay(dateOf(date).getTime()) !== date) continue;
        out.push({ id: `p-${p.id}-${y}`, date, kind: 'people', title: p.name, meta: served === 0 ? 'First day' : `Work anniversary · ${plural(served, 'year')}` });
      }
    }
    if (manager && SAMPLE_RECORDS) {
      for (const j of jobs) {
        if (j.open && j.closes && inRange(j.closes)) out.push({ id: `j-${j.id}`, date: j.closes, kind: 'followup', title: j.title, meta: 'Applications close', to: '/portal/community' });
      }
    }
    // the verification desk is admin-only, so its follow-ups are too
    if (role === 'admin' && SAMPLE_RECORDS) {
      for (const v of verifications) {
        if (v.status !== 'pending') continue;
        const date = addDays(v.requested, VERIFICATION_STALE_DAYS);
        if (!inRange(date)) continue;
        const subject = v.kind === 'company' ? v.company : v.kind === 'employment' ? v.candidate : (byId.get(v.personId)?.name ?? 'Removed user');
        const page = v.kind === 'employment' ? 'requests' : v.kind;
        out.push({ id: `v-${v.id}`, date, kind: 'followup', title: subject, meta: 'Verification follow-up', to: `/portal/verification/${page}?file=${v.id}` });
      }
    }
    // timed events first, by time; then by kind, so a day always reads in the same order
    return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '99').localeCompare(b.time ?? '99') || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  }, [tasks, events, people, jobs, verifications, byId, manager, role, monthStart, rangeEnd]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const it of items) map.set(it.date, [...(map.get(it.date) ?? []), it]);
    return map;
  }, [items]);
  const dayItems = byDate.get(picked) ?? [];
  const ahead = items.filter((it) => it.date > picked).slice(0, AHEAD_MAX);
  const kinds = KIND_ORDER.filter((k) => (k !== 'followup' || (manager && SAMPLE_RECORDS)) && (k !== 'people' || SAMPLE_RECORDS) && (k !== 'task' || tasks));

  // Weeks start on Sunday; the grid is filled out to whole weeks with the neighbouring months' days, greyed out.
  const lead = month.getDay();
  const prevDays = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
  const trail = (7 - ((lead + lastDay) % 7)) % 7;

  const remove = (it: CalItem) => {
    removeEvent(it.eventId!);
    notify(`Removed “${it.title}” from everyone’s calendar.`);
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
                    <AgendaItem key={it.id} item={it} onRemove={manager && it.eventId ? () => remove(it) : undefined} />
                  ))}
                </ul>
              ) : (
                <p className="p-cal-empty">Nothing on this day.</p>
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

      {adding && (
        <AddEvent
          date={picked}
          onClose={() => setAdding(false)}
          onAdd={(draft) => {
            addEvent(draft);
            // show the new event: jump to its month and day
            const target = dateOf(draft.date);
            const to = (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth();
            if (to !== offset) {
              setDir(to < offset ? 'prev' : 'next');
              setOffset(to);
            }
            setPicked(draft.date);
            notify(`“${draft.title}” is on everyone’s calendar now.`);
          }}
        />
      )}
    </section>
  );
}

function AgendaItem({ item, showDate = false, onRemove }: { item: CalItem; showDate?: boolean; onRemove?: () => void }) {
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
      {onRemove && (
        <button type="button" className="p-icon-btn is-danger" onClick={onRemove} aria-label={`Remove ${item.title}`}>
          <PIcon name="close" size={14} />
        </button>
      )}
    </li>
  );
}

function AddEvent({ date, onClose, onAdd }: { date: string; onClose: () => void; onAdd: (draft: { title: string; kind: EventKind; date: string; time: string }) => void }) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<EventKind>('meeting');
  const [day, setDay] = useState(date);
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  return (
    <Modal
      title="Add an event"
      icon="calendar"
      onClose={onClose}
      onSubmit={() => {
        const name = title.trim();
        if (!name) return setError('Give the event a name.');
        if (name.length > TITLE_MAX) return setError(`Keep the name under ${TITLE_MAX} characters.`);
        if (!day) return setError('Pick the date.');
        onAdd({ title: name, kind, date: day, time });
        onClose();
      }}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel>Add event</BtnLabel>
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
          <input type="date" value={day} onChange={(e) => (setDay(e.target.value), setError(''))} />
        </label>
        <label className="p-field">
          <span>Time (optional)</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <p className="p-field-hint">Everyone in the portal sees it on their calendar. Nobody is emailed.</p>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
