const { randomBytes } = require("crypto");
const InviteSent = require("../models/InviteSent");
const { kcAdmin, ensureKeycloakAdmin } = require("./keycloakAdmin");

// The invite email says the temporary password expires in 12 hours (owner's 5A, 2026-10-25). Invites sent before
// this was enforced have no record and are left as they were.
const INVITE_HOURS = 12;
const INVITE_MS = INVITE_HOURS * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";

const EXPIRED = { code: "invite-expired", message: "This invite has expired. Ask an admin to send it again." };

/** Notes that a temporary password was just emailed: the 12 hours start (again) now. */
const recordInviteSent = ({ keycloakId, email, username }) =>
  InviteSent.updateOne(
    { keycloakId },
    { $set: { email: String(email).toLowerCase(), username: String(username || "").toLowerCase(), sentAt: new Date() }, $unset: { voidedAt: 1 } },
    { upsert: true }
  );

const isExpired = (record, now = Date.now()) => Boolean(record) && now - new Date(record.sentAt).getTime() > INVITE_MS;

/** The expired invite someone signs in for (by email or the username it was sent with, any case), or null. */
const expiredInviteFor = async (login, now = Date.now()) => {
  const name = String(login || "").trim().toLowerCase();
  if (!name) return null;
  const record = await InviteSent.findOne({ $or: [{ email: name }, { username: name }] }).lean();
  return isExpired(record, now) ? record : null;
};

/** The invite is finished or cancelled: nothing left to expire. */
const forgetInvite = (keycloakId) => InviteSent.deleteOne({ keycloakId });

/**
 * Replaces the emailed temporary password of every expired invite with one nobody knows, so it stops working on
 * Keycloak's own sign-in page too (LibreChat, the LMS platform). An account that is no longer waiting for its first
 * password was finished elsewhere and is just forgotten. Answers how many passwords were replaced.
 */
const voidExpiredInvites = async (now = Date.now()) => {
  const due = await InviteSent.find({ sentAt: { $lt: new Date(now - INVITE_MS) }, voidedAt: { $exists: false } }).lean();
  if (!due.length) return 0;
  await ensureKeycloakAdmin();
  let voided = 0;
  for (const record of due) {
    const account = await kcAdmin.users.findOne({ realm: KEYCLOAK_REALM, id: record.keycloakId });
    if (!account || !(account.requiredActions || []).includes("UPDATE_PASSWORD")) {
      await forgetInvite(record.keycloakId);
      continue;
    }
    await kcAdmin.users.resetPassword({
      realm: KEYCLOAK_REALM,
      id: record.keycloakId,
      credential: { type: "password", value: randomBytes(32).toString("base64url"), temporary: true },
    });
    await InviteSent.updateOne({ _id: record._id }, { $set: { voidedAt: new Date(now) } });
    voided += 1;
  }
  return voided;
};

/** Runs the check now and then every hour; a failure is logged and tried again the next hour. */
const startHourlyInviteCheck = () => {
  const run = () =>
    voidExpiredInvites()
      .then((voided) => voided && console.log(`Invites: ${voided} expired temporary password(s) replaced`))
      .catch((error) => console.error("Invite expiry check failed:", error.message));
  run();
  setInterval(run, HOUR_MS).unref();
};

module.exports = { INVITE_HOURS, EXPIRED, recordInviteSent, isExpired, expiredInviteFor, forgetInvite, voidExpiredInvites, startHourlyInviteCheck };
