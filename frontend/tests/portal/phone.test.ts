import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { menuGroups, type TopItem } from '../../src/portal/portalMenu';
import { labelsForRow } from '../../src/portal/tableLabels';

// Roadmap step 20, Part 2 (owner's 3A 4A 5A 6A): the portal on phones. A menu button opens every page the
// person may reach; wide tables turn each row into a small card whose values carry their column's name.

const ITEMS: TopItem[] = [
  { key: 'overview', label: 'Overview', to: '/portal', tone: 'saffron', fx: 'drop' },
  {
    key: 'resources',
    label: 'Resources',
    tone: 'saffron',
    fx: 'ripple',
    sections: [
      { heading: 'Library', links: [{ to: '/portal/resources', label: 'Resources', icon: 'book' }] },
      { heading: 'Tools', links: [{ to: '/portal/tools/chat', href: 'https://chat.example.test', label: 'LibreChat', icon: 'chat' }] },
      { heading: 'Empty', links: [] },
    ],
  },
  { key: 'people', label: 'People', to: '/portal/people', tone: 'violet', fx: 'sweep' },
];

test('the phone menu lists the pages first, then each menu section under its own heading', () => {
  const groups = menuGroups(ITEMS);
  assert.deepEqual(
    groups.map((g) => [g.heading, g.links.map((l) => l.label)]),
    [
      [null, ['Overview', 'People']],
      ['Resources · Library', ['Resources']],
      ['Resources · Tools', ['LibreChat']],
    ],
  );
});

test('a tool with its own address keeps it, so the phone menu opens the tool itself', () => {
  const tools = menuGroups(ITEMS).find((g) => g.heading === 'Resources · Tools')!;
  assert.equal(tools.links[0].href, 'https://chat.example.test');
  assert.equal(menuGroups(ITEMS)[0].links[0].href, undefined);
});

test('the Overview link matches only the dashboard itself, the others their whole branch', () => {
  const pages = menuGroups(ITEMS)[0].links;
  assert.equal(pages.find((l) => l.label === 'Overview')!.end, true);
  assert.equal(pages.find((l) => l.label === 'People')!.end, false);
});

test('each cell is labelled with the heading of the column it sits under', () => {
  assert.deepEqual(labelsForRow(['Name', 'Status', 'Email'], [1, 1, 1]), ['Name', 'Status', 'Email']);
});

test('a cell spanning columns, or under an empty heading (an actions column), gets no label', () => {
  assert.deepEqual(labelsForRow(['Name', 'Status', ''], [1, 1, 1]), ['Name', 'Status', null]);
  assert.deepEqual(labelsForRow(['Name', 'Status', 'Email'], [2, 1]), [null, 'Email']);
  // "No tasks yet" across the whole table
  assert.deepEqual(labelsForRow(['Name', 'Status', 'Email'], [3]), [null]);
});

test('extra cells past the headings get no label', () => {
  assert.deepEqual(labelsForRow(['Name'], [1, 1]), ['Name', null]);
});

// Wiring, checked here by reading the source; the phone check (headless Chrome at 360/390/768px, all roles) is what
// shows the result.
const src = (f: string) => readFileSync(f, 'utf8');
const css = src('src/styles/portal.css').replace(/\/\*[\s\S]*?\*\//g, '');
/** The body of every @media block for this query, joined. */
const media = (query: string) => {
  const out: string[] = [];
  let at = css.indexOf(`@media ${query}`);
  while (at !== -1) {
    let i = css.indexOf('{', at) + 1;
    let depth = 1;
    const start = i;
    while (depth && i < css.length) depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0, i++;
    out.push(css.slice(start, i - 1));
    at = css.indexOf(`@media ${query}`, i);
  }
  return out.join('\n');
};

test('on phones the page row gives way to the menu button, and the theme key moves into the menu', () => {
  const phone = media('(max-width: 760px)');
  // (a selector may share its rule with others)
  assert.match(phone, /\.p-top \.nav-links[^{]*\{[^}]*display:\s*none/);
  assert.match(phone, /\.p-burger\s*\{[^}]*display:\s*(grid|flex|block)/);
  assert.match(phone, /\.p-top \.nav-theme[^{]*\{[^}]*display:\s*none/);
  const layout = src('src/portal/PortalLayout.tsx');
  assert.match(layout, /<PortalMenu\b/);
  assert.match(layout, /useTableLabels\(/);
});

test('on phones table rows are cards whose cells show their column name', () => {
  const small = media('(max-width: 640px)');
  assert.match(small, /\.p-table thead/);
  assert.match(small, /\.p-table td\[data-label\]::before\s*\{[^}]*content:\s*attr\(data-label\)/);
});

test('the dashboard, Settings and the verification desk are one column on phones', () => {
  const phone = media('(max-width: 760px)');
  for (const sel of ['.p-bento', '.p-settings', '.p-desk', '.p-set-row'])
    assert.match(phone, new RegExp(`${sel.replace('.', '\\.')}[^{]*\\{[^}]*grid-template-columns:\\s*(minmax\\(0, 1fr\\)|1fr)`), `${sel} isn't one column on phones`);
});
