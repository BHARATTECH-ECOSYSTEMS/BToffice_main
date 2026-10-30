// Redesign (owner's 1A 2A 3A 4A): OpenInterviewer takes the BharatTech portal's look, so moving from the portal into
// the tool feels like one product. The theme lives in one place (tailwind.config.ts + globals.css); every screen's
// blue and grey classes follow it. The candidate's chat shows the interview's five phases as a bar.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const config = require(path.join(ROOT, 'tailwind.config.ts')).default;
const globals = readFileSync(path.join(ROOT, 'src/app/globals.css'), 'utf8');
const { INTERVIEW_PHASES, phaseStep } = require('@/lib/phases');

const colors = config.theme.extend.colors;

// WCAG contrast of two #rrggbb colours
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

test("the tool's blue is the portal's Electric Violet, its greys the portal's warm ink and paper", () => {
  assert.equal(colors.blue['600'], '#6E58F5');
  assert.equal(colors.slate['900'], '#14130F');
  assert.equal(colors.slate['50'], '#F8F7F3');
  assert.equal(colors.tangerine['500'], '#FF8643');
  // every shade the screens use is replaced, so no old blue or cold grey is left in between
  for (const shade of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']) {
    assert.ok(colors.blue[shade] && colors.slate[shade], `shade ${shade}`);
  }
  for (const shade of ['250', '350', '450', '750', '850']) assert.ok(colors.slate[shade], `slate ${shade}`);
});

test("the portal's fonts: Bricolage Grotesque headings, Figtree text, Geist Mono code", () => {
  assert.equal(config.theme.extend.fontFamily.sans[0], 'Figtree');
  assert.equal(config.theme.extend.fontFamily.display[0], 'Bricolage Grotesque');
  assert.equal(config.theme.extend.fontFamily.mono[0], 'Geist Mono');
  assert.match(globals, /family=Bricolage\+Grotesque/);
  assert.match(globals, /family=Figtree/);
  assert.match(globals, /family=Geist\+Mono/);
  assert.doesNotMatch(globals, /family=Inter|JetBrains/);
});

test('the page, focus ring and code use the portal colours too', () => {
  assert.match(globals, /background-color:\s*#F8F7F3/i);
  assert.match(globals, /outline:\s*2px solid #6E58F5/i);
  assert.doesNotMatch(globals, /#3b82f6|#2563eb|#1e3a8a/i, 'no old blue left in the global styles');
});

test('text stays readable on the new colours', () => {
  assert.ok(contrast(colors.slate['500'], '#FFFFFF') >= 4.5, 'muted text on white');
  assert.ok(contrast('#FFFFFF', colors.blue['600']) >= 4.5, 'white on the main button');
  assert.ok(contrast(colors.blue['700'], '#FFFFFF') >= 4.5, 'violet links on white');
  assert.ok(contrast(colors.tangerine['800'], colors.tangerine['50']) >= 4.5, "the candidate's label on their bubble");
});

test("the chat's phase bar follows the interview's five phases", () => {
  // the 2026-10-28 order (lib/interviewFlow.ts); a stage kept in a browser from before reads as the start
  assert.deepEqual(INTERVIEW_PHASES, ['introduction', 'project', 'questions', 'code', 'ending']);
  assert.equal(phaseStep('introduction'), 0);
  assert.equal(phaseStep('code'), 3);
  assert.equal(phaseStep('ending'), 4);
  assert.equal(phaseStep(undefined), 0);
  assert.equal(phaseStep('functionality'), 0);
});

test('the chat moves gently, and not at all with reduced motion', () => {
  assert.match(globals, /@keyframes oi-rise/);
  const reduced = globals.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/);
  assert.ok(reduced, 'a reduced-motion block');
  assert.match(reduced[1], /\.oi-rise/);
  assert.match(reduced[1], /\.typing-dot-1/);
});
