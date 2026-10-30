import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Group C (2026-10-26, owner's 8A): the unused pages and sections (an admin landing page, an empty page, a second API
// client, made-up testimonials and company logos, an unused call-to-action, an unplaced link bar) and the packages
// nothing used are gone; package.json lists exactly what the app loads.

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : /\.jsx?$/.test(e.name) ? [path.join(dir, e.name)] : []));

const REMOVED = [
  "AdminPage.jsx",
  "LoginAsStudentPage.jsx",
  "api/api.js",
  "components/students/TestemonialsSection.jsx",
  "components/students/Companies.jsx",
  "components/students/CallToAction.jsx",
  "components/students/UserLinks.jsx",
];

test("the unused files are gone", () => {
  assert.deepEqual(REMOVED.filter((f) => fs.existsSync(path.join(src, f))), []);
});

test("package.json lists exactly the packages the app loads", () => {
  const { dependencies } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const loaded = new Set();
  for (const file of files(src)) {
    for (const [, name] of fs.readFileSync(file, "utf8").matchAll(/(?:from\s+|import\s+|import\(\s*)["']([^"'.][^"']*)["']/g)) {
      loaded.add(name.startsWith("@") ? name.split("/").slice(0, 2).join("/") : name.split("/")[0]);
    }
  }
  assert.deepEqual(Object.keys(dependencies).filter((name) => !loaded.has(name)).sort(), [], "listed but never loaded");
  assert.deepEqual([...loaded].filter((name) => !(name in dependencies)).sort(), [], "loaded but not listed");
});
