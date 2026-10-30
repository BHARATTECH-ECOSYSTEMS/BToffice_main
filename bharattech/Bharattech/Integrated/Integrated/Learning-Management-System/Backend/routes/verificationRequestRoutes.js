const express = require("express");
const router = express.Router();
const verificationRequestController = require("../controllers/verificationRequestController");

// The website's public verification form: no sign-in. server.js puts the strict per-address limit in front
// (app.use("/api/verification-requests", rateLimits.publicForm, verificationRequestRoutes)).
router.post("/", verificationRequestController.submitRequest);

module.exports = router;
