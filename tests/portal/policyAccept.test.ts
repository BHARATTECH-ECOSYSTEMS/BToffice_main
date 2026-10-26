import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../../src/portal/api';
import { policyCalls, READ_CONFIRMATION } from '../../src/portal/policies';

// Gap audit group B, owner's 4A: accepting a policy sends the person's "I have read and understood" tick, which the
// backend requires (controllers/policyController.js acceptPolicy).

test('accepting sends the tick to the document’s accept route', async () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const request = async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return new Response(JSON.stringify({ userAccepted: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const policies = policyCalls(createApi({ base: 'http://api.test/api', token: async () => 'token', signedIn: () => true, request: request as typeof fetch }));

  await policies.accept('6ada11223344556677889900');

  assert.deepEqual(calls, [{ url: 'http://api.test/api/policies/6ada11223344556677889900/accept', method: 'POST', body: { readConfirmed: true } }]);
});

test('the tick says the words the backend asks for', () => {
  assert.equal(READ_CONFIRMATION, 'I have read and understood this policy');
});
