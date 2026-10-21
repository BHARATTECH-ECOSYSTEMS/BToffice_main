const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "uploads", "policies");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const sanitizedOriginalName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${sanitizedOriginalName}`);
  },
});

const uploadPolicy = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files allowed"));
    }

    cb(null, true);
  },
});

module.exports = uploadPolicy;
