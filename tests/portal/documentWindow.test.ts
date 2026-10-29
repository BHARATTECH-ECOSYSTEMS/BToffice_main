import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pdfViewUrl } from '../../src/portal/pdfView';

// Owner, 2026-10-29 (1A 2A 3A): a certificate opened from View was squeezed into the 520 px form window, inside
// Chrome's PDF toolbar and grey margins. Every PDF now opens in a large document window; a one-page document (a
// certificate) is shown whole without the toolbar, longer ones keep it for paging and zoom.

const css = readFileSync('src/styles/portal.css', 'utf8');
const pdfModal = readFileSync('src/portal/PdfModal.tsx', 'utf8');
const rule = (selector: string) => {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `${selector} is styled`);
  return css.slice(at, css.indexOf('}', at));
};

test('a one-page document is shown whole, without the PDF toolbar', () => {
  assert.equal(pdfViewUrl('blob:http://localhost/abc', true), 'blob:http://localhost/abc#toolbar=0&navpanes=0&view=Fit');
});

test('a longer document keeps the toolbar for paging and zoom', () => {
  assert.equal(pdfViewUrl('blob:http://localhost/abc', false), 'blob:http://localhost/abc');
});

test('every PDF opens in the large document window, not the 520 px form window', () => {
  assert.match(pdfModal, /<Modal[\s\S]*?size="doc"/);
  const width = rule('.p-modal.is-doc').match(/width:\s*min\((\d+)px/);
  assert.ok(width && Number(width[1]) >= 960, 'at least 960 px wide on a laptop');
});

test('the window says what is loading, and a failed load can be tried again', () => {
  assert.match(pdfModal, /className="p-doc-sheet is-loading"/);
  assert.match(pdfModal, />\s*Try again\s*</);
  assert.match(pdfModal, /Open in new tab/);
});

test('a certificate opens whole, with its number, recipient and date as facts under the title', () => {
  const page = readFileSync('src/portal/pages/CertificatesConnected.tsx', 'utf8');
  const call = page.slice(page.indexOf('<PdfModal'), page.indexOf('/>', page.indexOf('<PdfModal')));
  assert.match(call, /wholePage/);
  assert.match(call, /icon="award"/);
  assert.match(call, /facts=\{/);
  assert.doesNotMatch(call, /details=/);
});

test('a policy lists its category, pages and date as facts', () => {
  const page = readFileSync('src/portal/pages/PolicyConnected.tsx', 'utf8');
  const call = page.slice(page.indexOf('<PdfModal'), page.indexOf('/>', page.indexOf('<PdfModal')));
  assert.match(call, /facts=\{/);
  assert.doesNotMatch(call, /wholePage/);
});
