/**
 * The app-launch animation for the icons in the footer's CONNECT pill (owner's 1A 2A 3A 4A 5A, 2026-10-25, first
 * LinkedIn and Instagram, then "all icons"; taken frame by frame from a reel of Spotify's launch): the icon pops out as a thick 3D coin while the page around it
 * bursts outward and a bright brand-colour screen floods in with ripples; the coin floats and wobbles; its face breaks
 * from the right into shards that swirl round the middle while a hole opens onto a glow in the brand's colours; the
 * rim zooms past the screen like a portal, the profile opens in a new tab (or, for an icon with no address yet, a
 * "coming soon" note shows), and the page fades back as it was. This
 * file is the plan: timings, the shards and their flight, the brands. launchScene.ts draws it; useLaunch.ts starts
 * it. No three.js here, so the page never loads it until a launch is near.
 */

type Click = { button: number; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean };

/** Milliseconds from the click; the reel's pace pressed into 1.4 s (owner's 2A). The browser lets a page open a tab
 *  for about 5 s after a click; ours opens at 1.25 s, when the portal has nearly filled the screen. */
export const LAUNCH = {
  pop: [0, 300],
  debris: [0, 450],
  ripples: [80, 1100],
  hold: [300, 760],
  break: [760, 1000],
  swirl: [860, 1250],
  hole: [880, 1060],
  portal: [1000, 1300],
  openAt: 1250,
  fade: [1300, 1400],
  total: 1400,
} as const;

/** One drawing of a brand's glyph, in a 24 × 24 box (the footer's icons). */
type Glyph = { d: string; stroke?: number };
export interface Brand {
  /** the tile and splash: one colour, or a gradient's stops from bottom-left to top-right */
  colours: string[];
  /** the coin's thick rim, a near-black of the brand (the reel's dark ring round the green) */
  rim: string;
  glyph: Glyph[];
}

export type Net = 'github' | 'x' | 'linkedin' | 'instagram' | 'youtube' | 'email' | 'discord';

// Glyphs are the footer's own icons (Footer.tsx), drawn white on the tile.
export const BRANDS: Record<Net, Brand> = {
  github: {
    // a black-and-white brand: a gradient of GitHub's greys, so the glow the portal zooms into still has depth
    colours: ['#0D1117', '#24292F', '#57606A'],
    rim: '#05070A',
    glyph: [
      { d: 'M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z' },
    ],
  },
  x: {
    // the same reason as GitHub: X's own greys
    colours: ['#000000', '#0F1419', '#536471'],
    rim: '#202327',
    glyph: [
      { d: 'M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z' },
    ],
  },
  linkedin: {
    colours: ['#0A66C2'],
    rim: '#0B1A2B',
    // the "in" alone, without the footer icon's own rounded square: the tile is the square
    glyph: [
      { d: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z' },
    ],
  },
  instagram: {
    colours: ['#FEDA75', '#FA7E1E', '#D62976', '#962FBF', '#4F5BD5'],
    rim: '#1E1222',
    glyph: [
      { d: 'M8 2.5h8a5.5 5.5 0 0 1 5.5 5.5v8a5.5 5.5 0 0 1-5.5 5.5H8A5.5 5.5 0 0 1 2.5 16V8A5.5 5.5 0 0 1 8 2.5z', stroke: 2 },
      { d: 'M12 7.7a4.3 4.3 0 1 1 0 8.6 4.3 4.3 0 0 1 0-8.6z', stroke: 2 },
      { d: 'M17.6 5.1a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z' },
    ],
  },
  youtube: {
    colours: ['#FF0000'],
    rim: '#2A0606',
    // the white play button; the triangle winds the other way, so it is cut out and shows the red through
    glyph: [
      { d: 'M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z' },
    ],
  },
  email: {
    // the link opens Gmail, so Gmail's four colours
    colours: ['#34A853', '#4285F4', '#FBBC04', '#EA4335'],
    rim: '#1C1410',
    glyph: [
      { d: 'M5.5 5h13a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-13a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z', stroke: 2 },
      { d: 'M3.5 7l8.5 6.2L20.5 7', stroke: 2 },
    ],
  },
  discord: {
    colours: ['#5865F2'],
    rim: '#151838',
    glyph: [
      { d: 'M20.32 4.37A19.8 19.8 0 0 0 15.4 2.8l-.62 1.27a18.3 18.3 0 0 0-5.5 0L8.66 2.8a19.7 19.7 0 0 0-4.93 1.53C.6 9.04-.25 13.6.17 18.1a19.9 19.9 0 0 0 6.03 3.05l1.3-1.77a12.9 12.9 0 0 1-2.04-.98l.5-.39a14.2 14.2 0 0 0 12.1 0l.5.39c-.65.39-1.33.71-2.05.98l1.3 1.77a19.8 19.8 0 0 0 6.04-3.05c.5-5.24-.84-9.75-3.53-13.73zM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.95-2.42 2.16-2.42c1.2 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z' },
    ],
  },
};

export const launchAllowed = ({ finePointer, reducedMotion }: { finePointer: boolean; reducedMotion: boolean }) => finePointer && !reducedMotion;

/** Only an ordinary click is ours; with a modifier or the middle button people mean a background tab or a window. */
export const isPlainClick = (e: Click) => e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;

const span = (t: number, [a, b]: readonly [number, number]) => Math.min(Math.max((t - a) / (b - a), 0), 1);

/** How far each part has run at `t` ms, 0…1 each (the scene puts its own easing on them). `shards` runs from the
 *  first crack to the last piece gone, the input of shardAt. */
export const phaseAt = (t: number) => ({
  pop: span(t, LAUNCH.pop),
  debris: span(t, LAUNCH.debris),
  ripples: span(t, LAUNCH.ripples),
  hold: span(t, LAUNCH.hold),
  shards: span(t, [LAUNCH.break[0], LAUNCH.swirl[1]]),
  hole: span(t, LAUNCH.hole),
  portal: span(t, LAUNCH.portal),
  fade: span(t, LAUNCH.fade),
  done: t >= LAUNCH.total,
});

export interface Shard {
  /** a triangle in the tile's own units, the tile spanning -0.5…0.5 */
  points: [number, number][];
  cx: number;
  cy: number;
  /** its own share of chance: how far, how fast it turns, about which axis */
  r: number;
  axis: [number, number, number];
}

function seeded(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The tile cut into triangles: a grid whose inner corners are nudged at random (edge corners slide along their edge
 * only), each cell split on a random diagonal. The pieces cover the tile exactly, so at rest they are the tile.
 */
export function shardGrid(cols: number, rows: number, seed: number): Shard[] {
  const random = seeded(seed);
  const corner: [number, number][][] = [];
  for (let j = 0; j <= rows; j++) {
    corner.push([]);
    for (let i = 0; i <= cols; i++) {
      const nudgeX = i > 0 && i < cols ? (random() - 0.5) * 0.7 : 0;
      const nudgeY = j > 0 && j < rows ? (random() - 0.5) * 0.7 : 0;
      corner[j].push([(i + nudgeX) / cols - 0.5, (j + nudgeY) / rows - 0.5]);
    }
  }
  const shards: Shard[] = [];
  const add = (points: [number, number][]) => {
    const cx = (points[0][0] + points[1][0] + points[2][0]) / 3;
    const cy = (points[0][1] + points[1][1] + points[2][1]) / 3;
    const ax = random() - 0.5;
    const ay = random() - 0.5;
    const az = (random() - 0.5) * 0.4;
    const n = Math.hypot(ax, ay, az) || 1;
    shards.push({ points, cx, cy, r: random(), axis: [ax / n, ay / n, az / n] });
  };
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const a = corner[j][i];
      const b = corner[j][i + 1];
      const c = corner[j + 1][i + 1];
      const d = corner[j + 1][i];
      if (random() < 0.5) {
        add([a, b, c]);
        add([a, c, d]);
      } else {
        add([a, b, d]);
        add([b, c, d]);
      }
    }
  return shards;
}

/** How much later the left edge breaks than the right: the break sweeps across from the right, as in the reel. */
const SWEEP = 0.4;

/**
 * Where a shard is at `p` (0…1, phaseAt's `shards`), in face units from its resting place. It lets go when the
 * sweep from the right reaches it, lifts toward the viewer turning about its own axis, and swirls anticlockwise
 * round the middle while spiralling outward, fading as it goes.
 */
export function shardAt(s: Shard, p: number) {
  const q = Math.min(Math.max((p - (0.5 - s.cx) * SWEEP) / (1 - SWEEP), 0), 1);
  if (q === 0) return { x: 0, y: 0, z: 0, angle: 0, opacity: 1 };
  const e = 1 - (1 - q) * (1 - q);
  const r0 = Math.hypot(s.cx, s.cy) || 0.02;
  const a0 = Math.atan2(s.cy, s.cx);
  const r = r0 * (1 + e * (0.9 + s.r * 1.4)) + e * 0.05;
  const a = a0 + e * (1.6 + s.r * 1.6);
  const fade = Math.min(Math.max((q - 0.6) / 0.4, 0), 1);
  return {
    x: Math.cos(a) * r - s.cx,
    y: Math.sin(a) * r - s.cy,
    z: e * (0.15 + s.r * 0.5),
    angle: e * (1.5 + s.r * 3) * (s.r < 0.5 ? -1 : 1),
    opacity: 1 - fade * fade * (3 - 2 * fade),
  };
}

/**
 * Opens the profile in a new tab and cuts the tab's way back to this page (what rel="noopener" does for the link).
 * window.open with "noopener" always returns null, so a blocked tab couldn't be told apart; this way it can.
 */
export function openTab(href: string, open: (url: string, target: string) => unknown = (u, t) => window.open(u, t)) {
  const tab = open(href, '_blank') as { opener: unknown } | null;
  if (!tab) return 'blocked' as const;
  try {
    tab.opener = null;
  } catch {
    // a browser that won't let it be set has already cut the link
  }
  return 'opened' as const;
}
