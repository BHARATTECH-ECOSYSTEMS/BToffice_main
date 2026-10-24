const express = require("express");
const router = express.Router();
const verificationController = require("../controllers/verificationController");

// server.js signs everyone in before these routes (app.use("/api/verifications", keycloakAuth, verificationRoutes));
// every route is for Super Admins and Admins only, which the controller checks.

// One kind of request, newest first (?kind=company|employee)
router.get("/", verificationController.listRequests);

// Open a company or employee request
router.post("/", verificationController.openRequest);

// Tick or untick one check of a pending request
router.patch("/:id/checks", verificationController.setCheck);

// Verify, reject (with a note) or reopen
router.post("/:id/decision", verificationController.decide);

// Delete a pending request
router.delete("/:id", verificationController.removeRequest);

module.exports = router;
