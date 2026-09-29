import { c3, clamp01, easeIO, rng, smooth, type Stage } from './stage';

export const DURATION = 8;
const TAU = Math.PI * 2;

/** Cursor in world units; `on` eases 0→1 while the cursor is over the scene. */
export interface Pointer {
  x: number;
  y: number;
  on: number;
}
export interface Label {
  id: string;
  text: string;
  x: number;
  y: number;
  a: number;
  hot?: boolean;
  tone?: 'violet' | 'tango' | 'pitch';
}
export interface Overlay {
  labels: Label[];
  caption: string;
  step: number;
  steps: number;
  tip?: { x: number; y: number; text: string; tone: 'violet' | 'tango' | 'pitch' };
}
export interface Scene {
  update(t: number, p: Pointer): Overlay;
  /** while the cursor is over the scene, time settles here so there is something to explore */
  hold?: number;
}
export type SceneName = 'memory' | 'connect' | 'learn' | 'origin';
export const SCENE_NAMES: SceneName[] = ['memory', 'connect', 'learn', 'origin'];

/** Pushes a point away from the cursor, with a soft falloff. */
const out = { x: 0, y: 0 };
function push(x: number, y: number, p: Pointer, radius = 1.6, k = 0.9) {
  out.x = 0;
  out.y = 0;
  if (p.on < 0.01) return out;
  const dx = x - p.x, dy = y - p.y;
  const d2 = dx * dx + dy * dy + 0.02;
  const f = p.on * k * Math.exp(-d2 / (radius * radius));
  const d = Math.sqrt(d2);
  out.x = (dx / d) * f;
  out.y = (dy / d) * f;
  return out;
}
const near = (p: Pointer, x: number, y: number, r: number) => p.on > 0.25 && (p.x - x) ** 2 + (p.y - y) ** 2 < r * r;
const stepOf = (t: number, marks: number[]) => marks.filter((m) => t >= m).length - 1;

/** 1. It remembers: context streams along a timeline and stays where it lands. */
const DAYS = ['Day 1', 'Day 4', 'Day 12', 'Day 30'];
const DAY_TIPS = [
  'Session one. Context is captured.',
  'Picks up where it left off.',
  'Links earlier work to the new question.',
  'A month on, nothing has been lost.',
];
const MEM_CAPTIONS = ['A session runs. Context is captured.', 'It is kept between sessions, not thrown away.', 'Later sessions start with what it already knows.'];

function memory(s: Stage): Scene {
  const R = rng(11);
  const { violet, tango, pitch, dim } = s.palette;
  const V = c3(violet), T = c3(tango), P = c3(pitch), D = c3(dim);
  const N = 1500, RINGS = 4, RING_PTS = 60, LINE = 260;
  const cloud = s.cloud(N + RINGS * RING_PTS + LINE);
  const X0 = -6.6, X1 = 6.6, SPEED = 2.3, LY = -1.5;
  const nodeX = [-4.6, -1.5, 1.6, 4.7];
  const pts = Array.from({ length: N }, () => {
    const k = Math.floor(R() * 4);
    return {
      k,
      birth: R() * 4.6,
      keep: R() < 0.72,
      r: 0.25 + R() * 0.95,
      th: R() * TAU,
      w: (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.9),
      h: Math.pow(R(), 0.8) * 3.3,
      wob: R() * TAU,
      col: R() < 0.16 ? (R() < 0.5 ? T : P) : V,
      sz: 2.2 + R() * 2.4,
    };
  });
  const first = nodeX.map((_, k) => pts.reduce((m, p) => (p.keep && p.k === k ? Math.min(m, p.birth + (nodeX[k] - X0) / SPEED) : m), 99));
  return {
    hold: 6,
    update(t, ptr) {
      const fadeOut = 1 - smooth((t - (DURATION - 0.8)) / 0.8);
      const hot = nodeX.findIndex((x, k) => t > first[k] + 0.6 && near(ptr, x, LY + 1.4, 1.5));
      let i = 0;
      for (const p of pts) {
        const target = p.keep ? nodeX[p.k] : X1 + 1;
        const arrive = p.birth + (target - X0) / SPEED;
        const age = t - p.birth;
        if (age < 0) { cloud.hide(i++); continue; }
        let x: number, y: number, z: number, a: number, sz = p.sz;
        if (t < arrive) {
          x = X0 + age * SPEED;
          y = Math.sin(x * 1.3 + p.wob) * 0.16 + LY;
          z = Math.cos(p.wob) * 0.3;
          a = smooth(age / 0.4) * fadeOut;
        } else {
          const u = smooth((t - arrive) / 0.55);
          const th = p.th + p.w * (t - arrive);
          const cx = target + Math.cos(th) * p.r;
          const cz = Math.sin(th) * p.r * 0.7;
          const cy = LY + 0.3 + p.h + Math.sin(th * 2) * 0.05;
          const ly = Math.sin(target * 1.3 + p.wob) * 0.16 + LY;
          x = target + (cx - target) * u;
          y = ly + (cy - ly) * u;
          z = cz * u;
          a = (p.keep ? 1 : 1 - smooth((t - arrive) / 0.9)) * fadeOut * (0.55 + 0.45 * u);
          if (p.keep && hot >= 0) {
            if (p.k === hot) { a = Math.min(1, a * 1.5); sz *= 1.45; } else a *= 0.4;
          }
        }
        const f = push(x, y, ptr);
        cloud.set(i++, x + f.x, y + f.y, z, p.col, sz, a);
      }
      for (let k = 0; k < RINGS; k++) {
        const on = smooth((t - first[k]) / 0.5);
        const rad = 0.42 + 0.05 * Math.sin(TAU * (t / 2) + k) + (k === hot ? 0.12 : 0);
        for (let j = 0; j < RING_PTS; j++) {
          const a = (j / RING_PTS) * TAU;
          cloud.set(i++, nodeX[k] + Math.cos(a) * rad, LY + Math.sin(a) * rad * 0.9, 0, T, k === hot ? 4.6 : 3.4, on * fadeOut * 0.9);
        }
      }
      for (let j = 0; j < LINE; j++) {
        const x = X0 + ((X1 - X0) * j) / (LINE - 1);
        const f = push(x, LY, ptr, 1.1, 0.35);
        cloud.set(i++, x + f.x, LY + f.y, -0.4, D, 1.6, 0.5 * fadeOut);
      }
      cloud.flush();

      const labels: Label[] = nodeX.map((x, k) => ({
        id: `d${k}`, text: DAYS[k], x, y: LY - 0.95, a: smooth((t - first[k] + 0.2) / 0.5) * fadeOut, hot: k === hot, tone: 'tango',
      }));
      labels.push({ id: 'time', text: 'Time →', x: 6.1, y: LY - 0.6, a: 0.7 * fadeOut, tone: 'violet' });
      const step = Math.max(0, stepOf(t, [0, 2.6, 5.2]));
      return {
        labels,
        caption: MEM_CAPTIONS[step],
        step,
        steps: 3,
        tip: hot >= 0 ? { x: nodeX[hot], y: LY + 4.0, text: DAY_TIPS[hot], tone: 'tango' } : undefined,
      };
    },
  };
}

/** 2. It connects: six systems trade signals through one shared core. */
const SYSTEMS = ['Chat', 'Docs', 'Search', 'Voice', 'Vision', 'Code'];
const SYS_TIPS = [
  'Conversations feed the same memory.',
  'Read once, remembered everywhere.',
  'What it finds is kept, not re-fetched.',
  'Speech and text share one context.',
  'What it sees joins what it knows.',
  'Code work stays in context.',
];
const CON_CAPTIONS = ['Each system works in its own way.', 'Signals flow into one shared memory.', 'Every system draws on it in return.'];

function connect(s: Stage): Scene {
  const R = rng(23);
  const { violet, tango, pitch } = s.palette;
  const V = c3(violet), T = c3(tango), P = c3(pitch);
  const SAT = 6, SAT_PTS = 90, HUB = 460, PK = 18, RING = 110;
  const cloud = s.cloud(HUB + SAT * SAT_PTS + SAT * PK + RING * 2);
  const cols = [T, P, T, P, T, P];
  const hubPts = Array.from({ length: HUB }, (_, j) => {
    const y = 1 - (j / (HUB - 1)) * 2, r = Math.sqrt(1 - y * y), a = j * 2.399963;
    return [Math.cos(a) * r, y, Math.sin(a) * r] as const;
  });
  const sats = Array.from({ length: SAT }, (_, k) => {
    const a = (k / SAT) * TAU - Math.PI / 2;
    return {
      x: Math.cos(a) * 5.2, y: Math.sin(a) * 2.9,
      pts: Array.from({ length: SAT_PTS }, () => {
        const u = R() * 2 - 1, th = R() * TAU, r = Math.sqrt(1 - u * u);
        return [Math.cos(th) * r, u, Math.sin(th) * r, R() * TAU] as const;
      }),
      ph: R(),
    };
  });
  return {
    update(t, ptr) {
      let i = 0;
      const hot = sats.findIndex((sat) => near(ptr, sat.x, sat.y, 1.15));
      const hubHot = hot < 0 && near(ptr, 0, 0, 1.5);
      const beat = 0.5 + 0.5 * Math.sin(TAU * (t / 2) - 1.2);
      const hr = (0.85 + beat * 0.14) * (hubHot ? 1.12 : 1), rot = TAU * (t / DURATION);
      for (const [x, y, z] of hubPts) {
        const c = Math.cos(rot), sn = Math.sin(rot);
        const px = (x * c + z * sn) * hr, py = y * hr;
        const f = push(px, py, ptr, 1.3, 0.5);
        cloud.set(i++, px + f.x, py + f.y, (-x * sn + z * c) * hr, V, 3.1, hot >= 0 ? 0.7 : 0.95);
      }
      sats.forEach((sat, k) => {
        const dimK = hot >= 0 && hot !== k ? 0.4 : 1;
        const big = hot === k ? 1.5 : 1;
        for (const [x, y, z, ph] of sat.pts) {
          const j = 0.06 * Math.sin(TAU * (t / 4) + ph);
          const px = sat.x + x * (0.5 + j) * big, py = sat.y + y * (0.5 + j) * big;
          const f = push(px, py, ptr, 1.0, 0.5);
          cloud.set(i++, px + f.x, py + f.y, z * 0.5, cols[k], hot === k ? 3.6 : 2.7, 0.9 * dimK);
        }
        for (let j = 0; j < PK; j++) {
          const inward = j % 2 === 0;
          const f = (t / (hot === k ? 1.2 : 2) + sat.ph + j / PK) % 1;
          const u = inward ? f : 1 - f;
          const bow = Math.sin(Math.PI * u) * (j % 4 < 2 ? 0.45 : -0.45);
          const nx = -sat.y, ny = sat.x, nl = Math.hypot(nx, ny);
          const x = sat.x * (1 - u) + (nx / nl) * bow, y = sat.y * (1 - u) + (ny / nl) * bow;
          const g = push(x, y, ptr, 0.9, 0.35);
          cloud.set(i++, x + g.x, y + g.y, 0, inward ? cols[k] : V, hot === k ? 3.6 : 2.6, Math.sin(Math.PI * f) * 0.95 * dimK);
        }
      });
      for (let r = 0; r < 2; r++) {
        const f = (t / 4 + r / 2) % 1;
        const rad = 1.1 + f * 6.2;
        for (let j = 0; j < RING; j++) {
          const a = (j / RING) * TAU;
          cloud.set(i++, Math.cos(a) * rad * 1.35, Math.sin(a) * rad * 0.78, 0, V, 2, (1 - f) * (1 - f) * 0.5);
        }
      }
      cloud.flush();

      const labels: Label[] = sats.map((sat, k) => ({
        id: `s${k}`, text: SYSTEMS[k], x: sat.x, y: sat.y + (sat.y > 0 ? 0.95 : -0.95), a: hot >= 0 && hot !== k ? 0.45 : 1, hot: k === hot, tone: k % 2 ? 'pitch' : 'tango',
      }));
      labels.push({ id: 'hub', text: 'Shared memory', x: 0, y: -1.9, a: 1, hot: hubHot, tone: 'violet' });
      const step = Math.max(0, stepOf(t, [0, 2.6, 5.2]));
      return {
        labels,
        caption: CON_CAPTIONS[step],
        step,
        steps: 3,
        tip: hot >= 0 ? { x: sats[hot].x, y: sats[hot].y + (sats[hot].y > 0 ? 1.2 : -1.2), text: SYS_TIPS[hot], tone: hot % 2 ? 'pitch' : 'tango' }
          : hubHot ? { x: 0, y: 2.3, text: 'One memory, shared by every system.', tone: 'violet' } : undefined,
      };
    },
  };
}

/** 3. It keeps learning: uncertainty narrows into a rising line, the frozen model stays flat. */
const LRN_CAPTIONS = ['Before deployment, both systems learn.', 'After it, a frozen model stops. Origin keeps going.', 'Uncertainty narrows with every use.'];

function learn(s: Stage): Scene {
  const R = rng(37);
  const { violet, tango, pitch, dim, ink } = s.palette;
  const P = c3(pitch), T = c3(tango), V = c3(violet), D = c3(dim), I = c3(ink);
  const N = 2200, BASE = 150, MARK = 40;
  const cloud = s.cloud(N + BASE + MARK + 14);
  const X0 = -6.4, W = 12.8, Y0 = -1.8;
  const curve = (u: number) => Y0 + 3.9 * ((1 - Math.exp(-3 * u)) / (1 - Math.exp(-3))) * (0.3 + 0.7 * smooth(u * 1.6));
  const pts = Array.from({ length: N }, () => ({
    u: Math.pow(R(), 0.9), ny: (R() + R() + R() - 1.5) / 1.5, z: (R() - 0.5) * 1.2,
    c: R() < 0.2 ? T : R() < 0.5 ? V : P, sz: 2 + R() * 2.2,
  }));
  return {
    update(t, ptr) {
      const auto = easeIO((t - 0.5) / 5.6);
      // hovering scrubs the curve to the cursor
      const scrub = clamp01((ptr.x - X0) / W);
      const prog = auto + (scrub - auto) * ptr.on;
      const fade = 1 - smooth((t - 7.1) / 0.8) * (1 - ptr.on);
      let i = 0;
      for (const p of pts) {
        const x = X0 + p.u * W;
        const spread = 1.35 * Math.pow(1 - p.u, 1.6) + 0.06;
        const y = curve(p.u) + p.ny * spread + Math.sin(TAU * (t / 4) + p.u * 9) * 0.03;
        const a = (1 - smooth((p.u - (prog - 0.06)) / 0.06)) * (p.u <= prog ? 1 : 0);
        const f = push(x, y, ptr, 1.0, 0.35);
        cloud.set(i++, x + f.x, y + f.y, p.z, p.c, p.sz, a * fade * 0.95);
      }
      for (let j = 0; j < BASE; j++) {
        const u = j / (BASE - 1);
        cloud.set(i++, X0 + u * W, Y0 + Math.sin(TAU * (t / 4) + u * 6) * 0.02, -0.5, D, j % 2 ? 2.4 : 1.2, 0.7 * fade);
      }
      const mx = X0 + 0.3 * W;
      for (let j = 0; j < MARK; j++) cloud.set(i++, mx, Y0 - 0.9 + (j / (MARK - 1)) * 5.6, -0.4, T, j % 2 ? 2.2 : 1.1, 0.55 * fade);
      const hx = X0 + prog * W, hy = curve(prog);
      for (let j = 0; j < 14; j++) {
        const a = (j / 14) * TAU, r = (j < 1 ? 0 : 0.16) * (1 + 0.3 * Math.sin(TAU * t + j));
        cloud.set(i++, hx + Math.cos(a) * r, hy + Math.sin(a) * r, 0.3, I, j < 1 ? 7 : 2.6, (prog > 0.01 ? 1 : 0) * fade);
      }
      cloud.flush();

      const step = prog < 0.3 ? 0 : prog < 0.78 ? 1 : 2;
      return {
        labels: [
          { id: 'dep', text: 'Deployed', x: mx, y: Y0 + 5.05, a: fade, tone: 'tango' },
          { id: 'frozen', text: 'Frozen model', x: X0 + 0.83 * W, y: Y0 - 0.55, a: fade, tone: 'violet' },
          { id: 'origin', text: 'Origin', x: hx - 0.1, y: hy + 0.8, a: smooth((prog - 0.12) / 0.1) * fade, hot: true, tone: 'pitch' },
        ],
        caption: LRN_CAPTIONS[step],
        step,
        steps: 3,
      };
    },
  };
}

/** 4. Origin: three colours gather into the mark. */
function origin(s: Stage): Scene {
  const R = rng(51);
  const { violet, tango, pitch } = s.palette;
  const cols = [c3(violet), c3(tango), c3(pitch)];
  const N = 4400;
  const cloud = s.cloud(N);
  const pts = Array.from({ length: N }, (_, j) => {
    const y = 1 - (j / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = j * 2.399963;
    const band = Math.sin(y * 5.2 + a * 0.05);
    const c = band > 0.62 ? cols[1] : band < -0.72 ? cols[2] : cols[0];
    const sd = R() * TAU, sv = R() * 2 - 1, sr = 5 + R() * 7, sq = Math.sqrt(1 - sv * sv);
    return { t: [Math.cos(a) * r, y, Math.sin(a) * r], f: [Math.cos(sd) * sq * sr * 1.5, sv * sr * 0.9, Math.sin(sd) * sq * sr], d: R() * 0.9, c, sz: 2 + R() * 2.4 };
  });
  return {
    hold: 4,
    update(t, ptr) {
      const rot = TAU * (t / DURATION);
      const cs = Math.cos(rot), sn = Math.sin(rot);
      let i = 0;
      for (const p of pts) {
        const into = easeIO((t - 0.3 - p.d) / 2.2);
        const out2 = easeIO((t - 6.3 - p.d * 0.6) / 1.5);
        const g = clamp01(into - out2);
        const rad = 2.7 * (1 + 0.025 * Math.sin(TAU * (t / 2) + p.t[1] * 3));
        const tx = p.t[0] * rad, ty = p.t[1] * rad, tz = p.t[2] * rad;
        const rx = tx * cs + tz * sn, rz = -tx * sn + tz * cs;
        const x = p.f[0] + (rx - p.f[0]) * g, y = p.f[1] + (ty - p.f[1]) * g;
        const f = push(x, y, ptr, 1.5, 0.8);
        cloud.set(i++, x + f.x, y + f.y, p.f[2] + (rz - p.f[2]) * g, p.c, p.sz, 0.35 + 0.6 * g);
      }
      cloud.flush();
      return { labels: [], caption: 'Three strands become one mark.', step: 0, steps: 1 };
    },
  };
}

export const SCENES: Record<SceneName, (s: Stage) => Scene> = { memory, connect, learn, origin };
