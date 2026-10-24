const express = require("express");
const router = express.Router();
const idDocumentController = require("../controllers/idDocumentController");
const { uploadIdDocumentPdf } = require("../middlewares/uploadIdDocument");

// server.js signs everyone in before these routes (app.use("/api/verification-documents", keycloakAuth, ...)); who
// may see which file is checked in the controller.

// The signed-in employee's own verification and uploads
router.get("/mine", idDocumentController.getMine);
router.put("/mine/:kind", uploadIdDocumentPdf, idDocumentController.uploadMine);
router.get("/mine/:kind/file", idDocumentController.openMine);

// Super Admins and Admins open anyone's (logged on the request)
router.get("/:verificationId/:kind/file", idDocumentController.openForAdmin);

module.exports = router;
