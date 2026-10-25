import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Group C Part 3 (2026-10-26, owner's 2A 3A 4A): every course is free and lectures are YouTube links, so the pages
// show no prices, discounts, "earnings", promises the LMS doesn't keep, uploads it can't do, or another company's name.

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : /\.(jsx?|css)$/.test(e.name) ? [path.join(dir, e.name)] : []));
// the 8 demo courses (assets.js) are the company's sample data and are no longer read by the app
const pages = files(src).filter((f) => !f.endsWith(path.join("assets", "assets.js")));
// what a page shows or does, without its comments
const code = (f) => fs.readFileSync(f, "utf8").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");
const found = (pattern) => pages.filter((f) => pattern.test(code(f))).map((f) => path.relative(src, f));

const UNTRUE = [
  ["a price or currency", /currency|coursePrice|finalPrice|line-through/],
  ["a discount", /discount|% off/],
  ["earnings or revenue", /\bearnings?\b|\brevenue\b/i],
  ["a limited-time offer", /days left at this price/i],
  ["a certificate, downloads or Q&A", /Certificate of completion|Downloadable resources|instructor Q&A/i],
  // (the player still plays a lecture uploaded before, which the live LMS may hold)
  ["a video upload", /videoFile|upload_preset|api\.cloudinary\.com/i],
  ["another company's name", /Amzilox/],
  ["a link to nowhere", /href="#"/],
  ["a newsletter", /newsletter/i],
];

for (const [what, pattern] of UNTRUE) {
  test(`no page shows ${what}`, () => {
    assert.deepEqual(found(pattern), []);
  });
}
