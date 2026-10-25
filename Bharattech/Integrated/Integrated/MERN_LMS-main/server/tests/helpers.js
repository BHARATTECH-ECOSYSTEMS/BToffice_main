import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Shared test setup: a stand-in for Keycloak's signing keys, the app on a free port and a local test database.

const here = path.dirname(fileURLToPath(import.meta.url));
const REALM = "bharattech";
export const LOCAL_SECRET = "a-local-secret-the-server-must-ignore";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const KID = "test-key";

let keyServer;
let appServer;
let issuer;
export let baseUrl;

// The auth middleware reads its Keycloak settings when it loads, so the key server must be up first.
async function startKeyServer() {
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: KID, alg: "RS256", use: "sig" };
  keyServer = http.createServer((req, res) => {
    if (req.url === `/realms/${REALM}/protocol/openid-connect/certs`) {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ keys: [jwk] }));
    }
    res.writeHead(404).end();
  });
  await new Promise((resolve) => keyServer.listen(0, "127.0.0.1", resolve));
  const keycloakUrl = `http://127.0.0.1:${keyServer.address().port}`;
  issuer = `${keycloakUrl}/realms/${REALM}`;
  return keycloakUrl;
}

function testDatabaseUri() {
  const settings = dotenv.parse(fs.readFileSync(path.join(here, "..", ".env")));
  const uri = settings.MONGODB_URI || settings.MONGO_URI;
  const host = new URL(uri.replace(/^mongodb(\+srv)?:/, "http:")).hostname;
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
    throw new Error("Tests only run against a local MongoDB");
  }
  return uri;
}

export async function startApp() {
  process.env.KEYCLOAK_URL = await startKeyServer();
  process.env.KEYCLOAK_REALM = REALM;
  process.env.KEYCLOAK_CLIENT_IDS = "lms-client";
  // Set on purpose: a token signed with it must still be refused.
  process.env.JWT_SECRET = LOCAL_SECRET;
  process.env.NODE_ENV = "test";

  await mongoose.connect(testDatabaseUri(), { dbName: "lms_test" });
  const { default: app } = await import("../app.js");
  appServer = http.createServer(app);
  await new Promise((resolve) => appServer.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${appServer.address().port}`;
}

export async function stopApp() {
  await new Promise((resolve) => appServer?.close(resolve));
  await new Promise((resolve) => keyServer?.close(resolve));
  await mongoose.disconnect();
}

export async function clearDatabase() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

/** A token as Keycloak would sign it for the LMS; `claims` overrides any field. */
export function tokenFor({ sub = randomUUID(), roles = ["Employee"], ...claims } = {}) {
  return jwt.sign(
    {
      sub,
      iss: issuer,
      azp: "lms-client",
      email: `${sub}@example.test`,
      name: "Test Person",
      preferred_username: `user-${sub}`,
      realm_access: { roles },
      ...claims,
    },
    privateKey,
    { algorithm: "RS256", keyid: KID, expiresIn: "5m" }
  );
}

export async function call(method, url, { token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const res = await fetch(`${baseUrl}${url}`, { method, headers, body });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

// The smallest valid PNG (1×1), for course covers.
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

export function courseForm(courseData) {
  const form = new FormData();
  form.append("courseData", JSON.stringify(courseData));
  form.append("image", new Blob([PNG], { type: "image/png" }), "cover.png");
  return form;
}

export const sampleCourse = (overrides = {}) => ({
  courseTitle: "Safe course",
  courseDescription: "<p>About this course</p>",
  coursePrice: 0,
  discount: 0,
  courseContent: [
    {
      chapterTitle: "Chapter 1",
      chapterContent: [
        {
          lectureTitle: "Lecture 1",
          lectureDuration: 5,
          lectureUrl: "https://youtu.be/dQw4w9WgXcQ",
          isPreviewFree: true,
        },
      ],
    },
  ],
  ...overrides,
});
