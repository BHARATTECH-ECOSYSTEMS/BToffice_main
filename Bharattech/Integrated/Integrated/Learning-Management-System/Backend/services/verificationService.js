const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const EmailVerification = require("../models/EmailVerification");
const { getKcAdminClient, KEYCLOAK_REALM } = require("./keycloakService");
const { createVerifiedKeycloakUser } = require("./authService");
const { sendVerificationEmail } = require("./emailService");
const { encryptPassword, decryptPassword } = require("../utils/cryptoUtils");

const handleSignup = async ({ username, password, email }) => {
  const inputUsername = username || email;
  if (!inputUsername || !password) {
    const err = new Error("Username and password are required");
    err.status = 400;
    throw err;
  }

  const resolvedEmail =
    email ||
    (inputUsername.includes("@")
      ? inputUsername
      : `${inputUsername}@bharattech.local`);
  const resolvedUsername = inputUsername.includes("@")
    ? inputUsername.split("@")[0]
    : inputUsername;

  const userExists = await User.findOne({
    $or: [{ email: resolvedEmail }, { username: resolvedUsername }],
  });
  if (userExists) {
    const err = new Error("Username or Email already exists in local DB");
    err.status = 409;
    throw err;
  }

  if (process.env.AUTH_MODE === "keycloak") {
    const client = await getKcAdminClient();
    const matches = await client.users.find({
      realm: KEYCLOAK_REALM,
      username: resolvedUsername,
    });
    if (matches.length > 0) {
      const err = new Error("Username already exists in Keycloak");
      err.status = 409;
      throw err;
    }
    const emailMatches = await client.users.find({
      realm: KEYCLOAK_REALM,
      email: resolvedEmail,
    });
    if (emailMatches.length > 0) {
      const err = new Error("Email already exists in Keycloak");
      err.status = 409;
      throw err;
    }
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const encryptedPassword = encryptPassword(password);

  await new EmailVerification({
    username: resolvedUsername,
    email: resolvedEmail,
    encryptedPassword,
    token: verificationToken,
  }).save();

  await sendVerificationEmail(resolvedEmail, verificationToken);
  return { email: resolvedEmail };
};

const handleVerifyEmail = async (token) => {
  if (!token) throw new Error("Missing token");

  const verification = await EmailVerification.findOne({ token });
  if (!verification) throw new Error("Invalid or expired verification token");

  const { username, email, encryptedPassword } = verification;
  const decryptedPassword = decryptPassword(encryptedPassword);

  if (process.env.AUTH_MODE === "keycloak") {
    const kcUserId = await createVerifiedKeycloakUser({
      username,
      email,
      name: username,
      role: "Employee",
      password: decryptedPassword,
    });

    let user = await User.findOne({ keycloakId: kcUserId });
    if (!user) {
      await new User({
        keycloakId: kcUserId,
        email,
        username,
        fullName: username,
        role: "Employee",
        authProvider: "keycloak",
        isDeleted: false,
        isBanned: false,
      }).save();
    }
  } else {
    const hashedPassword = await bcrypt.hash(decryptedPassword, 10);
    await new User({
      username,
      email,
      password: hashedPassword,
      role: "Employee",
      authProvider: "local",
      isDeleted: false,
      isBanned: false,
    }).save();
  }

  await EmailVerification.deleteOne({ _id: verification._id });
  return true;
};

module.exports = {
  handleSignup,
  handleVerifyEmail,
};
