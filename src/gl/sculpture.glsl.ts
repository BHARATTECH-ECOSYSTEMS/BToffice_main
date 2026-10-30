/**
 * The sculpture: the Bharattech Origin mark as one piece of deep violet glass, described as a signed
 * distance field and drawn by ray marching so it can flow from one form into the next. Every form is the
 * logo or made from it; the story is told by what happens to its three white threads. See Studio.ts.
 *
 *  0 origin     the mark itself: three threads meeting at the origin point
 *  1 forgets    the same sphere, its threads erased back towards the origin; the glass clears
 *  2 scattered  it parts into three orbs, one thread each, none touching
 *  3 frozen     whole, but cut into hard facets and iced over
 *  4 alone      the three orbs drift apart; each reaches for the centre and stops short
 *  5 remembers  the mark again, its threads drawn back in
 *  6 connects   the mark at the centre with the three orbs joined to it
 *  7 learns     the mark, lit from inside
 */

export const SCULPTURE_VS = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const SCULPTURE_FS = /* glsl */ `
precision highp float;
varying vec3 vWorld;

uniform vec3 uCenter;
uniform float uScale;
uniform mat3 uRot;
uniform int uA;
uniform int uB;
uniform float uMix;
uniform float uMorph;    // how far the field has blended into uB's shape (only the frozen gem is a different shape)
uniform float uSteps;
uniform int uNormalTaps; // always 4 (see normalAt)
uniform sampler2D uBg;
uniform sampler2D uLogo;  // r: the threads, g: how far along its thread a point is (0 tail, 1 origin)
uniform mat4 uViewProj;
uniform vec3 uTint;      // what the glass absorbs least
uniform float uDensity;  // how strongly it absorbs
uniform vec3 uBack;      // dark pages: the light colour the glass shows through, as it would on a light page
uniform float uBackLift; // how far what it sees is lifted towards uBack (0 on light pages)
uniform float uBody;     // how much of the logo's own violet the glass carries
uniform vec3 uCoreCol;
uniform float uCoreI;
uniform float uFrost;
uniform float uThreads;
uniform float uDraw;     // 1 threads whole, 0 erased back to the origin
uniform float uGhost;    // what is left of an erased thread
uniform float uIrid;
uniform float uGlow;     // the threads lit from within
uniform float uBound; // radius of a sphere that holds the shape, in shape space
uniform float uPix;   // the angle one drawn pixel spans: how wide the soft edge is at any distance
uniform vec4 uOrbs;   // the orb family: x ring radius, y orb radius, z centre radius, w arm (0 none, 1 short, 2 bridge)

#define PI 3.14159265
// the soft edge, in drawn pixels: wide enough to hide the stair steps, narrow enough to stay crisp
#define EDGE_PX 1.5

float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2) {
  vec3 ba = b - a; float l2 = dot(ba, ba); float rr = r1 - r2; float a2 = l2 - rr * rr; float il2 = 1.0 / l2;
  vec3 pa = p - a; float y = dot(pa, ba); float z = y - l2; vec3 xv = pa * l2 - ba * y; float x2 = dot(xv, xv);
  float y2 = y * y * l2; float z2 = z * z * l2; float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

// the three orbs sit on a triangle facing the viewer, one per thread
vec3 orbDir(int i) { float a = PI / 2.0 + float(i) * 2.0 * PI / 3.0; return vec3(cos(a), sin(a), 0.0); }
// fold the plane into one third so a single orb describes all three
vec3 fold3(vec3 p) {
  float sector = 2.0 * PI / 3.0;
  float a = atan(p.y, p.x) - PI / 2.0;
  float k = floor(a / sector + 0.5);
  p.xy = mat2(cos(k * sector), -sin(k * sector), sin(k * sector), cos(k * sector)) * p.xy;
  return p;
}

/**
 * The orb family. One sphere is three orbs at ring radius 0; pulled out they part like a cell dividing.
 * Every form but the frozen one is this with different numbers, so any of them can become any other by
 * moving the orbs rather than by blending two unrelated shapes.
 */
float sOrbs(vec3 p) {
  float R = uOrbs.x, s = uOrbs.y, c = uOrbs.z, arm = uOrbs.w;
  float k = max(0.24 * clamp(R / 0.5, 0.0, 1.0) * (1.0 - clamp((R - 0.9) / 0.4, 0.0, 1.0)), 1e-4);
  float d = 1e9;
  for (int i = 0; i < 3; i++) d = smin(d, length(p - orbDir(i) * R) - s, k);
  if (c > 0.01) d = smin(d, length(p) - c, 0.16);
  if (arm > 0.01) {
    // an arm from each orb towards the centre: short and failing, or all the way as a bridge
    vec3 q = fold3(p);
    vec3 a = vec3(0.0, R, 0.0);
    float bridge = clamp(arm - 1.0, 0.0, 1.0);
    vec3 b = vec3(0.0, mix(0.62, 0.0, bridge), 0.0);
    float ad = sdRoundCone(q, a, b, mix(0.16, 0.075, bridge), mix(0.03, 0.075, bridge));
    d = smin(d, ad + (1.0 - clamp(arm, 0.0, 1.0)) * 0.4, 0.13);
  }
  return d;
}

// cut into facets like a gem, then iced: the shape is still whole, it just cannot change
float sFrozen(vec3 p) {
  const float g = 1.618034;
  vec3 n0 = normalize(vec3(0.0, 1.0, g));
  vec3 n1 = normalize(vec3(0.0, -1.0, g));
  vec3 n2 = normalize(vec3(1.0, g, 0.0));
  vec3 n3 = normalize(vec3(-1.0, g, 0.0));
  vec3 n4 = normalize(vec3(g, 0.0, 1.0));
  vec3 n5 = normalize(vec3(-g, 0.0, 1.0));
  float d = max(max(abs(dot(p, n0)), abs(dot(p, n1))), max(abs(dot(p, n2)), abs(dot(p, n3))));
  d = max(d, max(abs(dot(p, n4)), abs(dot(p, n5))));
  return max(d - 0.88, length(p) - 1.0);
}

bool isSphere(int k) { return k == 0 || k == 1 || k == 3 || k == 5 || k == 7; }

float shape(int k, vec3 p) {
  if (k == 3) return sFrozen(p);
  return sOrbs(p);
}

vec3 toLocal(vec3 w) { return uRot * ((w - uCenter) / uScale); }

float map(vec3 w) {
  vec3 p = toLocal(w);
  float a = shape(uA, p);
  // two orb forms are the same field with moving numbers; only the frozen form is blended, and Studio times
  // that blend so it happens on the plain sphere, never between the gem and the scattered orbs
  float d = uMorph < 0.001 || (uA != 3 && uB != 3) ? a : mix(a, shape(uB, p), uMorph);
  return d * uScale;
}

// Four taps of the field round p. A loop whose count comes from a uniform, so the compiler keeps it as a loop and
// inlines map() once rather than four times: on Chrome for Windows (Direct3D) that about halves the compile time.
vec3 normalAt(vec3 p) {
  vec3 n = vec3(0.0);
  for (int i = 0; i < uNormalTaps; i++) {
    // the tetrahedron's corners (1,-1,-1), (-1,-1,1), (-1,1,-1), (1,1,1)
    vec3 k = 2.0 * vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.0;
    n += k * map(p + k * 0.0025);
  }
  return normalize(n);
}

// ── the mark painted on a form ──────────────────────────────────────────────

// the logo seen face on: the threads on the front of a sphere centred at c
float logoOn(vec3 p, vec3 c, out vec2 uv) {
  vec3 d = normalize(p - c);
  uv = d.xy;
  vec4 t = texture2D(uLogo, uv * 0.5 + 0.5);
  float thr = (1.0 - uDraw) * 1.08 - 0.04;
  float drawn = smoothstep(thr, thr + 0.04, t.g);
  float front = smoothstep(-0.05, 0.3, d.z);
  return t.r * max(drawn, uGhost) * front;
}

// one thread round an orb: a band, each orb's tilted its own way
float bandOn(vec3 p, int i, vec3 c, out vec2 uv) {
  vec3 d = normalize(p - c);
  uv = d.xy;
  float a = float(i) * 2.1 + 0.6;
  vec3 n = normalize(vec3(cos(a), sin(a), 0.9));
  float w = 0.16;
  return (1.0 - smoothstep(w * 0.7, w, abs(dot(d, n)))) * uDraw;
}

int nearestOrb(vec3 p) {
  float best = -9.0; int k = 0;
  for (int i = 0; i < 3; i++) { float s = dot(p.xy, orbDir(i).xy); if (s > best) { best = s; k = i; } }
  return k;
}

float threadsOf(int k, vec3 p, out vec2 uv) {
  if (isSphere(k)) return logoOn(p, vec3(0.0), uv);
  int i = nearestOrb(p);
  vec3 c = orbDir(i) * uOrbs.x;
  // with a hub, the mark sits on the centre and a thread runs round each orb
  if (uOrbs.z > 0.3 && length(p) < uOrbs.z + 0.2) return logoOn(p, vec3(0.0), uv);
  return bandOn(p, i, c, uv);
}

// the logo's own fill: a radial violet lit from the upper right
vec3 logoFill(vec2 uv) {
  float g = clamp(length(uv - vec2(0.24, 0.4)) / 1.6, 0.0, 1.0);
  vec3 a = vec3(0.431, 0.345, 0.961);  // #6E58F5
  vec3 b = vec3(0.294, 0.176, 0.753);  // #4B2DC0
  vec3 c = vec3(0.208, 0.094, 0.604);  // #35189A
  return g < 0.55 ? mix(a, b, g / 0.55) : mix(b, c, (g - 0.55) / 0.45);
}

// the studio, as glass sees it: a warm paper room with softboxes
vec3 env(vec3 d) {
  vec3 base = mix(vec3(0.55, 0.52, 0.5), vec3(0.98, 0.95, 0.9), smoothstep(-0.6, 0.6, d.y));
  float top = smoothstep(0.8, 0.93, d.y) * 3.2;
  float key = smoothstep(0.86, 0.97, dot(d, normalize(vec3(-0.85, 0.3, 0.45)))) * 7.0;
  float strip = smoothstep(0.93, 0.99, dot(normalize(d * vec3(1.0, 0.25, 1.0)), normalize(vec3(-0.6, 0.0, 0.8)))) * 2.5;
  float rim = smoothstep(0.9, 0.98, dot(d, normalize(vec3(0.9, 0.15, -0.4)))) * 4.5;
  return base + top * vec3(1.0) + key * vec3(1.0, 0.93, 0.84) + strip * vec3(1.0) + rim * vec3(0.86, 0.9, 1.0);
}

vec2 screenUv(vec3 w) { vec4 c = uViewProj * vec4(w, 1.0); return c.xy / c.w * 0.5 + 0.5; }

vec3 behind(vec2 uv) {
  vec3 c = texture2D(uBg, uv).rgb;
  if (uFrost > 0.001) {
    float r = uFrost * 0.012;
    c += texture2D(uBg, uv + vec2(r, 0.0)).rgb + texture2D(uBg, uv - vec2(r, 0.0)).rgb + texture2D(uBg, uv + vec2(0.0, r)).rgb + texture2D(uBg, uv - vec2(0.0, r)).rgb;
    c /= 5.0;
  }
  return c;
}

void main() {
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorld - cameraPosition);
  // only march where the ray crosses the shape's bounding sphere
  vec3 oc = ro - uCenter;
  float R = uBound * uScale;
  float bb = dot(oc, rd);
  float hh = bb * bb - (dot(oc, oc) - R * R);
  if (hh < 0.0) discard;
  hh = sqrt(hh);
  float t = max(-bb - hh, 0.0);
  float tEnd = -bb + hh;
  bool hit = false;
  vec3 p;
  float dMin = 1e9;
  float tMin = t;
  for (int i = 0; i < 110; i++) {
    if (float(i) > uSteps) break;
    p = ro + rd * t;
    float d = map(p);
    if (d < dMin) { dMin = d; tMin = t; }
    if (d < 0.0015) { hit = true; break; }
    t += d * 0.9;
    if (t > tEnd) break;
  }
  // A ray that just misses the glass still covers part of its pixel: drawn as nothing, the edge came out in stair
  // steps (plain on dark pages). It is shaded at the closest point it passed, partly see-through.
  float cover = 1.0;
  if (!hit) {
    cover = 1.0 - dMin / (uPix * tMin * EDGE_PX);
    if (cover <= 0.0) discard;
    p = ro + rd * tMin;
  }

  vec3 n = normalAt(p);
  vec3 v = -rd;
  float ndv = max(dot(n, v), 0.0);
  float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);

  // through the glass: march inside to the far side. Always take the first step: where lobes blend, the field
  // reads smaller than the true distance, so a point just inside looked like the surface itself and the march
  // stopped with no glass at all, showing the bare background in bands along the crease.
  vec3 r1 = refract(rd, n, 1.0 / 1.47);
  vec3 q = p - n * 0.004;
  float th = 0.0;
  for (int i = 0; i < 28; i++) {
    float d = -map(q);
    if (d < 0.002 && i > 0) break;
    q += r1 * max(d, 0.02);
    th += max(d, 0.02);
  }
  vec3 n2 = -normalAt(q);
  vec3 r2 = refract(r1, n2, 1.47);
  if (dot(r2, r2) < 0.01) r2 = reflect(r1, n2);
  vec3 seen = behind(screenUv(q + r2 * 1.6));
  vec3 seenR = behind(screenUv(q + (r2 + n2 * 0.03) * 1.6));
  vec3 seenB = behind(screenUv(q + (r2 - n2 * 0.03) * 1.6));
  seen = vec3(seenR.r, seen.g, seenB.b);
  // on a dark page the glass only saw near-black, and its violet came out a dusty grey-lilac; lifting what it
  // sees keeps the same vivid violet as on a light page
  seen = mix(seen, uBack, uBackLift);
  vec3 absorb = exp(-th * uDensity * (vec3(1.0) - uTint));
  vec3 col = seen * absorb;

  // the mark belongs to one form at a time: when the shape changes, Studio draws the threads back into the
  // origin before the halfway point and out again after it, so the switch happens while nothing is drawn
  vec3 lp = toLocal(p);
  vec2 uvA, uvB;
  float mark = threadsOf(uA, lp, uvA);
  vec2 uv = uvA;
  if (uMix > 0.001) {
    float mb = threadsOf(uB, lp, uvB);
    if (uMix >= 0.5) mark = mb;
    uv = mix(uvA, uvB, uMix);
  }

  // the logo's violet, carried in the glass: deeper towards the rim, as a solid ball would be
  vec3 fill = logoFill(uv) * (0.62 + 0.55 * ndv);
  col = mix(col, fill, uBody * (0.55 + 0.45 * (1.0 - ndv)));

  // light caught inside, strongest where the threads meet
  vec3 lq = toLocal(q);
  float through = clamp(th * 0.8, 0.0, 1.0);
  vec2 origin = uA == 6 ? vec2(0.42, 0.37) * uOrbs.z : isSphere(uA) ? vec2(0.42, 0.37) : vec2(0.0);
  float cd = length(lp.xy - origin);
  col += uCoreCol * uCoreI * (exp(-cd * cd / 0.06) * 0.9 + exp(-dot(lq, lq) / 0.5) * 0.45 * through);

  col *= 1.0 - fres;

  // the threads: white, a little frosted, catching the light like an inlay
  float m = clamp(mark * uThreads, 0.0, 1.0);
  vec3 ink = vec3(0.99, 0.98, 1.0) * (0.84 + 0.2 * ndv) * (1.0 + uGlow) + uCoreCol * uCoreI * 0.18;
  col = mix(col, ink, m * (1.0 - fres * 0.6));

  // reflection and glints
  vec3 rf = reflect(rd, n);
  col += env(rf) * fres * 0.9;
  col += vec3(1.0, 0.97, 0.94) * pow(max(dot(rf, normalize(vec3(-0.6, 0.6, 0.55))), 0.0), 160.0) * 6.0 * (1.0 - uFrost * 0.7);
  col += vec3(1.0) * pow(max(dot(rf, normalize(vec3(0.7, 0.55, 0.45))), 0.0), 40.0) * 0.35 * uBody;

  // thin-film colour at the rim, kept to the brand's cool end
  vec3 film = 0.5 + 0.5 * cos(2.0 * PI * (vec3(0.55, 0.65, 0.8) + (1.0 - ndv) * 0.9 + th * 0.2));
  col = mix(col, col * film * 1.3 + film * 0.05, pow(1.0 - ndv, 2.5) * uIrid);

  // frost: a soft milky scatter
  col = mix(col, vec3(0.9, 0.93, 0.99) * (0.75 + 0.25 * ndv), uFrost * 0.55);

  vec4 clip = uViewProj * vec4(p, 1.0);
  gl_FragDepth = clip.z / clip.w * 0.5 + 0.5;
  gl_FragColor = vec4(col, cover);
}`;
