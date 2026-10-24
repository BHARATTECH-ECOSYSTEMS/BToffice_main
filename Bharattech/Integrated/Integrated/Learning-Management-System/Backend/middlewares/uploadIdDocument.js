const multer = require("multer");

const ID_DOCUMENT_MAX_MB = 1;

// An employee's Aadhaar or PAN, kept in memory and then saved to MongoDB by the controller
// (controllers/idDocumentController.js). Whether it really is a PDF is checked there, from the file's own bytes.
const uploadIdDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ID_DOCUMENT_MAX_MB * 1024 * 1024, files: 1 },
});

// The "file" field, with upload problems answered as the caller's mistake (400/413) instead of a server error.
const uploadIdDocumentPdf = (req, res, next) =>
  uploadIdDocument.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: `The file is over ${ID_DOCUMENT_MAX_MB} MB. Scan it at a lower resolution and try again.` });
    return res.status(400).json({ message: "Send one PDF in the \"file\" field." });
  });

module.exports = { uploadIdDocumentPdf, ID_DOCUMENT_MAX_MB };
