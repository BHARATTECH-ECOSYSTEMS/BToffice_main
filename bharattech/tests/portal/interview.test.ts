import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, BUSY_MESSAGE } from '../../src/portal/api';
import { INTERVIEW_LAUNCH_PATH, launchAddress, openInterviewTool, type LaunchTab } from '../../src/portal/interview';

// Step 14 Part 3 (owner's 1A 2A): HR OPS → Interview opens OpenInterviewer in a new tab, signed in, for Admins and
// Super Admins. The backend's pass works once for 60 seconds, so the tab is opened on the click (before any wait,
// or the browser blocks it) and a pass is only asked for when there is a tab to use it.

const LAUNCH = 'http://localhost:3000/login?launchToken=abc&redirect=%2Fstudies';

function fakeTab() {
  const tab = { opener: {} as unknown, went: [] as string[], closed: false, location: { replace: (url: string) => void tab.went.push(url) }, close: () => void (tab.closed = true) };
  return tab;
}

test('the tab opens first, then goes to the launch address without a way back to the portal', async () => {
  const steps: string[] = [];
  const tab = fakeTab();
  const result = await openInterviewTool(
    async (path, body) => {
      steps.push(`post ${path}`);
      assert.deepEqual(body, {});
      return { launchUrl: LAUNCH, expiresIn: 60 };
    },
    () => {
      steps.push('open');
      return tab as LaunchTab;
    },
  );
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(steps, ['open', `post ${INTERVIEW_LAUNCH_PATH}`]);
  assert.equal(INTERVIEW_LAUNCH_PATH, '/openinterviewer/launch-token');
  assert.deepEqual(tab.went, [LAUNCH]);
  assert.equal(tab.opener, null);
  assert.equal(tab.closed, false);
});

test('a blocked tab asks for pop-ups and spends no pass', async () => {
  let asked = 0;
  const result = await openInterviewTool(async () => void asked++, () => null);
  assert.equal(asked, 0);
  assert.equal(result.ok, false);
  assert.match(!result.ok ? result.message : '', /pop-ups/i);
});

test('a failure closes the tab and says what happened', async () => {
  const cases: [ApiError, RegExp][] = [
    [new ApiError('forbidden', 'Admin or Superadmin required'), /Admins and Super Admins/],
    [new ApiError('busy'), new RegExp(BUSY_MESSAGE.replace(/[.]/g, '\\.'))],
    [new ApiError('signed-out'), /sign-in has ended/i],
    [new ApiError('unavailable', 'OpenInterviewer launch secret is not configured'), /isn’t set up/],
    [new ApiError('unavailable'), /couldn’t reach/i],
  ];
  for (const [error, message] of cases) {
    const tab = fakeTab();
    const result = await openInterviewTool(async () => Promise.reject(error), () => tab as LaunchTab);
    assert.equal(result.ok, false, error.kind);
    assert.match(!result.ok ? result.message : '', message, `${error.kind}: ${error.message}`);
    assert.equal(tab.closed, true, `${error.kind} closes the tab`);
    assert.deepEqual(tab.went, []);
  }
});

test('only a web address from the backend is followed', async () => {
  assert.equal(launchAddress({ launchUrl: LAUNCH }), LAUNCH);
  assert.equal(launchAddress({ launchUrl: 'https://interview.example.test/login?launchToken=x' }), 'https://interview.example.test/login?launchToken=x');
  for (const reply of [{ launchUrl: 'javascript:alert(1)' }, { launchUrl: 'not a url' }, { launchUrl: 42 }, {}, null, 'text']) {
    assert.equal(launchAddress(reply), null, JSON.stringify(reply));
  }

  const tab = fakeTab();
  const result = await openInterviewTool(async () => ({ launchUrl: 'javascript:alert(1)' }), () => tab as LaunchTab);
  assert.equal(result.ok, false);
  assert.equal(tab.closed, true);
  assert.deepEqual(tab.went, []);
});
