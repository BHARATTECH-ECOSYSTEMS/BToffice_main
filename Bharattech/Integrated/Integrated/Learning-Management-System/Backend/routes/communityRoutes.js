const express = require("express");
const {
  listMembers,
  listJoiners,
  markLeft,
  bringBack,
  getMyPersonalEmail,
  setMyPersonalEmail,
  setMemberPersonalEmail,
} = require("../controllers/communityController");
const { listReferrals, shareReferral, removeReferral } = require("../controllers/referralController");
const { listJobs, postJob, setJobOpen, removeJob, addApplicant, moveApplicant } = require("../controllers/jobController");

// Mounted at /api/community behind keycloakAuth (server.js); who may do what is checked in the controller.
const router = express.Router();

router.get("/members", listMembers);
router.get("/joiners", listJoiners);
router.post("/leave/:userId", markLeft);
router.post("/members/:userId/back", bringBack);
router.put("/members/:userId/personal-email", setMemberPersonalEmail);
router.get("/me/personal-email", getMyPersonalEmail);
router.put("/me/personal-email", setMyPersonalEmail);
router.get("/referrals", listReferrals);
router.post("/referrals", shareReferral);
router.delete("/referrals/:id", removeReferral);
router.get("/jobs", listJobs);
router.post("/jobs", postJob);
router.patch("/jobs/:id", setJobOpen);
router.delete("/jobs/:id", removeJob);
router.post("/jobs/:id/applicants", addApplicant);
router.post("/jobs/:id/applicants/:appId/stage", moveApplicant);

module.exports = router;
