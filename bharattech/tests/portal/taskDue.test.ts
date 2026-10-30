import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysUntil, dueFlag } from '../../src/portal/taskDue';
import { countByStatus, toTasks } from '../../src/portal/tasks';

// Owner's 3A (2026-10-25): every open task says how its due day stands, Task management filters by status, and a
// finished task says when it was finished.

const TODAY = '2026-10-25';

test('days until a due day count whole calendar days, past days negative', () => {
  assert.equal(daysUntil('2026-10-25', TODAY), 0);
  assert.equal(daysUntil('2026-10-26', TODAY), 1);
  assert.equal(daysUntil('2026-11-01', TODAY), 7);
  assert.equal(daysUntil('2026-10-24', TODAY), -1);
  assert.equal(daysUntil('2025-10-25', TODAY), -365);
});

test('an open task says how its due day stands', () => {
  const flag = (due: string) => dueFlag({ due, status: 'todo' }, TODAY);
  assert.deepEqual(flag('2026-10-22'), { label: 'Overdue by 3 days', late: true });
  assert.deepEqual(flag('2026-10-24'), { label: 'Overdue by 1 day', late: true });
  assert.deepEqual(flag('2026-10-25'), { label: 'Due today', late: false });
  assert.deepEqual(flag('2026-10-26'), { label: 'Due tomorrow', late: false });
  assert.deepEqual(flag('2026-10-30'), { label: '5 days left', late: false });
  assert.deepEqual(dueFlag({ due: '2026-10-22', status: 'doing' }, TODAY), { label: 'Overdue by 3 days', late: true });
});

test('finished tasks and tasks without a due day get no flag', () => {
  assert.equal(dueFlag({ due: '2026-10-22', status: 'done' }, TODAY), null);
  assert.equal(dueFlag({ due: '', status: 'todo' }, TODAY), null);
});

test('a finished task carries when it was finished; an open one and an old finished one carry none', () => {
  const base = { _id: 't1', title: 'Notes', assignedTo: { _id: 'u1', fullName: 'Asha' } };
  const [done, open, old] = toTasks([
    { ...base, status: 'completed', completedAt: '2026-10-24T09:30:00.000Z' },
    // a reopened task whose old finish time came along anyway still shows none
    { ...base, _id: 't2', status: 'pending', completedAt: '2026-10-20T09:30:00.000Z' },
    { ...base, _id: 't3', status: 'completed' },
  ]);
  assert.equal(done.completedAt, '2026-10-24T09:30:00.000Z');
  assert.equal(open.completedAt, undefined);
  assert.equal(old.completedAt, undefined);
});

test('the status filter counts each status', () => {
  const tasks = [{ status: 'todo' }, { status: 'done' }, { status: 'todo' }, { status: 'doing' }] as const;
  assert.deepEqual(countByStatus(tasks), { all: 4, todo: 2, doing: 1, done: 1 });
  assert.deepEqual(countByStatus([]), { all: 0, todo: 0, doing: 0, done: 0 });
});
