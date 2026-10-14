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

