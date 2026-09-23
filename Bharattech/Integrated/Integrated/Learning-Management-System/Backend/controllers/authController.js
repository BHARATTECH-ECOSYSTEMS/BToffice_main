const bcrypt = require("bcryptjs");
const User = require("../models/User");
const {
  getKcAdminClient,
  KEYCLOAK_REALM,
  setUserPassword,
} = require("../services/keycloakService");
const {
  passwordGrantLogin,
  findKeycloakUser,
} = require("../services/authService");
const {
  handleRegisterUser,
  handleLoginUser,
} = require("../services/localAuthService");
const {
  handleSignup,
  handleVerifyEmail,
} = require("../services/verificationService");

const registerUser = async (req, res) => {
  try {
    const user = await handleRegisterUser(req.body, req.file);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(error.status || 500).json({ error: error.message || "Server Error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await handleLoginUser(email, password);
    res.status(200).json({
      message: "Login successful",
      token: result.token,
      user: {
        _id: result._id,
        fullName: result.fullName,
        username: result.username,
        email: result.email,
        role: result.role,
      },
    });
  } catch (error) {
    console.log("Login Error:", error);
    res.status(error.status || 500).json({ message: error.message || "Server Error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Please provide current and new password." });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const signup = async (req, res) => {
  try {
    const result = await handleSignup(req.body);
    return res.status(201).json({
      message: "Verification email sent. Please check your inbox.",
      email: result.email,
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(error.status || 500).json({ message: "Signup error", error: error.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    await handleVerifyEmail(req.query.token);
    return res.redirect("http://localhost:8080/employees?verified=true");
  } catch (error) {
    console.error("Verification Error:", error);
    return res.redirect(
      `http://localhost:8080/employees?verified=false&error=${encodeURIComponent(
        error.message || "Verification failed"
      )}`
    );
  }
};

const checkAdminSession = async (req, res) => {
  try {
    const { checkActiveAdminSession } = require("../middlewares/keycloakAuth");
    const active = await checkActiveAdminSession();
    res.json({ active });
  } catch (error) {
    console.error("checkAdminSession error:", error);
    res.status(500).json({ active: false, error: error.message });
  }
};

const keycloakLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const result = await passwordGrantLogin(username, password);
    if (!result.ok) {
      if (/not fully set up/i.test(result.errorDescription || "")) {
        return res.status(403).json({
          requiresPasswordChange: true,
          message: "Please set a new password to finish accepting your invite.",
        });
      }
      return res.status(401).json({ message: "Invalid username or password" });
    }
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("keycloakLogin error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

const acceptInvite = async (req, res) => {
  try {
    const { username, temporaryPassword, newPassword, newUsername } = req.body;
    const trimmedNewUsername = String(newUsername || "").trim();
    if (!username || !temporaryPassword || !newPassword || !trimmedNewUsername) {
      return res.status(400).json({
        message: "Username, temporary password, new password, and a chosen username are required",
      });
    }

    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(trimmedNewUsername)) {
      return res.status(400).json({
        message: "Username must be 3-32 characters and contain only letters, numbers, dots, dashes, or underscores.",
      });
    }

    const checkResult = await passwordGrantLogin(username, temporaryPassword);
    if (!checkResult.ok && !/not fully set up/i.test(checkResult.errorDescription || "")) {
      return res.status(401).json({ message: "Invalid username or temporary password" });
    }

    const client = await getKcAdminClient();
    const kcUser = await findKeycloakUser(username);
    if (!kcUser) return res.status(404).json({ message: "User not found" });

    if (trimmedNewUsername.toLowerCase() !== (kcUser.username || "").toLowerCase()) {
      const taken = await client.users.find({
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

    await setUserPassword(kcUser.id, newPassword, false);
    await client.users.update(
      { realm: KEYCLOAK_REALM, id: kcUser.id },
      { username: trimmedNewUsername, requiredActions: [] }
    );

    const loginResult = await passwordGrantLogin(trimmedNewUsername, newPassword);
    if (!loginResult.ok) {
      return res.status(500).json({
        message: "Password updated, but automatic sign-in failed. Please log in again.",
      });
    }
    return res.json({ success: true, ...loginResult });
  } catch (error) {
    console.error("acceptInvite error:", error);
    res.status(500).json({ message: "Failed to set new password", error: error.message });
  }
};

const keycloakChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }
    const username = req.user?.decoded?.preferred_username || req.user?.email;
    if (!username) return res.status(401).json({ message: "Could not identify the current user" });

    const checkResult = await passwordGrantLogin(username, currentPassword);
    if (!checkResult.ok) return res.status(401).json({ message: "Current password is incorrect" });

    await setUserPassword(req.user.keycloakId, newPassword, false);
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("keycloakChangePassword error:", error);
    res.status(500).json({ message: "Failed to change password", error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  changePassword,
  signup,
  verifyEmail,
  checkAdminSession,
  keycloakLogin,
  acceptInvite,
  keycloakChangePassword,
};