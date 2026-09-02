const https = require("https");
const http = require("http");

const PING_INTERVAL_MS = 10 * 60 * 1000;

const startKeycloakKeepAlive = () => {
  const baseUrl = process.env.KEYCLOAK_BASE_URL || process.env.KEYCLOAK_URL;
  const realm = process.env.KEYCLOAK_REALM || "bharattech";

  if (!baseUrl || /localhost|127\.0\.0\.1/i.test(baseUrl)) {
    return;
  }

  const pingUrl = `${baseUrl.replace(/\/+$/, "")}/realms/${realm}/.well-known/openid-configuration`;
  const client = pingUrl.startsWith("https") ? https : http;

  const ping = () => {
    const req = client.get(pingUrl, { timeout: 15000 }, (res) => {
      res.resume();
    });
    req.on("error", () => {});
    req.on("timeout", () => req.destroy());
  };

  ping();
  setInterval(ping, PING_INTERVAL_MS);
};

const startSelfKeepAlive = () => {
  const baseUrl = process.env.PUBLIC_BACKEND_URL || process.env.RENDER_EXTERNAL_URL;

  if (!baseUrl || /localhost|127\.0\.0\.1/i.test(baseUrl)) {
    return;
  }

  const pingUrl = `${baseUrl.replace(/\/+$/, "")}/health`;
  const client = pingUrl.startsWith("https") ? https : http;

  const ping = () => {
    const req = client.get(pingUrl, { timeout: 15000 }, (res) => {
      res.resume();
    });
    req.on("error", () => {});
    req.on("timeout", () => req.destroy());
  };

  ping();
  setInterval(ping, PING_INTERVAL_MS);
};

module.exports = { startKeycloakKeepAlive, startSelfKeepAlive };
