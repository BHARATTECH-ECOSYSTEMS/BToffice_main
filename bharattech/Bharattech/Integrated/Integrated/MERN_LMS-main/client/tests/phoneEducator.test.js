import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The educator pages on phones (2026-10-27, owner's E1A E2A E3A). Desktop (768 px and up) stays as it was.
// E1: the educator navbar ran 663 px wide on a 375 px phone, so every educator page loaded zoomed out; below 768 px it
//     is now the logo and a Menu button, like the learner side.
// E2: the tables cut off their right-hand columns on phones; below 768 px each row stacks instead.
// E3: small links and buttons get a finger-sized (44 px) tap area on phones.

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("E1: below 768 px the educator navbar is the logo and a Menu button; the desktop row is hidden there", () => {
  const nav = read("components/educator/Navbar.jsx");
  assert.match(nav, /className="hidden items-center gap-5 md:flex"/, "the tabs are desktop only");
  assert.match(nav, /className="hidden shrink-0 items-center gap-2 md:flex"/, "the right-hand buttons are desktop only");
  assert.match(nav, /aria-controls="edu-menu"\s+aria-expanded=\{menuOpen\}/);
  assert.match(nav, /className=\{menuButton\}/, "the Menu button is the learner side's");
});

test("E1: the menu panel holds the three tabs and every button, each a full-width row", () => {
  const nav = read("components/educator/Navbar.jsx");
  const panel = nav.slice(nav.indexOf('id="edu-menu"'));
  assert.match(panel, /TABS\.map/, "Dashboard, My courses and Learners");
  for (const label of ["Add a course", "View as learner", "Sign out"]) assert.ok(panel.includes(label), label);
  assert.match(panel, /className=\{menuPanel\}/);
  assert.ok((panel.match(/menuRow/g) || []).length >= 4, "tabs and buttons use the 48 px row");
});

test("E1: both navbars share one menu hook that closes on a new page, on Escape, and on a tap outside", () => {
  const hook = read("hooks/usePhoneMenu.js");
  assert.match(hook, /useEffect\(\(\) => setMenuOpen\(false\), \[pathname\]\)/);
  assert.match(hook, /event\.key === "Escape"/);
  assert.match(hook, /!navRef\.current\?\.contains\(event\.target\)/);
  for (const file of ["components/students/Navbar.jsx", "components/educator/Navbar.jsx"]) {
    const nav = read(file);
    assert.match(nav, /const \{ menuOpen, setMenuOpen, navRef \} = usePhoneMenu\(\)/, file);
    assert.match(nav, /<nav ref=\{navRef\}/, file);
  }
});

test("E2: below 768 px the tables drop their header row and stack each row", () => {
  const parts = read("components/educator/parts.jsx");
  assert.match(parts, /export const tableClass = "[^"]*max-md:block[^"]*"/);
  assert.match(parts, /export const tableHead = "[^"]*max-md:hidden[^"]*"/);
  assert.match(parts, /export const tableBody = "[^"]*max-md:block[^"]*"/);
  assert.match(parts, /export const bodyCell = "px-5 py-4 align-middle max-md:p-0"/, "desktop padding unchanged");
  assert.match(parts, /export const enrollmentRow = "[^"]*max-md:grid[^"]*"/);
  assert.match(parts, /export const courseRow = "[^"]*max-md:flex[^"]*"/);
  for (const page of ["pages/educator/Dashboard.jsx", "pages/educator/StudentsEnrolled.jsx", "pages/educator/MyCourses.jsx"]) {
    const src = read(page);
    assert.match(src, /<thead className=\{tableHead\}>/, page);
    assert.match(src, /<tbody className=\{tableBody\}>/, page);
  }
});

test("E2: on phones an enrollment reads learner, course, progress, then the date", () => {
  for (const page of ["pages/educator/Dashboard.jsx", "pages/educator/StudentsEnrolled.jsx"]) {
    const src = read(page);
    assert.match(src, /<tr key=\{`[^`]+`\} className=\{enrollmentRow\}>/, page);
    assert.match(src, /text-muted max-md:text-left`\}>/, `${page}: the date lines up under the progress`);
    assert.match(src, /<span className="md:hidden">Enrolled <\/span>/, `${page}: the date is named on phones`);
  }
});

test("E2: on phones a course reads cover and title, then learners and the publish date", () => {
  const src = read("pages/educator/MyCourses.jsx");
  assert.match(src, /<tr key=\{course\._id\} className=\{courseRow\}>/);
  assert.match(src, /max-md:basis-full/);
  assert.equal((src.match(/max-md:basis-full max-md:pl-28/g) || []).length, 2, "learners and date each a line under the title");
  assert.match(src, /<span className="md:hidden">Published <\/span>/);
});

test("E3: the small controls on Add a course and its windows use the 44 px tap class", () => {
  const add = read("pages/educator/AddCourse.jsx");
  assert.match(add, /className="tap text-sm font-medium text-muted[^"]*"\s*>\s*Remove chapter/, "Remove chapter");
  assert.match(add, /className="tap text-sm text-muted[^"]*"\s*>\s*Remove</, "Remove lesson");
  assert.match(add, /className="tap text-sm font-semibold text-act-deep[^"]*"\s*>\s*Add a lesson/, "Add a lesson");
  assert.match(add, /className=\{`tap justify-self-start[^`]*`\}>\s*Add a chapter/, "Add a chapter");
  assert.equal((read("components/educator/EduPopup.jsx").match(/className=\{`tap /g) || []).length, 2, "chapter window buttons");
  const lesson = read("components/educator/AddLectureModal.jsx");
  assert.match(lesson, /className="tap rounded-full p-2/, "lesson window close");
  assert.equal((lesson.match(/className=\{`tap flex-1/g) || []).length, 2, "lesson window buttons");
  assert.match(lesson, /<label className="tap relative inline-flex items-center cursor-pointer">/, "Free preview switch (44 x 24)");
});

test("E3: on phones the description toolbar's buttons are a real 44 px (layers would overlap there)", () => {
  const css = read("index.css");
  const phone = css.slice(css.indexOf("@media (max-width: 767px)"));
  assert.match(phone, /\.learn \.ql-snow\.ql-toolbar button \{[^}]*width: 44px;[^}]*height: 44px;/);
  assert.match(phone, /\.learn \.ql-snow \.ql-picker \{[^}]*height: 44px;/);
});
