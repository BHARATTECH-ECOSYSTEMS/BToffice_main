import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { CERTIFICATE_TYPES, toolById, type Person, type PersonRole, type PersonStatus, type PortalIconName, type SecurityEvent, type TaskStatus } from '../data';
import { managesPortal, useSession } from '../session';
import { formatDate, usePeopleById, usePortal } from '../store';
import { Badge, btnClass, BtnLabel, ConfirmDelete, Empty, initials, Modal, PageHead, PIcon, SearchField, Stat, useNotice } from '../ui';
import { InviteModal } from './People';

const STATUS_LABEL: Record<TaskStatus, string> = { todo: 'To do', doing: 'In progress', done: 'Done' };
const ROLE_LABEL: Record<PersonRole, string> = { admin: 'Admin', subadmin: 'Sub Admin', employee: 'Employee', intern: 'Intern' };
const PERSON_STATUS_LABEL: Record<PersonStatus, string> = { active: 'Active', inactive: 'Inactive', invited: 'Invited' };
const certName = (id: string) => CERTIFICATE_TYPES.find((c) => c.id === id)?.name ?? id;

// SecuPrompt reports these once it's connected; until then the panel shows that nothing is being reported.
const SECUPROMPT_CONNECTED = false;
const SECURITY_EVENTS: SecurityEvent[] = [];

export function Dashboard() {
  const session = useSession()!;
  return managesPortal(session.role) ? <AdminDashboard /> : <EmployeeDashboard />;
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

function EmployeeDashboard() {
  const { me, tasks, setTaskStatus, setPersonStatus } = usePortal();
  const [notice, notify] = useNotice();
  const mine = tasks.filter((t) => t.assigneeId === me.id);
  const done = mine.filter((t) => t.status === 'done').length;
  const doing = mine.filter((t) => t.status === 'doing').length;
  const progress = mine.length ? Math.round((done / mine.length) * 100) : 0;

  return (
    <>
      <PageHead title="Dashboard" sub="Your tasks, schedule and workspace tools in one place.">
        <div className="p-seg is-status" role="group" aria-label="My status">
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
        <HeadActions notify={notify} />
      </PageHead>
      {notice}
      <div className="p-stats">
        <Stat icon="target" label="My tasks" value={mine.length} />
        <Stat icon="check" label="Completed" value={done} tone="saffron" />
        <Stat icon="clock" label="In progress" value={doing} tone="tangerine" />
        <Stat icon="trend" label="Progress" value={`${progress}%`} tone="ink" />
      </div>
      <div className="p-split">
        <HrmsCard />
        <CalendarCard dueDates={mine.filter((t) => t.status !== 'done').map((t) => t.due)} />
      </div>
      <section className="p-card" aria-labelledby="my-tasks">
        <div className="p-card-head">
          <h2 id="my-tasks" className="p-card-title">
            My tasks
          </h2>
        </div>
        {mine.length ? (
          <ul className="p-tasks">
            {mine.map((t) => (
              <li key={t.id} className="p-task">
                <div>
                  <p className="p-task-title">{t.title}</p>
                  <p className="p-task-meta">Due {formatDate(t.due)}</p>
                </div>
                <label className="p-select-wrap">
                  <span className="sr-only">Status of {t.title}</span>
                  <select className="p-select" value={t.status} onChange={(e) => setTaskStatus(t.id, e.target.value as TaskStatus)}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="target" title="No tasks yet">
            Tasks your admin assigns to you will show up here.
          </Empty>
        )}
      </section>
    </>
  );
}

function AdminDashboard() {
  const { people, certificates } = usePortal();
  const [view, setView] = useState<'management' | 'analytics'>('management');
  const [notice, notify] = useNotice();
  const recent = certificates.filter((c) => Date.now() - new Date(c.date).getTime() < 30 * 864e5).length;
  return (
    <>
      <PageHead title="Dashboard" sub="Your team, certificates, tasks and security at a glance.">
        <div className="p-seg" role="group" aria-label="Dashboard view">
          {(
            [
              ['management', 'Management', 'grid'],
              ['analytics', 'Analytics', 'chart'],
            ] as const
          ).map(([id, label, icon]) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}>
              <PIcon name={icon} size={15} /> {label}
            </button>
          ))}
        </div>
        <HeadActions notify={notify} />
      </PageHead>
      {notice}
      <div className="p-stats">
        <Stat icon="award" label="Total certificates" value={certificates.length} />
        <Stat icon="check" label="Issued in the last 30 days" value={recent} tone="saffron" />
        <Stat icon="users" label="Total users" value={people.length} tone="tangerine" />
        <Stat icon="key" label="Active reset links" value={0} tone="ink" />
      </div>
      {view === 'management' ? (
        <>
          <div className="p-split">
            <HrmsCard />
            <CalendarCard dueDates={[]} />
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

function HrmsCard() {
  const hrms = toolById('hrms')!;
  return (
    <section className="p-card p-hrms" aria-labelledby="hrms">
      <div className="p-card-head">
        <span className="p-tile-icon">
          <PIcon name="external" />
        </span>
        <Badge kind="soft">HR management</Badge>
      </div>
      <h2 id="hrms" className="p-card-title">
        HRMS portal access
      </h2>
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
    </section>
  );
}

/** Opens a self-hosted tool, or says plainly that its address hasn't been set up yet. */
export function ToolButton({
  url,
  label,
  name,
  icon,
  variant = 'primary',
  wide = true,
}: {
  url: string;
  label: string;
  /** The tool's name, for screen readers when the label alone ("Open") doesn't say which tool. */
  name: string;
  icon?: PortalIconName;
  variant?: 'primary' | 'ghost';
  wide?: boolean;
}) {
  if (url) {
    return (
      <a className={btnClass(variant, { wide })} href={url} target="_blank" rel="noreferrer">
        <BtnLabel icon={icon} arrow={icon ? undefined : 'up-right'}>
          {label}
        </BtnLabel>
        <span className="sr-only">{name} (opens in a new tab)</span>
      </a>
    );
  }
  return (
    // the label stays visible so a card's two buttons can still be told apart; the card says it isn't connected yet
    <span className={`p-btn is-disabled ${wide ? 'is-wide' : ''}`} aria-disabled="true" title="Not connected yet: its address hasn't been set up">
      {icon && <PIcon name={icon} size={16} />}
      {label}
      <span className="sr-only"> for {name}, not connected yet</span>
    </span>
  );
}

/** Shown once on a card whose tool has no address yet (aria-hidden: each button already says so to screen readers). */
export function NotConnected() {
  return (
    <p className="p-not-connected" aria-hidden="true">
      <PIcon name="alert" size={14} /> Not connected yet
    </p>
  );
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function CalendarCard({ dueDates }: { dueDates: string[] }) {
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const label = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const due = useMemo(() => new Set(dueDates), [dueDates]);

  // Weeks start on Sunday. The grid is filled out to whole weeks with the neighbouring months' days, greyed out.
  const lead = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const prevDays = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
  const trail = (7 - ((lead + days) % 7)) % 7;
  const before = Array.from({ length: lead }, (_, i) => prevDays - lead + 1 + i);
  const after = Array.from({ length: trail }, (_, i) => i + 1);
  const iso = (d: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const isToday = (d: number) => offset === 0 && d === now.getDate();

  return (
    <section className="p-card p-cal" aria-labelledby="cal">
      <div className="p-card-head">
        <h2 id="cal" className="p-card-title">
          <PIcon name="calendar" /> Calendar &amp; schedules
        </h2>
        <div className="p-cal-nav">
          <button type="button" className="p-icon-btn is-flip" onClick={() => setOffset((o) => o - 1)} aria-label="Previous month">
            <PIcon name="chevron" />
          </button>
          <p className="p-cal-month" aria-live="polite">
            {label}
          </p>
          <button type="button" className="p-icon-btn" onClick={() => setOffset((o) => o + 1)} aria-label="Next month">
            <PIcon name="chevron" />
          </button>
        </div>
      </div>
      <div className="p-cal-grid" role="grid" aria-label={label}>
        {WEEKDAYS.map((w) => (
          <span key={w} className="p-cal-dow" role="columnheader">
            {w}
          </span>
        ))}
        {before.map((d) => (
          <span key={`p${d}`} className="p-cal-day is-other" aria-hidden="true">
            {d}
          </span>
        ))}
        {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
          <span key={d} role="gridcell" className={`p-cal-day ${isToday(d) ? 'is-today' : ''} ${due.has(iso(d)) ? 'has-due' : ''}`} aria-current={isToday(d) ? 'date' : undefined}>
            {d}
            {due.has(iso(d)) && <span className="sr-only"> (task due)</span>}
          </span>
        ))}
        {after.map((d) => (
          <span key={`n${d}`} className="p-cal-day is-other" aria-hidden="true">
            {d}
          </span>
        ))}
      </div>
    </section>
  );
}

function CertificatesPanel() {
  const { certificates } = usePortal();
  const byId = usePeopleById();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const rows = certificates
    .filter((c) => !query || certName(c.type).toLowerCase().includes(query) || byId.get(c.recipientId)?.name.toLowerCase().includes(query))
    .slice(0, 5);
  return (
    <section className="p-card" aria-labelledby="cert-mgmt">
      <div className="p-card-head">
        <div>
          <h2 id="cert-mgmt" className="p-card-title">
            Certificate management
          </h2>
          <p className="p-muted">Manage and generate certificates. The five most recent are shown; the full history is on Certificates.</p>
        </div>
        <Link to="/portal/certificates" className={btnClass('primary')}>
          <BtnLabel icon="plus">Generate certificate</BtnLabel>
        </Link>
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
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
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
        <button type="button" className={btnClass('primary')} onClick={() => setInviting(true)}>
          <BtnLabel icon="plus">Add user</BtnLabel>
        </button>
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
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
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
          onInvite={(name, email, role) => {
            invitePerson(name, email, role);
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
  const [deleting, setDeleting] = useState(false);

  if (deleting) {
    return (
      <ConfirmDelete
        what={person.name}
        onClose={onClose}
        onConfirm={() => {
          removePerson(person.id);
          notify(`${person.name} was deleted.`);
        }}
      />
    );
  }
  return (
    <Modal
      eyebrow="Manage"
      title={person.name}
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
          <button type="button" className={btnClass('danger')} onClick={() => setDeleting(true)}>
            <BtnLabel icon="trash">
              Delete<span className="sr-only"> account</span>
            </BtnLabel>
          </button>
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
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="is-strong">{t.title}</td>
                  <td>{byId.get(t.assigneeId)?.name ?? 'Removed user'}</td>
                  <td>{formatDate(t.due)}</td>
                  <td>
                    <Badge kind={t.status}>{STATUS_LABEL[t.status]}</Badge>
                  </td>
                  <td className="is-end">
                    {canDelete && (
                      <button type="button" className="p-icon-btn is-danger" onClick={() => (removeTask(t.id), notify('Task removed.'))} aria-label={`Remove task: ${t.title}`}>
                        <PIcon name="trash" size={16} />
                      </button>
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
      eyebrow="Task"
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
        <label className="p-select-wrap p-filter">
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
