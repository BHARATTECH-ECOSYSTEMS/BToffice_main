import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Learning's toasts (2026-10-27, owner's 2A): bottom-right covered the buttons in that corner (the video window's Mark
// as watched / Next lesson / Done, the educator windows' Save). They now come in at the top centre, just under the
// sticky navbar, on every screen size.

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("there is one toast container, at the top centre", () => {
  const app = read("App.jsx");
  assert.equal((app.match(/<ToastContainer\b/g) || []).length, 1);
  assert.match(app, /<ToastContainer position="top-center" autoClose=\{3000\} \/>/);
});

test("toasts sit below the navbar, phones included (Toastify's own phone rule puts them at the very top)", () => {
  const css = read("index.css");
  assert.match(css, /\.learn \.Toastify__toast-container--top-center \{\s*top: 84px;/);
});

test("on phones they keep 12 px from each edge instead of running edge to edge", () => {
  const css = read("index.css");
  assert.match(css, /@media \(max-width: 480px\) \{[\s\S]{0,200}\.learn \.Toastify__toast-container--top-center \{\s*left: 12px;\s*right: 12px;\s*width: auto;/);
});
