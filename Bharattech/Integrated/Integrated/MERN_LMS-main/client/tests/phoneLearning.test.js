import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Learning on phones (2026-10-27, owner's L1A L2A L3A). Desktop (768 px and up) stays as it was.
// L1: the navbar ran 600 px wide on a phone, so every page loaded zoomed out; below 768 px it is now the logo and a
//     Menu button that opens a panel with every link.
// L2: small links and buttons get a finger-sized (44 px) tap area on phones, without moving anything.
// L3: in the player, the "Up next" card comes right after the title on phones, before the lesson list.

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("L1: below 768 px the navbar is the logo and a Menu button; the desktop row is hidden there", () => {
  const nav = read("components/students/Navbar.jsx");
  assert.match(nav, /className="hidden items-center gap-5 md:flex"/, "the tabs are desktop only");
  assert.match(nav, /className="hidden shrink-0 items-center gap-2 md:flex"/, "the right-hand buttons are desktop only");
  assert.match(nav, /aria-controls="learn-menu"\s+aria-expanded=\{menuOpen\}/);
  assert.match(nav, /className=\{`[^`]*md:hidden[^`]*`\}/, "the Menu button is phones only");
});

test("L1: the menu panel holds every navbar link, each a full-width 48 px row", () => {
  const nav = read("components/students/Navbar.jsx");
  const panel = nav.slice(nav.indexOf('id="learn-menu"'));
  for (const label of ["Courses", "My courses", "Back to the portal", "View as educator", "Sign out"]) assert.ok(panel.includes(label), label);
  assert.match(nav, /const menuRow = `[^`]*min-h-12[^`]*`/);
});

test("L1: the menu closes on a new page, on Escape, and on a tap outside it", () => {
  const nav = read("components/students/Navbar.jsx");
  assert.match(nav, /useEffect\(\(\) => setMenuOpen\(false\), \[pathname\]\)/);
  assert.match(nav, /event\.key === "Escape"/);
  assert.match(nav, /!navRef\.current\?\.contains\(event\.target\)/);
});

test("L2: the tap class adds a 44 px see-through tap area on phones only", () => {
  const css = read("index.css");
  assert.match(css, /@media \(max-width: 767px\) \{[\s\S]{0,400}\.learn \.tap::after,\s*\.learn \.Toastify__close-button::after \{[\s\S]{0,300}width: max\(100%, 44px\);\s*height: max\(100%, 44px\);/);
});

test("L2: the toast's close button keeps Toastify's own placement (moving it put the cross over the text)", () => {
  const css = read("index.css");
  // its ::after layer has a position of its own; the button itself must not
  assert.doesNotMatch(css, /\.Toastify__close-button\s*[,{][^}]*position:/);
});

test("L2: the small controls from the phone check use it", () => {
  const details = read("pages/student/CourseDetails.jsx");
  assert.match(details, /className="tap inline-flex items-center gap-1\.5 text-sm font-medium text-muted/, "back link");
  assert.match(details, /className="tap mt-2 text-sm font-semibold text-act-deep/, "Read the full description");
  assert.match(details, /className="tap rounded-full bg-act-wash px-3 py-0\.5/, "Preview");
  assert.match(read("pages/student/Player.jsx"), /className="tap inline-flex items-center gap-1\.5 text-sm font-medium text-muted/, "player back link");
  const stars = read("components/students/Rating.jsx");
  assert.match(stars, /className="flex items-center gap-0\.5 max-md:gap-5"/, "stars spaced so their tap areas don't overlap");
  assert.match(stars, /className=\{`tap rounded px-0\.5/);
  assert.equal((read("components/students/Footer.jsx").match(/className="tap /g) || []).length, 2, "footer links");
});

test("L3: on phones the player shows the Up next card between the title and the lessons; desktop keeps its columns", () => {
  const player = read("pages/student/Player.jsx");
  assert.match(player, /<div className="contents lg:block lg:min-w-0">\s*<div className="order-1 lg:order-none">/);
  assert.match(player, /<ul className="order-3 mt-10 overflow-hidden rounded-2xl border border-line bg-card max-lg:mt-0 lg:order-none">/);
  assert.match(player, /<aside className="order-2 lg:sticky lg:top-24 lg:order-none lg:self-start">/);
});
