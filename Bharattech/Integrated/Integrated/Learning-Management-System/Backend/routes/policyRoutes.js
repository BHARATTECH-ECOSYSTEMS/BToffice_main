const express = require("express");
const router = express.Router();

const uploadPolicy = require("../middlewares/uploadPolicy");
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

router.get("/file/:filename", streamPolicyPdfFile);

router.get("/:id/pdf", streamPolicyPdf);

router.post(
  "/",
  keycloakAuth,
  requireAdmin,
  uploadPolicy.single("pdf"),
  createPolicy
);

router.post("/:id/accept", keycloakAuth, acceptPolicy);

router.delete("/:id", keycloakAuth, requireAdmin, deletePolicy);

module.exports = router;
