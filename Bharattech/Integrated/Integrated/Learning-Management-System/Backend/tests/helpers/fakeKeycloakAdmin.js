// An in-memory stand-in for the keycloak-admin client: accounts, realm roles and passwords, enough for the invite
// flow. Put it in place before the code under test loads keycloak-admin:
//   const realm = installFakeKeycloakAdmin();   // then require the controllers
// realm.accounts, realm.passwords and realm.calls can be read and set by the test.
const installFakeKeycloakAdmin = () => {
  const realm = { accounts: [], roles: new Map(), passwords: new Map(), calls: [], next: 1 };
  const roleOf = (name) => {
    if (!realm.roles.has(name)) realm.roles.set(name, { id: `role-${name}`, name });
    return realm.roles.get(name);
  };
  const account = (id) => realm.accounts.find((a) => a.id === id);

  class FakeKcAdminClient {
    constructor() {
      this.users = {
        find: async ({ email, username, exact } = {}) => {
          realm.calls.push(["find", { email, username, exact }]);
          return realm.accounts.filter((a) => (email ? a.email === email : username ? a.username === username : true)).map((a) => ({ ...a }));
        },
        findOne: async ({ id }) => (account(id) ? { ...account(id) } : null),
        create: async (rep) => {
          const id = `kc-${realm.next++}`;
          realm.accounts.push({ id, createdTimestamp: Date.now(), realmRoles: [], ...rep, realm: undefined });
          realm.calls.push(["create", rep.email]);
          return { id };
        },
        update: async ({ id }, rep) => {
          Object.assign(account(id), rep);
          realm.calls.push(["update", id]);
        },
        del: async ({ id }) => {
          realm.accounts = realm.accounts.filter((a) => a.id !== id);
          realm.calls.push(["del", id]);
        },
        resetPassword: async ({ id, credential }) => {
          realm.passwords.set(id, credential);
          realm.calls.push(["resetPassword", id]);
        },
        listRealmRoleMappings: async ({ id }) => (account(id)?.realmRoles || []).map(roleOf),
        addRealmRoleMappings: async ({ id, roles }) => {
          account(id).realmRoles = [...new Set([...(account(id).realmRoles || []), ...roles.map((r) => r.name)])];
        },
        delRealmRoleMappings: async ({ id, roles }) => {
          account(id).realmRoles = (account(id).realmRoles || []).filter((name) => !roles.some((r) => r.name === name));
        },
        count: async () => realm.accounts.length,
      };
      this.roles = {
        findOneByName: async ({ name }) => roleOf(name),
        create: async ({ name }) => roleOf(name),
      };
    }
    async auth() {}
  }

  require.cache[require.resolve("keycloak-admin")] = { id: "keycloak-admin", loaded: true, exports: { default: FakeKcAdminClient } };
  return realm;
};

module.exports = { installFakeKeycloakAdmin };
