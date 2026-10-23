const express = require("express");
const router = express.Router();

const { sendInvite, getUsers } = require("../controllers/inviteController");
const { keycloakAuth, requireAdmin } = require("../middlewares/keycloakAuth");

router.post("/send-invite", keycloakAuth, requireAdmin, sendInvite);
router.get("/users", keycloakAuth, requireAdmin, getUsers);

module.exports = router;
