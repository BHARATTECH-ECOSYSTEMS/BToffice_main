import * as THREE from 'three';

/**
 * The Research page's one object, after the "Ascend" reference: a fat ribbed crystal tube bent into a single arch,
 * standing in a pale studio, with amber liquid in the site's Tango Orange and Pitch Yellow running through it.
 *
 * The camera faces the arch, dives beneath its left shoulder, then follows the leg down to its lower bend.
 * The orientation depends on scroll alone, so returning to a section returns to the same composition.
 *
 * `frame(now, s)` takes the page's stop value (0 … LAST).
 */

export const LAST = 8;

const A = 1000; // the arch's radius, to the tube's centre line
const H = 2200; // where the legs stop being straight and start to bend
const FOOT = -300; // the legs start below the floor, which hides their ends
const R = 175; // the tube's radius
const RIB = 40; // about the distance between two ribs: thin plates, packed close
// Rings of vertices per rib, so the silhouette shows each plate's facets and the notch between; one falls on every
// corner of a blade's facets (see `bladeDepth`).
const RIB_STEPS = 10;
const GROOVE = R * 0.11; // how far the notch between two plates cuts in
// The plate in section. Over the arch, as in the reference's opening shot, a blade cut like a prism: a low pointed
// roof, a chamfer to each side and a steep V down into the groove, every facet flat, so each catches the light as a
// line of its own and the liquid shows through the blade unbroken. ROOF and CHAMFER are how far down the groove's
// depth the roof's and the chamfer's lower edges fall.
const ROOF = 0.1;
const CHAMFER = 0.3;
// Down the legs, where the camera comes in close, a disc: a gently crowned face (so each plate is a weak lens of its
// own, and shows the liquid as a band shaded from light to dark) falling at its edges into a narrow rounded rim.
// Its groove is cut DISC as deep as a blade's, so its rim, seen almost edge on, mirrors less of the studio over the
// liquid; CROWN is the crown's share of that depth, and the rim falls as the distance from the plate's middle to the
// power RIM.
const DISC = 0.7;
const CROWN = 0.25;
const RIM = 20;
const RADIAL = 48; // vertices round the tube: the shader works out its own smooth normals, so these only shape the outline
// the liquid's radius down the legs, as a share of the tube's (a solid rod magnifies it by its index, to nearly
// two thirds), and how much thinner it runs over the arch's top
const LIQUID_R = 0.4;
const LIQUID_THIN = 0.42;
// The glass's index of refraction for red, green and blue. Real crystal splits them less; a little more shows as
// the reference's coloured fringes at the plates' edges.
const IOR = [1.49, 1.5, 1.515] as const;
const MENISCUS = 0.55; // the liquid's rounded end, its depth as a share of its radius
const PIECES = 64; // the tube is cut into this many pieces, so the ones out of view aren't drawn
const WALL = '#E7E7EF';
const FLOOR = { base: '#DCE1ED', light: '#FFFDF8' };

const LEG = H - FOOT;
const LENGTH = 2 * LEG + Math.PI * A;
const RIBS = Math.round(LENGTH / RIB);
/** where in its rib (0 groove … 1 the next groove) a point along the tube (0–1) sits */
const ribPhase = (u: number) => {
  const x = u * RIBS;
  return x - Math.floor(x);
};
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// The plates turn from discs into blades over the first stretch of the arch, from each leg: where it is, as distances
// from the arch's middle along the tube (0–1).
const BLADES: [number, number] = [(Math.PI * A) / 2 / LENGTH - 600 / LENGTH, (Math.PI * A) / 2 / LENGTH];
/** where along the tube (0–1) a point of the arch sits, by its angle from the right (0) to the left (π) */
const atAngle = (a: number) => (LEG + (Math.PI - a) * A) / LENGTH;

// The liquid, as in the reference: in the hero it fills the tube (but for a small bubble on the right shoulder); as
// the page is first scrolled it drains back down the left side, so its rounded end arrives at the top of the left leg
// just as the camera does. A short run stays put in the right leg.
const DRAIN_FULL = atAngle(Math.PI * 0.27);
const DRAIN_EMPTY = (LEG - 150) / LENGTH;
const STILL = atAngle(Math.PI * 0.25);

// How far below its crest a plate's surface lies, as a share of GROOVE, `d` from the plate's middle (0) to the groove
// (1): a blade's facets (its broad roof to d = 0.6, its narrow chamfer to 0.8, then the groove's wall), and a disc's
// crowned face and rim.
const bladeDepth = (d: number) => {
  if (d < 0.6) return (ROOF * d) / 0.6;
  if (d < 0.8) return ROOF + ((CHAMFER - ROOF) * (d - 0.6)) / 0.2;
  return CHAMFER + ((1 - CHAMFER) * (d - 0.8)) / 0.2;
};
const discDepth = (d: number) => DISC * (CROWN * d * d + (1 - CROWN) * Math.pow(d, RIM));
/** One rib, as in the reference: a thin plate of cut glass meeting the next in a sharp V notch, a blade over the arch
 * and a disc down the legs. The glass shader works out the same profile's slope for its normals (its `plateDepth()`). */
const ribRadius = (u: number) => {
  const d = Math.abs(2 * ribPhase(u) - 1);
  const blade = 1 - smoothstep(BLADES[0], BLADES[1], Math.abs(u - 0.5));
  return R - GROOVE * THREE.MathUtils.lerp(discDepth(d), bladeDepth(d), blade);
};

/** The legs snake as they come down, as in the reference: a slow S side to side and another front to back, out of step
 * with each other, so the tube winds like a twisting strand and its plates fan open round every bend. The bend grows
 * in below the shoulder, so a leg still meets the arch smoothly, and it never gets tighter than about three tube radii
 * (tighter, and the plates crowd into each other on the inside of a bend). `w` runs from 0 at the top of a leg to 1 at
 * its foot; `phase` sets the two legs out of step. */
const WIND = 2400; // the length of one whole S
const sway = (w: number, phase: number, out: THREE.Vector3) => {
  const along = (w * LEG * 2 * Math.PI) / WIND;
  const grow = smoothstep(0, 0.16, w);
  return out.set(210 * Math.sin(along + phase) * grow, 0, 170 * Math.sin(along + phase + 1.6) * grow);
};
const swayed = new THREE.Vector3();

/** The tube's centre line: up the left leg, over the half-circle top, down the right leg. Even in length. */
class ArchCurve extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super();
  }
  getPoint(t: number, out = new THREE.Vector3()) {
    const d = t * LENGTH;
    if (d <= LEG) {
      sway(1 - d / LEG, 0, swayed);
      return out.set(-A - swayed.x, FOOT + d, -swayed.z);
    }
    if (d <= LEG + Math.PI * A) {
      const a = Math.PI - (d - LEG) / A;
      return out.set(A * Math.cos(a), H + A * Math.sin(a), 0);
    }
    const down = d - LEG - Math.PI * A;
    sway(down / LEG, 2.1, swayed);
    return out.set(A + swayed.x, H - down, swayed.z);
  }
}

// ── the camera ───────────────────────────────────────────────────────────────

/**
 * The shots down the left leg (stops 1–7), as in the reference: the first scroll brings the camera in low on the left,
 * looking up along the arch, and round the left shoulder until the leg stands upright at the screen's right with the
 * liquid's rounded end at its top (the reference's "Our agency" shot). It then travels down the winding leg, every
 * section seen from a new angle, as the reference does: from above, looking down the bends; from below, the leg
 * leaning across the frame; in close at the right edge; further out with the floor's window light behind it (its
 * "Clients" shot, the cards over it).
 *
 * Each shot sits on a circle round the leg's centre at its height (the leg winds, so that centre moves): `turn` is how
 * far round from the front towards the outside (degrees; kept within about 35°, and the camera always looks away from
 * the arch, so the other leg never comes into view), `y` its height (it stops well above the floor, so the leg's foot
 * never shows), `dist` its distance from the leg, `x` where the leg stands across the screen (0 left … 1 right),
 * `tilt` how far it looks down (negative looks up) and `roll` how far the frame leans (degrees).
 */
const LEG_SHOTS = [
  { turn: 0, y: 1960, dist: 1080, x: 0.76, tilt: -3, roll: 8 },
  { turn: 12, y: 1800, dist: 1120, x: 0.76, tilt: 2, roll: 2 },
  { turn: 18, y: 1640, dist: 1240, x: 0.71, tilt: 4, roll: -3 },
  { turn: 14, y: 1480, dist: 1320, x: 0.66, tilt: 6, roll: -5 },
  { turn: 8, y: 1320, dist: 1420, x: 0.61, tilt: 3, roll: -3 },
  { turn: 4, y: 1160, dist: 1550, x: 0.56, tilt: 2, roll: 1 },
  { turn: 8, y: 1040, dist: 1750, x: 0.51, tilt: 1, roll: 0 },
];

type Pose = { pos: THREE.Vector3; look: THREE.Vector3; roll: number };
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// the hero: the arch's top filling the lower part of the screen, just clear of the headline's buttons, its legs
// running out at the bottom corners
const heroShot = (aspect: number): Pose => {
  // Keep the crest at 39% of the frame, with the outer sides just beyond the viewport.
  const distance = (A + R) / (1.08 * Math.tan(Math.PI / 12) * aspect);
  const lookY = H + A + R - 0.11 * 2 * distance * Math.tan(Math.PI / 12);
  return { pos: v(0, lookY + 140, distance), look: v(0, lookY, 0), roll: 0 };
};
// The first scroll, after the reference's frames: the arch grows and rises as the camera sinks towards it; low and
// close in front, its top crosses the screen with the liquid's end mid-frame; in under the left shoulder, leaning the
// other way, the tube climbs from the bottom left and levels off; then the camera drops down the leg, the frame
// leaning hard so the leg fills it on a steep slant, and eases back as the leg swings upright.
const PUSH: Pose[] = [
  { pos: v(-50, 3150, 2150), look: v(-50, 3150, 0), roll: 0 },
  { pos: v(-250, 2600, 1550), look: v(-150, 3150, 0), roll: 1 },
  { pos: v(-1100, 2250, 550), look: v(-450, 3000, 0), roll: -6 },
  { pos: v(-1130, 1830, 790), look: v(-940, 2400, 0), roll: 30 },
  { pos: v(-1060, 1840, 900), look: v(-1120, 2050, 0), roll: 18 },
];
// Finish beside the lower bend, as in the reel, rather than retreating to an unrelated wide shot.
const END_SHOTS = [
  { turn: 10, y: 980, dist: 1920, x: 0.47, tilt: 1, roll: -1 },
  { turn: 10, y: 920, dist: 2150, x: 0.43, tilt: 0, roll: 0 },
];

// ── shaders ──────────────────────────────────────────────────────────────────

// The floor's colour: a little darker than the wall, with soft pools of window light round the legs. Shared by the
// floor and by the glass, which traces its rays out to it.
const FLOOR_LIGHT = /* glsl */ `
  uniform vec3 uBase, uLight;
  float pool(vec2 p, vec2 c, vec2 r) { vec2 d = (p - c) / r; return exp(-dot(d, d)); }
  float rectangle(vec2 p, vec2 halfSize, float feather) {
    vec2 d = abs(p) - halfSize;
    return 1.0 - smoothstep(-feather, feather, max(d.x, d.y));
  }
  float windowPanes(vec2 p, vec2 size, float width) {
    vec2 edge = abs(mod(p + size * 0.5, size) - size * 0.5);
    vec2 bars = smoothstep(vec2(width), vec2(width + 18.0), edge);
    return bars.x * bars.y;
  }
  vec3 wallColour(vec2 p) {
    vec2 q = p - vec2(-1800.0, 2000.0);
    float opening = rectangle(q, vec2(1650.0, 1800.0), 20.0);
    float panes = windowPanes(q, vec2(1100.0, 1200.0), 35.0);
    float foliage = (0.5 + 0.5 * sin(p.x * 0.005 + sin(p.y * 0.006))) * (1.0 - smoothstep(700.0, 1650.0, p.y));
    vec3 outside = mix(vec3(0.83, 0.89, 0.96), vec3(0.56, 0.63, 0.43), foliage * 0.45);
    vec3 wall = mix(fogColor, uLight, 0.55 * pool(p, vec2(-2200.0, 2000.0), vec2(2800.0, 3500.0)));
    return mix(wall, mix(uLight, outside, panes * 0.7), opening);
  }
  vec3 floorColour(vec2 p) {
    float light = pool(p, vec2(1500.0, 500.0), vec2(900.0, 1600.0)) + 0.7 * pool(p, vec2(-600.0, 1300.0), vec2(1400.0, 400.0));
    vec2 projected = vec2(p.x - p.y * 0.36 + 900.0, p.y - 1000.0);
    float sunlit = rectangle(projected, vec2(2900.0, 3600.0), 180.0);
    float panes = windowPanes(projected, vec2(1100.0, 1250.0), 60.0);
    float caustic = 0.5 + 0.5 * sin(p.x * 0.009 + sin(p.y * 0.006) * 2.0);
    return mix(uBase, uLight, clamp(light * 0.35 + sunlit * panes * 0.8 + sunlit * caustic * 0.035, 0.0, 1.0));
  }
`;

// The glass is a solid crystal rod with the liquid running down its middle, and it is drawn as one: each fragment
// follows the line of sight into the rod. It carries the centre line's point and direction at its ring, so the
// fragment shader can work in the tube's own frame.
const GLASS_VERT = /* glsl */ `
  attribute vec3 centre;
  attribute vec3 axis;
  varying vec3 vWorld;
  varying vec3 vCentre;
  varying vec3 vAxis;
  varying float vU;
  #include <fog_pars_vertex>
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vCentre = (modelMatrix * vec4(centre, 1.0)).xyz;
    vAxis = mat3(modelMatrix) * axis;
    vU = uv.x;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
// Positions in the fragment shader are taken from the centre line at the fragment's ring: s along the axis, q across
// it. Over the short way a ray travels inside the tube the centre line is near enough straight.
const GLASS_FRAG = /* glsl */ `
  uniform samplerCube tEnv;
  uniform vec3 uIor;
  uniform float uRibs;
  uniform float uLength;
  uniform float uGroove;
  uniform float uCrown;
  uniform float uRim;
  uniform float uDisc;
  uniform float uRoof;
  uniform float uChamfer;
  uniform vec2 uBlades;
  uniform float uWall;
  uniform float uLiquid;
  uniform float uThin;
  uniform float uMeniscus;
  uniform float uEnd;
  uniform float uStill;
  uniform float uFlow;
  uniform vec3 uA;
  uniform vec3 uB;
  varying vec3 vWorld;
  varying vec3 vCentre;
  varying vec3 vAxis;
  varying float vU;
  #include <fog_pars_fragment>
  ${FLOOR_LIGHT}

  vec3 T; // the tube's axis here
  float rl; // the liquid's radius here
  float blade; // 1 where the plates are cut as blades (over the arch), 0 where they are discs (down the legs)
  float blue; // how much of the studio's cobalt comes through here

  // how far below the plates' crests the surface lies, as a share of the groove's depth, x ribs along the tube (as
  // ribRadius() has it)
  float plateDepth(float x) {
    float d = abs(2.0 * fract(x) - 1.0);
    float cut = d < 0.6 ? uRoof * d / 0.6 : d < 0.8 ? mix(uRoof, uChamfer, (d - 0.6) / 0.2) : mix(uChamfer, 1.0, (d - 0.8) / 0.2);
    return mix(uDisc * (uCrown * d * d + (1.0 - uCrown) * pow(d, uRim)), cut, blade);
  }

  // The surface's rise along the tube, averaged over two pixels round x (each spanning span ribs): the rise across
  // them. Where they cover a sliver of a plate this is the facet's true slope, and a facet's edge falls crisply within
  // two pixels; where they cover a whole plate or more the plates' rises and falls cancel, and fade out, so distant
  // ribs settle into a smooth tube rather than sparkling from pixel to pixel.
  float ribSlope(float x, float span) {
    float w = max(2.0 * span, 1e-3);
    float fade = 1.0 - smoothstep(0.35, 1.0, w);
    return (plateDepth(x - 0.5 * w) - plateDepth(x + 0.5 * w)) / w * uGroove * uRibs / uLength * fade;
  }

  // a plate's own small random lean, along the tube and round it
  vec2 plateLean(float rib) {
    return fract(sin(vec2(rib * 12.9898, rib * 78.233)) * 43758.5453) - 0.5;
  }

  // the studio in a direction, its cobalt panels greyed but towards the tube's sides, where the reference's blue
  // fringes are
  vec3 studio(vec3 d) {
    vec3 c = textureCube(tEnv, d).rgb;
    return mix(vec3(dot(c, vec3(0.3, 0.55, 0.15))), c, blue);
  }

  // Every choice in this shader keeps both its sides finite: compilers may flatten a choice into arithmetic on both
  // sides, and a NaN on the side not taken (a root of a negative, a division by nought) then turns the pixel black.

  // where a ray (from o, along d, split into q and s) goes in and out of the liquid's surface round the axis: its
  // cylinder (k = 0) or, centred at sc, a rounded end k deep; x > y when it misses
  vec2 surface(vec3 oq, vec3 dq, float os, float ds, float sc, float k) {
    float zo = k > 0.0 ? (os - sc) / k : 0.0;
    float zd = k > 0.0 ? ds / k : 0.0;
    float a = max(dot(dq, dq) + zd * zd, 1e-6);
    float b = dot(oq, dq) + zo * zd;
    float c = dot(oq, oq) + zo * zo - rl * rl;
    float h = b * b - a * c;
    float root = sqrt(max(h, 0.0));
    return h < 0.0 ? vec2(1.0, -1.0) : vec2(-b - root, -b + root) / a;
  }

  // one run of liquid between s0 and s1, its ends rounded: where the ray goes in and out
  vec2 run(vec3 oq, vec3 dq, float os, float ds, float s0, float s1) {
    vec2 t = surface(oq, dq, os, ds, 0.0, 0.0);
    if (t.x > t.y) return t;
    float sIn = os + ds * t.x;
    float sOut = os + ds * t.y;
    // past an end the ray can only come in through that end's cap (the cylinder there is empty)
    if (sIn < s0 || sIn > s1) {
      vec2 cap = surface(oq, dq, os, ds, sIn < s0 ? s0 : s1, uMeniscus);
      if (cap.x > cap.y) return cap;
      t.x = cap.x;
    }
    if (sOut < s0 || sOut > s1) t.y = surface(oq, dq, os, ds, sOut < s0 ? s0 : s1, uMeniscus).y;
    return t;
  }

  // the nearer of the liquid's two runs that the ray meets (the one that drains and the one that stays): in, out and
  // the run's two ends; x > y when it meets neither
  vec4 liquid(vec3 oq, vec3 dq, float os, float ds) {
    vec2 draining = vec2(-vU, uEnd - vU) * uLength;
    vec2 still = vec2(uStill - vU, 1.0 - vU) * uLength;
    vec2 a = run(oq, dq, os, ds, draining.x, draining.y);
    vec2 b = run(oq, dq, os, ds, still.x, still.y);
    bool hitA = a.x <= a.y && a.x > 0.0;
    bool hitB = b.x <= b.y && b.x > 0.0;
    if (hitA && (!hitB || a.x < b.x)) return vec4(a, draining);
    if (hitB) return vec4(b, still);
    return vec4(1.0, -1.0, 0.0, 0.0);
  }

  // The room along a ray that has left the glass: the floor (its far reaches fading into the wall, as the fog draws
  // them) or the plain wall. A ray the glass has bent well away from the line of sight looks out at the studio's
  // walls and windows instead, which is what fills crystal with its greys and lights.
  vec3 room(vec3 p, vec3 d, vec3 i) {
    vec3 f = p - d * (p.y / min(d.y, -1e-3));
    float depth = -(viewMatrix * vec4(f, 1.0)).z;
    vec3 ground = mix(floorColour(f.xz), fogColor, smoothstep(fogNear, fogFar, depth));
    float toWall = (-2000.0 - p.z) / min(d.z, -1e-3);
    vec3 wall = wallColour((p + d * toWall).xy);
    float wallDepth = -(viewMatrix * vec4(p + d * toWall, 1.0)).z;
    wall = mix(wall, fogColor, smoothstep(fogNear, fogFar, wallDepth));
    vec3 col = d.y < 0.0 && p.y > 0.0 && (f.z > -2000.0 || d.z >= 0.0) ? ground : d.z < 0.0 ? wall : fogColor;
    float bend = 1.0 - dot(d, i);
    return mix(col, studio(d), smoothstep(0.02, 0.4, bend) * 0.8);
  }

  // Out through the far wall (normal ne) at p into the room, for one colour's index: the colours part a little as
  // they leave, most where the wall bends them hardest. Past the critical angle the wall mirrors the ray back into
  // the glass instead, which then shows the studio (mirrored): cut glass's bright edges.
  vec3 leave(vec3 p, vec3 d, vec3 ne, vec3 i, float ior, vec3 mirrored) {
    // refract(), written out so that past the critical angle it takes no root of a negative
    float c = dot(d, ne);
    float k = 1.0 - ior * ior * (1.0 - c * c);
    vec3 x = normalize(ior * d - (ior * c - sqrt(max(k, 0.0))) * ne);
    // (eased over the last stretch before it, which a steep facet crosses within a pixel or two)
    return mix(room(p, x, i), mirrored, 1.0 - smoothstep(-0.15, 0.0, k));
  }

  void main() {
    T = normalize(vAxis);
    float x = vU * uRibs;
    float span = fwidth(x);
    blade = 1.0 - smoothstep(uBlades.x, uBlades.y, abs(vU - 0.5));
    // thinner over the arch's top than down the legs, as in the reference
    rl = uLiquid * mix(uThin, 1.0, smoothstep(0.06, 0.19, abs(vU - 0.5)));
    vec3 o = vWorld - vCentre;
    float os = dot(o, T);
    vec3 oq = o - T * os;
    vec3 i = normalize(vWorld - cameraPosition);
    vec3 radial = normalize(oq);
    // how far across the tube, as the camera sees it, from its middle (0) to its silhouette (1)
    blue = smoothstep(0.7, 0.97, length(cross(radial, normalize(i - T * dot(i, T)))));
    // No two plates of cut crystal sit quite alike: each leans a little its own way, so it catches the light and
    // shows the liquid a little differently from its neighbours (not where the ribs are too fine to tell apart). The
    // lean passes from one plate to the next over a pixel or so either side of the groove, or the groove's line breaks
    // into steps.
    float groove = floor(x + 0.5);
    vec2 lean = mix(plateLean(groove - 1.0), plateLean(groove), smoothstep(-span, span, x - groove)) * (1.0 - smoothstep(0.1, 0.4, span));
    float slope = ribSlope(x, span);
    vec3 n = normalize(radial - T * (slope + lean.x * 0.12) + cross(T, radial) * lean.y * 0.05);
    // a rim seen almost edge on can tilt its normal past the line of sight; keep it just facing the camera
    n = normalize(n - i * max(0.0, dot(n, i) + 0.05));

    // into the rod and across it to the far wall (taken at the ribs' mean radius, with its own rib's slope)
    vec3 d = refract(i, n, 1.0 / uIor.g);
    float ds = dot(d, T);
    vec3 dq = d - T * ds;
    float a = max(dot(dq, dq), 1e-6);
    float b = dot(oq, dq);
    float c = dot(oq, oq) - uWall * uWall;
    float tw = (-b + sqrt(max(b * b - a * c, 0.0))) / a;
    vec3 e = o + d * tw;
    float se = os + ds * tw;
    // The far wall's ribs, seen through the lens, can change far faster from pixel to pixel than the near ones (behind
    // a steep chamfer, by several ribs a pixel), so they are averaged over their own span on screen, or they break
    // into dotted lines; and they keep only part of their slope, less behind a steep facet, whose thin line would
    // otherwise show them as dashes. (Clamped: a helper pixel past the triangle's edge traces a wild ray, and must
    // not throw the derivative far out.)
    float farRib = (vU + se / uLength) * uRibs;
    float farSlope = ribSlope(farRib, 1.5 * clamp(fwidth(farRib), 0.0, 1.0)) * 0.5 * (1.0 - smoothstep(0.3, 1.2, abs(slope)));
    vec3 ne = normalize(normalize(e - T * se) - T * farSlope);
    vec3 p = vCentre + e;
    vec3 mirrored = studio(reflect(d, -ne));
    #ifdef DISPERSION
      vec3 seen = vec3(leave(p, d, ne, i, uIor.r, mirrored).r, leave(p, d, ne, i, uIor.g, mirrored).g, leave(p, d, ne, i, uIor.b, mirrored).b);
    #else
      vec3 seen = leave(p, d, ne, i, uIor.g, mirrored);
    #endif
    // the glass's own faint cool body, deeper the longer the way through it
    seen *= pow(vec3(0.96, 0.975, 1.0), vec3(tw / 200.0));

    vec4 l = liquid(oq, dq, os, ds);
    if (l.x <= l.y) {
      float sp = os + ds * l.x;
      vec3 q = o + d * l.x - T * sp;
      vec3 nl = normalize(q + T * (sp - clamp(sp, l.z, l.w)) / (uMeniscus * uMeniscus));
      // The liquid is never quite still: slow ripples round its surface tip it back and forth along the tube, and
      // fine ones, close-set along it and wavering round it, draw its reflections out into streaks of gold and brown
      // across each band; a sway round it, which changes from one plate's view to the next, moves each band's glint
      // (not where the plates are too fine to tell apart).
      vec3 around = normalize(q);
      float ripple = sin(dot(around, vec3(2.6, 1.9, 2.3)) + sp * 0.013 + uFlow * 0.8) + 0.6 * sin(dot(around, vec3(-4.1, 3.3, 1.7)) - sp * 0.021 - uFlow * 0.6);
      float fine = sin(sp * 0.35 + 1.8 * sin(dot(around, vec3(2.3, -1.9, 2.7)) * 1.7 - uFlow * 0.5) + uFlow * 0.9) + 0.6 * sin(sp * 0.83 - 2.5 * sin(dot(around, vec3(-3.1, 2.2, 1.4)) * 1.3 + uFlow * 0.6));
      float sway = sin(sp * 0.11 + dot(around, vec3(1.3, -0.8, 1.1)) + uFlow * 0.4);
      float near = 1.0 - smoothstep(0.1, 0.4, span);
      nl = normalize(nl + T * (0.16 * ripple + 0.18 * fine * near) + cross(T, around) * 0.15 * sway * near);
      float along = vU + sp / uLength;
      // Amber, drifting between the brand's yellow and orange along the tube. It takes its colour by absorbing
      // (Beer–Lambert): what a ray across its whole width keeps is that amber, so its thin edges are paler and its
      // middle deeper. (Capped: a ray bent to run along the tube through a steep facet would cross so much of it that
      // the facet's thin line would turn to dark dashes.)
      vec3 tint = mix(uA, uB, 0.4 + 0.3 * sin(along * 40.0 - uFlow * 0.7)) * 0.85;
      float path = min((l.y - l.x) / (2.0 * uLiquid), 1.2);
      vec3 r = reflect(d, nl);
      float sky = smoothstep(-0.7, 0.3, r.y);
      // Behind the legs' discs its surface is glossy, like gilt, under a plain light: bright gold where it mirrors the
      // ceiling and the pale floor, deep brown where it looks straight down. (The studio cube's many panels would
      // stripe every band; this way each plate's lens sweeps its band once from light to dark.)
      vec3 gilt = pow(max(tint, 0.01), vec3(path)) * mix(tint * 0.4, vec3(1.05, 0.72, 0.24), sky);
      // Behind the arch's flat blades, and from afar, as in the reference's opening shots, it reads as a translucent
      // honey instead, its density drifting in long swirls along the tube from pale tan to deep orange, its gloss
      // faint. (Its depth of colour goes by its share of the liquid's own width, so the thin thread over the arch and
      // the full legs seen from afar take the same amber.)
      float swirl = 0.5 + 0.5 * sin(along * 23.0 + 1.3 - uFlow * 0.3) * sin(along * 9.0 - uFlow * 0.2);
      float across = min((l.y - l.x) / (2.0 * rl), 1.0);
      vec3 honey = pow(max(mix(uA, uB, 0.25) * 0.8, 0.01), vec3(across * mix(0.3, 1.5, swirl))) * mix(0.85, 1.1, sky);
      seen *= mix(gilt, honey, max(blade, smoothstep(1300.0, 2200.0, length(vWorld - cameraPosition))));
      // and the window, a pale yellow glint, brighter in some plates than others
      seen += pow(max(dot(r, normalize(vec3(0.6, 0.35, 0.7))), 0.0), 18.0) * vec3(1.0, 0.86, 0.55) * 0.5 * (1.0 + 1.2 * lean.x);
    }

    float fresnel = 0.04 + 0.96 * pow(1.0 - clamp(-dot(n, i), 0.0, 1.0), 5.0);
    vec3 col = mix(seen, studio(reflect(i, n)), fresnel);
    vec3 key = normalize(vec3(0.45, 0.8, 0.55));
    // A chamfer is flat, so where it faces one of the tall windows to either side it lights all along at once: a
    // crisp bright line beside each plate's edge (not on the steep wall below it), brighter on some plates than others
    // as they lean.
    float chamfer = smoothstep(0.5, 0.9, abs(slope)) * (1.0 - smoothstep(1.6, 2.6, abs(slope)));
    float window = max(dot(n, normalize(vec3(0.8, 0.3, 0.5) - i)), dot(n, normalize(vec3(-0.8, 0.3, 0.5) - i)));
    col += pow(max(dot(n, normalize(key - i)), 0.0), 140.0) * 0.9 + chamfer * pow(max(window, 0.0), 12.0);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const FLOOR_VERT = /* glsl */ `
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
// the fog takes the floor into the wall towards the horizon
const FLOOR_FRAG = /* glsl */ `
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  ${FLOOR_LIGHT}
  void main() {
    gl_FragColor = vec4(floorColour(vWorld.xz), 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const WALL_FRAG = /* glsl */ `
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  ${FLOOR_LIGHT}
  void main() {
    gl_FragColor = vec4(wallColour(vWorld.xy), 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/**
 * What the glass reflects and refracts: a bright, cool studio with big window softboxes and a pale floor, like the
 * reference's. The softboxes must be far brighter than the walls, or the glass's highlights come out dull grey; the
 * cobalt panels give the ribs' edges the reference's blue fringe.
 */
function studioEnvironment() {
  const scene = new THREE.Scene();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const add = (geo: THREE.BufferGeometry, color: string, place: (m: THREE.Mesh) => void, glow = 1) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(glow), side: THREE.BackSide });
    const mesh = new THREE.Mesh(geo, mat);
    place(mesh);
    scene.add(mesh);
    geos.push(geo);
    mats.push(mat);
  };
  add(new THREE.SphereGeometry(50, 32, 16), '#c4c9d3', () => {});
  // the floor, pale and warm
  add(new THREE.CircleGeometry(48, 32), '#eeebe4', (m) => {
    m.rotation.x = Math.PI / 2;
    m.position.y = -12;
  });
  const centre = new THREE.Vector3();
  const box = (w: number, h: number, x: number, y: number, z: number, color: string, glow: number) =>
    add(
      new THREE.PlaneGeometry(w, h),
      color,
      (m) => {
        m.position.set(x, y, z);
        m.lookAt(centre);
        (m.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
      },
      glow,
    );
  // a tall window to the right and one behind, two panels overhead, cobalt panels low to each side
  box(26, 40, 44, 6, 8, '#ffffff', 3.5);
  box(30, 34, -8, 8, -44, '#ffffff', 3);
  box(36, 14, -10, 36, 8, '#f6f7ff', 2.2);
  box(22, 10, 20, 34, -16, '#ffffff', 2.5);
  box(18, 30, -44, 4, 12, '#1f6cff', 1.5);
  box(12, 22, 30, 4, -34, '#2a78ff', 1.4);
  box(20, 8, 40, -4, 22, '#1f6cff', 1.4);
  // thin strips, for the long bright edges along each rib
  box(70, 2.5, 0, 22, 30, '#ffffff', 8);
  box(2.5, 50, 30, 10, -30, '#ffffff', 6);
  box(2.5, 46, -30, 10, 30, '#ffffff', 5);
  return { scene, dispose: () => (geos.forEach((g) => g.dispose()), mats.forEach((m) => m.dispose())) };
}

/**
 * The glass tube along `curve`, a ring of vertices every `step` along it, its radius following `radius(u)` so it rises
 * and falls into ribs. uv.x is the place along the curve (0–1); each vertex also carries its ring's point on the
 * centre line and the line's direction there, for the glass shader's frame.
 */
function tubeGeometry(curve: THREE.Curve<THREE.Vector3>, radius: (u: number) => number, step: number, radial: number) {
  const segments = Math.max(1, Math.round(LENGTH / step));
  const frames = curve.computeFrenetFrames(segments, false);
  const count = (segments + 1) * (radial + 1);
  const pos = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const centre = new Float32Array(count * 3);
  const axis = new Float32Array(count * 3);
  const p = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    curve.getPoint(u, p);
    const n = frames.normals[i];
    const b = frames.binormals[i];
    const t = frames.tangents[i];
    const r = radius(u);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      pos[k * 3] = p.x + r * (c * n.x + s * b.x);
      pos[k * 3 + 1] = p.y + r * (c * n.y + s * b.y);
      pos[k * 3 + 2] = p.z + r * (c * n.z + s * b.z);
      p.toArray(centre, k * 3);
      t.toArray(axis, k * 3);
      uv[k * 2] = u;
      uv[k * 2 + 1] = j / radial;
      k++;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('centre', new THREE.BufferAttribute(centre, 3));
  geo.setAttribute('axis', new THREE.BufferAttribute(axis, 3));
  return { geo, segments };
}

/**
 * Cuts a tube into `pieces` along its length, so the renderer can skip the pieces outside the camera's view: the
 * camera only ever sees a stretch of the tube, and drawing all of it cost frames.
 */
function cut(tube: { geo: THREE.BufferGeometry; segments: number }, radial: number, pieces: number) {
  const { geo, segments } = tube;
  const ring = radial + 1;
  const attrs = ['position', 'uv', 'centre', 'axis'] as const;
  const out: THREE.BufferGeometry[] = [];
  for (let c = 0; c < pieces; c++) {
    const r0 = Math.floor((segments * c) / pieces);
    const r1 = Math.floor((segments * (c + 1)) / pieces);
    const part = new THREE.BufferGeometry();
    for (const name of attrs) {
      const src = geo.getAttribute(name) as THREE.BufferAttribute;
      const size = src.itemSize;
      part.setAttribute(name, new THREE.BufferAttribute((src.array as Float32Array).slice(r0 * ring * size, (r1 + 1) * ring * size), size));
    }
    const index = new Uint32Array((r1 - r0) * radial * 6);
    let q = 0;
    for (let i = 0; i < r1 - r0; i++)
      for (let j = 0; j < radial; j++) {
        const a = i * ring + j;
        const b = a + ring;
        index.set([a, a + 1, b, b, a + 1, b + 1], q);
        q += 6;
      }
    part.setIndex(new THREE.BufferAttribute(index, 1));
    part.computeBoundingSphere();
    out.push(part);
  }
  geo.dispose();
  return out;
}

/** Scroll → the camera's way along its path: always moving, as in the reference, but easing through each stop. */
const travel = (s: number) => {
  const k = Math.min(LAST - 1, Math.floor(s));
  const f = s - k;
  const eased = 0.5 - 0.5 * Math.cos(Math.PI * f);
  return k + 0.4 * f + 0.6 * eased;
};

export interface GlassTube {
  frame: (now: number, s: number) => void;
  /** true once the stage has drawn its first frame, so the headline can rise in over it */
  ready: () => boolean;
  destroy: () => void;
}

export function mountGlassTube({ canvas, stage, lite }: { canvas: HTMLCanvasElement; stage: HTMLElement; lite: boolean }): GlassTube {
  const gl = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  gl.debug.checkShaderErrors = true;
  gl.debug.onShaderError = (context, program, vertex, fragment) => {
    // A shader that fails to compile leaves the program's log saying only that; the reason is in the shader's own log.
    console.error('Research studio shader:', context.getProgramInfoLog(program), context.getShaderInfoLog(vertex), context.getShaderInfoLog(fragment));
    throw new Error('The Research studio shader could not compile.');
  };
  gl.toneMapping = THREE.NeutralToneMapping;
  gl.toneMappingExposure = 1;
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(d: T) => (disposables.push(d), d);

  const scene = new THREE.Scene();
  // a plain colour background is drawn by clearing, so it is not tone mapped and matches the page's cream exactly
  scene.background = new THREE.Color(WALL);
  // What the glass mirrors: the studio, caught once in a cube. With mipmaps, so that where a steep facet sweeps its
  // look across the studio within a pixel or two the cube is read blurred to match, rather than as broken dashes of
  // its bright strips.
  const studio = studioEnvironment();
  const envTarget = keep(
    new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }),
  );
  new THREE.CubeCamera(0.1, 200, envTarget).update(gl, studio.scene);
  studio.dispose();
  const fog = new THREE.Fog(WALL, 3200, 9000);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(30, 1.6, 10, 60000);

  const curve = new ArchCurve();
  const glassTube = tubeGeometry(curve, ribRadius, LENGTH / RIBS / RIB_STEPS, RADIAL);
  const glassParts = cut(glassTube, RADIAL, PIECES).map(keep);
  const floorColours = () => ({ uBase: { value: new THREE.Color(FLOOR.base) }, uLight: { value: new THREE.Color(FLOOR.light) } });

  // the floor (it hides the legs' feet below it), far below the shots: the camera never goes down to it
  const floorMat = keep(
    new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, floorColours()]),
      vertexShader: FLOOR_VERT,
      fragmentShader: FLOOR_FRAG,
      fog: true,
    }),
  );
  const floorGeo = keep(new THREE.PlaneGeometry(80000, 80000));
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.renderOrder = -2;
  scene.add(floor);

  const wallMat = keep(new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, floorColours()]),
    vertexShader: FLOOR_VERT,
    fragmentShader: WALL_FRAG,
    fog: true,
  }));
  const wall = new THREE.Mesh(keep(new THREE.PlaneGeometry(26000, 16000)), wallMat);
  wall.position.set(0, 4000, -2000);
  wall.renderOrder = -1;
  scene.add(wall);

  // the glass draws the liquid too, where its rays meet it, so the liquid needs no mesh of its own
  const glass = keep(
    new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        floorColours(),
        {
          tEnv: { value: null },
          uIor: { value: new THREE.Vector3(...IOR) },
          uRibs: { value: RIBS },
          uLength: { value: LENGTH },
          uGroove: { value: GROOVE },
          uCrown: { value: CROWN },
          uRim: { value: RIM },
          uDisc: { value: DISC },
          uRoof: { value: ROOF },
          uChamfer: { value: CHAMFER },
          uBlades: { value: new THREE.Vector2(...BLADES) },
          uWall: { value: R - GROOVE / 4 },
          uLiquid: { value: LIQUID_R * R },
          uThin: { value: LIQUID_THIN },
          uMeniscus: { value: MENISCUS },
          uEnd: { value: DRAIN_FULL },
          uStill: { value: STILL },
          uFlow: { value: 0 },
          uA: { value: new THREE.Color('#D77616') },
          uB: { value: new THREE.Color('#FFC34B') },
        },
      ]),
      // on weaker devices the colours leave the glass together, which saves two looks into the room a fragment
      defines: lite ? {} : { DISPERSION: '' },
      vertexShader: GLASS_VERT,
      fragmentShader: GLASS_FRAG,
      fog: true,
    }),
  );
  glass.uniforms.tEnv.value = envTarget.texture;
  const pieces = glassParts.map((part) => {
    const mesh = new THREE.Mesh(part, glass);
    scene.add(mesh);
    return { sphere: part.boundingSphere!, mesh };
  });

  // ── the camera's path
  const legShot = (shot: (typeof LEG_SHOTS)[number], aspect: number): Pose => {
    const turn = THREE.MathUtils.degToRad(shot.turn);
    // the left leg's centre at this height (it winds, so it is not straight below the shoulder)
    const leg = curve.getPoint((shot.y - FOOT) / LENGTH);
    const pos = v(leg.x - shot.dist * Math.sin(turn), shot.y, leg.z + shot.dist * Math.cos(turn));
    const toLeg = v(leg.x - pos.x, 0, leg.z - pos.z).normalize();
    // turn away from the leg so it stands at `x` across the screen
    const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
    const off = Math.atan((shot.x * 2 - 1) * Math.tan(half));
    const look = toLeg.applyAxisAngle(v(0, 1, 0), off);
    look.y = -Math.tan(THREE.MathUtils.degToRad(shot.tilt));
    return { pos, look: pos.clone().add(look.multiplyScalar(shot.dist)), roll: shot.roll };
  };
  // The path's points: the hero and the first scroll's poses (all within the first stop), then the leg shots with a
  // point between each pair, and the pull back (two steps a stop). The camera glides through them on a smooth curve.
  let rail: THREE.CatmullRomCurve3;
  let aim: THREE.CatmullRomCurve3;
  let lean: THREE.CatmullRomCurve3;
  const buildPath = (aspect: number) => {
    const poses: Pose[] = [heroShot(aspect), ...PUSH];
    LEG_SHOTS.forEach((shot, i) => {
      const before = LEG_SHOTS[i - 1];
      if (before) {
        // halfway between two shots, a little further out and level, so the camera eases off the leg as it swings
        const mid = { turn: (before.turn + shot.turn) / 2, y: (before.y + shot.y) / 2, dist: (before.dist + shot.dist) / 2 + 60, x: (before.x + shot.x) / 2, tilt: (before.tilt + shot.tilt) / 2, roll: 0 };
        poses.push(legShot(mid, aspect));
      }
      poses.push(legShot(shot, aspect));
    });
    poses.push(...END_SHOTS.map((shot) => legShot(shot, aspect)));
    rail = new THREE.CatmullRomCurve3(
      poses.map((q) => q.pos),
      false,
      'centripetal',
    );
    aim = new THREE.CatmullRomCurve3(
      poses.map((q) => q.look),
      false,
      'centripetal',
    );
    // the lean is one number, carried on a curve of its own so it swings as smoothly as the camera moves
    lean = new THREE.CatmullRomCurve3(poses.map((q, i) => v(q.roll, i, 0)));
  };
  // `p` (0 … LAST) → how far along the path's points
  const pathAt = (p: number) => {
    const first = PUSH.length + 1;
    const index = p <= 1 ? p * first : first + (p - 1) * 2;
    return Math.min(1, index / (rail.points.length - 1));
  };

  const resize = () => {
    const width = stage.clientWidth || 1;
    const height = stage.clientHeight || 1;
    camera.aspect = width / height;
    // narrower screens see less to the sides; step back a little so the arch stays whole
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    gl.setPixelRatio(Math.min(lite ? 1 : 1.5, window.devicePixelRatio || 1));
    gl.setSize(width, height, false);
    buildPath(camera.aspect);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();
  const destroy = () => {
    ro.disconnect();
    disposables.forEach((d) => d.dispose());
    gl.dispose();
    gl.forceContextLoss();
  };
  try {
    gl.compile(scene, camera);
  } catch (error) {
    destroy();
    throw error;
  }

  // the opening's clock starts on the frame after the first draw, which uploads the tube and can stall
  let born = Infinity;
  let primed = false;
  const look = new THREE.Vector3();
  const leaning = new THREE.Vector3();

  return {
    frame: (now, sIn) => {
      if (born === Infinity) {
        if (primed) born = now;
        primed = true;
      }
      const s = Math.min(LAST, Math.max(0, sIn));
      // the opening, as in the reference: the arch is there from the first frame and the camera eases back a touch
      // while the headline rises in; scrolling before it has finished hurries it to its end
      const age = born === Infinity ? 0 : (now - born) / 2400;
      const push = s > 0.05 ? 0 : Math.pow(1 - Math.min(1, age), 3);

      const p = travel(s);
      const u = pathAt(p);
      rail.getPoint(u, camera.position);
      aim.getPoint(u, look);
      camera.position.z -= push * 220;
      camera.position.y -= push * 50;
      camera.lookAt(look);

      lean.getPoint(u, leaning);
      // Orientation is a function of scroll alone: reversing scroll retraces the same shot without wobble.
      camera.rotateZ(THREE.MathUtils.degToRad(leaning.x));

      // never a piece the camera is inside or right against: it would pass across the lens
      for (const piece of pieces) piece.mesh.visible = piece.sphere.center.distanceTo(camera.position) > piece.sphere.radius + 80;

      // Let the studio and its window light emerge as the camera reaches the lower bend.
      const open = smoothstep(LAST - 1, LAST, p);
      fog.near = 3200 + open * 2400;
      fog.far = 9000 + open * 4000;
      glass.uniforms.uFlow.value = now / 1000 + p * 3;
      // it runs back as the camera dives, so its end stays in frame, and settles as the leg shot does
      glass.uniforms.uEnd.value = THREE.MathUtils.lerp(DRAIN_FULL, DRAIN_EMPTY, smoothstep(0.05, 0.92, p));
      gl.render(scene, camera);
    },
    ready: () => born !== Infinity,
    destroy,
  };
}
