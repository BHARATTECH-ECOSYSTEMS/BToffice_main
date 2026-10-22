// Connects the tests to a throwaway database next to the local one: MONGO_URI's database name + "_unit".
// It refuses anything that isn't a MongoDB on this machine, so tests can never touch shared or live data.
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", ".env"), quiet: true });

const LOCAL_HOSTS = ["127.0.0.1", "localhost"];

const testDbUri = () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set, so there is no local database to test against.");
  const parsed = new URL(uri);
  if (parsed.protocol !== "mongodb:" || !LOCAL_HOSTS.includes(parsed.hostname)) {
    throw new Error("Tests only run against a MongoDB on this machine (127.0.0.1 or localhost).");
  }
  const dbName = parsed.pathname.replace(/^\//, "") || "bharattech";
  parsed.pathname = `/${dbName}_unit`;
  return parsed.toString();
};

const connectTestDb = async () => {
  await mongoose.connect(testDbUri(), { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();
  // unique indexes (email, employeeId…) must exist before the tests rely on them
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
};

const clearTestDb = async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
};

const disconnectTestDb = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

let made = 0;
/** The fields every user needs, unique per call; pass overrides for what the test is about. */
const userFields = (overrides = {}) => {
  made += 1;
  return {
    fullName: `Test Person ${made}`,
    username: `test.person.${made}`,
    email: `test.person.${made}@example.test`,
    keycloakId: `kc-test-${made}`,
    role: "Employee",
    authProvider: "keycloak",
    ...overrides,
  };
};

module.exports = { connectTestDb, clearTestDb, disconnectTestDb, userFields };
