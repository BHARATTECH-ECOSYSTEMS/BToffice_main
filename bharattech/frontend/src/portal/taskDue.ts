import type { TaskStatus } from './data';

/** Today as YYYY-MM-DD on this device's calendar, the same calendar the due day was picked on. */
export function localToday(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Whole calendar days from `today` to a YYYY-MM-DD day; negative once it has passed. */
export function daysUntil(day: string, today = localToday()) {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5);
}

/** How an open task's due day stands ("Overdue by 2 days", "Due today", "3 days left"); null when done or undated. */
export function dueFlag(task: { due: string; status: TaskStatus }, today = localToday()): { label: string; late: boolean } | null {
  if (task.status === 'done' || !task.due) return null;
  const days = daysUntil(task.due, today);
  if (days < 0) return { label: `Overdue by ${-days} ${days === -1 ? 'day' : 'days'}`, late: true };
  if (days === 0) return { label: 'Due today', late: false };
  if (days === 1) return { label: 'Due tomorrow', late: false };
  return { label: `${days} days left`, late: false };
}
