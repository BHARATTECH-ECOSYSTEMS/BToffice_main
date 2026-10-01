import type { Draw } from './Diagram';
import { connect, learn, remember } from './intro';
import { alone, forgets, fragmented, stops } from './problem';
import { network } from './network';
import { DOMAIN_DRAWS, DOMAIN_H, DOMAIN_W } from './domains';
import { AUDIENCE_DRAWS, AUD_H, AUD_W } from './audiences';

/** Every diagram that can be exported as a video (see scripts/render-reels.mjs). */
export const REGISTRY: Record<string, { draw: Draw; period: number; w: number; h: number }> = {
  remember: { draw: remember, period: 12, w: 480, h: 280 },
  connect: { draw: connect, period: 12, w: 480, h: 300 },
  learn: { draw: learn, period: 12, w: 480, h: 270 },
  forgets: { draw: forgets, period: 10, w: 480, h: 250 },
  fragmented: { draw: fragmented, period: 10, w: 480, h: 250 },
  stops: { draw: stops, period: 12, w: 480, h: 250 },
  alone: { draw: alone, period: 10, w: 480, h: 250 },
  network: { draw: network(null), period: 15, w: 560, h: 380 },
  ...Object.fromEntries(DOMAIN_DRAWS.map((draw, i) => [`domain${i}`, { draw, period: 8, w: DOMAIN_W, h: DOMAIN_H }])),
  ...Object.fromEntries(AUDIENCE_DRAWS.map((draw, i) => [`aud${i}`, { draw, period: 8, w: AUD_W, h: AUD_H }])),
};
