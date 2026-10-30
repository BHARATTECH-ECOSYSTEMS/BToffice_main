// Preloaded by `npm test` (node --require). Lets node:test load the app's TypeScript without a build or a new package:
// files under src/ are turned into CommonJS by the TypeScript compiler the project already has, "@/..." resolves to
// src/, and two modules are swapped for test stand-ins (Next's request cookies and the AI providers).
const { registerHooks } = require('node:module');
const { readFileSync, existsSync } = require('node:fs');
const { fileURLToPath, pathToFileURL } = require('node:url');
const path = require('node:path');
const ts = require('typescript');
const { testDatabaseUri } = require('./testDatabase.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const STUBS = {
  'next/headers': path.join(__dirname, 'nextHeaders.cjs'),
  '@/lib/providers': path.join(__dirname, 'fakeProviders.cjs'),
};

// Tests run against their own database next to the laptop one, never a remote one (support/testDatabase.cjs); a copy
// without .env.local uses TEST_MONGODB_URI or the local MongoDB.
const readEnvLocal = () => {
  const file = path.join(ROOT, '.env.local');
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
};

Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: testDatabaseUri({ env: process.env, readEnvLocal }),
  LOCAL_FILE_STORAGE: 'false',
  ADMIN_PASSWORD: 'test-admin-password',
  SESSION_SECRET: 'test-session-secret',
  PARTICIPANT_TOKEN_SECRET: 'test-participant-secret',
  BHARATTECH_LAUNCH_SECRET: 'test-launch-secret',
  NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: 'openinterviewer-client',
});
for (const name of ['KEYCLOAK_URL', 'NEXT_PUBLIC_KEYCLOAK_URL', 'VITE_KEYCLOAK_URL', 'ADMIN_SECRET', 'GROQ_API_KEY', 'GROQ_MODEL']) {
  delete process.env[name];
}

function sourceFile(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (/\.tsx?$/.test(candidate) && existsSync(candidate)) return candidate;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (STUBS[specifier]) return { url: pathToFileURL(STUBS[specifier]).href, format: 'commonjs', shortCircuit: true };

    const parent = context.parentURL?.startsWith('file:') ? fileURLToPath(context.parentURL) : null;
    let file = null;
    if (specifier.startsWith('@/')) file = sourceFile(path.join(SRC, specifier.slice(2)));
    else if (specifier.startsWith('.') && parent?.startsWith(SRC)) file = sourceFile(path.resolve(path.dirname(parent), specifier));
    if (file) return { url: pathToFileURL(file).href, format: 'commonjs', shortCircuit: true };

    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.tsx?$/.test(url)) {
      const fileName = fileURLToPath(url);
      const { outputText } = ts.transpileModule(readFileSync(fileName, 'utf8'), {
        fileName,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
          jsx: ts.JsxEmit.ReactJSX,
        },
      });
      return { format: 'commonjs', source: outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
