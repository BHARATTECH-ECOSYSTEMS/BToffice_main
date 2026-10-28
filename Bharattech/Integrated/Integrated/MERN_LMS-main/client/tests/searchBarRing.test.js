import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Learning's course search (2026-10-28): clicking into it drew two lines, its own violet border and, 2 px outside it,
// the global `*:focus-visible` ring. That rule comes after Tailwind's utilities with the same weight, so the box's
// `outline-none` lost, and a text box counts as focus-visible on a mouse click too. The box's own edge is now the one
// focus line: 2 px of violet (the border plus a ring sitting flush against it, not 2 px away).

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const classes = () => read("components/students/SearchBar.jsx").match(/<input[\s\S]*?className="([^"]*)"/)[1].split(/\s+/);

test("the global focus ring still comes after Tailwind and would win over a plain outline-none", () => {
  const css = read("index.css");
  assert.ok(css.indexOf("*:focus-visible {") > css.indexOf("@tailwind utilities;"));
});

test("the search box turns the global ring off with a rule that outweighs it", () => {
  const list = classes();
  assert.ok(list.includes("focus-visible:outline-none"), list.join(" "));
  assert.ok(!list.includes("outline-none"), "a bare outline-none loses to *:focus-visible");
});

// The same two lines on the educator's text boxes (2026-10-28, owner's A): Add course, the Add lesson window, and the
// pop-up that asks for a chapter name.
const TEXT_BOXES = ["pages/educator/AddCourse.jsx", "components/educator/AddLectureModal.jsx", "components/educator/EduPopup.jsx"];

test("no text box relies on a bare outline-none against the global ring", () => {
  for (const file of TEXT_BOXES) assert.doesNotMatch(read(file), /text-ink outline-none/, file);
});

test("each educator text box shows focus as one violet edge", () => {
  const counts = TEXT_BOXES.map((file) => (read(file).match(/text-ink focus-visible:outline-none focus:ring-1 focus:ring-act /g) || []).length);
  assert.deepEqual(counts, [1, 3, 1]);
});

test("the search box clears with a violet × of its own instead of Chrome's blue one", () => {
  const src = read("components/students/SearchBar.jsx");
  assert.ok(classes().includes("[&::-webkit-search-cancel-button]:appearance-none"));
  assert.match(src, /\{input && \(\s*<button\s+type="button"\s+aria-label="Clear search"/);
  assert.match(src, /onClick=\{\(\) => \{\s*setInput\(""\);\s*inputRef\.current\?\.focus\(\);/);
});

test("focus still shows: the violet edge thickens to 2 px with no gap", () => {
  const list = classes();
  for (const name of ["focus:border-act", "focus:ring-1", "focus:ring-act"]) assert.ok(list.includes(name), name);
  assert.ok(!list.some((c) => c.startsWith("focus:ring-offset")), "an offset would bring the second line back");
});
