const nodemailer = require("nodemailer");

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
  EMAIL_USER ||
  "no-reply@bharattech.internal";

const SMTP_HOST =
  process.env.SMTP_HOST ||
  process.env.MAIL_HOST ||
  process.env.KEYCLOAK_SMTP_HOST;
const SMTP_PORT = Number(
  process.env.SMTP_PORT ||
  process.env.MAIL_PORT ||
  process.env.KEYCLOAK_SMTP_PORT ||
  587
);
const SMTP_SECURE =
  process.env.SMTP_SECURE === "true" ||
  process.env.KEYCLOAK_SMTP_SSL === "true" ||
  SMTP_PORT === 465;

const SMTP_EMAIL_TIMEOUT_MS = Number(process.env.SMTP_EMAIL_TIMEOUT_MS || 8000);

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const createTransporter = () => {
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

  throw new Error("Email service is not configured. Please set EMAIL_USER and EMAIL_PASS.");
};

const sendVerificationEmail = async (email, token, origin = "http://localhost:5000") => {
  const transporter = createTransporter();
  const verificationUrl = `${origin}/api/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject: "Verify your email for BharatTech Account",
    text: `Please verify your email by clicking on the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 12px;">BharatTech Email Verification</h2>
        <p>Thank you for signing up. Please verify your email to activate your account:</p>
        <p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 10px 16px; background: #ff5a00; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Verify Email Address
          </a>
        </p>
        <p>This verification link will expire in 24 hours.</p>
        <p>BharatTech Team</p>
      </div>
    `,
  });
};

const sendInviteEmail = async ({
  email,
  name,
  role,
  username,
  temporaryPassword,
  loginUrl,
}) => {
  const transporter = createTransporter();
  const safeName = name || "Team Member";
  const escapedName = escapeHtml(safeName);
  const escapedRole = escapeHtml(role);
  const escapedUsername = escapeHtml(username);
  const escapedEmail = escapeHtml(email);
  const escapedTemporaryPassword = escapeHtml(temporaryPassword);
  const escapedLoginUrl = escapeHtml(loginUrl);

  const isAdmin = ["Admin", "Superadmin", "Subadmin"].includes(role);
  const subject = isAdmin
    ? `Action Required: Administrator Invitation to BharatTech LMS`
    : `You are invited to join BharatTech LMS as ${role}`;

  const adminNote = isAdmin
    ? `<p style="background:#f0f4ff;border-left:4px solid #4f46e5;padding:10px 14px;border-radius:4px;color:#3730a3;">
        <strong>Important:</strong> You have been granted Administrator access.
        Your account will not be active until you accept this invitation by signing in and
        setting your password.
       </p>`
    : "";

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject,
    text: [
      `Hello ${safeName},`,
      "",
      `You have been invited to BharatTech LMS as ${role}.`,
      isAdmin ? "\nIMPORTANT: You have been granted Administrator access.\n" : "",
      `Login URL: ${loginUrl}`,
      `Username: ${username}`,
      `Email: ${email}`,
      `Temporary password: ${temporaryPassword}`,
      "",
      "After you sign in, you will be prompted to create a new password.",
      "Your invitation will expire in 12 hours.",
      "",
      "BharatTech",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827; max-width: 560px;">
        <h2 style="margin: 0 0 12px; color: #1e1b4b;">${escapedRole} Invitation — BharatTech LMS</h2>
        <p>Hello ${escapedName},</p>
        <p>You have been invited to the <strong>BharatTech LMS</strong> platform as <strong>${escapedRole}</strong>.</p>
        ${adminNote}
        <p>Use the button below to open the platform, then sign in with your temporary credentials:</p>
        <p style="margin: 20px 0;">
          <a href="${escapedLoginUrl}" style="display: inline-block; padding: 11px 20px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Accept Invitation &amp; Sign In
          </a>
        </p>
        <table style="border-collapse:collapse; margin: 8px 0; font-size: 14px;">
          <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Username</td><td style="padding: 4px 0;"><strong>${escapedUsername}</strong></td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Email</td><td style="padding: 4px 0;"><strong>${escapedEmail}</strong></td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Temporary password</td><td style="padding: 4px 0;"><strong>${escapedTemporaryPassword}</strong></td></tr>
        </table>
        <p style="font-size:13px;color:#6b7280;">After signing in, please update your password. This invitation link expires in 12 hours.</p>
        <p style="margin-top:24px;color:#9ca3af;font-size:12px;">BharatTech Team</p>
      </div>
    `,
  });
};

module.exports = {
  createTransporter,
  sendVerificationEmail,
  sendInviteEmail,
  escapeHtml,
};
