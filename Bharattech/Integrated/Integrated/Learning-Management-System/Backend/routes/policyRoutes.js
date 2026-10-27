const express = require("express");
const router = express.Router();
const { mustBeObjectId } = require("../utils/refusal");
// an id that can't be a record is a plain 400, not a failed database lookup (500)
router.param("id", mustBeObjectId);

const { uploadPolicyPdf } = require("../middlewares/uploadPolicy");
const {
  createPolicy,
  getPolicies,
  acceptPolicy,
  deletePolicy,
  streamPolicyPdf,
  streamPolicyPdfFile,
} = require("../controllers/policyController");
const {
  keycloakAuth,
  requireAdmin,
} = require("../middlewares/keycloakAuth");

router.get("/", keycloakAuth, getPolicies);

// Signed in since step 17: before, anyone with a link could download an internal policy. The portal sends the
// sign-in with the request; the company's old Policy page shows these in an iframe, which can't.
router.get("/file/:filename", keycloakAuth, streamPolicyPdfFile);

router.get("/:id/pdf", keycloakAuth, streamPolicyPdf);

router.post(
  "/",
  keycloakAuth,
  requireAdmin,
  uploadPolicyPdf,
  createPolicy
);

router.post("/:id/accept", keycloakAuth, acceptPolicy);

router.delete("/:id", keycloakAuth, requireAdmin, deletePolicy);

module.exports = router;
