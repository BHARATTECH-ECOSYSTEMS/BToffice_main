const express = require("express");
const { uploadSingle } = require("../middlewares/multerConfig"); 
const { registerUser, loginUser, changePassword, signup, verifyEmail, checkAdminSession, keycloakLogin, acceptInvite, keycloakChangePassword } = require("../controllers/authController");
const { keycloakAuth } = require("../middlewares/keycloakAuth");

const router = express.Router();

// 🔓 PUBLIC ROUTES (Legacy auth - keep for backward compatibility)
router.post("/register", uploadSingle, registerUser);
router.post("/signup", signup);
router.post("/login", loginUser);
router.post("/keycloak-login", keycloakLogin);
router.post("/accept-invite", acceptInvite);
router.get("/verify-email", verifyEmail);
router.get("/check-admin-session", checkAdminSession);

// 🔐 PROTECTED ROUTES (Keycloak only)
router.post("/change-password", keycloakAuth, changePassword);
router.post("/keycloak-change-password", keycloakAuth, keycloakChangePassword);

// 🔐 Test endpoint for Keycloak auth
router.get("/whoami", keycloakAuth, (req, res) => {
  res.json({
    message: "Keycloak auth working",
    user: req.user
  });
});

module.exports = router;