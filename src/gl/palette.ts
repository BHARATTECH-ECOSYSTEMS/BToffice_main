// One palette for the page and the 3D scene. Each chapter owns one colour; red is reserved for risk.

export const HUE = {
  cobalt: '#2E5BFF',
  tangerine: '#FF7438',
  emerald: '#0FA874',
  violet: '#7C5CFF',
  pink: '#FF5FA2',
  saffron: '#FFB21E',
  signal: '#F2361F',
  ink: '#14130F',
} as const;

export type HueName = keyof typeof HUE;

/** Particle hue slots, in the order the shader's palette uniform holds them. */
export const PARTICLE_HUES: HueName[] = ['cobalt', 'tangerine', 'emerald', 'violet', 'pink', 'saffron'];
export const hueIndex = (h: HueName) => PARTICLE_HUES.indexOf(h);

/** The logo's three threads, top to bottom. */
export const THREAD_HUES: HueName[] = ['cobalt', 'tangerine', 'emerald'];
/** The six tools of the problem chapter: chat, search, docs, code, vision, voice. */
export const TOOL_HUES: HueName[] = ['cobalt', 'tangerine', 'emerald', 'violet', 'pink', 'saffron'];
/** Capability families: understand, build, operate. */
export const GROUP_HUES: HueName[] = ['cobalt', 'violet', 'emerald'];
/** Architecture families: intelligence, knowledge & trust, foundation. */
export const FAMILY_HUES: HueName[] = ['cobalt', 'violet', 'tangerine'];
/** Research domains, in DOMAINS order. */
export const DOMAIN_HUES: HueName[] = ['cobalt', 'violet', 'emerald', 'saffron', 'pink', 'tangerine'];
