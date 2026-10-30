import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CERTIFICATE_TYPES, PERSON_STATUS_LABEL, ROLE_LABEL, toolById, type Person, type PersonRole, type PortalIconName, type SecurityEvent, type Task, type TaskStatus } from '../data';
import { hasArrived, managesPortal, markArrived, useSession } from '../session';
import { formatDate, usePeopleById, usePortal } from '../store';
import { Badge, btnClass, BtnLabel, DeleteButton, Empty, initials, Modal, NotConnected, PIcon, PresenceDot, SearchField, Stat, ToolButton, useListFlip, useNotice } from '../ui';
import { askToWatchActivity, useMyPresence } from '../presence';
import { attendanceFailedMessage, formatDuration, indiaHour, indiaTimeSec, indiaToday, useAttendanceDay } from '../attendance';
import { useOfficeSource } from './officeSource';
import { IdCardDialog } from '../IdCard';
import { InviteModal } from './People';
import { CalendarCard } from '../Calendar';
import { api } from '../api';
import { useDirectory } from '../people';
import { useCertificates } from '../certificates';
import { useAccountProfile, type ProfileState } from '../profile';
import { useMyPhoto } from '../myPhoto';
import { certificatesByType, managerFigures, peopleByRole, toCardPerson, type CardPerson, type Figure } from '../dashboard';
import { ConnectedCertificatesPanel, ConnectedTeamPanel } from './DashboardConnected';
import { MyLearningPanel } from './MyLearningPanel';
import { useTasks, type PortalTask, type TasksApi } from '../tasks';
import { daysUntil } from '../taskDue';
import { ConnectedTasksPanel, DueFlag, STATUS_LABEL as TASK_STATUS_LABEL, taskFailedMessage, TaskWindow, type TaskViewer } from './TasksConnected';
import type { ApiError } from '../api';
import type { DirectoryPerson } from '../people';

const STATUS_LABEL: Record<TaskStatus, string> = { todo: 'To do', doing: 'In progress', done: 'Done' };
const certName = (id: string) => CERTIFICATE_TYPES.find((c) => c.id === id)?.name ?? id;

// SecuPrompt reports these once it's connected; until then the panel shows that nothing is being reported.
const SECUPROMPT_CONNECTED = false;
const SECURITY_EVENTS: SecurityEvent[] = [];

export function Dashboard() {
  const session = useSession()!;
  // The first dashboard after signing in is the portal's one authored moment (the arrival); every later visit
  // opens with the ordinary quiet rise. Read once: a pure read, so Strict Mode's double call agrees with itself.
  const [arrive] = useState(() => !hasArrived());
  useEffect(() => {
    if (arrive) markArrived();
  }, [arrive]);
  // with the backend connected, the panels show its records; the parts it can't fill yet (tasks) are left out
  if (managesPortal(session.role)) return api ? <ConnectedManagerDashboard arrive={arrive} /> : <AdminDashboard arrive={arrive} />;
  return api ? <ConnectedEmployeeDashboard arrive={arrive} /> : <EmployeeDashboard arrive={arrive} />;
}

/** The header's shared actions: the Huly workspace, and copying this page's link. */
function HeadActions({ notify }: { notify: (t: string) => void }) {
  const huly = toolById('huly')!;
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify('Dashboard link copied. Only signed-in people can open it.');
    } catch {
      notify("Couldn't copy the link. Copy it from the address bar instead.");
    }
  };
  return (
    <>
      {/* opens the workspace itself once its address is set; until then its page says it isn't connected */}
      {huly.url ? (
        <a className={btnClass('light')} href={huly.url} target="_blank" rel="noreferrer">
          <BtnLabel icon="users">Integrated Workspace</BtnLabel>
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : (
        <Link to="/portal/tools/huly" className={btnClass('light')}>
          <BtnLabel icon="users">Integrated Workspace</BtnLabel>
        </Link>
      )}
      <button type="button" className={btnClass('light')} onClick={share}>
        <BtnLabel icon="share">Share</BtnLabel>
      </button>
    </>
  );
}

function greeting(hour: number) {
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

const taskSegments = (list: Task[]): Segment[] => [
  { label: 'Done', value: list.filter((t) => t.status === 'done').length, tone: 'ink' },
  { label: 'In progress', value: list.filter((t) => t.status === 'doing').length, tone: 'violet' },
  { label: 'To do', value: list.filter((t) => t.status === 'todo').length, tone: 'hatch' },
];

/** The page's opening: a big greeting, the key numbers beside it, and a bar of how work splits up. */
function Hello({
  sub,
  figures,
  segments,
  meterLabel,
  arrive,
  children,
}: {
  /** The supporting line, figures and task bar are optional: the employee view drops them, since its task board
   * already shows the same counts. */
  sub?: string;
  figures?: Figure[];
  segments?: Segment[];
  meterLabel?: string;
  arrive: boolean;
  children?: ReactNode;
}) {
  const { me } = usePortal();
  return (
    <header className="p-hello" data-arrive={arrive || undefined}>
      <div className="p-hello-top">
        <div>
          <h1 className="p-title">
            {/* the line rises out of its own baseline on arrival; the mask is the h1 */}
            <span className="p-title-line">
              {greeting(indiaHour())}, <span className="p-title-name">{me.name.split(' ')[0]}</span>
            </span>
          </h1>
          {sub && <p className="p-sub">{sub}</p>}
        </div>
        {figures && (
          <dl className="p-figures">
            {figures.map((f) => (
              <div key={f.label}>
                {/* a figure that hasn't loaded shows a dash, never a made-up 0 */}
                <dd>{f.value ?? '-'}</dd>
                <dt>
                  <PIcon name={f.icon} size={14} /> {f.label}
                </dt>
              </div>
            ))}
          </dl>
        )}
      </div>
      {(segments || children) && (
        <div className="p-hello-row">
          {segments && <Meter label={meterLabel ?? ''} segments={segments} />}
          {children && <div className="p-head-actions">{children}</div>}
        </div>
      )}
    </header>
  );
}

function EmployeeDashboard({ arrive }: { arrive: boolean }) {
  const { me, tasks, setPersonStatus } = usePortal();
  const [notice, notify] = useNotice();
  const mine = tasks.filter((t) => t.assigneeId === me.id);
  const done = mine.filter((t) => t.status === 'done').length;

  return (
    <>
      {/* just the greeting: the task board beside it already counts the tasks */}
      <Hello arrive={arrive} />
      {notice}
      <div className="p-bento">
        <ProfileCard person={me}>
          <div className="p-seg is-status is-glass" role="group" aria-label="My status">
            {(['active', 'inactive'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`is-${s}`}
                aria-pressed={me.status === s}
                onClick={() => {
                  if (me.status === s) return;
                  setPersonStatus(me.id, s);
                  notify(`You're now marked ${PERSON_STATUS_LABEL[s].toLowerCase()}.`);
                }}
              >
                <span className="p-status-dot" aria-hidden="true" /> {PERSON_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </ProfileCard>
        <ProgressCard title="Progress" done={done} total={mine.length} empty="No tasks assigned yet." delay={arrive ? ARRIVAL_LEAD : 0} />
        <NextDueCard list={mine} />
        {/* the task board's column, with the e-Office check-in above the board */}
        <div className="p-board-col">
          <EOfficeCard notify={notify} />
          <TaskBoard title="My tasks" list={mine} editable />
        </div>
        <WorkspaceCard notify={notify} />
        <CalendarCard tasks={mine.filter((t) => t.status !== 'done')} notify={notify} />
      </div>
    </>
  );
}

function AdminDashboard({ arrive }: { arrive: boolean }) {
  const { people, certificates, tasks, me } = usePortal();
  const [view, setView] = useState<DashboardView>('management');
  const [notice, notify] = useNotice();
  const recent = certificates.filter((c) => Date.now() - new Date(c.date).getTime() < 30 * 864e5).length;
  const done = tasks.filter((t) => t.status === 'done').length;
  return (
    <>
      <Hello
        sub="Your team, certificates, tasks and security at a glance."
        arrive={arrive}
        meterLabel="Team tasks"
        segments={taskSegments(tasks)}
        figures={[
          { label: 'Users', icon: 'users', value: people.length },
          { label: 'Certificates', icon: 'award', value: certificates.length },
          { label: 'Last 30 days', icon: 'check', value: recent },
          { label: 'Reset links', icon: 'key', value: 0 },
        ]}
      >
        <ViewSwitch view={view} onChange={setView} />
      </Hello>
      {notice}
      {view === 'management' ? (
        <>
          <div className="p-bento">
            <ProfileCard person={me} />
            <ProgressCard title="Team progress" done={done} total={tasks.length} empty="No tasks created yet." delay={arrive ? ARRIVAL_LEAD : 0} />
            <NextDueCard list={tasks} />
            <TaskBoard title="Team tasks" list={tasks} />
            <WorkspaceCard notify={notify} />
            <CalendarCard tasks={tasks.filter((t) => t.status !== 'done')} notify={notify} />
          </div>
          <CertificatesPanel />
          <TeamPanel />
          <TasksPanel />
          <SecurityPanel />
        </>
      ) : (
        <AnalyticsView />
      )}
    </>
  );
}

type DashboardView = 'management' | 'analytics';

function ViewSwitch({ view, onChange }: { view: DashboardView; onChange: (view: DashboardView) => void }) {
  return (
    <div className="p-seg" role="group" aria-label="Dashboard view">
      {(
        [
          ['management', 'Management', 'grid'],
          ['analytics', 'Analytics', 'chart'],
        ] as const
      ).map(([id, label, icon]) => (
        <button key={id} type="button" aria-pressed={view === id} onClick={() => onChange(id)}>
          <PIcon name={icon} size={15} /> {label}
        </button>
      ))}
    </div>
  );
}

/** What a task list shows while it loads or when it couldn't load; undefined once it's there. */
function tasksNote(tasks: TasksApi, loading: string) {
  if (tasks.state.kind === 'loading') return loading;
  if (tasks.state.kind !== 'error') return undefined;
  return (
    <>
      The tasks didn’t load. {taskFailedMessage(tasks.state.error)}{' '}
      {tasks.state.error.kind !== 'signed-out' && (
        <button type="button" className="p-link-btn" onClick={tasks.retry}>
          Try again
        </button>
      )}
    </>
  );
}

/**
 * The open task's window. It follows the task by id, so it shows each saved change, and closes once the task is gone
 * (deleted here or elsewhere).
 */
function OpenTask({ id, tasks, viewer, people, onClose, notify }: { id: string | null; tasks: TasksApi; viewer: TaskViewer; people?: DirectoryPerson[]; onClose: () => void; notify: (t: string) => void }) {
  const task = id && tasks.state.kind === 'ready' ? tasks.state.tasks.find((t) => t.id === id) : undefined;
  useEffect(() => {
    if (id && tasks.state.kind === 'ready' && !task) onClose();
  }, [id, task, tasks.state.kind, onClose]);
  return task ? <TaskWindow task={task} tasks={tasks} viewer={viewer} people={people} onClose={onClose} notify={notify} /> : null;
}

/**
 * The employee's dashboard on the backend's records: their real profile and ID card, with the status the backend
 * keeps (only admins can block an account, so there's no switch), and the tasks given to them. Changing a task's
 * status here saves it; a task opens in its window to see the brief and hand in work.
 */
function ConnectedEmployeeDashboard({ arrive }: { arrive: boolean }) {
  const email = useSession()!.email;
  const [notice, notify] = useNotice();
  const [profile] = useAccountProfile();
  const tasks = useTasks('mine');
  // only for the calendar's first days and work anniversaries
  const directory = useDirectory();
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);
  const list: PortalTask[] = tasks.state.kind === 'ready' ? tasks.state.tasks : [];
  const note = tasksNote(tasks, 'Loading your tasks…');
  const changeStatus = (id: string, status: TaskStatus) =>
    tasks.setStatus(id, status).then(
      () => notify(`Marked ${TASK_STATUS_LABEL[status].toLowerCase()}.`),
      (e: ApiError) => notify(taskFailedMessage(e)),
    );
  return (
    <>
      <Hello arrive={arrive} />
      {notice}
      <div className="p-bento">
        <ConnectedProfileCard profile={profile} />
        <ProgressCard
          title="Progress"
          done={list.filter((t) => t.status === 'done').length}
          total={list.length}
          empty={tasks.state.kind === 'ready' ? 'No tasks assigned yet.' : tasks.state.kind === 'error' ? 'Your tasks didn’t load.' : 'Loading your tasks…'}
          delay={arrive ? ARRIVAL_LEAD : 0}
        />
        <NextDueCard list={list} />
        <div className="p-board-col">
          <EOfficeCard notify={notify} />
          <TaskBoard title="My tasks" list={list} editable onStatus={(id, s) => void changeStatus(id, s)} onOpen={(t) => setOpenId(t.id)} note={note} />
        </div>
        <WorkspaceCard notify={notify} />
        <CalendarCard tasks={list.filter((t) => t.status !== 'done')} joiners={directory.state.kind === 'ready' ? directory.state.people : undefined} notify={notify} />
      </div>
      <MyLearningPanel />
      <OpenTask id={openId} tasks={tasks} viewer={{ accountRole: 'Employee', email }} onClose={close} notify={notify} />
    </>
  );
}

/** Admins and superadmins may list everyone's certificates; a sub admin's dashboard never asks for them. */
function ConnectedManagerDashboard({ arrive }: { arrive: boolean }) {
  return useSession()!.role === 'admin' ? <ManagerWithCertificates arrive={arrive} /> : <ConnectedManaging arrive={arrive} />;
}

function ManagerWithCertificates({ arrive }: { arrive: boolean }) {
  const certificates = useCertificates('all');
  return <ConnectedManaging arrive={arrive} certificates={certificates} />;
}

/** The managing dashboard on the backend's records: the team, every task, the certificates (admins only) and real figures. */
function ConnectedManaging({ arrive, certificates }: { arrive: boolean; certificates?: ReturnType<typeof useCertificates> }) {
  const email = useSession()!.email;
  // live: the team table's dots change on their own
  const directory = useDirectory({ live: true });
  const tasks = useTasks('team');
  const [profile] = useAccountProfile();
  const [view, setView] = useState<DashboardView>('management');
  const [notice, notify] = useNotice();
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);
  const people = directory.state.kind === 'ready' ? directory.state.people : undefined;
  const issued = certificates?.state.kind === 'ready' ? certificates.state.certificates : undefined;
  const list: PortalTask[] = tasks.state.kind === 'ready' ? tasks.state.tasks : [];
  // as on People: the directory says what this account may change; until it loads, nothing
  const viewer: TaskViewer = { accountRole: people?.find((p) => p.email.toLowerCase() === email.toLowerCase())?.accountRole ?? 'Employee', email };
  return (
    <>
      <Hello
        sub={certificates ? 'Your team, tasks and certificates at a glance.' : 'Your team and tasks at a glance.'}
        arrive={arrive}
        meterLabel="Team tasks"
        segments={tasks.state.kind === 'ready' ? taskSegments(list) : undefined}
        figures={managerFigures({ people, certificates: issued, showCertificates: !!certificates })}
      >
        <ViewSwitch view={view} onChange={setView} />
      </Hello>
      {notice}
      {view === 'management' ? (
        <>
          <div className="p-bento">
            <ConnectedProfileCard profile={profile} />
            <ProgressCard
              title="Team progress"
              done={list.filter((t) => t.status === 'done').length}
              total={list.length}
              empty={tasks.state.kind === 'ready' ? 'No tasks created yet.' : tasks.state.kind === 'error' ? 'The tasks didn’t load.' : 'Loading the tasks…'}
              delay={arrive ? ARRIVAL_LEAD : 0}
            />
            <NextDueCard list={list} />
            <div className="p-board-col">
              <EOfficeCard notify={notify} team />
              <TaskBoard title="Team tasks" list={list} onOpen={(t) => setOpenId(t.id)} note={tasksNote(tasks, 'Loading the tasks…')} />
            </div>
            <WorkspaceCard notify={notify} />
            <CalendarCard tasks={list.filter((t) => t.status !== 'done')} joiners={people} notify={notify} />
          </div>
          <MyLearningPanel />
          {certificates && <ConnectedCertificatesPanel certificates={certificates} />}
          <ConnectedTeamPanel directory={directory} />
          <ConnectedTasksPanel tasks={tasks} people={people} onOpen={(t) => setOpenId(t.id)} notify={notify} />
          <SecurityPanel />
        </>
      ) : (
        <div className="p-analytics">
          {people ? (
            <Breakdown title="People by role" icon="users" total={people.length} rows={peopleByRole(people)} />
          ) : (
            <p className="p-muted" role="status">
              {directory.state.kind === 'error' ? 'The figures didn’t load. Try again from Management.' : 'Loading the figures…'}
            </p>
          )}
          {issued && <Breakdown title="Certificates by type" icon="award" total={issued.length} rows={certificatesByType(issued)} />}
          {tasks.state.kind === 'ready' && (
            <Breakdown
              title="Tasks by status"
              icon="clipboard"
              total={list.length}
              rows={Object.entries(TASK_STATUS_LABEL).map(([status, label]) => ({ label, value: list.filter((t) => t.status === status).length }))}
            />
          )}
        </div>
      )}
      <OpenTask id={openId} tasks={tasks} viewer={viewer} people={people} onClose={close} notify={notify} />
    </>
  );
}

/**
 * The profile card on the signed-in person's real record; until it loads there's no ID card to show. Its tag is the
 * live e-Office dot (presence.ts); whether the account is blocked shows in People and the ID card.
 */
function ConnectedProfileCard({ profile }: { profile: ProfileState }) {
  const card = profile.kind === 'ready' ? toCardPerson(profile.profile) : null;
  const presence = useMyPresence();
  return (
    <ProfileCard person={card}>
      {card ? (
        presence && (
          <span className="p-profile-tag">
            <PresenceDot presence={presence} label />
          </span>
        )
      ) : (
        <span className="p-profile-tag">{profile.kind === 'error' ? 'Details didn’t load' : 'Loading…'}</span>
      )}
    </ProfileCard>
  );
}

type Segment = { label: string; value: number; tone: 'ink' | 'violet' | 'hatch' };

/** A bar split into pills, one per part, each as wide as its share. The pills draw in once, left to right. */
function Meter({ label, segments }: { label: string; segments: Segment[] }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  const shown = segments.filter((s) => s.value > 0);
  return (
    <div className="p-tally" role="img" aria-label={total ? `${label}: ${segments.map((s) => `${s.value} ${s.label.toLowerCase()}`).join(', ')}` : `${label}: none yet`}>
      {total ? (
        shown.map((s, i) => (
          <div key={s.label} className="p-tally-part" style={{ flexGrow: s.value, '--i': i } as CSSProperties}>
            <span className="p-tally-label" aria-hidden="true">
              {s.label}
            </span>
            <span className={`p-tally-pill is-${s.tone}`} aria-hidden="true">
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))
      ) : (
        <div className="p-tally-part">
          <span className="p-tally-label" aria-hidden="true">
            {label}
          </span>
          <span className="p-tally-pill is-empty" aria-hidden="true">
            Nothing yet
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * The signed-in person: their photo (or initials) filling the card, with name and role over it. Clicking anywhere
 * on it except the status switch brings out their company ID card. `person` is null while the real record loads (or
 * when it couldn't load): the card then shows the session's name and role, and has no ID card to bring out.
 */
function ProfileCard({ person, children }: { person: CardPerson | null; children?: ReactNode }) {
  const session = useSession()!;
  const photo = useMyPhoto();
  const [showId, setShowId] = useState(false);
  const name = person?.name ?? session.name;
  const roleLine = person ? [person.roleLabel ?? ROLE_LABEL[person.role], person.team].filter(Boolean).join(' · ') : ROLE_LABEL[session.role];
  return (
    <section className="p-card p-profile" aria-label="Your profile">
      {person && (
        <>
          {/* the card's click target, under the name and the switch; the foot lets clicks through to it */}
          <button type="button" className="p-profile-open" aria-haspopup="dialog" onClick={() => setShowId(true)}>
            <span className="sr-only">Show my company ID card</span>
          </button>
          <span className="p-profile-hint" aria-hidden="true">
            <PIcon name="eye" size={14} />
            ID card
          </span>
        </>
      )}
      {photo ? (
        <img className="p-profile-photo" src={photo} alt="" />
      ) : (
        <span className="p-profile-initials" aria-hidden="true">
          {initials(name)}
        </span>
      )}
      <div className="p-profile-foot">
        <div>
          <p className="p-profile-name">{name}</p>
          <p className="p-profile-role">{roleLine}</p>
        </div>
        {children ?? (person && <span className="p-profile-tag">{PERSON_STATUS_LABEL[person.status]}</span>)}
      </div>
      {showId && person && <IdCardDialog person={person} photo={photo} onClose={() => setShowId(false)} />}
    </section>
  );
}

const RING_R = 52;
const RING_LENGTH = 2 * Math.PI * RING_R;
const RING_TICKS = 48;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// how long the arrival holds the cards back so the greeting reads first (matches --arrive-lead in portal.css)
const ARRIVAL_LEAD = 380;

/**
 * Drives the progress ring: the arc, the dot riding its tip, the tick marks it has passed, and the number, all from
 * one value so they never drift apart. Frames are written straight to the elements, so React doesn't re-render.
 *
 * When the page opens the ring sweeps up to 100%, glows once and the number pops, then it settles on the real share
 * (asked for as a one-time intro). Later changes glide to the new share. With reduced motion it just shows the value.
 */
function useRing(share: number, delay = 0) {
  const arc = useRef<SVGCircleElement>(null);
  const head = useRef<SVGGElement>(null);
  const ticks = useRef<SVGGElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const value = useRef<HTMLParagraphElement>(null);
  const glow = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const latest = useRef(share);
  latest.current = share;
  const intro = useRef(false);
  const raf = useRef(0);
  const hold = useRef(0);

  const paint = (v: number) => {
    shown.current = v;
    arc.current?.style.setProperty('stroke-dashoffset', String(RING_LENGTH * (1 - v)));
    if (head.current) {
      head.current.style.transform = `rotate(${v * 360}deg)`;
      head.current.style.opacity = v > 0.004 ? '1' : '0';
    }
    // a tick lights once the arc has reached it
    ticks.current?.querySelectorAll('line').forEach((t, i) => t.classList.toggle('is-lit', i / RING_TICKS < v - 0.001));
    if (label.current) label.current.textContent = String(Math.round(v * 100));
  };

  const tween = (to: number, ms: number, ease: (t: number) => number, done?: () => void) => {
    cancelAnimationFrame(raf.current);
    const from = shown.current;
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      paint(from + (to - from) * ease(t));
      if (t < 1) raf.current = requestAnimationFrame(frame);
      else done?.();
    };
    raf.current = requestAnimationFrame(frame);
  };

  // a layout effect, so the first painted frame is already at 0 rather than flashing the real value
  useLayoutEffect(() => {
    if (reducedMotion()) return paint(latest.current);
    intro.current = true;
    paint(0);
    const sweep = () => tween(1, 700, easeOut, () => {
      // full: the ring glows once and the number gives a small pop, then everything settles on the real share
      glow.current?.animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' });
      value.current?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)', offset: 0.4 }, { transform: 'scale(1)' }], {
        duration: 420,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      });
      hold.current = window.setTimeout(() => {
        tween(latest.current, 650, easeInOut, () => (intro.current = false));
      }, 180);
    });
    const wait = window.setTimeout(sweep, delay);
    return () => {
      cancelAnimationFrame(raf.current);
      clearTimeout(wait);
      clearTimeout(hold.current);
      intro.current = false;
    };
  }, []);

  // after the intro, a new share (a task done or removed) glides there
  useLayoutEffect(() => {
    if (intro.current) return;
    if (reducedMotion()) paint(share);
    else tween(share, 420, easeOut);
  }, [share]);

  return { arc, head, ticks, label, value, glow };
}

/** A ring showing the share of tasks done, with tick marks round it like a dial. */
function ProgressCard({ title, done, total, empty, delay = 0 }: { title: string; done: number; total: number; empty: string; delay?: number }) {
  const share = total ? done / total : 0;
  const { arc, head, ticks, label, value, glow } = useRing(share, delay);
  return (
    <section className="p-card" aria-labelledby="progress-title">
      <div className="p-card-head">
        <h2 id="progress-title" className="p-card-title">
          {title}
        </h2>
        <Link to="/portal/people" className="p-round-link" aria-label="Open People">
          <PIcon name="external" size={15} />
        </Link>
      </div>
      <div className="p-ring">
        <span ref={glow} className="p-ring-glow" aria-hidden="true" />
        <svg viewBox="0 0 128 128" aria-hidden="true">
          <g ref={ticks} className="p-ring-ticks">
            {Array.from({ length: RING_TICKS }, (_, i) => {
              const a = (i / RING_TICKS) * 2 * Math.PI;
              return <line key={i} x1={64 + 60 * Math.cos(a)} y1={64 + 60 * Math.sin(a)} x2={64 + 63.5 * Math.cos(a)} y2={64 + 63.5 * Math.sin(a)} />;
            })}
          </g>
          <circle className="p-ring-track" cx="64" cy="64" r={RING_R} />
          <circle ref={arc} className="p-ring-fill" cx="64" cy="64" r={RING_R} style={{ '--len': RING_LENGTH } as CSSProperties} />
          <g ref={head} className="p-ring-head">
            <circle cx={64 + RING_R} cy="64" r="6.5" />
          </g>
        </svg>
        {/* the sweep is decoration: screen readers get the real share only */}
        <p ref={value} className="p-ring-value" aria-label={`${Math.round(share * 100)}% done`}>
          <span ref={label} aria-hidden="true" />
          <span aria-hidden="true">%</span>
        </p>
      </div>
      <p className="p-muted">{total ? `${done} of ${total} tasks done` : empty}</p>
    </section>
  );
}

/** Today's date, and the open task due soonest. Without a task list (tasks aren't connected yet) just the date. */
function NextDueCard({ list }: { list?: Task[] }) {
  const byId = usePeopleById();
  const now = new Date();
  // a task without a due date (allowed by the backend) is never "next due"
  const next = list?.filter((t) => t.status !== 'done' && t.due).sort((a, b) => a.due.localeCompare(b.due))[0];
  const days = next ? daysUntil(next.due) : 0;
  return (
    <section className="p-card" aria-labelledby="today-title">
      <h2 id="today-title" className="p-card-title">
        Today
      </h2>
      <p className="p-today-date">
        {now.getDate()}
        <span>{now.toLocaleDateString('en-IN', { month: 'short' })}</span>
      </p>
      <p className="p-today-day">{now.toLocaleDateString('en-IN', { weekday: 'long' })}</p>
      {list && (
        <div className="p-today-next">
          <p className="p-menu-label">Next due</p>
          {next ? (
            <>
              <p className="p-today-task">{next.title}</p>
              <p className={`p-today-when${days < 0 ? ' is-late' : ''}`}>
                {formatDate(next.due)} · {days < 0 ? `${-days} ${-days === 1 ? 'day' : 'days'} late` : days === 0 ? 'today' : `in ${days} ${days === 1 ? 'day' : 'days'}`}
                {list.some((t) => t.assigneeId !== next.assigneeId) && ` · ${next.assigneeName ?? byId.get(next.assigneeId)?.name ?? 'Removed user'}`}
              </p>
            </>
          ) : (
            <p className="p-today-task is-none">Nothing due</p>
          )}
        </div>
      )}
    </section>
  );
}

/** The dark task list. People change their own tasks' status here; the team view only reads. */
const clockTime = (t: number) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
const duration = (ms: number) => formatDuration(Math.floor(ms / 1000));

/**
 * The person's day in the e-Office: join checks them in and opens the virtual office in a new tab, then the card
 * shows since when they've been in, the day's running time, and a way to leave; joining again starts a new visit.
 * Connected, every visit is saved to the backend (officeSource.ts) and the card links to the person's attendance; a
 * manager's card also says how many are in now. The office's address comes from TOOLS like the other tools.
 */
function EOfficeCard({ notify, team = false }: { notify: (t: string) => void; team?: boolean }) {
  const { me } = usePortal();
  const source = useOfficeSource(me.email);
  const office = toolById('eoffice')!;
  const state = source.now;
  const { inside } = state;
  const teamDay = useAttendanceDay(indiaToday(), team && source.connected);
  const [busy, setBusy] = useState(false);
  // the running time shows seconds, so the card re-renders every second while someone is in
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!inside) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [inside]);
  // the demo shows the browser's clock as it always has; the backend's days are India time
  const time = source.connected ? indiaTimeSec : clockTime;

  const open = () => office.url && window.open(office.url, '_blank', 'noopener,noreferrer');
  const act = async (change: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await change();
      notify(done);
      if (team) void teamDay.reload();
      return true;
    } catch (error) {
      notify(attendanceFailedMessage(error as ApiError));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const enter = async () => {
    askToWatchActivity();
    if ((await act(source.join, office.url ? 'You checked in to the e-Office.' : "You checked in. The e-Office link isn't connected yet, so nothing opened.")) && office.url) open();
  };
  const loading = source.status.kind === 'loading';

  return (
    <section className="p-card p-eoffice" data-state={inside ? 'in' : state.visited ? 'left' : 'out'} aria-labelledby="eoffice-title" aria-busy={busy || loading}>
      <div className="p-eoffice-head">
        <span className="p-tile-icon">
          <PIcon name="home" />
        </span>
        <div>
          <h2 id="eoffice-title" className="p-card-title">
            e-Office
          </h2>
          <p className="p-eoffice-sub" role="status">
            {source.status.kind === 'error' ? (
              'Your day didn’t load.'
            ) : loading ? (
              'Loading your day…'
            ) : state.inside ? (
              <>
                <span className="p-eoffice-dot" aria-hidden="true" /> In since {time(state.since)}
              </>
            ) : state.visited ? (
              `Left at ${time(state.leftAt)}`
            ) : (
              'Check in to start your day.'
            )}
          </p>
        </div>
        {state.visited && <p className="p-eoffice-time">{duration(source.spent(now))}</p>}
      </div>
      <div className="p-eoffice-actions">
        {source.status.kind === 'error' ? (
          <button type="button" className={btnClass('ghost', { small: true, wide: true })} onClick={source.retry}>
            <BtnLabel icon="refresh">Try again</BtnLabel>
          </button>
        ) : inside ? (
          <>
            {office.url && (
              <button type="button" className={btnClass('primary', { small: true })} onClick={open}>
                <BtnLabel arrow="up-right">Open e-Office</BtnLabel>
                <span className="sr-only">(opens in a new tab)</span>
              </button>
            )}
            <button type="button" className={btnClass('ghost', { small: true })} disabled={busy} onClick={() => void act(source.leave, 'You left the e-Office.')}>
              <BtnLabel icon="logout">{busy ? 'Leaving…' : 'Leave'}</BtnLabel>
            </button>
          </>
        ) : (
          <button type="button" className={btnClass('primary', { small: true, wide: true })} disabled={busy || loading} onClick={() => void enter()}>
            <BtnLabel icon="home">{busy ? 'Checking in…' : state.visited ? 'Join again' : 'Join e-Office'}</BtnLabel>
          </button>
        )}
      </div>
      {source.connected && (
        <p className="p-eoffice-foot">
          {team && teamDay.state.kind === 'ready' && (
            <span>
              {teamDay.state.value.inNow} in now
            </span>
          )}
          <Link to="/portal/attendance" className="p-link">
            {team ? 'Open attendance' : 'My attendance'}
          </Link>
        </p>
      )}
    </section>
  );
}

function TaskBoard({
  title,
  list,
  editable = false,
  onStatus,
  onOpen,
  note,
}: {
  title: string;
  list: Task[];
  editable?: boolean;
  /** Saves a status change; the demo's own store when unset. */
  onStatus?: (id: string, status: TaskStatus) => void;
  /** Opens a task's details; when set, each title is a button. */
  onOpen?: (task: Task) => void;
  /** Shown instead of the list while it loads or when it couldn't load. */
  note?: ReactNode;
}) {
  const { setTaskStatus } = usePortal();
  const changeStatus = onStatus ?? setTaskStatus;
  const byId = usePeopleById();
  const done = list.filter((t) => t.status === 'done').length;
  // open tasks first, soonest due first; tasks with no due date after the dated ones
  const sorted = [...list].sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || (a.due || '~').localeCompare(b.due || '~'));
  const listRef = useListFlip<HTMLUListElement>(sorted.map((t) => `${t.id}:${t.status}`).join());
  return (
    <section className="p-card p-board" aria-labelledby="board-title" data-lenis-prevent>
      <div className="p-board-head">
        <h2 id="board-title" className="p-card-title">
          {title}
        </h2>
        <p className="p-board-count">
          {done}/{list.length}
        </p>
      </div>
      {note ? (
        <div className="p-board-empty">{note}</div>
      ) : sorted.length ? (
        <ul className="p-board-list" ref={listRef}>
          {sorted.map((t) => (
            <li key={t.id} data-flip={t.id} className={`p-board-item is-${t.status}`}>
              <span className="p-board-icon" aria-hidden="true">
                {/* keyed by status, so a new status swaps the icon in instead of cutting to it */}
                <PIcon key={t.status} name={t.status === 'done' ? 'check' : t.status === 'doing' ? 'clock' : 'target'} size={15} />
              </span>
              <div className="p-board-text">
                {onOpen ? (
                  <button type="button" className="p-board-title is-link" aria-haspopup="dialog" onClick={() => onOpen(t)}>
                    {t.title}
                  </button>
                ) : (
                  <p className="p-board-title">{t.title}</p>
                )}
                <div className="p-board-meta">
                  {editable ? (
                    <label className="p-board-status">
                      <span className="sr-only">Status of {t.title}</span>
                      <select value={t.status} onChange={(e) => changeStatus(t.id, e.target.value as TaskStatus)}>
                        {Object.entries(STATUS_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span className={`p-board-tag is-${t.status}`}>{STATUS_LABEL[t.status]}</span>
                  )}
                  <span>
                    {t.due ? formatDate(t.due) : 'No due date'}
                    {!editable && ` · ${t.assigneeName ?? byId.get(t.assigneeId)?.name ?? 'Removed user'}`}
                  </span>
                  <DueFlag task={t} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-board-empty">{editable ? 'Tasks your admin assigns to you will show up here.' : 'Tasks you create show up here.'}</p>
      )}
    </section>
  );
}

/** The workspace tools as folding rows: HRMS sign-in, the team workspace, and sharing this page. */
function WorkspaceCard({ notify }: { notify: (t: string) => void }) {
  const hrms = toolById('hrms')!;
  return (
    <section className="p-card p-fold" aria-label="Workspace">
      <details open>
        <summary>
          HRMS portal <PIcon name="chevron" size={14} />
        </summary>
        <div className="p-fold-body">
          <p className="p-muted">Single sign-on to workforce administration and operations.</p>
          <ul className="p-checks">
            {['Employee directory and profiles', 'Leave and attendance', 'Payroll and performance', 'Secure SSO sign-in'].map((f) => (
              <li key={f}>
                <PIcon name="check" size={14} /> {f}
              </li>
            ))}
          </ul>
          <ToolButton url={hrms.url} label="Launch HRMS Login" name="HRMS" />
          {!hrms.url && <NotConnected />}
        </div>
      </details>
      <details>
        <summary>
          Workspace &amp; sharing <PIcon name="chevron" size={14} />
        </summary>
        <div className="p-fold-body p-row">
          <HeadActions notify={notify} />
        </div>
      </details>
    </section>
  );
}

/** Breakdowns of the portal's own records: who is in it, what was issued, and how work is going. */
function AnalyticsView() {
  const { people, certificates, tasks } = usePortal();
  const count = <T,>(list: T[], pick: (x: T) => string, keys: [string, string][]) => keys.map(([k, label]) => ({ label, value: list.filter((x) => pick(x) === k).length }));
  return (
    <div className="p-analytics">
      <Breakdown title="People by role" icon="users" total={people.length} rows={count(people, (p) => p.role, Object.entries(ROLE_LABEL))} />
      <Breakdown title="Certificates by type" icon="award" total={certificates.length} rows={count(certificates, (c) => c.type, CERTIFICATE_TYPES.map((t) => [t.id, t.name]))} />
      <Breakdown title="Tasks by status" icon="clipboard" total={tasks.length} rows={count(tasks, (t) => t.status, Object.entries(STATUS_LABEL))} />
    </div>
  );
}

function Breakdown({ title, icon, total, rows }: { title: string; icon: PortalIconName; total: number; rows: { label: string; value: number }[] }) {
  return (
    <section className="p-card" aria-label={title}>
      <h2 className="p-card-title">
        <PIcon name={icon} /> {title}
      </h2>
      <ul className="p-bars">
        {rows.map((r) => (
          <li key={r.label}>
            <span className="p-bars-label">{r.label}</span>
            <span className="p-bars-track" aria-hidden="true">
              <i style={{ scale: `${total ? r.value / total : 0} 1` }} />
            </span>
            <span className="p-bars-value">{r.value}</span>
          </li>
        ))}
      </ul>
      <p className="p-dim">{total === 1 ? '1 in total' : `${total} in total`}</p>
    </section>
  );
}

function CertificatesPanel() {
  // as in the real portal: only Super Admins and Admins generate certificates
  const isAdmin = useSession()!.role === 'admin';
  const { certificates } = usePortal();
  const byId = usePeopleById();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const rows = certificates
    .filter((c) => !query || certName(c.type).toLowerCase().includes(query) || byId.get(c.recipientId)?.name.toLowerCase().includes(query))
    .slice(0, 5);
  const certRows = useListFlip<HTMLTableSectionElement>(query);
  return (
    <section className="p-card" aria-labelledby="cert-mgmt">
      <div className="p-card-head">
        <div>
          <h2 id="cert-mgmt" className="p-card-title">
            Certificate management
          </h2>
          <p className="p-muted">Manage and generate certificates. The five most recent are shown; the full history is on Certificates.</p>
        </div>
        {isAdmin && (
          <Link to="/portal/certificates" className={btnClass('primary')}>
            <BtnLabel icon="plus">Generate certificate</BtnLabel>
          </Link>
        )}
      </div>
      <SearchField value={q} onChange={setQ} label="Search certificates" placeholder="Search by type or person" />
      {rows.length ? (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th scope="col">Certificate</th>
                <th scope="col">Issued to</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody ref={certRows}>
              {rows.map((c) => (
                <tr key={c.id} data-flip={c.id}>
                  <td className="is-strong">{certName(c.type)}</td>
                  <td>{byId.get(c.recipientId)?.name ?? 'Removed user'}</td>
                  <td>{formatDate(c.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="award" title="No certificates found">
          Try clearing the search, or generate a new certificate.
        </Empty>
      )}
    </section>
  );
}

function TeamPanel() {
  const isAdmin = useSession()!.role === 'admin';
  const { people, me, invitePerson } = usePortal();
  const [q, setQ] = useState('');
  const [inviting, setInviting] = useState(false);
  const [managing, setManaging] = useState<Person | null>(null);
  const [notice, notify] = useNotice();
  const query = q.trim().toLowerCase();
  const rows = people.filter((p) => !query || [p.name, p.email, p.role].some((v) => v.toLowerCase().includes(query)));
  const teamRows = useListFlip<HTMLTableSectionElement>(query);
  // Same rule as People: only admins manage, and never other admins or themselves.
  const manageable = (p: Person) => isAdmin && p.role !== 'admin' && p.id !== me.id;

  return (
    <section className="p-card" aria-labelledby="team">
      <div className="p-card-head">
        <div>
          <h2 id="team" className="p-card-title">
            Manage team: employees and interns
          </h2>
          <p className="p-muted">Admin accounts can't be managed from here.</p>
        </div>
        {/* as in the real portal: only Super Admins and Admins invite */}
        {isAdmin && (
          <button type="button" className={btnClass('primary')} onClick={() => setInviting(true)}>
            <BtnLabel icon="plus">Add user</BtnLabel>
          </button>
        )}
      </div>
      <SearchField value={q} onChange={setQ} label="Search the team" placeholder="Search by name, email or role" />
      {rows.length ? (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody ref={teamRows}>
              {rows.map((p) => (
                <tr key={p.id} data-flip={p.id}>
                  <td className="is-strong">
                    <span className="p-person">
                      <span className="p-avatar is-soft is-small" aria-hidden="true">
                        {initials(p.name)}
                      </span>
                      {p.name}
                    </span>
                  </td>
                  <td>
                    <Badge kind={p.role}>{ROLE_LABEL[p.role]}</Badge>
                  </td>
                  <td>{p.email}</td>
                  <td>
                    <Badge kind={p.status}>{PERSON_STATUS_LABEL[p.status]}</Badge>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={btnClass('ghost', { small: true })}
                      onClick={() => setManaging(p)}
                      disabled={!manageable(p)}
                      title={manageable(p) ? undefined : !isAdmin ? 'Only admins can change roles or delete accounts' : p.id === me.id ? "You can't manage your own account" : "Admin accounts can't be managed"}
                    >
                      <BtnLabel icon="edit">
                        Manage<span className="sr-only"> {p.name}</span>
                      </BtnLabel>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="users" title="Nobody matches that search" />
      )}
      <p className="p-hint">
        <strong>Note:</strong> admins can delete only employee and intern accounts.
      </p>
      {notice}
      {inviting && (
        <InviteModal
          taken={(email) => people.some((p) => p.email === email)}
          onClose={() => setInviting(false)}
          onInvite={(name, email, role, stream) => {
            invitePerson(name, email, role, stream);
            notify(`${name} was added. Invite emails aren't connected yet, so no email was sent.`);
          }}
        />
      )}
      {managing && <ManagePerson person={managing} onClose={() => setManaging(null)} notify={notify} />}
    </section>
  );
}

/** Change an employee's or intern's role, or delete their account. */
function ManagePerson({ person, onClose, notify }: { person: Person; onClose: () => void; notify: (t: string) => void }) {
  const { setPersonRole, removePerson } = usePortal();
  const [role, setRole] = useState<PersonRole>(person.role);
  return (
    <Modal
      title={`Manage ${person.name}`}
      icon="edit"
      onClose={onClose}
      onSubmit={() => {
        if (role !== person.role) {
          setPersonRole(person.id, role);
          notify(`${person.name} is now ${ROLE_LABEL[role].toLowerCase()}.`);
        }
        onClose();
      }}
      footer={
        <>
          <DeleteButton
            srText="account"
            onDone={() => {
              removePerson(person.id);
              notify(`${person.name} was deleted.`);
              onClose();
            }}
          />
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel>Save</BtnLabel>
          </button>
        </>
      }
    >
      <p className="p-modal-text">{person.email}</p>
      <label className="p-field">
        <span>Role</span>
        <select className="p-select" value={role} onChange={(e) => setRole(e.target.value as PersonRole)} autoFocus>
          <option value="subadmin">Sub Admin</option>
          <option value="employee">Employee</option>
          <option value="intern">Intern</option>
        </select>
      </label>
    </Modal>
  );
}

function TasksPanel() {
  const canDelete = useSession()!.role === 'admin';
  const { tasks, people, addTask, removeTask } = usePortal();
  const byId = usePeopleById();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [notice, notify] = useNotice();
  const query = q.trim().toLowerCase();
  const rows = tasks.filter((t) => !query || t.title.toLowerCase().includes(query) || byId.get(t.assigneeId)?.name.toLowerCase().includes(query));
  const taskRows = useListFlip<HTMLTableSectionElement>(`${query}|${rows.map((t) => t.id).join()}`);
  // sub admins get the managing dashboard, which has no task list of their own
  const assignable = people.filter((p) => p.role !== 'admin' && p.role !== 'subadmin');

  return (
    <section className="p-card" aria-labelledby="task-mgmt">
      <div className="p-card-head">
        <div>
          <h2 id="task-mgmt" className="p-card-title">
            Task management
          </h2>
          <p className="p-muted">Create and track tasks for employees and interns.</p>
        </div>
        <button type="button" className={btnClass('primary')} onClick={() => setCreating(true)}>
          <BtnLabel icon="plus">Create task</BtnLabel>
        </button>
      </div>
      <SearchField value={q} onChange={setQ} label="Search tasks" placeholder="Search by task or person" />
      {rows.length ? (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th scope="col">Task</th>
                <th scope="col">Assigned to</th>
                <th scope="col">Due</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody ref={taskRows}>
              {rows.map((t) => (
                <tr key={t.id} data-flip={t.id}>
                  <td className="is-strong">{t.title}</td>
                  <td>{byId.get(t.assigneeId)?.name ?? 'Removed user'}</td>
                  <td>{formatDate(t.due)}</td>
                  <td>
                    <Badge kind={t.status}>{STATUS_LABEL[t.status]}</Badge>
                  </td>
                  <td className="is-end">
                    {canDelete && (
                      <DeleteButton small srText={`task: ${t.title}`} onDone={() => (removeTask(t.id), notify('Task removed.'))} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="clipboard" title="No tasks found">
          {query ? 'Try clearing the search.' : 'Click "Create task" to create one.'}
        </Empty>
      )}
      {notice}
      {creating && (
        <CreateTask
          people={assignable}
          onClose={() => setCreating(false)}
          onCreate={(title, who, due) => {
            addTask(title, who, due);
            notify(`Task assigned to ${byId.get(who)?.name ?? 'them'}.`);
          }}
        />
      )}
    </section>
  );
}

function CreateTask({ people, onClose, onCreate }: { people: { id: string; name: string }[]; onClose: () => void; onCreate: (title: string, who: string, due: string) => void }) {
  const [title, setTitle] = useState('');
  const [who, setWho] = useState(people[0]?.id ?? '');
  const [due, setDue] = useState('');
  const [error, setError] = useState('');
  return (
    <Modal
      title="Create task"
      icon="clipboard"
      onClose={onClose}
      onSubmit={() => {
        if (!title.trim()) return setError('Give the task a title.');
        if (!who) return setError('Pick who the task is for.');
        if (!due) return setError('Pick a due date.');
        onCreate(title.trim(), who, due);
        onClose();
      }}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel>Create task</BtnLabel>
          </button>
        </>
      }
    >
      <label className="p-field">
        <span>Title</span>
        <input value={title} onChange={(e) => (setTitle(e.target.value), setError(''))} placeholder="What needs doing?" autoFocus />
      </label>
      <label className="p-field">
        <span>Assign to</span>
        <select className="p-select" value={who} onChange={(e) => setWho(e.target.value)}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="p-field">
        <span>Due date</span>
        <input type="date" value={due} onChange={(e) => (setDue(e.target.value), setError(''))} />
      </label>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

const ACTION_LABEL: Record<SecurityEvent['action'], string> = { blocked: 'Blocked', sanitized: 'Sanitised' };

function SecurityPanel() {
  const [q, setQ] = useState('');
  const [action, setAction] = useState<SecurityEvent['action'] | ''>('');
  const events = SECURITY_EVENTS;
  const query = q.trim().toLowerCase();
  const rows = events.filter((e) => (!action || e.action === action) && (!query || e.personName.toLowerCase().includes(query) || e.email.toLowerCase().includes(query)));
  const dayAgo = Date.now() - 864e5;

  return (
    <section className="p-card" aria-labelledby="sec">
      <div className="p-card-head">
        <div>
          <h2 id="sec" className="p-card-title">
            <PIcon name="shield" /> AI security events
          </h2>
          <p className="p-muted">Prompt-injection attempts detected by SecuPrompt.</p>
        </div>
        {/* nothing to reload until SecuPrompt reports to the portal */}
        <button type="button" className={btnClass('ghost')} disabled={!SECUPROMPT_CONNECTED} title={SECUPROMPT_CONNECTED ? undefined : "SecuPrompt isn't connected yet"}>
          <BtnLabel icon="refresh">Refresh</BtnLabel>
        </button>
      </div>
      <div className="p-stats is-compact">
        <Stat icon="shield" label="Total events" value={events.length} tone="ink" />
        <Stat icon="close" label="Blocked" value={events.filter((e) => e.action === 'blocked').length} tone="tangerine" />
        <Stat icon="check" label="Sanitised" value={events.filter((e) => e.action === 'sanitized').length} tone="saffron" />
        <Stat icon="alert" label="Last 24 hours" value={events.filter((e) => new Date(e.at).getTime() > dayAgo).length} />
      </div>
      <div className="p-toolbar">
        <SearchField value={q} onChange={setQ} label="Search security events" placeholder="Search by name or email" />
        <label className="p-filter">
          <PIcon name="filter" size={16} />
          <span className="sr-only">Filter by action</span>
          <select className="p-select" value={action} onChange={(e) => setAction(e.target.value as SecurityEvent['action'] | '')}>
            <option value="">All actions</option>
            <option value="blocked">Blocked</option>
            <option value="sanitized">Sanitised</option>
          </select>
        </label>
      </div>
      {rows.length ? (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Email</th>
                <th scope="col">Action</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="is-strong">{e.personName}</td>
                  <td>{e.email}</td>
                  <td>
                    <Badge kind={e.action === 'blocked' ? 'doing' : 'done'}>{ACTION_LABEL[e.action]}</Badge>
                  </td>
                  <td>{new Date(e.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="shield" title="No injection events found">
          {SECUPROMPT_CONNECTED
            ? events.length
              ? 'Try clearing the search or the filter.'
              : 'Nobody has tried a prompt injection.'
            : "SecuPrompt isn't connected yet, so no events are being reported."}
        </Empty>
      )}
    </section>
  );
}
