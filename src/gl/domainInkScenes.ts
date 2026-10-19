import {
  type Palette,
  type Pt,
  arc,
  drawStrokes,
  easeInOut,
  easeOut,
  easeOutBack,
  glowDot,
  lerp,
  line,
  pointAlong,
  rand,
  span,
  wobble,
} from './ink';

/**
 * One ink scene per research domain. Each scene has four layers that match the
 * four chapters in src/data/reelScreenplays.ts: layer N is drawn in during
 * chapter N and stays on screen for the chapters after it.
 *
 * Coordinates are in a 460×380 design space centred on (0, 0); the reel scales it to fit.
 */

interface SceneWorld {
  ctx: CanvasRenderingContext2D;
  c: Palette;
  t: number;
}

/** `build` is 0–1: how far this layer has been drawn in. */
type Layer = (w: SceneWorld, build: number) => void;

const TAU = Math.PI * 2;

function pen(ctx: CanvasRenderingContext2D, color: string, width: number, alpha = 1, dash: number[] = []) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha;
  ctx.setLineDash(dash);
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) {
  if (r <= 0 || alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

const rect = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
  [x, y],
];

const circle = (x: number, y: number, r: number, n = 32) => arc(x, y, r, -Math.PI / 2, Math.PI * 1.5, n);

function reset(ctx: CanvasRenderingContext2D) {
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}

// ═══ 01 · GI Rivinity — learn → remember → reason → decide ═══

const MEMORY_RINGS = [52, 86, 120];
const MEMORY_COUNT = [4, 6, 8];

/** Memory dots drift slowly, each ring the opposite way to its neighbour. */
const memoryPoint = (ring: number, j: number, t: number): Pt => {
  const a = (j / MEMORY_COUNT[ring]) * TAU + ring * 0.7 + t * 0.05 * (ring % 2 ? -1 : 1);
  return [Math.cos(a) * MEMORY_RINGS[ring], Math.sin(a) * MEMORY_RINGS[ring]];
};

const reasoningChain = (t: number): Pt[] => [[0, 0], memoryPoint(0, 1, t), memoryPoint(1, 2, t), memoryPoint(2, 3, t)];

const giRivinity: Layer[] = [
  // Continuous learning: signals spiral in and are absorbed by the core
  ({ ctx, c, t }, b) => {
    const hues = [c.violet, c.orange, c.saffron];
    for (let i = 0; i < 14; i++) {
      const f = (t * 0.3 + i / 14) % 1;
      const a = i * 2.39996 + t * 0.2 + f * 1.2;
      const r = lerp(178, 20, f * f);
      dot(ctx, Math.cos(a) * r, Math.sin(a) * r, 3, hues[i % 3], b * span(f, 0, 0.15) * (1 - span(f, 0.9, 1)));
    }
    glowDot(ctx, c, 0, 0, 7 + Math.sin(t * 2) * 0.6, b);
    pen(ctx, c.ink, 2.2);
    drawStrokes(ctx, [circle(0, 0, 20)], span(b, 0, 0.7));
  },
  // Long-term memory: rings drawn one by one, memories settle onto them
  ({ ctx, c, t }, b) => {
    const hues = [c.violet, c.orange, c.saffron];
    MEMORY_RINGS.forEach((r, k) => {
      pen(ctx, c.ink, 1.3, 0.45);
      drawStrokes(ctx, [circle(0, 0, r, 64)], span(b, k * 0.18, k * 0.18 + 0.45));
      for (let j = 0; j < MEMORY_COUNT[k]; j++) {
        const pop = span(b, 0.35 + k * 0.15 + j * 0.02, 0.5 + k * 0.15 + j * 0.02);
        const [x, y] = memoryPoint(k, j, t);
        dot(ctx, x, y, 4.4 * easeOutBack(pop), hues[(k + j) % 3]);
      }
    });
  },
  // Autonomous reasoning: a chain links memories outward from the core
  ({ ctx, c, t }, b) => {
    const chain = reasoningChain(t);
    pen(ctx, c.violet, 2.6);
    drawStrokes(ctx, [chain], b);
    chain.slice(1).forEach(([x, y], i) => {
      const reached = span(b, (i + 1) / 3 - 0.05, (i + 1) / 3);
      pen(ctx, c.violet, 1.6, reached);
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, TAU);
      ctx.stroke();
    });
    if (b >= 1) {
      const [px, py] = pointAlong(chain, (t * 0.45) % 1);
      dot(ctx, px, py, 3.4, '#FFFFFF');
      dot(ctx, px, py, 2, c.violet);
    }
  },
  // Adaptive decisions: three options branch out; one is chosen
  ({ ctx, c, t }, b) => {
    const [ex, ey] = reasoningChain(t)[3];
    const base = Math.atan2(ey, ex);
    [-0.55, 0, 0.55].forEach((offset, i) => {
      const a = base + offset;
      const end: Pt = [ex + Math.cos(a) * 52, ey + Math.sin(a) * 52];
      const chosen = i === 2;
      const f = span(b, i * 0.15, i * 0.15 + 0.5);
      pen(ctx, chosen ? c.saffron : c.ink, chosen ? 2.6 : 1.4, chosen ? 1 : 0.4, chosen ? [] : [4, 5]);
      drawStrokes(ctx, [line([ex, ey], end, 6)], f);
      reset(ctx);
      if (f >= 1) {
        if (chosen) glowDot(ctx, { ...c, glow: '245, 158, 0', violet: c.saffron }, end[0], end[1], 5, span(b, 0.7, 1));
        else {
          pen(ctx, c.ink, 1.2, 0.4);
          ctx.beginPath();
          ctx.arc(end[0], end[1], 4, 0, TAU);
          ctx.stroke();
        }
      }
    });
  },
];

// ═══ 02 · Rivinity Core — layer → plug in → route → shared fabric ═══

const BAR = { x: -182, y: 28, w: 364, h: 30 };
const DEVICE_X = [-150, -50, 50, 150];
const DEVICE_Y = -96;

function deviceIcon(kind: number, x: number, y: number): Pt[][] {
  switch (kind) {
    case 0: // laptop
      return [rect(x - 24, y - 18, 48, 30), line([x - 30, y + 16], [x + 30, y + 16], 4)];
    case 1: // phone
      return [rect(x - 12, y - 22, 24, 44), line([x - 3, y + 16], [x + 3, y + 16], 2)];
    case 2: // server stack
      return [rect(x - 22, y - 22, 44, 12), rect(x - 22, y - 6, 44, 12), rect(x - 22, y + 10, 44, 12)];
    default: // factory
      return [
        [
          [x - 26, y + 22],
          [x - 26, y - 4],
          [x - 12, y - 16],
          [x - 12, y - 4],
          [x + 2, y - 16],
          [x + 2, y - 4],
          [x + 16, y - 16],
          [x + 16, y - 4],
          [x + 26, y - 4],
          [x + 26, y + 22],
          [x - 26, y + 22],
        ],
      ];
  }
}

const ROUTES: [number, number][] = [
  [0, 2],
  [3, 1],
  [1, 3],
];

const routePath = ([from, to]: [number, number]): Pt[] => [
  [DEVICE_X[from], DEVICE_Y + 26],
  [DEVICE_X[from], BAR.y + BAR.h / 2],
  [DEVICE_X[to], BAR.y + BAR.h / 2],
  [DEVICE_X[to], DEVICE_Y + 26],
];

const rivinityCore: Layer[] = [
  // Unified capability layer
  ({ ctx, c }, b) => {
    pen(ctx, c.ink, 2.2);
    drawStrokes(ctx, [rect(BAR.x, BAR.y, BAR.w, BAR.h)], span(b, 0, 0.6));
    pen(ctx, c.ink, 1, 0.3);
    drawStrokes(
      ctx,
      [-120, -60, 0, 60, 120].map((x) => line([x, BAR.y + 6], [x, BAR.y + BAR.h - 6], 2)),
      span(b, 0.5, 1)
    );
    reset(ctx);
  },
  // Applications, industries and devices plug into the same core
  ({ ctx, c }, b) => {
    DEVICE_X.forEach((x, i) => {
      const f = span(b, i * 0.12, i * 0.12 + 0.45);
      pen(ctx, c.ink, 1.8);
      drawStrokes(ctx, deviceIcon(i, x, DEVICE_Y), f);
      pen(ctx, c.ink, 1.2, 0.35, [3, 4]);
      drawStrokes(ctx, [line([x, DEVICE_Y + 26], [x, BAR.y], 6)], span(b, 0.4 + i * 0.1, 0.6 + i * 0.1));
      reset(ctx);
    });
  },
  // Intelligence routing: requests pass through the core to another system
  ({ ctx, c, t }, b) => {
    const hues = [c.violet, c.orange, c.saffron];
    ROUTES.forEach((route, k) => {
      const f = (t * 0.32 + k / ROUTES.length) % 1;
      const path = routePath(route);
      const [x, y] = pointAlong(path, f);
      const fade = b * span(f, 0, 0.08) * (1 - span(f, 0.92, 1));
      dot(ctx, x, y, 9, hues[k], 0.18 * fade);
      dot(ctx, x, y, 4, hues[k], fade);
    });
  },
  // Shared knowledge fabric under the layer; every link pulses together
  ({ ctx, c, t }, b) => {
    const rows = [86, 108, 130];
    const cols = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
    const strokes: Pt[][] = [];
    rows.forEach((y, r) => {
      strokes.push(line([cols[0], y], [cols[cols.length - 1], y], 16));
      if (r < rows.length - 1)
        cols.slice(0, -1).forEach((x, i) => i % 2 === r % 2 && strokes.push(line([x, y], [x + 40, rows[r + 1]], 4)));
    });
    pen(ctx, c.violet, 1.2, 0.5);
    drawStrokes(ctx, strokes, span(b, 0, 0.6));
    pen(ctx, c.violet, 1.2, 0.5);
    drawStrokes(ctx, [-120, 0, 120].map((x) => line([x, BAR.y + BAR.h], [x, rows[0]], 4)), span(b, 0.3, 0.7));
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
    rows.forEach((y) => cols.forEach((x) => dot(ctx, x, y, 2.6, c.violet, span(b, 0.5, 1) * (0.4 + 0.6 * pulse))));
    DEVICE_X.forEach((x) => {
      pen(ctx, c.violet, 2, span(b, 0.7, 1) * pulse * 0.8);
      ctx.beginPath();
      ctx.moveTo(x, DEVICE_Y + 26);
      ctx.lineTo(x, BAR.y);
      ctx.stroke();
    });
    reset(ctx);
  },
];

// ═══ 03 · IoT Intelligence — devices → fusion → automation → smart site ═══

const GROUND = 128;
const SENSORS: Pt[] = [
  [-196, GROUND - 58],
  [-152, GROUND - 58],
  [150, GROUND - 112],
];
/** Where each sensor's pole starts: the ground, or the factory roofline for the last one. */
const SENSOR_BASE = [GROUND, GROUND, GROUND - 87];
const CHIP: Pt = [-10, -110];
const FACTORY = { x: 74, w: 130, h: 70 };
const ARM_BASE: Pt = [-86, GROUND - 18];

function armJoints(t: number): [Pt, Pt, Pt] {
  const a1 = -Math.PI / 2 + 0.45 * Math.sin(t * 1.4);
  const a2 = a1 + 1.1 + 0.35 * Math.sin(t * 1.4 + 1);
  const elbow: Pt = [ARM_BASE[0] + Math.cos(a1) * 56, ARM_BASE[1] + Math.sin(a1) * 56];
  const hand: Pt = [elbow[0] + Math.cos(a2) * 46, elbow[1] + Math.sin(a2) * 46];
  return [ARM_BASE, elbow, hand];
}

const iotIntelligence: Layer[] = [
  // Connected devices: sensors and a factory on one ground line
  ({ ctx, c }, b) => {
    pen(ctx, c.ink, 2.2);
    drawStrokes(ctx, [wobble(line([-220, GROUND], [220, GROUND], 30), 2, 0.8)], span(b, 0, 0.4));
    const { x, w, h } = FACTORY;
    pen(ctx, c.ink, 1.8);
    drawStrokes(
      ctx,
      [
        [
          [x, GROUND],
          [x, GROUND - h],
          [x + w / 3, GROUND - h - 22],
          [x + w / 3, GROUND - h],
          [x + (2 * w) / 3, GROUND - h - 22],
          [x + (2 * w) / 3, GROUND - h],
          [x + w, GROUND - h - 22],
          [x + w, GROUND],
        ],
        rect(x + 8, GROUND - 30, 22, 30),
      ],
      span(b, 0.2, 0.75)
    );
    SENSORS.forEach(([sx, sy], i) => {
      const f = span(b, 0.3 + i * 0.15, 0.6 + i * 0.15);
      pen(ctx, c.ink, 1.8);
      const strokes = [line([sx, SENSOR_BASE[i]], [sx, sy + 7], 6), circle(sx, sy, 7, 16), line([sx, sy - 7], [sx, sy - 18], 3)];
      drawStrokes(ctx, strokes, f);
    });
    reset(ctx);
  },
  // Sensor fusion: readings ripple out and converge on one chip
  ({ ctx, c, t }, b) => {
    SENSORS.forEach(([sx, sy], i) => {
      for (let k = 0; k < 2; k++) {
        const f = (t * 0.6 + k / 2 + i * 0.2) % 1;
        pen(ctx, c.orange, 1.4, b * (1 - f) * 0.7);
        ctx.beginPath();
        ctx.arc(sx, sy - 18, 6 + f * 22, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();
      }
      pen(ctx, c.violet, 1.2, 0.5, [3, 5]);
      ctx.lineDashOffset = -t * 20;
      drawStrokes(ctx, [line([sx, sy - 18], CHIP, 8)], span(b, 0.2 + i * 0.1, 0.6 + i * 0.1));
      reset(ctx);
    });
    const f = span(b, 0, 0.5);
    pen(ctx, c.ink, 2);
    drawStrokes(ctx, [rect(CHIP[0] - 20, CHIP[1] - 20, 40, 40)], f);
    pen(ctx, c.ink, 1.4, 0.6);
    drawStrokes(
      ctx,
      [-10, 0, 10].flatMap((d) => [
        line([CHIP[0] + d, CHIP[1] - 20], [CHIP[0] + d, CHIP[1] - 27], 1),
        line([CHIP[0] + d, CHIP[1] + 20], [CHIP[0] + d, CHIP[1] + 27], 1),
      ]),
      f
    );
    reset(ctx);
    glowDot(ctx, c, CHIP[0], CHIP[1], 6, span(b, 0.6, 1));
  },
  // Industrial automation: a robot arm swings and boxes ride the conveyor into the factory
  ({ ctx, c, t }, b) => {
    const beltY = GROUND - 12;
    const beltStart = -52;
    const beltEnd = FACTORY.x;
    pen(ctx, c.ink, 1.6);
    drawStrokes(ctx, [line([beltStart, beltY], [beltEnd, beltY], 10), line([beltStart, GROUND], [beltEnd, GROUND], 10)], span(b, 0, 0.4));
    for (let x = beltStart + 8; x < beltEnd; x += 22) dot(ctx, x, beltY + 6, 3, c.ink, span(b, 0.2, 0.5) * 0.5);
    for (let k = 0; k < 3; k++) {
      const f = (t * 0.22 + k / 3) % 1;
      const bx = lerp(beltStart, beltEnd - 14, f);
      ctx.globalAlpha = b * span(f, 0, 0.1) * (1 - span(f, 0.9, 1));
      ctx.fillStyle = c.saffron;
      ctx.fillRect(bx, beltY - 15, 14, 14);
    }
    const [base, elbow, hand] = armJoints(t);
    pen(ctx, c.ink, 4.5, span(b, 0.2, 0.6));
    ctx.beginPath();
    ctx.moveTo(...base);
    ctx.lineTo(...elbow);
    ctx.lineTo(...hand);
    ctx.stroke();
    dot(ctx, elbow[0], elbow[1], 4.5, c.violet, span(b, 0.2, 0.6));
    pen(ctx, c.ink, 2, span(b, 0.2, 0.6));
    ctx.beginPath();
    ctx.moveTo(hand[0] - 7, hand[1] + 6);
    ctx.lineTo(hand[0], hand[1]);
    ctx.lineTo(hand[0] + 7, hand[1] + 6);
    ctx.stroke();
    pen(ctx, c.ink, 2, span(b, 0, 0.3));
    drawStrokes(ctx, [rect(base[0] - 16, GROUND - 18, 32, 18)], span(b, 0, 0.3));
    reset(ctx);
  },
  // Smart infrastructure: the site lights up and every part links back to the chip
  ({ ctx, c, t }, b) => {
    const { x, w, h } = FACTORY;
    for (let i = 0; i < 3; i++) {
      const lit = span(b, 0.1 + i * 0.12, 0.3 + i * 0.12) * (0.75 + 0.25 * Math.sin(t * 2 + i));
      ctx.globalAlpha = lit;
      ctx.fillStyle = c.saffron;
      ctx.fillRect(x + 42 + i * 28, GROUND - h + 18, 16, 14);
    }
    const [, elbow] = armJoints(t);
    const targets: Pt[] = [elbow, [x + w / 2, GROUND - h - 10], [-196, GROUND - 76]];
    targets.forEach((target, i) => {
      const path = line(CHIP, target, 8);
      pen(ctx, c.violet, 1.6, 0.7);
      drawStrokes(ctx, [path], span(b, 0.2 + i * 0.1, 0.6 + i * 0.1));
      if (b >= 1) {
        const [px, py] = pointAlong(path, (t * 0.5 + i / 3) % 1);
        dot(ctx, px, py, 3, c.violet);
      }
    });
    reset(ctx);
  },
];

// ═══ 04 · Geo Intelligence — sense → map → trace routes → climate ═══

const TOWNS: Pt[] = [
  [-178, 136],
  [-70, 0],
  [36, 48],
  [176, 14],
  [130, 140],
];
const ROAD_MAIN: Pt[] = [TOWNS[0], [-120, 70], TOWNS[1], [-10, 30], TOWNS[2], [110, 20], TOWNS[3]];
const ROAD_SPUR: Pt[] = [TOWNS[2], [80, 100], TOWNS[4]];

function contour(cx: number, cy: number, rx: number, seed: number): Pt[] {
  return Array.from({ length: 41 }, (_, i) => {
    const a = (i / 40) * TAU;
    const k = 1 + 0.13 * Math.sin(3 * a + seed) + 0.07 * Math.sin(5 * a + seed * 2);
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * rx * 0.56 * k] as Pt;
  });
}

const satelliteX = (t: number) => Math.sin(t * 0.45) * 150;

const geoIntelligence: Layer[] = [
  // Remote sensing: a satellite sweeps across, scanning the ground
  ({ ctx, c, t }, b) => {
    const sx = satelliteX(t);
    const sy = -148;
    const a = b;
    ctx.globalAlpha = a * 0.08;
    ctx.fillStyle = c.violet;
    ctx.beginPath();
    ctx.moveTo(sx, sy + 10);
    ctx.lineTo(sx - 46, 30);
    ctx.lineTo(sx + 46, 30);
    ctx.closePath();
    ctx.fill();
    pen(ctx, c.violet, 1.2, a * 0.6, [3, 4]);
    ctx.beginPath();
    ctx.moveTo(sx - 46, 30);
    ctx.lineTo(sx, sy + 10);
    ctx.lineTo(sx + 46, 30);
    ctx.stroke();
    reset(ctx);
    pen(ctx, c.violet, 2.4, a);
    ctx.beginPath();
    ctx.moveTo(sx - 46, 30);
    ctx.lineTo(sx + 46, 30);
    ctx.stroke();
    pen(ctx, c.ink, 1.8, a);
    drawStrokes(
      ctx,
      [rect(sx - 9, sy - 9, 18, 18), rect(sx - 38, sy - 5, 24, 10), rect(sx + 14, sy - 5, 24, 10)],
      span(b, 0, 0.6)
    );
    reset(ctx);
  },
  // Satellite imagery becomes terrain contours
  ({ ctx, c }, b) => {
    const hills: [number, number, number[], number][] = [
      [-84, 64, [92, 62, 32], 1],
      [104, 86, [66, 38], 4],
    ];
    let k = 0;
    hills.forEach(([cx, cy, radii, seed]) =>
      radii.forEach((r, i) => {
        pen(ctx, c.ink, i === radii.length - 1 ? 1.8 : 1.2, 0.35 + i * 0.2);
        drawStrokes(ctx, [contour(cx, cy, r, seed + i * 0.4)], span(b, k * 0.12, k * 0.12 + 0.4));
        k++;
      })
    );
    reset(ctx);
  },
  // Transport networks: roads connect towns, a vehicle follows the route
  ({ ctx, c, t }, b) => {
    pen(ctx, c.ink, 2.4);
    drawStrokes(ctx, [ROAD_MAIN, ROAD_SPUR], span(b, 0, 0.7));
    TOWNS.forEach(([x, y], i) => {
      const pop = span(b, 0.1 + i * 0.1, 0.25 + i * 0.1);
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.paper;
      ctx.strokeStyle = c.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 6 * easeOutBack(pop), 0, TAU);
      ctx.fill();
      if (pop > 0) ctx.stroke();
    });
    if (b >= 1) {
      const f = (t * 0.12) % 1;
      const [vx, vy] = pointAlong(ROAD_MAIN, f < 0.5 ? f * 2 : 2 - f * 2);
      dot(ctx, vx, vy, 10, c.orange, 0.2);
      dot(ctx, vx, vy, 4.5, c.orange);
    }
    reset(ctx);
  },
  // Climate intelligence: a heat pattern, drifting wind, and a pinned observation
  ({ ctx, c, t }, b) => {
    const r = 74 + Math.sin(t * 1.5) * 6;
    const g = ctx.createRadialGradient(70, 96, 0, 70, 96, r);
    g.addColorStop(0, 'rgba(255, 134, 67, 0.32)');
    g.addColorStop(1, 'rgba(255, 134, 67, 0)');
    ctx.globalAlpha = span(b, 0, 0.5);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(70, 96, r, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const y = -10 + i * 28;
      const x0 = -200 + (((t * 34 + i * 47) % 120) - 20);
      pen(ctx, c.violet, 1.4, span(b, 0.2, 0.6) * 0.55);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.quadraticCurveTo(x0 + 18, y - 7, x0 + 36, y);
      ctx.lineTo(x0 + 30, y - 4);
      ctx.stroke();
    }
    const drop = easeOutBack(span(b, 0.5, 0.85));
    const [px, py] = [TOWNS[1][0], TOWNS[1][1] - 8 - (1 - drop) * 50];
    ctx.globalAlpha = span(b, 0.5, 0.6);
    ctx.fillStyle = c.saffron;
    ctx.beginPath();
    ctx.arc(px, py - 14, 9, Math.PI, 0);
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();
    dot(ctx, px, py - 14, 3.4, c.paper, span(b, 0.5, 0.6));
    reset(ctx);
  },
];

// ═══ 05 · Defense Intelligence — secure → defend → monitor → resilient ═══

const SHIELD: Pt[] = [
  [0, -86],
  [62, -66],
  [60, 6],
  [34, 52],
  [0, 76],
  [-34, 52],
  [-60, 6],
  [-62, -66],
  [0, -86],
];
const shieldScaled = (k: number): Pt[] => SHIELD.map(([x, y]) => [x * k, -6 + (y + 6) * k]);
const BLIPS: [number, number][] = [
  [0.6, 132],
  [1.9, 118],
  [2.8, 142],
  [4.1, 126],
  [5.2, 138],
];

const defenseIntelligence: Layer[] = [
  // Secure architecture: nested shield around the core
  ({ ctx, c, t }, b) => {
    pen(ctx, c.ink, 2.6);
    drawStrokes(ctx, [wobble(SHIELD.flatMap((p, i) => (i ? line(SHIELD[i - 1], p, 4).slice(1) : [p])), 3, 0.5)], span(b, 0, 0.6));
    pen(ctx, c.ink, 1.2, 0.35);
    drawStrokes(ctx, [shieldScaled(0.72)], span(b, 0.3, 0.8));
    reset(ctx);
    glowDot(ctx, c, 0, -6, 6 + Math.sin(t * 2) * 0.5, span(b, 0.5, 1));
  },
  // Cybersecurity: threats approach from every side and are stopped at the edge
  ({ ctx, c, t }, b) => {
    for (let i = 0; i < 7; i++) {
      const f = (t * 0.28 + i / 7) % 1;
      const a = rand(i + Math.floor(t * 0.28 + i / 7)) * TAU;
      if (f < 0.72) {
        const r = lerp(200, 100, f / 0.72);
        dot(ctx, Math.cos(a) * r, -6 + Math.sin(a) * r, 3.6, c.orange, b * span(f, 0, 0.1));
      } else {
        const burst = span(f, 0.72, 0.9);
        const [ix, iy] = [Math.cos(a) * 100, -6 + Math.sin(a) * 100];
        pen(ctx, c.orange, 1.6, b * (1 - burst));
        for (let s = 0; s < 4; s++) {
          const sa = a + Math.PI + (s - 1.5) * 0.5;
          ctx.beginPath();
          ctx.moveTo(ix + Math.cos(sa) * 4, iy + Math.sin(sa) * 4);
          ctx.lineTo(ix + Math.cos(sa) * (6 + burst * 12), iy + Math.sin(sa) * (6 + burst * 12));
          ctx.stroke();
        }
      }
    }
    pen(ctx, c.orange, 1.2, b * 0.35, [3, 6]);
    ctx.beginPath();
    ctx.arc(0, -6, 100, 0, TAU);
    ctx.stroke();
    reset(ctx);
  },
  // Autonomous monitoring: a radar sweep finds and flags activity
  ({ ctx, c, t }, b) => {
    const sweep = (t * 1.3) % TAU;
    pen(ctx, c.ink, 1, 0.25 * b, [2, 5]);
    ctx.beginPath();
    ctx.arc(0, -6, 152, 0, TAU);
    ctx.stroke();
    reset(ctx);
    ctx.globalAlpha = 0.12 * b;
    ctx.fillStyle = c.violet;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.arc(0, -6, 152, sweep - 0.6, sweep);
    ctx.closePath();
    ctx.fill();
    pen(ctx, c.violet, 1.8, 0.8 * b);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(Math.cos(sweep) * 152, -6 + Math.sin(sweep) * 152);
    ctx.stroke();
    BLIPS.forEach(([a, r]) => {
      const since = (sweep - a + TAU) % TAU;
      const glow = 1 - since / TAU;
      dot(ctx, Math.cos(a) * r, -6 + Math.sin(a) * r, 3.4, c.violet, b * glow * glow);
    });
    reset(ctx);
  },
  // Mission-critical reliability: a verified check and a steady heartbeat
  ({ ctx, c, t }, b) => {
    pen(ctx, c.saffron, 4.5);
    drawStrokes(
      ctx,
      [
        [
          [-22, -6],
          [-6, 12],
          [26, -24],
        ],
      ],
      span(b, 0, 0.5)
    );
    const y = 158;
    const pts: Pt[] = [];
    const shift = (t * 70) % 90;
    for (let x = -180; x <= 180; x += 3) {
      const phase = (x + shift + 1000) % 90;
      const spike = phase > 40 && phase < 52 ? Math.sin(((phase - 40) / 12) * TAU) * 16 : 0;
      pts.push([x, y - spike]);
    }
    pen(ctx, c.violet, 1.8);
    drawStrokes(ctx, [pts], span(b, 0.2, 0.9));
    reset(ctx);
  },
];

// ═══ 06 · Miniature Intelligence — compress → deploy → run locally → stay connected ═══

const MODEL: Pt = [0, -78];
const DEVICES: Pt[] = [
  [-150, 96],
  [0, 104],
  [150, 96],
];
/** Where each device's model chip sits (its screen / board centre). */
const DEVICE_CHIPS: Pt[] = [
  [-150, 88],
  [0, 98],
  [150, 96],
];

function drawNet(ctx: CanvasRenderingContext2D, c: Palette, reveal: number) {
  const cols = [-64, 0, 64];
  const counts = [4, 5, 4];
  const nodes = cols.map((x, ci) =>
    Array.from({ length: counts[ci] }, (_, i) => [x, (i - (counts[ci] - 1) / 2) * 24] as Pt)
  );
  const edges: Pt[][] = [];
  for (let ci = 0; ci < 2; ci++) nodes[ci].forEach((a) => nodes[ci + 1].forEach((bb) => edges.push([a, bb])));
  pen(ctx, c.ink, 0.9, 0.3);
  drawStrokes(ctx, edges, span(reveal, 0.2, 1));
  const hues = [c.violet, c.orange, c.saffron];
  nodes.forEach((col, ci) => col.forEach(([x, y]) => dot(ctx, x, y, 5 * easeOutBack(span(reveal, ci * 0.15, ci * 0.15 + 0.3)), hues[ci])));
  reset(ctx);
}

function chipOutline(ctx: CanvasRenderingContext2D, c: Palette, [x, y]: Pt, size: number, reveal: number) {
  const h = size / 2;
  pen(ctx, c.ink, 1.8);
  drawStrokes(ctx, [rect(x - h, y - h, size, size)], reveal);
  pen(ctx, c.ink, 1.2, 0.6);
  drawStrokes(
    ctx,
    [-h / 2, 0, h / 2].flatMap((d) => [
      line([x - h, y + d], [x - h - 6, y + d], 1),
      line([x + h, y + d], [x + h + 6, y + d], 1),
    ]),
    reveal
  );
  reset(ctx);
}

const miniatureIntelligence: Layer[] = [
  // Lightweight model: a large network is compressed into a chip
  ({ ctx, c }, b) => {
    const scale = lerp(1, 0.24, easeInOut(span(b, 0.5, 0.85)));
    ctx.save();
    ctx.translate(MODEL[0], MODEL[1]);
    ctx.scale(scale, scale);
    drawNet(ctx, c, span(b, 0, 0.45));
    ctx.restore();
    chipOutline(ctx, c, MODEL, 44, span(b, 0.75, 1));
  },
  // Edge deployment: copies of the model travel into a laptop, a phone and a board
  ({ ctx, c }, b) => {
    const [laptop, phone, board] = DEVICES;
    pen(ctx, c.ink, 1.8);
    drawStrokes(
      ctx,
      [
        rect(laptop[0] - 34, laptop[1] - 30, 68, 42),
        line([laptop[0] - 44, laptop[1] + 16], [laptop[0] + 44, laptop[1] + 16], 6),
        rect(phone[0] - 17, phone[1] - 32, 34, 62),
        rect(board[0] - 38, board[1] - 24, 76, 48),
        rect(board[0] + 24, board[1] - 16, 9, 10),
        rect(board[0] + 24, board[1] + 4, 9, 10),
      ],
      span(b, 0, 0.5)
    );
    reset(ctx);
    DEVICE_CHIPS.forEach((target, i) => {
      const f = easeInOut(span(b, 0.35 + i * 0.1, 0.75 + i * 0.1));
      if (f <= 0) return;
      const x = lerp(MODEL[0], target[0], f);
      const y = lerp(MODEL[1], target[1], f) - Math.sin(f * Math.PI) * 30;
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.violet;
      ctx.fillRect(x - 7, y - 7, 14, 14);
    });
    reset(ctx);
  },
  // Local by default: each device runs its own inference loop
  ({ ctx, c, t }, b) => {
    DEVICE_CHIPS.forEach(([x, y], i) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 1.6 * (i % 2 ? -1 : 1));
      pen(ctx, c.violet, 1.6, b, [5, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, TAU);
      ctx.stroke();
      ctx.restore();
      const a = t * 3 + i;
      dot(ctx, x + Math.cos(a) * 18, y + Math.sin(a) * 18, 2.6, c.saffron, b);
    });
    reset(ctx);
  },
  // Still connected: devices sync back to the wider network
  ({ ctx, c, t }, b) => {
    DEVICE_CHIPS.forEach((chip, i) => {
      const path = line(chip, MODEL, 8);
      pen(ctx, c.ink, 1.2, 0.45, [3, 5]);
      drawStrokes(ctx, [path], span(b, i * 0.12, i * 0.12 + 0.5));
      reset(ctx);
      if (b >= 1) {
        const f = (t * 0.45 + i / 3) % 1;
        const [px, py] = pointAlong(path, i % 2 ? 1 - f : f);
        dot(ctx, px, py, 3, c.violet);
      }
    });
    const ring = span(b, 0.5, 1);
    pen(ctx, c.violet, 1.6, ring * (0.5 + 0.5 * Math.sin(t * 2.5)));
    ctx.beginPath();
    ctx.arc(MODEL[0], MODEL[1], 34, 0, TAU);
    ctx.stroke();
    reset(ctx);
    glowDot(ctx, c, MODEL[0], MODEL[1], 4, ring);
  },
];

export const DOMAIN_SCENES: Layer[][] = [
  giRivinity,
  rivinityCore,
  iotIntelligence,
  geoIntelligence,
  defenseIntelligence,
  miniatureIntelligence,
];

/** Shared easing for how quickly a chapter's layer draws in (first half of the chapter). */
export const layerBuild = (layer: number, act: number, progress: number) =>
  layer < act ? 1 : layer === act ? easeOut(span(progress, 0, 0.5)) : 0;
