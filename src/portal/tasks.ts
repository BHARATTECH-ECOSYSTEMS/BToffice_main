import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';
import type { Task, TaskStatus } from './data';
import type { AccountRole, DirectoryPerson } from './people';

/**
 * Tasks from the backend (/api/tasks): the signed-in person's own (`mine`) or the whole team's (`team`, admins and sub
 * admins), plus giving, changing and deleting tasks, attaching a brief and handing in work. The backend's rules:
 * admins and superadmins change any task, a sub admin only the tasks they gave; tasks go to employees and interns;
 * handing in work completes the task. The backend checks every change itself.
 */

export const TASK_PRIORITIES = ['Low', 'Normal', 'Medium', 'High'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/** A file on a task: one kept by the backend (`path`, fetched with the sign-in) or a web link (`url`). */
export type TaskFile = { name: string; path: string } | { name: string; url: string };
export type TaskSubmission = TaskFile & { id: string; notes?: string; at: string };

/** The board's fields (data.ts Task) plus what the backend keeps. `due` is '' when the task has no due date. */
export interface PortalTask extends Task {
  description: string;
  priority: TaskPriority;
  assigneeName: string;
  assigneeEmail: string;
  givenBy?: { name: string; email: string };
  projectFile?: TaskFile;
  submissions: TaskSubmission[];
}

const BOARD_STATUS: Record<string, TaskStatus> = { pending: 'todo', 'in-progress': 'doing', completed: 'done' };
const BACKEND_STATUS: Record<TaskStatus, string> = { todo: 'pending', doing: 'in-progress', done: 'completed' };
export const backendStatus = (status: TaskStatus) => BACKEND_STATUS[status];

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const record = (value: unknown) => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined);

/** A backend file address becomes an API path; a web link stays a link; anything else (javascript:, data:) is dropped. */
function taskFile(address: unknown, name: unknown): TaskFile | undefined {
  const at = text(address);
  if (!at) return undefined;
  const label = text(name) ?? 'File';
  if (at.startsWith('/api/tasks/')) return { name: label, path: at.slice('/api'.length) };
  return /^https?:\/\//i.test(at) ? { name: label, url: at } : undefined;
}

export function toTasks(raw: unknown): PortalTask[] {
  if (!Array.isArray(raw)) throw new ApiError('unavailable', 'The backend’s answer isn’t a list of tasks.');
  const rows: PortalTask[] = [];
  for (const entry of raw) {
    const t = record(entry);
    const id = text(t?._id);
    const to = record(t?.assignedTo);
    const toId = text(to?._id);
    // one broken record shouldn't take the whole board down
    if (!t || !id || !to || !toId) continue;
    const by = record(t.assignedBy);
    const project = record(t.projectFile);
    const projectFile = taskFile(project?.url, project?.fileName);
    const submissions: TaskSubmission[] = [];
    for (const s of Array.isArray(t.submissions) ? t.submissions : []) {
      const sub = record(s);
      const file = taskFile(sub?.fileUrl, sub?.fileName);
      if (!sub || !file) continue;
      submissions.push({ id: text(sub._id) ?? String(submissions.length), ...file, ...(text(sub.notes) ? { notes: text(sub.notes) } : {}), at: text(sub.submittedAt) ?? '' });
    }
    rows.push({
      id,
      title: text(t.title) ?? 'Untitled task',
      description: text(t.description) ?? '',
      status: BOARD_STATUS[String(t.status)] ?? 'todo',
      priority: TASK_PRIORITIES.find((p) => p === t.priority) ?? 'Normal',
      // the backend keeps a due day as that day at midnight UTC, so the UTC date is the day that was picked
      due: /^\d{4}-\d{2}-\d{2}/.test(text(t.dueDate) ?? '') ? text(t.dueDate)!.slice(0, 10) : '',
      assigneeId: toId,
      assigneeName: text(to.fullName) ?? text(to.email) ?? 'Unknown',
      assigneeEmail: text(to.email) ?? '',
      givenBy: by ? { name: text(by.fullName) ?? text(by.email) ?? 'Unknown', email: text(by.email) ?? '' } : undefined,
      projectFile,
      submissions,
    });
  }
  return rows;
}

/** Mirrors the backend: admins and superadmins change any task, a sub admin only the ones they gave. */
export function canChangeTask(me: { accountRole: AccountRole; email: string }, task: PortalTask) {
  if (me.accountRole === 'Superadmin' || me.accountRole === 'Admin') return true;
  return me.accountRole === 'Subadmin' && task.givenBy?.email.toLowerCase() === me.email.toLowerCase();
}

/** Who a task can go to: employees and interns whose accounts aren't blocked. */
export const assignablePeople = (people: DirectoryPerson[]) => people.filter((p) => (p.accountRole === 'Employee' || p.accountRole === 'Intern') && p.status === 'active');

// What the backend keeps (utils/taskFiles.js there checks the content too); the picker offers only these.
export const TASK_FILE_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.zip';
export const TASK_FILE_MAX_MB = 20;

/** Why this file can't be attached, before it is sent; '' when it can. */
export function taskFileProblem(file: { name: string; size: number }) {
  const ext = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';
  if (!TASK_FILE_ACCEPT.split(',').includes(ext)) return 'Attach a PDF, Word, Excel, PowerPoint, image (PNG, JPG, GIF, WebP) or ZIP file.';
  if (file.size > TASK_FILE_MAX_MB * 1024 * 1024) return `The file is over ${TASK_FILE_MAX_MB} MB.`;
  return '';
}

export interface TaskDraft {
  title: string;
  description: string;
  assigneeId: string;
  /** yyyy-mm-dd, or '' for none */
  due: string;
  priority: TaskPriority;
}

export type TasksState = { kind: 'off' } | { kind: 'loading' } | { kind: 'ready'; tasks: PortalTask[] } | { kind: 'error'; error: ApiError };

const asApiError = (error: unknown) => (error instanceof ApiError ? error : new ApiError('unavailable'));

// a 20 MB file on a slow connection takes a while
const UPLOAD_TIMEOUT_MS = 120_000;

/**
 * Loads the tasks; `off` with the demo sign-in. The actions save to the backend, then load the list again, so the
 * page always shows what the backend actually stored. They throw an ApiError when the backend refuses.
 */
export function useTasks(scope: 'mine' | 'team') {
  const [state, setState] = useState<TasksState>(api ? { kind: 'loading' } : { kind: 'off' });

  const load = useCallback(
    async (quiet = false) => {
      if (!api) return;
      if (!quiet) setState({ kind: 'loading' });
      try {
        setState({ kind: 'ready', tasks: toTasks(await api.get<unknown>(scope === 'team' ? '/tasks/assigned' : '/tasks')) });
      } catch (error) {
        setState({ kind: 'error', error: asApiError(error) });
      }
    },
    [scope],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (change: () => Promise<unknown>) => {
      try {
        await change();
      } catch (error) {
        throw asApiError(error);
      } finally {
        await load(true);
      }
    },
    [load],
  );

  const fields = (draft: TaskDraft) => ({
    title: draft.title,
    description: draft.description,
    assignedTo: draft.assigneeId,
    dueDate: draft.due || null,
    priority: draft.priority,
  });
  const form = (file: File, notes?: string) => {
    const body = new FormData();
    if (notes) body.append('notes', notes);
    body.append('file', file);
    return body;
  };

  return {
    state,
    retry: () => void load(),
    /** Gives the task; resolves with its id, so a brief can be attached to it next. */
    create: async (draft: TaskDraft) => {
      let id = '';
      await act(async () => {
        id = String((await api!.post<{ _id?: unknown }>('/tasks', fields(draft)))._id ?? '');
      });
      return id;
    },
    update: (id: string, draft: TaskDraft & { status: TaskStatus }) => act(() => api!.patch(`/tasks/${id}`, { ...fields(draft), status: backendStatus(draft.status) })),
    setStatus: (id: string, status: TaskStatus) => act(() => api!.patch(`/tasks/${id}/status`, { status: backendStatus(status) })),
    remove: (id: string) => act(() => api!.del(`/tasks/${id}`)),
    attachBrief: (id: string, file: File) => act(() => api!.postForm(`/tasks/${id}/upload`, form(file), { timeoutMs: UPLOAD_TIMEOUT_MS })),
    handIn: (id: string, file: File, notes: string) => act(() => api!.postForm(`/tasks/${id}/submission`, form(file, notes.trim()), { timeoutMs: UPLOAD_TIMEOUT_MS })),
    openFile: async (path: string) => {
      try {
        return await api!.getFile(path);
      } catch (error) {
        throw asApiError(error);
      }
    },
  };
}

export type TasksApi = ReturnType<typeof useTasks>;
