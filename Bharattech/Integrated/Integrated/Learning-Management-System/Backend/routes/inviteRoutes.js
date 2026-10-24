const express = require("express");
const router = express.Router();

const { sendInvite, getUsers, listPendingInvites, cancelPendingInvite } = require("../controllers/inviteController");
const { keycloakAuth, requireAdmin } = require("../middlewares/keycloakAuth");

router.post("/send-invite", keycloakAuth, requireAdmin, sendInvite);
router.get("/users", keycloakAuth, requireAdmin, getUsers);

// Invites nobody has accepted yet, and cancelling one (Super Admins and Admins; an Admin only for the roles they invite)
router.get("/pending", keycloakAuth, requireAdmin, listPendingInvites);
router.delete("/pending/:id", keycloakAuth, requireAdmin, cancelPendingInvite);

module.exports = router;
