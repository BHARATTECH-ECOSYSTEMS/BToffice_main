const express = require("express");
const { keycloakLogin, acceptInvite, keycloakChangePassword } = require("../controllers/authController");
const { keycloakAuth } = require("../middlewares/keycloakAuth");
const { requestPasswordReset, resetPassword } = require("../controllers/passwordResetController");

const router = express.Router();

// 🔓 PUBLIC ROUTES: signing in goes through Keycloak (the old local register/signup/login/verify-email routes were
// removed in step 17)
router.post("/keycloak-login", keycloakLogin);
router.post("/accept-invite", acceptInvite);

// "Forgot password?": a single-use link by email, then the new password (public; controllers/passwordResetController.js)
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

// 🔐 PROTECTED ROUTES (Keycloak only)
router.post("/keycloak-change-password", keycloakAuth, keycloakChangePassword);

module.exports = router;