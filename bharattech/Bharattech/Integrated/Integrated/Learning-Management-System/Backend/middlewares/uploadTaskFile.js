const multer = require("multer");

const MAX_FILE_MB = 20;

// Kept in memory, then checked and saved to MongoDB by the task controller (utils/taskFiles.js). The size limit stops
// one upload from using up the server's memory or the database.
const uploadTask = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: 1 },
  // file names arrive as UTF-8 ("Bericht über.pdf"), not Latin-1
  defParamCharset: "utf8",
});

/**
 * The "file" field of a form upload, with upload problems answered as the caller's mistake (400/413) instead of a
 * server error. A JSON request (the company app sends web links that way) passes through untouched.
 */
const uploadTaskFile = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();
  return uploadTask.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: `The file is over ${MAX_FILE_MB} MB.` });
    }
    return res.status(400).json({ message: err.message || "The upload didn't work." });
  });
};

module.exports = { uploadTaskFile, MAX_FILE_MB };
