import type { Draw } from './Diagram';
import { connect, learn, remember } from './intro';
import { alone, forgets, fragmented, stops } from './problem';
import { network } from './network';

/** Every diagram that can be exported as a video (see scripts/render-reels.mjs). */
export const REGISTRY: Record<string, { draw: Draw; period: number; w: number; h: number }> = {
  remember: { draw: remember, period: 12, w: 480, h: 300 },
  connect: { draw: connect, period: 12, w: 480, h: 300 },
  learn: { draw: learn, period: 12, w: 480, h: 300 },
  forgets: { draw: forgets, period: 10, w: 480, h: 300 },
  fragmented: { draw: fragmented, period: 10, w: 480, h: 300 },
  stops: { draw: stops, period: 12, w: 480, h: 300 },
  alone: { draw: alone, period: 10, w: 480, h: 300 },
  network: { draw: network(null), period: 15, w: 560, h: 380 },
};
