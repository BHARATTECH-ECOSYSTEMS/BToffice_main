import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The hero's glass logo showed a stair-stepped edge on dark pages (owner, 2026-10-30): the shader drew each pixel as
// either the sphere or nothing. A ray that just misses the shape still covers part of its pixel, so it is now drawn
// partly see-through, over about one and a half pixels, whatever resolution the film draws at.
const shader = readFileSync('src/gl/sculpture.glsl.ts', 'utf8');
const studio = readFileSync('src/gl/Studio.ts', 'utf8');

test('a ray that just misses the glass covers part of its pixel instead of nothing', () => {
  assert.match(shader, /uniform float uPix;/);
  assert.match(shader, /if \(d < dMin\) \{ dMin = d; tMin = t; \}/);
  assert.match(shader, /cover = 1\.0 - dMin \/ \(uPix \* tMin \* EDGE_PX\);/);
  assert.match(shader, /if \(cover <= 0\.0\) discard;/);
  assert.match(shader, /gl_FragColor = vec4\(col, cover\);/);
});

test('the glass blends its soft edge, and knows how wide a pixel is at every size', () => {
  assert.match(studio, /new THREE\.ShaderMaterial\(\{ uniforms: this\.su, vertexShader: SCULPTURE_VS, fragmentShader: SCULPTURE_FS, transparent: true \}\)/);
  assert.match(studio, /uPix: \{ value: 0\.001 \}/);
  assert.match(studio, /this\.su\.uPix\.value = \(2 \* Math\.tan\(THREE\.MathUtils\.degToRad\(this\.camera\.fov \/ 2\)\)\) \/ \(h \* pr\);/);
});
