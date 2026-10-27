// Lets Node run the site's TypeScript modules in tests: type stripping (--experimental-strip-types) plus this hook,
// which resolves the extensionless relative imports Vite allows ('../geo' → '../geo.ts').
import { register } from 'node:module';

register('./resolve-ts.mjs', import.meta.url);

// The tests' clock is UTC, not India's: code that slips back to the device's clock then fails here too, even on a
// laptop in India, where the device's clock and India's are the same.
process.env.TZ = 'UTC';
