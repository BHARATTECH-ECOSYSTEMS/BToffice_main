import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, "public");
const dataDir = join(__dirname, "data");
const usersFile = join(dataDir, "users.json");
const punchesFile = join(dataDir, "punches.json");
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3001);
const sessionTtlMs = 1000 * 60 * 60 * 12;

const sessions = new Map();

function ensureDataFiles() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  if (!existsSync(usersFile)) {
    const defaultEmail = process.env.ATTENDANCE_DEFAULT_EMAIL ?? "admin@company.com";
    const defaultPassword = process.env.ATTENDANCE_DEFAULT_PASSWORD ?? "admin123";
    const seededUser = {
      id: "user-admin",
      name: "Admin User",
      email: defaultEmail.toLowerCase(),
      passwordHash: hashPassword(defaultPassword),
      createdAt: new Date().toISOString(),
    };
    writeJson(usersFile, [seededUser]);
  }

  if (!existsSync(punchesFile)) {
    writeJson(punchesFile, []);
  }
}

function hashPassword(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function readUsers() {
  return readJson(usersFile, []);
}

function readPunches() {
  return readJson(punchesFile, []);
}

function writePunches(records) {
  writeJson(punchesFile, records);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function parseCookies(req) {
  const raw = req.headers.cookie ?? "";
  return raw.split(";").reduce((acc, item) => {
    const trimmed = item.trim();
    if (!trimmed) return acc;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return acc;
    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function createSession(userId) {
  const token = randomUUID();
  sessions.set(token, {
    userId,
    expiresAt: Date.now() + sessionTtlMs,
  });
  return token;
}

function destroySession(token) {
  if (token) {
    sessions.delete(token);
  }
}

function getAuthenticatedUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.session_token;
  if (!token) {
    return null;
  }

  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }

  session.expiresAt = Date.now() + sessionTtlMs;
  const user = readUsers().find((item) => item.id === session.userId);
  if (!user) {
    sessions.delete(token);
    return null;
  }

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

function requireAuth(req, res) {
  const auth = getAuthenticatedUser(req);
  if (!auth) {
    sendJson(res, 401, { error: "Authentication required" });
    return null;
  }
  return auth;
}

function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function summarizeDayEntry(records, userId, dateKey) {
  const entry = records.find((item) => item.userId === userId && item.date === dateKey);
  if (!entry) {
    return {
      date: dateKey,
      punchedInAt: null,
      punchedOutAt: null,
      status: "not-started",
      totalHours: 0,
    };
  }

  const totalMs = entry.punchOutAt
    ? new Date(entry.punchOutAt).getTime() - new Date(entry.punchInAt).getTime()
    : 0;

  return {
    ...entry,
    status: entry.punchOutAt ? "completed" : "active",
    totalHours: Number((Math.max(totalMs, 0) / 36e5).toFixed(2)),
  };
}

function buildHistory(records, userId) {
  return records
    .filter((item) => item.userId === userId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((item) => summarizeDayEntry(records, userId, item.date));
}

function serveStatic(req, res, pathname) {
  const requestedPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const safePath = normalize(join(publicDir, requestedPath));
  if (!safePath.startsWith(publicDir)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  if (!existsSync(safePath)) {
    sendText(res, 404, "Not found");
    return;
  }

  const contentType = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  }[extname(safePath)] ?? "application/octet-stream";

  res.writeHead(200, { "Content-Type": contentType });
  res.end(readFileSync(safePath));
}

async function handleApi(req, res, pathname) {
  if (req.method === "POST" && pathname === "/api/auth/login") {
    const { email, password } = await parseJsonBody(req);
    if (!email || !password) {
      sendJson(res, 400, { error: "Email and password are required" });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const passwordHash = hashPassword(String(password));
    const user = readUsers().find((item) => item.email === normalizedEmail);
    if (!user || user.passwordHash !== passwordHash) {
      sendJson(res, 401, { error: "Invalid email or password" });
      return;
    }

    const token = createSession(user.id);
    sendJson(
      res,
      200,
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      {
        "Set-Cookie": `session_token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${sessionTtlMs / 1000}; SameSite=Lax`,
      },
    );
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/logout") {
    const auth = getAuthenticatedUser(req);
    destroySession(auth?.token);
    sendJson(
      res,
      200,
      { success: true },
      {
        "Set-Cookie": "session_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
      },
    );
    return;
  }

  if (req.method === "GET" && pathname === "/api/auth/session") {
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      sendJson(res, 200, { user: null });
      return;
    }
    sendJson(res, 200, { user: auth.user });
    return;
  }

  if (req.method === "GET" && pathname === "/api/attendance/today") {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const punches = readPunches();
    sendJson(res, 200, {
      user: auth.user,
      today: summarizeDayEntry(punches, auth.user.id, getTodayKey()),
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/attendance/history") {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const punches = readPunches();
    sendJson(res, 200, {
      history: buildHistory(punches, auth.user.id),
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/attendance/punch-in") {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const punches = readPunches();
    const todayKey = getTodayKey();
    const existing = punches.find((item) => item.userId === auth.user.id && item.date === todayKey);
    if (existing?.punchInAt) {
      sendJson(res, 409, { error: "You have already punched in today" });
      return;
    }

    const now = new Date().toISOString();
    punches.push({
      id: randomUUID(),
      userId: auth.user.id,
      date: todayKey,
      punchInAt: now,
      punchOutAt: null,
    });
    writePunches(punches);
    sendJson(res, 201, {
      today: summarizeDayEntry(punches, auth.user.id, todayKey),
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/attendance/punch-out") {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const punches = readPunches();
    const todayKey = getTodayKey();
    const existing = punches.find((item) => item.userId === auth.user.id && item.date === todayKey);
    if (!existing?.punchInAt) {
      sendJson(res, 409, { error: "Punch in first before punching out" });
      return;
    }
    if (existing.punchOutAt) {
      sendJson(res, 409, { error: "You have already punched out today" });
      return;
    }

    existing.punchOutAt = new Date().toISOString();
    writePunches(punches);
    sendJson(res, 200, {
      today: summarizeDayEntry(punches, auth.user.id, todayKey),
    });
    return;
  }

  sendJson(res, 404, { error: "Route not found" });
}

ensureDataFiles();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
      return;
    }
    serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Internal server error" });
  }
});

server.listen(port, host, () => {
  console.log(`Attendance app running at http://${host}:${port}`);
});
