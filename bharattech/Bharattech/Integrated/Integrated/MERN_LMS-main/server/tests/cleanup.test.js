import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";

// Group C (2026-10-26, owner's 8A): the payment and old sign-up webhooks (Stripe, Clerk) and the packages nothing
// used are gone, and package.json lists exactly what the server loads.

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const codeFiles = (dir) =>
  fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name === "tests" ? [] : codeFiles(rel);
    return e.name.endsWith(".js") ? [rel] : [];
  });

const packagesLoaded = () => {
  const found = new Set();
  for (const file of codeFiles(".")) {
    for (const [, name] of read(file).matchAll(/(?:from\s+|import\s+|import\(\s*|require\(\s*)["']([^"'.][^"']*)["']/g)) {
      if (name.startsWith("node:") || builtinModules.includes(name.split("/")[0])) continue;
      found.add(name.startsWith("@") ? name.split("/").slice(0, 2).join("/") : name.split("/")[0]);
    }
  }
  return found;
};

test("package.json lists exactly the packages the server loads", () => {
  const { dependencies } = JSON.parse(read("package.json"));
  const loaded = packagesLoaded();
  // nodemon runs the server during development ("npm run server"); nothing imports it
  const tools = new Set(["nodemon"]);
  assert.deepEqual([...loaded].filter((name) => !(name in dependencies)).sort(), [], "loaded but not listed");
  assert.deepEqual(Object.keys(dependencies).filter((name) => !loaded.has(name) && !tools.has(name)).sort(), [], "listed but never loaded");
});

test("there is no payment or Clerk webhook any more", () => {
  assert.equal(fs.existsSync(path.join(root, "controllers", "webhooks.js")), false);
  assert.doesNotMatch(read("app.js"), /stripe|webhook/i);
});
