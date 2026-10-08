// One palette for the page and the 3D scene: Violet (#6E58F5), Tango Orange (#FF8643), Pitch Yellow (#F59E00) on Cultured (#F8F7F3).
export const HUE = {
  violet: '#6E58F5',    // Violet
  tangerine: '#FF8643', // Tango Orange
  saffron: '#F59E00',   // Pitch Yellow
  cobalt: '#6E58F5',    // Violet (generic mapping)
  emerald: '#F59E00',   // Pitch Yellow (generic mapping)
  pink: '#FF8643',      // Tango Orange (generic mapping)
  signal: '#FF8643',    // Tango Orange (generic mapping)
  ink: '#14130F',       // Charcoal Ink
} as const;

export type HueName = keyof typeof HUE;

/** Particle hue slots, in the order the shader's palette uniform holds them. */
export const PARTICLE_HUES: HueName[] = ['violet', 'tangerine', 'saffron', 'violet', 'tangerine', 'saffron'];
export const hueIndex = (h: HueName) => PARTICLE_HUES.indexOf(h);

/** The logo's three threads: Violet, Tango Orange, Pitch Yellow. */
export const THREAD_HUES: HueName[] = ['violet', 'tangerine', 'saffron'];
/** The six tools of the problem chapter: chat, search, docs, code, vision, voice. */
export const TOOL_HUES: HueName[] = ['violet', 'tangerine', 'saffron', 'violet', 'tangerine', 'saffron'];
/** Capability families: understand, build, operate. */
export const GROUP_HUES: HueName[] = ['saffron', 'tangerine', 'violet'];
/** Architecture families: intelligence, knowledge & trust, foundation. */
export const FAMILY_HUES: HueName[] = ['tangerine', 'saffron', 'violet'];
/** Research domains, in DOMAINS order. */
export const DOMAIN_HUES: HueName[] = ['violet', 'tangerine', 'saffron', 'violet', 'tangerine', 'saffron'];
