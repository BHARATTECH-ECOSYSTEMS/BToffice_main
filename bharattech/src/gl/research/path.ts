import * as THREE from 'three';

/**
 * The Research story's stops and the swarm's form at each, as pure functions of the scroll story value `s`
 * (0 … LAST), so scrolling back, or jumping several stops at once, always lands on the same frame.
 *
 * Stops: the hero (the 3D word), our research (an open field), the six domains in DOMAINS order (the home reels'
 * main objects), where we work and the closer (a wide calm field).
 */
export const FORMS = ['word', 'field', 'cube', 'slab', 'arm', 'globe', 'dome', 'phone', 'wide', 'wide'] as const;
export type FormName = (typeof FORMS)[number];
export const LAST = FORMS.length - 1;

export const FOV = 30;
/** Each stop's form sits this much further along −z than the last, so the camera always travels forward. */
export const GAP = 9;
/** Where stop `k`'s form is centred. */
export const stopCentre = (k: number): [number, number, number] => [0, 0, -k * GAP];

/** Which side of the screen a stop's form takes: the domains alternate (the first on the right, its copy on the left). */
export const sideOf = (stop: number): -1 | 0 | 1 => (stop < 2 || stop > 7 ? 0 : stop % 2 ? -1 : 1);

// Each stop seen from its own angle, as the reference keeps finding a new view of the one object: how far round the
// form the camera stands (yaw) and how far above it (pitch), in degrees. The globe faces India squarely.
const VIEWS: { yaw: number; pitch: number }[] = [
  { yaw: 0, pitch: 0 }, // hero (the word: framed by its own leg)
  { yaw: 0, pitch: 4 }, // our research: the open field
  { yaw: 28, pitch: 22 }, // GI Rivinity's cube
  { yaw: -24, pitch: 30 }, // Rivinity Core's slab, from above
  { yaw: 24, pitch: 12 }, // the IoT robot arm, side on, so its reach reads as a silhouette
  { yaw: 0, pitch: 8 }, // the Geo globe
  { yaw: -22, pitch: 16 }, // the Defense dome
  { yaw: 16, pitch: 4 }, // the Miniature phone
  { yaw: 0, pitch: 6 }, // where we work: the wide field
  { yaw: 0, pitch: 2 }, // the closer
];
const tan = Math.tan(((FOV / 2) * Math.PI) / 180);
/**
 * How far from a form (radius 1) the camera stands: close enough that it spans 60% of the screen's height, but on
 * narrow or tall windows far enough back that its silhouette (half-width 1 / √(d² − 1) on the −1…1 screen scale,
 * over tan × aspect) stays inside the 36% beside the copy column.
 */
const formDist = (aspect: number) => Math.max(2 / (0.6 * 2 * tan), Math.sqrt(1 + (1 / (0.36 * tan * aspect)) ** 2));
const UP = new THREE.Vector3(0, 1, 0);

/** Where the camera stands at stop `k` (k ≥ 1), relative to that stop's centre, on a window `aspect` wide. */
export function stopEye(k: number, aspect: number): [number, number, number] {
  const { yaw, pitch } = VIEWS[k];
  const y = (yaw * Math.PI) / 180;
  const p = (pitch * Math.PI) / 180;
  const dist = formDist(aspect);
  return [Math.sin(y) * Math.cos(p) * dist, Math.sin(p) * dist, Math.cos(y) * Math.cos(p) * dist];
}

export interface Pose {
  pos: [number, number, number];
  look: [number, number, number];
  /** degrees */
  roll: number;
}

/** Scroll within a leg → how far along it: always moving, as in the reference, but easing through each stop. */
const travel = (t: number) => 0.4 * t + 0.6 * (0.5 - 0.5 * Math.cos(Math.PI * t));

/**
 * The camera's whole way through the story. The hero's leg flies into the word's `letter` and through it; every
 * later leg dives through the current form's centre (inside its swarm) and comes out at the next stop's view.
 * Returns `poseAt(s, aspect, orbit)`, where `orbit` is a small turn (radians) round the nearest form that the caller
 * may drift slowly over time; it fades out towards the middle of each dive, so it never jolts a scroll.
 */
export function storyPath(hero: { width: number; letter: [number, number, number] }) {
  let built: { aspect: number; rail: THREE.CatmullRomCurve3; aim: THREE.CatmullRomCurve3; count: number } | null = null;
  const build = (aspect: number) => {
    const rail: THREE.Vector3[] = [];
    const aim: THREE.Vector3[] = [];
    // the hero: the word spans 62% of the width, just below the middle (the headline above it, the actions below)
    const heroDist = hero.width / 0.62 / 2 / (tan * aspect);
    const lookY = 0.04 * 2 * heroDist * tan;
    const letter = new THREE.Vector3(...hero.letter);
    rail.push(new THREE.Vector3(0, lookY, heroDist), letter.clone().add(new THREE.Vector3(0, 0, 1.1)), letter.clone().add(new THREE.Vector3(0, 0, -0.7)));
    aim.push(new THREE.Vector3(0, lookY, 0), letter.clone(), letter.clone().add(new THREE.Vector3(0, 0, -3)));
    const dist = formDist(aspect);
    for (let k = 1; k <= LAST; k++) {
      const centre = new THREE.Vector3(...stopCentre(k));
      const pos = centre.clone().add(new THREE.Vector3(...stopEye(k, aspect)));
      // turn the aim, not the camera, so the form sits to its side of the screen and its copy has the other
      const forward = centre.clone().sub(pos).normalize();
      const right = forward.clone().cross(UP).normalize();
      const look = centre.clone().addScaledVector(right, -sideOf(k) * 0.34 * dist * tan * aspect);
      rail.push(pos);
      aim.push(look);
      if (k < LAST) {
        // the dive: through this form's centre, looking ahead to the next
        rail.push(centre.clone());
        aim.push(new THREE.Vector3(...stopCentre(k + 1)));
      }
    }
    return {
      aspect,
      rail: new THREE.CatmullRomCurve3(rail, false, 'centripetal'),
      aim: new THREE.CatmullRomCurve3(aim, false, 'centripetal'),
      count: rail.length,
    };
  };
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  return (sIn: number, aspect: number, orbit: number): Pose => {
    if (!built || built.aspect !== aspect) built = build(aspect);
    const s = Math.min(LAST, Math.max(0, sIn));
    const k = Math.min(LAST - 1, Math.floor(s));
    const t = s - k;
    // rail point index: the hero's leg runs over points 0–3, each later leg k over 2k+1 → 2k+3 (through its centre)
    const index = k === 0 ? 3 * travel(t) : 2 * k + 1 + 2 * travel(t);
    const u = index / (built.count - 1);
    built.rail.getPoint(u, pos);
    built.aim.getPoint(u, look);
    // the slow orbit, round whichever form is nearer, gone by the middle of a dive
    const hold = k === 0 && t < 0.5 ? 0 : 0.5 + 0.5 * Math.cos(2 * Math.PI * t);
    if (orbit && hold > 0) {
      const centre = new THREE.Vector3(...stopCentre(t < 0.5 ? k : k + 1));
      pos.sub(centre).applyAxisAngle(UP, orbit * hold).add(centre);
    }
    // a slight lean through each dive, alternating, and none at the stops
    const roll = k === 0 ? 0 : (k % 2 ? 4 : -4) * Math.sin(Math.PI * t);
    return { pos: pos.toArray() as [number, number, number], look: look.toArray() as [number, number, number], roll };
  };
}

/** The two forms on screen at `s`: the swarm is `t` of the way from `from` to `to`. */
export function pairAt(s: number, sequence: readonly FormName[] = FORMS) {
  const last = Math.max(1, sequence.length - 1);
  const x = Math.min(last, Math.max(0, s));
  const index = Math.min(last - 1, Math.floor(x));
  return { from: sequence[index], to: sequence[Math.min(sequence.length - 1, index + 1)], index, t: x - index };
}
