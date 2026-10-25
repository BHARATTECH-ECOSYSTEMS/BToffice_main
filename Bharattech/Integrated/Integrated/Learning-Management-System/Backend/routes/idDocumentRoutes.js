const express = require("express");
const router = express.Router();
const idDocumentController = require("../controllers/idDocumentController");
const { uploadIdDocumentPdf } = require("../middlewares/uploadIdDocument");

// server.js signs everyone in before these routes (app.use("/api/verification-documents", keycloakAuth, ...)); who
// may see which file is checked in the controller.

// The signed-in employee's own verification, uploads and "This is my first job"
router.get("/mine", idDocumentController.getMine);
// before "/mine/:kind", which would take the name as a file kind
router.put("/mine/first-job", idDocumentController.setFirstJob);
router.put("/mine/:kind", uploadIdDocumentPdf, idDocumentController.uploadMine);
router.get("/mine/:kind/file", idDocumentController.openMine);

// Super Admins and Admins open anyone's (logged on the request)
router.get("/:verificationId/:kind/file", idDocumentController.openForAdmin);

module.exports = router;
