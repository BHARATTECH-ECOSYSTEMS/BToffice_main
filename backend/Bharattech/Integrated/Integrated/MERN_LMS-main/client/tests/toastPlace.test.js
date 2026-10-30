import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toastLift, TOAST_GAP } from "../src/utils/toastLift.js";

// Learning's toasts. 2026-10-27 (owner's 2A): bottom-right covered the buttons in that corner (the video window's Mark
// as watched / Next lesson / Done, the educator windows' Save), so they went to the top centre. 2026-10-30 (owner): the
// top centre sat in the middle of the screen; back to the bottom right, lifted above the lowest buttons of an open
// window so nothing is covered.

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("there is one toast container, at the bottom right", () => {
  const app = read("App.jsx");
  assert.equal((app.match(/<ToastContainer\b/g) || []).length, 1);
  assert.match(app, /<ToastContainer position="bottom-right" autoClose=\{3000\} \/>/);
  assert.match(app, /useToastLift\(\);/);
});

// a button as the window puts it on a 1440 x 900 screen: [top, left, right] in px from the top and left edges
const at = (top, left, right = left + 120) => ({ top, left, right });

test("with no window open, toasts sit just above the screen's bottom edge", () => {
  assert.equal(TOAST_GAP, 16);
  assert.equal(toastLift(1440, 900, []), TOAST_GAP);
});

test("with a window open, toasts rise above the buttons in the corner where they appear", () => {
  // the video window's footer: Mark as watched and Next lesson, 60 px above the bottom edge, at the right
  assert.equal(toastLift(1440, 900, [at(24, 1300, 1330), at(840, 1100), at(840, 1250)]), 72);
  // a window whose buttons in that corner sit higher up lifts toasts further
  assert.equal(toastLift(1440, 900, [at(640, 1200)]), 272);
});

test("buttons away from that corner don't move the toasts", () => {
  // the window's close button at its top right (the course preview has only that one)
  assert.equal(toastLift(1440, 900, [at(113, 1280, 1316)]), TOAST_GAP);
  // footer buttons at the left, far from the toasts' column
  assert.equal(toastLift(1440, 900, [at(840, 200)]), TOAST_GAP);
  // buttons scrolled out of sight below the edge
  assert.equal(toastLift(1440, 900, [at(1200, 1200)]), TOAST_GAP);
});

test("the container follows the lift, phones included with the page's 12 px margins", () => {
  const css = read("index.css");
  assert.match(css, /\.learn \.Toastify__toast-container--bottom-right \{\s*bottom: var\(--toast-lift, 16px\);/);
  assert.match(css, /@media \(max-width: 480px\) \{[\s\S]{0,300}\.learn \.Toastify__toast-container--bottom-right \{\s*left: 12px;\s*right: 12px;\s*width: auto;/);
  assert.doesNotMatch(css, /toast-container--top-center/);
});
