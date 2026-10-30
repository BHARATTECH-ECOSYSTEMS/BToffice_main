const multer = require("multer");
const { PHOTO_MAX_BYTES } = require("../utils/userPhotos");

// Kept in memory, then checked and saved to MongoDB by the user controller (utils/userPhotos.js).
const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_MAX_BYTES, files: 1 },
});

/**
 * One photo from the form field `field`, with upload problems answered as the caller's mistake (400/413) instead of a
 * server error. A JSON request (the admin edit route's usual body) passes through untouched.
 */
const uploadUserPhoto = (field) => (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();
  return uploadPhoto.single(field)(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: `The photo is over ${PHOTO_MAX_BYTES / 1024 / 1024} MB.` });
    }
    return res.status(400).json({ message: err.message || "The upload didn't work." });
  });
};

module.exports = { uploadUserPhoto };
