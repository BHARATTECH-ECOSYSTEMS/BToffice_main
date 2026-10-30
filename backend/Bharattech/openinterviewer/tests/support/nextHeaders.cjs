// Stand-in for next/headers outside a Next request: one cookie jar per test, set with useCookies().
let jar = new Map();

function useCookies(values = {}) {
  jar = new Map(Object.entries(values).map(([name, value]) => [name, { name, value }]));
  return jar;
}

async function cookies() {
  return {
    get: (name) => jar.get(name),
    set: (name, value, options) => jar.set(name, { name, value, options }),
    delete: (name) => jar.set(name, { name, value: '', deleted: true }),
  };
}

module.exports = { cookies, useCookies, cookieJar: () => jar };
