import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignablePeople, backendStatus, canChangeTask, taskFileProblem, toTasks } from '../../src/portal/tasks';
import { ApiError } from '../../src/portal/api';
import type { DirectoryPerson } from '../../src/portal/people';

// One task as the local backend returns it (GET /api/tasks/assigned), with a stored brief and a linked submission
const raw = {
  _id: '6a1f00000000000000000001',
  id: '6a1f00000000000000000001',
  title: 'Write the onboarding notes',
  description: 'Two pages.',
  status: 'in-progress',
  assignedBy: { _id: '6a1f0000000000000000000a', fullName: 'Test Admin', email: 'test.admin@example.test', role: 'Admin' },
  assignedTo: { _id: '6a1f0000000000000000000b', fullName: 'Test Employee', email: 'test.employee@example.test', role: 'Employee' },
  assignedEmail: 'test.employee@example.test',
  assignedRole: 'Employee',
  createdBy: 'admin',
  dueDate: '2026-10-30T00:00:00.000Z',
  priority: 'High',
  projectFile: { url: '/api/tasks/6a1f00000000000000000001/files/6a1f000000000000000000f1', fileName: 'brief.pdf', uploadedAt: '2026-10-23T09:00:00.000Z', contentType: 'application/pdf', size: 1200 },
  fileUrl: '/api/tasks/6a1f00000000000000000001/files/6a1f000000000000000000f1',
  submissions: [{ _id: 's1', fileUrl: 'https://drive.example.test/report.pdf', fileName: 'report.pdf', notes: 'First draft', submittedAt: '2026-10-24T10:00:00.000Z' }],
  createdAt: '2026-10-23T09:00:00.000Z',
  updatedAt: '2026-10-24T10:00:00.000Z',
};

test("the backend's task becomes what the dashboard shows", () => {
  const [task] = toTasks([raw]);
  assert.equal(task.id, '6a1f00000000000000000001');
  assert.equal(task.title, 'Write the onboarding notes');
  assert.equal(task.description, 'Two pages.');
  assert.equal(task.status, 'doing');
  assert.equal(task.priority, 'High');
  assert.equal(task.due, '2026-10-30');
  assert.equal(task.assigneeId, '6a1f0000000000000000000b');
  assert.equal(task.assigneeName, 'Test Employee');
  assert.equal(task.assigneeEmail, 'test.employee@example.test');
  assert.deepEqual(task.givenBy, { name: 'Test Admin', email: 'test.admin@example.test' });
});

test('a stored file is fetched through the API with the sign-in; a web link opens as it is', () => {
  const [task] = toTasks([raw]);
  assert.deepEqual(task.projectFile, { name: 'brief.pdf', path: '/tasks/6a1f00000000000000000001/files/6a1f000000000000000000f1' });
  assert.deepEqual(task.submissions, [{ id: 's1', name: 'report.pdf', url: 'https://drive.example.test/report.pdf', notes: 'First draft', at: '2026-10-24T10:00:00.000Z' }]);
});

test('the three backend statuses map to the board columns and back', () => {
  for (const [backend, board] of [
    ['pending', 'todo'],
    ['in-progress', 'doing'],
    ['completed', 'done'],
  ] as const) {
    assert.equal(toTasks([{ ...raw, status: backend }])[0].status, board);
    assert.equal(backendStatus(board), backend);
  }
});

test('a task without a due date has an empty one, and no project document is none', () => {
  const [task] = toTasks([{ ...raw, dueDate: null, projectFile: null, fileUrl: null }]);
  assert.equal(task.due, '');
  assert.equal(task.projectFile, undefined);
});

test('an old link that is not a web address is never offered', () => {
  const [task] = toTasks([{ ...raw, projectFile: { url: 'javascript:alert(1)', fileName: 'x' }, submissions: [{ _id: 's2', fileUrl: 'data:text/html,hi', fileName: 'y' }] }]);
  assert.equal(task.projectFile, undefined);
  assert.deepEqual(task.submissions, []);
});

test('a broken entry is skipped; an answer that is not a list is an error', () => {
  assert.equal(toTasks([raw, { title: 'no id' }, { ...raw, _id: 'x2', assignedTo: null }]).length, 1);
  assert.throws(() => toTasks({ tasks: [] }), ApiError);
});

const me = (accountRole: DirectoryPerson['accountRole'], email = 'me@example.test') => ({ accountRole, email });

test('admins and superadmins change any task; a sub admin only the tasks they gave; others none', () => {
  const [task] = toTasks([raw]);
  assert.equal(canChangeTask(me('Superadmin'), task), true);
  assert.equal(canChangeTask(me('Admin'), task), true);
  assert.equal(canChangeTask(me('Subadmin'), task), false);
  assert.equal(canChangeTask(me('Subadmin', 'test.admin@example.test'), task), true);
  assert.equal(canChangeTask(me('Employee', 'test.employee@example.test'), task), false);
});

test('tasks can be given to employees and interns only', () => {
  const person = (accountRole: DirectoryPerson['accountRole'], status: DirectoryPerson['status'] = 'active') =>
    ({ id: accountRole + status, name: accountRole, email: `${accountRole}@x.test`, accountRole, role: 'employee', roleLabel: accountRole, status }) as DirectoryPerson;
  const names = assignablePeople([person('Superadmin'), person('Admin'), person('Subadmin'), person('Employee'), person('Intern'), person('Employee', 'inactive')]).map((p) => p.id);
  assert.deepEqual(names, ['Employeeactive', 'Internactive']);
});

test('a file is checked before it is sent: only the kinds the backend keeps, up to 20 MB', () => {
  assert.equal(taskFileProblem({ name: 'Brief.PDF', size: 1000 }), '');
  assert.equal(taskFileProblem({ name: 'photo.jpeg', size: 20 * 1024 * 1024 }), '');
  assert.match(taskFileProblem({ name: 'setup.exe', size: 10 }), /PDF, Word/);
  assert.match(taskFileProblem({ name: 'no-extension', size: 10 }), /PDF, Word/);
  assert.match(taskFileProblem({ name: 'big.zip', size: 20 * 1024 * 1024 + 1 }), /20 MB/);
});
