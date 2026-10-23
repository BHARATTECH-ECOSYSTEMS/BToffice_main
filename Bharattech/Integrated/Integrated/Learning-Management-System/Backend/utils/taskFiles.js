const path = require("path");
const mongoose = require("mongoose");

// Task documents and submitted work are kept in MongoDB (GridFS, bucket "taskFiles") rather than on the server's disk,
// which hosts like Render wipe on every restart, the same way as policy PDFs (utils/policyFiles.js).
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "taskFiles" });

const isZip = (b) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05) && (b[3] === 0x04 || b[3] === 0x06);
const isOle = (b) => b.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"));
const startsWith = (b, text) => b.subarray(0, text.length).toString("latin1") === text;

// What may be attached, by extension, with the bytes each kind must start with: the browser's claimed type is easy
// to fake, so the stored type comes from this list and only when the content matches.
const KINDS = [
  { exts: [".pdf"], type: "application/pdf", matches: (b) => startsWith(b, "%PDF-") },
  { exts: [".png"], type: "image/png", matches: (b) => b.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) },
  { exts: [".jpg", ".jpeg"], type: "image/jpeg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { exts: [".gif"], type: "image/gif", matches: (b) => startsWith(b, "GIF87a") || startsWith(b, "GIF89a") },
  { exts: [".webp"], type: "image/webp", matches: (b) => startsWith(b, "RIFF") && b.subarray(8, 12).toString("latin1") === "WEBP" },
  { exts: [".zip"], type: "application/zip", matches: isZip },
  { exts: [".docx"], type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", matches: isZip },
  { exts: [".xlsx"], type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", matches: isZip },
  { exts: [".pptx"], type: "application/vnd.openxmlformats-officedocument.presentationml.presentation", matches: isZip },
  { exts: [".doc"], type: "application/msword", matches: isOle },
  { exts: [".xls"], type: "application/vnd.ms-excel", matches: isOle },
  { exts: [".ppt"], type: "application/vnd.ms-powerpoint", matches: isOle },
];

const NAME_MAX = 200;

/** The content type to store for this upload, or null when it isn't one of the allowed kinds or its bytes don't match. */
exports.taskFileType = (fileName, buffer) => {
  const ext = path.extname(fileName).toLowerCase();
  const kind = KINDS.find((k) => k.exts.includes(ext));
  return kind && kind.matches(buffer) ? kind.type : null;
};

/** The name to show and download it under: no folders or control characters, and not too long. */
exports.cleanFileName = (name) => {
  const base = path.basename(String(name || "")).replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (base.length <= NAME_MAX) return base || "file";
  const ext = path.extname(base).slice(0, 10);
  return base.slice(0, NAME_MAX - ext.length) + ext;
};

exports.saveTaskFile = (buffer, { fileName, contentType, taskId }) =>
  new Promise((resolve, reject) => {
    const upload = bucket().openUploadStream(fileName, { metadata: { contentType, taskId: String(taskId) } });
    upload.once("error", reject).once("finish", () => resolve(upload.id));
    upload.end(buffer);
  });

exports.openTaskFile = (fileId) => bucket().openDownloadStream(fileId);

exports.deleteTaskFiles = async (fileIds) => {
  for (const id of fileIds) {
    // a file already gone shouldn't stop the others being removed
    await bucket()
      .delete(id)
      .catch((error) => {
        if (!/FileNotFound|not found/i.test(error.message)) throw error;
      });
  }
};
