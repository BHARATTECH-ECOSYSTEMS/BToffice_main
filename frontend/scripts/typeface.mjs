// Converts a TrueType font into three.js's typeface JSON (what FontLoader parses), keeping only the given glyphs.
// The same conversion as three's TTFLoader, run once at build time so the site ships a few kilobytes of outlines
// instead of the font parser.
//
// The Research hero's word uses Bricolage Grotesque at weight 640 and optical size 96 (Open Font License 1.1), the
// site's headline font, as a static instance from the Google Fonts CSS API (css2?family=Bricolage+Grotesque:opsz,wght@96,640):
//
//   npm i --prefix <tmp> opentype.js
//   NODE_PATH=<tmp>/node_modules node scripts/typeface.mjs BricolageGrotesque-640.ttf src/gl/research/fonts/bricolage-grotesque-640.json "intelgc "
// An instance cut from a variable font keeps its overlapping contours, which TextGeometry can't fill: the "e"'s crossbar
// ran through its bowl and drew a stray face in 3D. After converting, its outline was redrawn by hand without the
// overlap (the bar's underside meets the bowl's inner edge; the eye above the bar is its own hole). Redo that if the
// file is regenerated.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const [input, output, keep] = process.argv.slice(2);
if (!input || !output || !keep) {
  console.error('usage: node scripts/typeface.mjs <in.ttf> <out.json> <glyphs>');
  process.exit(1);
}
// a build-time tool, not a project dependency: found through NODE_PATH, which only require() reads
const opentype = createRequire(import.meta.url)('opentype.js');

const bytes = readFileSync(input);
const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const scale = 100000 / ((font.unitsPerEm || 2048) * 72);
const round = Math.round;

const glyphs = {};
for (const char of new Set(keep)) {
  const glyph = font.charToGlyph(char);
  let o = '';
  for (const c of glyph.path.commands) {
    o += (c.type === 'C' ? 'b' : c.type.toLowerCase()) + ' ';
    for (const [x, y] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2']])
      if (c[x] !== undefined && c[y] !== undefined) o += `${round(c[x] * scale)} ${round(c[y] * scale)} `;
  }
  glyphs[char] = { ha: round(glyph.advanceWidth * scale), x_min: round((glyph.xMin ?? 0) * scale), x_max: round((glyph.xMax ?? 0) * scale), o };
}

const { head, post } = font.tables;
const json = {
  glyphs,
  familyName: font.getEnglishName('fullName'),
  ascender: round(font.ascender * scale),
  descender: round(font.descender * scale),
  underlinePosition: post.underlinePosition,
  underlineThickness: post.underlineThickness,
  boundingBox: { xMin: head.xMin, xMax: head.xMax, yMin: head.yMin, yMax: head.yMax },
  resolution: 1000,
  original_font_information: { copyright: font.getEnglishName('copyright'), license: font.getEnglishName('license'), licenseURL: font.getEnglishName('licenseURL') },
};
writeFileSync(output, JSON.stringify(json));
console.log(`${Object.keys(glyphs).length} glyphs, ${JSON.stringify(json).length} bytes → ${output}`);
