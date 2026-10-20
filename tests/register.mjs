// Lets Node run the site's TypeScript modules in tests: type stripping (--experimental-strip-types) plus this hook,
// which resolves the extensionless relative imports Vite allows ('../geo' → '../geo.ts').
import { register } from 'node:module';

register('./resolve-ts.mjs', import.meta.url);
