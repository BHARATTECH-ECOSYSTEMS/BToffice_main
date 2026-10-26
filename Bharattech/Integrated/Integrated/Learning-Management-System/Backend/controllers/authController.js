// Sign-in through Keycloak: the password grant (with Employee IDs and older "$"-less passwords), finishing an invite,
// and changing a password. The company's old local sign-up and sign-in (register, login, signup + verify-email, the
// local change-password and check-admin-session) were removed in step 17: register took any role from the request,
// Superadmin included, and logged the whole request, password and all; nothing called them any more.
const User = require("../models/User");

const { kcAdmin, ensureKeycloakAdmin, keycloakReply } = require("../utils/keycloakAdmin");
const { EXPIRED, expiredInviteFor, forgetInvite } = require("../utils/inviteExpiry");
const KEYCLOAK_BASE_URL =
  process.env.KEYCLOAK_BASE_URL || "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";

const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || "lms-client";

// Exchanges username/password for tokens via Keycloak's Direct Grant flow and
// builds the user payload our frontend expects. Shared by keycloakLogin and
// acceptInvite (the second leg, after a temporary password has been replaced).
const passwordGrantLogin = async (username, password) => {
  const tokenUrl = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID,
      grant_type: "password",
      username,
      password,
    }).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      ok: false,
      error: data.error,
      errorDescription: data.error_description,
    };
  }

  const base64 = data.access_token
    .split(".")[1]
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const tp = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));

  const allRoles = [
    ...(tp.realm_access?.roles || []),
    ...(tp.resource_access?.[KEYCLOAK_CLIENT_ID]?.roles || []),
  ];
  const upper = allRoles.map((r) => r.toUpperCase().replace(/[-_\s]/g, ""));

  let role = "INTERN";
  if (upper.includes("SUPERADMIN")) role = "SUPERADMIN";
  else if (upper.includes("ADMIN")) role = "ADMIN";
  else if (upper.includes("SUBADMIN")) role = "SUBADMIN";
  else if (upper.includes("EMPLOYEE")) role = "EMPLOYEE";

  const firstName = tp.given_name || "";
  const lastName = tp.family_name || "";
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    tp.name ||
    tp.preferred_username ||
    "";

  const userObj = {
    fullName,
    firstName,
    lastName,
    username: tp.preferred_username || username,
    email: tp.email || "",
    role,
  };

  // Sync to local DB (best-effort)
  try {
    const { getOrCreateUser } = require("../middlewares/keycloakAuth");
    await getOrCreateUser(tp);
  } catch (_) {
    /* don't fail login if DB sync fails */
  }

  return {
    ok: true,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    id_token: data.id_token,
    user: userObj,
  };
};

// Before step 16 the request cleaner deleted every "$" from what people typed, so a password chosen with "$" was
// saved in Keycloak without it, and signing in worked only because the typing was cut the same way. Passwords now
// arrive as typed, so when one with a "$" is refused, the same password without its "$" is tried once.
const isWrongPassword = (result) => !result.ok && /invalid user credentials/i.test(result.errorDescription || "");
const withoutDollars = (password) => String(password).replace(/\$/g, "");

/**
 * Signs in with the password as typed or, for a password saved before step 16, as it was saved. `resave` then saves
 * it as typed, so the next sign-in needs one try; a failure there is logged (never the password) and doesn't stop
 * the sign-in.
 */
const passwordGrantAsTyped = async (username, password, { resave = false } = {}) => {
  const result = await passwordGrantLogin(username, password);
  if (!isWrongPassword(result) || typeof password !== "string" || !password.includes("$")) return result;
  const older = await passwordGrantLogin(username, withoutDollars(password));
  if (!older.ok) return result;
  if (resave) {
    try {
      const { sub } = JSON.parse(Buffer.from(older.access_token.split(".")[1], "base64url").toString("utf8"));
      await ensureKeycloakAdmin();
      await kcAdmin.users.resetPassword({ realm: KEYCLOAK_REALM, id: sub, credential: { type: "password", value: password, temporary: false } });
    } catch (error) {
      console.warn("Sign-in: an older password couldn't be saved again as typed:", error.message);
    }
  }
  return older;
};

// BT-0001, bt-0001, BT0001… (IDs are padded to at least four digits).
const EMPLOYEE_ID_SHAPE = /^bt-?(\d{4,})$/i;

// People may sign in with their Employee ID, which Keycloak doesn't know, so it is swapped for the person's email.
// An ID nobody has goes to Keycloak unchanged and fails like a wrong password: neither the message nor the reply
// time shows which IDs exist.
const loginNameFor = async (typed) => {
  const match = EMPLOYEE_ID_SHAPE.exec(String(typed).trim());
  if (!match) return typed;
  const person = await User.findOne({ employeeId: `BT-${match[1]}`, isDeleted: { $ne: true } })
    .select("email")
    .lean();
  return person?.email || String(typed).trim();
};

/** The steps Keycloak still wants on this account (by username, else email), or null when it can't be looked up. */
const unfinishedSteps = async (login) => {
  try {
    await ensureKeycloakAdmin();
    const byUsername = await kcAdmin.users.find({ realm: KEYCLOAK_REALM, username: login, exact: true });
    const [account] = byUsername.length ? byUsername : await kcAdmin.users.find({ realm: KEYCLOAK_REALM, email: login, exact: true });
    return account ? account.requiredActions || [] : null;
  } catch (error) {
    console.warn("Sign-in: couldn't look up the account's unfinished steps:", error.message);
    return null;
  }
};

const keycloakLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const login = await loginNameFor(username);
    const result = await passwordGrantAsTyped(login, password, { resave: true });

    if (!result.ok) {
      console.warn(
        "Keycloak login failed:",
        result.errorDescription || result.error,
      );

      // Keycloak refuses a right password while the account has an unfinished step. A temporary (invite) password
      // waits for a new one: that's the invite's "Set up your account". Any other step (a missing last name, an email
      // to verify…) is an admin's to finish, so it isn't presented as a password change.
      // an invite past its 12 hours: said plainly, whether its emailed password still works or was already replaced
      if (await expiredInviteFor(login)) return res.status(410).json(EXPIRED);

      if (/not fully set up/i.test(result.errorDescription || "")) {
        const steps = await unfinishedSteps(login);
        if (steps?.includes("UPDATE_PASSWORD")) {
          return res.status(403).json({
            requiresPasswordChange: true,
            message: "Please set a new password to finish accepting your invite.",
          });
        }
        console.warn("Sign-in: the account isn't fully set up; Keycloak still wants:", steps ? steps.join(", ") || "nothing listed" : "unknown");
        return res.status(403).json({ message: "Your account isn't fully set up yet. Ask an admin to finish it." });
      }

      return res.status(401).json({ message: "Invalid username or password" });
    }

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("keycloakLogin error:", error);
    res.status(500).json({ message: "Login failed" });
  }
};

// Second leg of the invite flow: the user submitted their temporary password
// plus a new permanent one (entered on our own /login page, never on
// Keycloak's hosted UI). We confirm the temporary password is genuinely
// correct by treating Keycloak's "not fully set up" response as proof of
// valid credentials, then use the admin API to set the permanent password
// and clear the pending UPDATE_PASSWORD action, and finally log them in.
const acceptInvite = async (req, res) => {
  try {
    const { username, temporaryPassword, newPassword, newUsername } = req.body;
    const trimmedNewUsername = String(newUsername || "").trim();

    if (
      !username ||
      !temporaryPassword ||
      !newPassword ||
      !trimmedNewUsername
    ) {
      return res.status(400).json({
        message:
          "Username, temporary password, new password, and a chosen username are required",
      });
    }

    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(trimmedNewUsername)) {
      return res.status(400).json({
        message:
          "Username must be 3-32 characters and contain only letters, numbers, dots, dashes, or underscores.",
      });
    }

    if (await expiredInviteFor(username)) return res.status(410).json(EXPIRED);

    const checkResult = await passwordGrantLogin(username, temporaryPassword);

    if (
      !checkResult.ok &&
      !/not fully set up/i.test(checkResult.errorDescription || "")
    ) {
      return res
        .status(401)
        .json({ message: "Invalid username or temporary password" });
    }

    await ensureKeycloakAdmin();

    // The invitee may have typed either their assigned username or their
    // email to sign in — try both when locating their Keycloak record.
    const byUsername = await kcAdmin.users.find({
      realm: KEYCLOAK_REALM,
      username,
      exact: true,
    });
    const byEmail = byUsername.length
      ? []
      : await kcAdmin.users.find({
          realm: KEYCLOAK_REALM,
          email: username,
          exact: true,
        });
    const kcUser = byUsername[0] || byEmail[0];

    if (!kcUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only an invite is finished here. A set-up account changes its password through Change password, which also
    // signs it out everywhere.
    if (!(kcUser.requiredActions || []).includes("UPDATE_PASSWORD")) {
      return res.status(409).json({ code: "already-set-up", message: "This account is already set up. Sign in, then use Change password in Settings." });
    }

    if (
      trimmedNewUsername.toLowerCase() !== (kcUser.username || "").toLowerCase()
    ) {
      const taken = await kcAdmin.users.find({
        realm: KEYCLOAK_REALM,
        username: trimmedNewUsername,
        exact: true,
      });
      if (taken.some((u) => u.id !== kcUser.id)) {
        return res.status(409).json({
          message: "That username is already taken. Please choose another.",
        });
      }
    }

    await kcAdmin.users.resetPassword({
      realm: KEYCLOAK_REALM,
      id: kcUser.id,
      credential: { type: "password", value: newPassword, temporary: false },
    });

    await kcAdmin.users.update(
      { realm: KEYCLOAK_REALM, id: kcUser.id },
      { username: trimmedNewUsername, requiredActions: [] },
    );
    await forgetInvite(kcUser.id);

    const loginResult = await passwordGrantLogin(
      trimmedNewUsername,
      newPassword,
    );

    if (!loginResult.ok) {
      console.error(
        "Post-accept-invite login failed:",
        loginResult.errorDescription || loginResult.error,
      );
      return res.status(500).json({
        message:
          "Password updated, but automatic sign-in failed. Please log in again.",
      });
    }

    return res.json({ success: true, ...loginResult });
  } catch (error) {
    console.error("acceptInvite error:", error);
    res
      .status(500)
      .json({ message: "Failed to set new password" });
  }
};

// Lets an already-authenticated Keycloak user change their own password from
// inside the app (Profile page), as opposed to the one-time invite-acceptance
// flow. Verifies the current password via Direct Grant before changing it.
const keycloakChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }

    const username = req.user?.decoded?.preferred_username || req.user?.email;
    if (!username) {
      return res
        .status(401)
        .json({ message: "Could not identify the current user" });
    }

    // the new password replaces it anyway, so the older one isn't saved again first
    const checkResult = await passwordGrantAsTyped(username, currentPassword);
    if (!checkResult.ok) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    await ensureKeycloakAdmin();

    try {
      await kcAdmin.users.resetPassword({
        realm: KEYCLOAK_REALM,
        id: req.user.keycloakId,
        credential: { type: "password", value: newPassword, temporary: false },
      });
    } catch (error) {
      // Keycloak refuses a password that breaks the realm's rules with a 400 and a readable reason
      const keycloak = keycloakReply(error);
      const reason = keycloak.status === 400 && keycloak.data?.error_description;
      if (reason) return res.status(400).json({ message: reason });
      throw error;
    }

    // Ending every session means a stolen sign-in stops working too. The password is already changed, so a
    // failure here is reported but doesn't undo it.
    let signedOutEverywhere = true;
    try {
      await kcAdmin.users.logout({ realm: KEYCLOAK_REALM, id: req.user.keycloakId });
    } catch (error) {
      signedOutEverywhere = false;
      console.error("keycloakChangePassword: ending sessions failed:", error.message);
    }

    res.json({ success: true, signedOutEverywhere, message: "Password changed successfully" });
  } catch (error) {
    console.error("keycloakChangePassword error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
};

module.exports = {
  keycloakLogin,
  acceptInvite,
  keycloakChangePassword,
  // shared with the "Forgot password?" form (passwordResetController.js), which takes an Employee ID too
  loginNameFor,
};