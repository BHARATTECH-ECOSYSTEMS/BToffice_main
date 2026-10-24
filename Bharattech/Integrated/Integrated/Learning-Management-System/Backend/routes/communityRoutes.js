const express = require("express");
const {
  listMembers,
  markLeft,
  bringBack,
  getMyPersonalEmail,
  setMyPersonalEmail,
  setMemberPersonalEmail,
} = require("../controllers/communityController");

// Mounted at /api/community behind keycloakAuth (server.js); who may do what is checked in the controller.
const router = express.Router();

router.get("/members", listMembers);
router.post("/leave/:userId", markLeft);
router.post("/members/:userId/back", bringBack);
router.put("/members/:userId/personal-email", setMemberPersonalEmail);
router.get("/me/personal-email", getMyPersonalEmail);
router.put("/me/personal-email", setMyPersonalEmail);

module.exports = router;
