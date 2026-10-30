// Keycloak's token endpoint (the password grant the sign-in, accept-invite and change-password routes ask) as the
// tests need it: `answers` is a list of what to say to each call in turn ("ok", "set up", "wrong", "disabled"), the
// last one repeating. Call it in a test; `restore` puts the real fetch back.
const DESCRIPTIONS = { "set up": "Account is not fully set up", wrong: "Invalid user credentials", disabled: "Account disabled" };

const fakeToken = (claims = {}) =>
  `x.${Buffer.from(JSON.stringify({ sub: "kc-1", preferred_username: "asha", realm_access: { roles: ["Employee"] }, ...claims })).toString("base64url")}.y`;

const realFetch = global.fetch;
const fakeTokenEndpoint = (...answers) => {
  const asked = [];
  global.fetch = async (_url, init) => {
    const form = new URLSearchParams(init?.body);
    asked.push({ username: form.get("username") });
    const answer = answers.length > 1 ? answers.shift() : answers[0];
    return answer === "ok"
      ? { ok: true, json: async () => ({ access_token: fakeToken(), refresh_token: "r", expires_in: 300 }) }
      : { ok: false, json: async () => ({ error: "invalid_grant", error_description: DESCRIPTIONS[answer] }) };
  };
  return asked;
};
const restore = () => {
  global.fetch = realFetch;
};

module.exports = { fakeTokenEndpoint, restore };
