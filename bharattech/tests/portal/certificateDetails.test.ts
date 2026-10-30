import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { certificateDetailsProblem, issueBody } from '../../src/portal/certificates';

// Owner, 2026-10-29: every certificate reads like the company's sample ("has served as {job title} from {date} to
// {date}"), so issuing asks for the job title and the period; the backend checks the same (utils/certificateTemplate.js).

const TODAY = '2026-10-29';
const ok = { jobTitle: 'Fullstack Intern', fromDate: '2026-07-08', toDate: '2026-10-15' };

test('a job title and a real period that has ended can be issued', () => {
  assert.equal(certificateDetailsProblem(ok, TODAY), '');
  assert.equal(certificateDetailsProblem({ ...ok, toDate: TODAY }, TODAY), '');
});

test('the details say what to fix, as the backend does', () => {
  assert.match(certificateDetailsProblem({ ...ok, jobTitle: '   ' }, TODAY), /job title/i);
  assert.match(certificateDetailsProblem({ ...ok, jobTitle: 'x'.repeat(81) }, TODAY), /80/);
  assert.match(certificateDetailsProblem({ ...ok, fromDate: '' }, TODAY), /start date/i);
  assert.match(certificateDetailsProblem({ ...ok, fromDate: '2026-02-30' }, TODAY), /start date/i);
  assert.match(certificateDetailsProblem({ ...ok, toDate: '' }, TODAY), /end date/i);
  assert.match(certificateDetailsProblem({ ...ok, fromDate: '2026-10-16' }, TODAY), /before/i);
  assert.match(certificateDetailsProblem({ ...ok, toDate: '2026-10-30' }, TODAY), /future/i);
});

test('issuing sends the job title and the period with the person and the type', () => {
  assert.deepEqual(issueBody('6ad8bc3dd430c9b545aa2845', 'character', { ...ok, jobTitle: '  Fullstack Intern ' }), {
    userId: '6ad8bc3dd430c9b545aa2845',
    title: 'Character Certificate',
    jobTitle: 'Fullstack Intern',
    fromDate: '2026-07-08',
    toDate: '2026-10-15',
  });
});

test('the issue window asks for the details in their own step, starting from the join date and today', () => {
  const wizard = readFileSync('src/portal/pages/Certificates.tsx', 'utf8');
  assert.match(wizard, /\['Certificate type', 'Person', 'Details', 'Review'\]/);
  for (const label of ['Job title', 'From', 'To']) assert.match(wizard, new RegExp(`>\\s*${label}\\s*<`), label);
  assert.match(wizard, /fromDate: chosen\.joined \?\? ''/);
  assert.match(wizard, /indiaToday\(\)/);
  assert.match(wizard, /certificateDetailsProblem\(/);
  const connected = readFileSync('src/portal/pages/CertificatesConnected.tsx', 'utf8');
  assert.match(connected, /certificates\.issue\(personId, type, details\)/);
});

test('the certificate window has the portrait shape of the company design', () => {
  const css = readFileSync('src/styles/portal.css', 'utf8');
  const at = css.indexOf('.p-doc-stage[data-whole] .p-doc-sheet {');
  const rule = css.slice(at, css.indexOf('}', at));
  assert.match(rule, /aspect-ratio:\s*1122 \/ 1402/);
  assert.match(rule, /\* 1122 \/ 1402\)/);
});
