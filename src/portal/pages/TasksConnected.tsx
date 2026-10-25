import { useState } from 'react';
import { type TaskStatus } from '../data';
import type { ApiError, ApiErrorKind } from '../api';
import { BUSY_MESSAGE } from '../api';
import type { DirectoryPerson } from '../people';
import { formatDate } from '../store';
import {
  assignablePeople,
  canChangeTask,
  countByStatus,
  TASK_FILE_ACCEPT,
  TASK_FILE_MAX_MB,
  TASK_PRIORITIES,
  taskFileProblem,
  type PortalTask,
  type TaskDraft,
  type TaskFile,
  type TaskPriority,
  type TasksApi,
} from '../tasks';
import { dueFlag } from '../taskDue';
import { Badge, btnClass, BtnLabel, Empty, Modal, SearchField, useListFlip } from '../ui';

/**
 * Tasks on the backend's records (src/portal/tasks.ts): the managers' Task management panel, the window a task opens
 * in (details, the brief, work handed in, and the changes the signed-in person may make), and the form that gives or
 * edits a task. The backend checks every change; these only offer what it will accept.
 */

export const STATUS_LABEL: Record<TaskStatus, string> = { todo: 'To do', doing: 'In progress', done: 'Done' };

const TASK_FAILED: Record<ApiErrorKind, string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'Your role can’t make that change to this task.',
  'not-found': 'That task isn’t there any more. The list has been refreshed.',
  conflict: 'That clashes with another change. Try again.',
  'bad-request': 'That wasn’t accepted.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the task records, so nothing was changed. Try again in a moment.',
};
/** The backend's own words for refused input are more useful than a generic line. */
export const taskFailedMessage = (e: ApiError) => (e.kind === 'bad-request' && e.message !== e.kind ? e.message : TASK_FAILED[e.kind]);

/** Who is looking: their account role and email decide what they may change; `doer` tasks are their own. */
export interface TaskViewer {
  accountRole: DirectoryPerson['accountRole'];
  email: string;
}

const isDoer = (viewer: TaskViewer, task: PortalTask) => task.assigneeEmail.toLowerCase() === viewer.email.toLowerCase();
const dueText = (due: string) => (due ? formatDate(due) : 'No due date');

/** "Overdue by 2 days", "Due today", "3 days left" for an open task with a due day; nothing otherwise. */
export function DueFlag({ task }: { task: { due: string; status: TaskStatus } }) {
  const flag = dueFlag(task);
  return flag && <span className={`p-due-flag${flag.late ? ' is-late' : ''}`}>{flag.label}</span>;
}

/** Opens a task file: a web link in a new tab, a stored file downloaded with the sign-in. */
function FileButton({ file, tasks, notify }: { file: TaskFile; tasks: TasksApi; notify: (t: string) => void }) {
  const [busy, setBusy] = useState(false);
  if ('url' in file) {
    return (
      <a className={btnClass('ghost', { small: true })} href={file.url} target="_blank" rel="noreferrer">
        <BtnLabel arrow="up-right">{file.name}</BtnLabel>
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }
  const download = async () => {
    setBusy(true);
    try {
      const href = URL.createObjectURL(await tasks.openFile(file.path));
      const a = document.createElement('a');
      a.href = href;
      a.download = file.name;
      a.click();
      // the download has started by now; the address only needs to live that long
      window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch (error) {
      notify(taskFailedMessage(error as ApiError));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className={btnClass('ghost', { small: true })} onClick={() => void download()} disabled={busy}>
      <BtnLabel icon="download">{busy ? 'Downloading…' : file.name}</BtnLabel>
    </button>
  );
}

/** A file picker that checks the pick before anything is sent. */
function FilePick({ label, onPick, disabled }: { label: string; onPick: (file: File | null, problem: string) => void; disabled?: boolean }) {
  return (
    <label className="p-field">
      <span>
        {label} (PDF, Word, Excel, PowerPoint, image or ZIP, up to {TASK_FILE_MAX_MB} MB)
      </span>
      <input
        type="file"
        accept={TASK_FILE_ACCEPT}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onPick(file, file ? taskFileProblem(file) : '');
        }}
      />
    </label>
  );
}

/**
 * A task's window. Everyone who can see it gets the details and its files; the person doing it hands in work (which
 * completes it); whoever may change it edits, attaches the brief or deletes it.
 */
export function TaskWindow({
  task,
  tasks,
  viewer,
  people,
  onClose,
  notify,
}: {
  task: PortalTask;
  tasks: TasksApi;
  viewer: TaskViewer;
  /** The directory, for handing the task to someone else; unset where it isn't loaded (the employee's dashboard). */
  people?: DirectoryPerson[];
  onClose: () => void;
  notify: (t: string) => void;
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view');
  const [file, setFile] = useState<File | null>(null);
  // a file input can't be emptied from React; a new key gives a fresh one once its file was sent
  const [pickKey, setPickKey] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const changeable = canChangeTask(viewer, task);
  const doer = isDoer(viewer, task);

  const run = async (work: () => Promise<unknown>, done: string, close = false) => {
    setBusy(true);
    setError('');
    try {
      await work();
      notify(done);
      setFile(null);
      setPickKey((k) => k + 1);
      setNotes('');
      if (close) onClose();
    } catch (e) {
      setError(taskFailedMessage(e as ApiError));
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'edit' && people) {
    return (
      <TaskForm
        title={`Edit “${task.title}”`}
        people={people}
        initial={task}
        onClose={() => setMode('view')}
        onSave={async (draft) => {
          await tasks.update(task.id, draft);
          notify('Task saved.');
          setMode('view');
        }}
      />
    );
  }
  if (mode === 'delete') {
    return (
      <Modal
        title={`Delete “${task.title}”?`}
        icon="alert"
        onClose={() => setMode('view')}
        onSubmit={() => void run(() => tasks.remove(task.id), 'Task deleted.', true)}
        footer={
          <>
            <button type="button" className={btnClass('ghost')} onClick={() => setMode('view')}>
              <BtnLabel>Cancel</BtnLabel>
            </button>
            <button type="submit" className={btnClass('primary')} disabled={busy}>
              <BtnLabel>{busy ? 'Deleting…' : 'Delete task'}</BtnLabel>
            </button>
          </>
        }
      >
        <p>The task, its brief and the work handed in for it are removed for everyone. This can’t be undone from the portal.</p>
        {error && (
          <p className="p-error" role="alert">
            {error}
          </p>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      title={task.title}
      icon="clipboard"
      onClose={onClose}
      footer={
        <>
          {changeable && (
            <button type="button" className={btnClass('ghost')} onClick={() => (setError(''), setMode('delete'))} disabled={busy}>
              <BtnLabel>Delete</BtnLabel>
            </button>
          )}
          {changeable && people && (
            <button type="button" className={btnClass('ghost')} onClick={() => setMode('edit')} disabled={busy}>
              <BtnLabel icon="edit">Edit</BtnLabel>
            </button>
          )}
          <button type="button" className={btnClass('primary')} onClick={onClose}>
            <BtnLabel>Close</BtnLabel>
          </button>
        </>
      }
    >
      <dl className="p-file-facts p-task-facts">
        <div>
          <dt>Status</dt>
          <dd>
            <Badge kind={task.status}>{STATUS_LABEL[task.status]}</Badge>
          </dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>{task.priority}</dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd>
            {dueText(task.due)} <DueFlag task={task} />
          </dd>
        </div>
        {task.status === 'done' && task.completedAt && (
          <div>
            <dt>Finished</dt>
            <dd>{new Date(task.completedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</dd>
          </div>
        )}
        <div>
          <dt>For</dt>
          <dd>{task.assigneeName}</dd>
        </div>
        {task.givenBy && (
          <div>
            <dt>Given by</dt>
            <dd>{task.givenBy.name}</dd>
          </div>
        )}
      </dl>
      <p className="p-task-text">{task.description || <span className="p-dim">No description.</span>}</p>

      <section className="p-task-part" aria-label="Brief">
        <h3 className="p-menu-label">Brief</h3>
        {task.projectFile ? <FileButton file={task.projectFile} tasks={tasks} notify={notify} /> : <p className="p-dim">No brief attached.</p>}
        {changeable && (
          <div className="p-task-upload">
            <FilePick key={pickKey} label={task.projectFile ? 'Replace the brief' : 'Attach a brief'} disabled={busy} onPick={(f, problem) => (setFile(problem ? null : f), setError(problem))} />
            <button
              type="button"
              className={btnClass('light', { small: true })}
              disabled={busy || !file}
              onClick={() => file && void run(() => tasks.attachBrief(task.id, file), 'Brief attached.')}
            >
              <BtnLabel icon="upload">{busy ? 'Uploading…' : 'Attach'}</BtnLabel>
            </button>
          </div>
        )}
      </section>

      <section className="p-task-part" aria-label="Work handed in">
        <h3 className="p-menu-label">Work handed in</h3>
        {task.submissions.length ? (
          <ul className="p-task-subs">
            {task.submissions.map((s) => (
              <li key={s.id}>
                <FileButton file={s} tasks={tasks} notify={notify} />
                <span className="p-dim">{s.at ? new Date(s.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</span>
                {s.notes && <p className="p-task-text">{s.notes}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-dim">Nothing handed in yet.</p>
        )}
        {doer && (
          <div className="p-task-upload">
            <FilePick key={pickKey} label="Hand in your work" disabled={busy} onPick={(f, problem) => (setFile(problem ? null : f), setError(problem))} />
            <label className="p-field">
              <span>Notes (optional)</span>
              <textarea value={notes} rows={2} maxLength={2000} disabled={busy} onChange={(e) => setNotes(e.target.value)} placeholder="Anything they should know" />
            </label>
            <button
              type="button"
              className={btnClass('primary', { small: true })}
              disabled={busy || !file}
              onClick={() => file && void run(() => tasks.handIn(task.id, file, notes), 'Work handed in. The task is done.')}
            >
              <BtnLabel icon="upload">{busy ? 'Uploading…' : 'Hand in'}</BtnLabel>
            </button>
            <p className="p-field-hint">Handing in work marks the task done.</p>
          </div>
        )}
      </section>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

/** Gives a task, or edits one (with its status). Keeps what was typed when the backend refuses it. */
function TaskForm({
  title,
  people,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  people: DirectoryPerson[];
  initial?: PortalTask;
  onClose: () => void;
  onSave: (draft: TaskDraft & { status: TaskStatus }, brief: File | null) => Promise<void>;
}) {
  const choices = assignablePeople(people);
  // someone handed a task earlier may have left or changed role; they stay pickable on their own task
  const options = initial && !choices.some((p) => p.id === initial.assigneeId) ? [{ id: initial.assigneeId, name: initial.assigneeName }, ...choices] : choices;
  const [name, setName] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [who, setWho] = useState(initial?.assigneeId ?? options[0]?.id ?? '');
  const [due, setDue] = useState(initial?.due ?? '');
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'Normal');
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'todo');
  const [brief, setBrief] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    if (!name.trim()) return setError('Give the task a title.');
    if (!who) return setError('Pick who the task is for.');
    setSaving(true);
    setError('');
    try {
      await onSave({ title: name.trim(), description: description.trim(), assigneeId: who, due, priority, status }, brief);
      onClose();
    } catch (e) {
      setError(taskFailedMessage(e as ApiError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={title}
      icon="clipboard"
      onClose={onClose}
      onSubmit={() => void save()}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')} disabled={saving}>
            <BtnLabel>{saving ? 'Saving…' : initial ? 'Save' : 'Create task'}</BtnLabel>
          </button>
        </>
      }
    >
      <label className="p-field">
        <span>Title</span>
        <input value={name} maxLength={200} onChange={(e) => (setName(e.target.value), setError(''))} placeholder="What needs doing?" autoFocus />
      </label>
      <label className="p-field">
        <span>Description (optional)</span>
        <textarea value={description} rows={3} maxLength={5000} onChange={(e) => setDescription(e.target.value)} placeholder="Details, links, what done looks like" />
      </label>
      <label className="p-field">
        <span>Assign to</span>
        <select className="p-select" value={who} onChange={(e) => (setWho(e.target.value), setError(''))}>
          {options.length === 0 && <option value="">No employees or interns yet</option>}
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="p-field">
        <span>Due date (optional)</span>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      </label>
      <label className="p-field">
        <span>Priority</span>
        <select className="p-select" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      {initial ? (
        <label className="p-field">
          <span>Status</span>
          <select className="p-select" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <FilePick label="Brief (optional)" onPick={(f, problem) => (setBrief(problem ? null : f), setError(problem))} />
      )}
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

/** The managers' list of every task, with giving a task; a task opens in its window from its title. */
export function ConnectedTasksPanel({
  tasks,
  people,
  onOpen,
  notify,
}: {
  tasks: TasksApi;
  people?: DirectoryPerson[];
  onOpen: (task: PortalTask) => void;
  notify: (t: string) => void;
}) {
  const { state } = tasks;
  const [q, setQ] = useState('');
  const [shown, setShown] = useState<TaskStatus | 'all'>('all');
  const [creating, setCreating] = useState(false);
  const list = state.kind === 'ready' ? state.tasks : [];
  const counts = countByStatus(list);
  const query = q.trim().toLowerCase();
  const rows = list.filter((t) => (shown === 'all' || t.status === shown) && (!query || t.title.toLowerCase().includes(query) || t.assigneeName.toLowerCase().includes(query)));
  const taskRows = useListFlip<HTMLTableSectionElement>(`${shown}|${query}|${rows.map((t) => t.id).join()}`);

  return (
    <section className="p-card" aria-labelledby="task-mgmt" aria-busy={state.kind === 'loading' || undefined}>
      <div className="p-card-head">
        <div>
          <h2 id="task-mgmt" className="p-card-title">
            Task management
          </h2>
          <p className="p-muted">Give and track tasks for employees and interns. Open a task to see its brief and the work handed in.</p>
        </div>
        {/* giving a task needs the directory, to pick who it's for */}
        {people && (
          <button type="button" className={btnClass('primary')} onClick={() => setCreating(true)}>
            <BtnLabel icon="plus">Create task</BtnLabel>
          </button>
        )}
      </div>
      <div className="p-toolbar is-split">
        <div className="p-chips" role="group" aria-label="Show status">
          {(['all', 'todo', 'doing', 'done'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={shown === s} onClick={() => setShown(s)}>
              {s === 'all' ? 'All' : STATUS_LABEL[s]} <span className="p-chip-count">{counts[s]}</span>
            </button>
          ))}
        </div>
        <SearchField value={q} onChange={setQ} label="Search tasks" placeholder="Search by task or person" />
      </div>
      {state.kind === 'loading' ? (
        <p className="p-muted" role="status">
          Loading the tasks…
        </p>
      ) : state.kind === 'error' ? (
        <div role="alert">
          <Empty icon="alert" title="The tasks didn’t load">
            {TASK_FAILED[state.error.kind]}
          </Empty>
          {state.error.kind !== 'signed-out' && (
            <button type="button" className={btnClass('light', { small: true })} onClick={tasks.retry}>
              <BtnLabel icon="refresh">Try again</BtnLabel>
            </button>
          )}
        </div>
      ) : rows.length ? (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th scope="col">Task</th>
                <th scope="col">Assigned to</th>
                <th scope="col">Due</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody ref={taskRows}>
              {rows.map((t) => (
                <tr key={t.id} data-flip={t.id}>
                  <td className="is-strong">
                    <button type="button" className="p-link-btn" aria-haspopup="dialog" onClick={() => onOpen(t)}>
                      {t.title}
                    </button>
                  </td>
                  <td>{t.assigneeName}</td>
                  <td>
                    {dueText(t.due)}
                    <DueFlag task={t} />
                  </td>
                  <td>{t.priority}</td>
                  <td>
                    <Badge kind={t.status}>{STATUS_LABEL[t.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="clipboard" title={list.length ? 'No tasks found' : 'No tasks yet'}>
          {list.length ? (shown === 'all' ? 'Try clearing the search.' : 'Try another status, or clear the search.') : 'Click "Create task" to give one.'}
        </Empty>
      )}
      {creating && people && (
        <TaskForm
          title="Create task"
          people={people}
          onClose={() => setCreating(false)}
          onSave={async (draft, brief) => {
            const id = await tasks.create(draft);
            const to = people.find((p) => p.id === draft.assigneeId)?.name ?? 'them';
            if (!brief || !id) return notify(`Task given to ${to}.`);
            try {
              await tasks.attachBrief(id, brief);
              notify(`Task given to ${to}, with its brief.`);
            } catch (e) {
              // the task exists; only the brief is missing, and it can be attached from the task's window
              notify(`Task given to ${to}, but the brief didn’t upload: ${taskFailedMessage(e as ApiError)} Attach it from the task.`);
            }
          }}
        />
      )}
    </section>
  );
}
