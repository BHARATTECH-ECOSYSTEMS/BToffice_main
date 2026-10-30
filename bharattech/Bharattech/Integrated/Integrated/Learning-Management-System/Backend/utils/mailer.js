const nodemailer = require("nodemailer");

// The backend's email settings and transport, shared by invite emails (controllers/inviteController.js) and
// notification emails (utils/notify.js). Read once at start-up; server.js loads .env before anything requires this.

const DEFAULT_FRONTEND_URL = "https://bharattech-learning-management-system.onrender.com";
const isProductionRuntime = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);
const configuredFrontendUrl = process.env.FRONTEND_URL;
const isLocalFrontendUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(
  configuredFrontendUrl || ""
);
const FRONTEND_URL =
  configuredFrontendUrl && !(isProductionRuntime && isLocalFrontendUrl)
    ? configuredFrontendUrl
    : DEFAULT_FRONTEND_URL;
const EMAIL_USER =
  process.env.EMAIL_USER ||
  process.env.SMTP_USER ||
  process.env.MAIL_USER ||
  process.env.GMAIL_USER ||
  process.env.KEYCLOAK_SMTP_USER;
const EMAIL_PASS =
  process.env.EMAIL_PASS ||
  process.env.SMTP_PASS ||
  process.env.SMTP_PASSWORD ||
  process.env.MAIL_PASS ||
  process.env.GMAIL_PASS ||
  process.env.KEYCLOAK_SMTP_PASS ||
  process.env.KEYCLOAK_SMTP_PASSWORD;
const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  process.env.SMTP_FROM ||
  process.env.MAIL_FROM ||
  EMAIL_USER;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
const SMTP_EMAIL_TIMEOUT_MS = Number(process.env.SMTP_EMAIL_TIMEOUT_MS || 20000);

const createMailTransporter = () => {
  if (SMTP_HOST) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      connectionTimeout: SMTP_EMAIL_TIMEOUT_MS,
      greetingTimeout: SMTP_EMAIL_TIMEOUT_MS,
      socketTimeout: SMTP_EMAIL_TIMEOUT_MS,
      auth: EMAIL_USER && EMAIL_PASS ? { user: EMAIL_USER, pass: EMAIL_PASS } : undefined,
    });
  }

  if (EMAIL_USER && EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      connectionTimeout: SMTP_EMAIL_TIMEOUT_MS,
      greetingTimeout: SMTP_EMAIL_TIMEOUT_MS,
      socketTimeout: SMTP_EMAIL_TIMEOUT_MS,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }

  throw new Error("Invite email is not configured. Set EMAIL_USER and EMAIL_PASS.");
};

// Any HTML email built from saved text must escape it (names, task titles…).
const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** A full address for a page of the portal (the site routes after "#"), e.g. "/portal/certificates". */
const portalUrl = (path) => `${FRONTEND_URL.replace(/\/$/, "")}/#${path}`;

module.exports = {
  DEFAULT_FRONTEND_URL,
  FRONTEND_URL,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
  SMTP_EMAIL_TIMEOUT_MS,
  createMailTransporter,
  escapeHtml,
  portalUrl,
};
