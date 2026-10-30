import type { DomainWorld } from './kit';
import { createDefenseDome } from './defenseDome';
import { createGeoGlobe } from './geoGlobe';
import { createGiRivinity } from './giRivinity';
import { createIotGrid } from './iotGrid';
import { createMiniatureChip } from './miniatureChip';
import { createRivinityCore } from './rivinityCore';

/** One 3D world per research domain, in DOMAINS order. A missing entry falls back to the 2D ink reel. */
export const WORLD_BUILDERS: ((() => DomainWorld) | undefined)[] = [
  createGiRivinity,
  createRivinityCore,
  createIotGrid,
  createGeoGlobe,
  createDefenseDome,
  createMiniatureChip,
];
