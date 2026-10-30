const multer = require("multer");

const MAX_PDF_MB = 20;

// Kept in memory, then saved to MongoDB by the controller (utils/policyFiles.js): the server's disk doesn't survive a
// restart on hosts like Render. The size limit stops one upload from using up the server's memory or the database.
const uploadPolicy = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_MB * 1024 * 1024, files: 1 },
  // file names arrive as UTF-8 ("आधार कार्ड.pdf"), not Latin-1
  defParamCharset: "utf8",
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files allowed"));
    }

    cb(null, true);
  },
});

// The "pdf" field, with upload problems answered as the caller's mistake (400/413) instead of a server error.
const uploadPolicyPdf = (req, res, next) =>
  uploadPolicy.single("pdf")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: `The PDF is over ${MAX_PDF_MB} MB.` });
    }
    return res.status(400).json({ message: err.message || "The upload didn't work." });
  });

module.exports = uploadPolicy;
module.exports.uploadPolicyPdf = uploadPolicyPdf;
