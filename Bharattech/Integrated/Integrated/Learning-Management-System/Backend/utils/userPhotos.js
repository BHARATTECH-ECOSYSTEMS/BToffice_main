const mongoose = require("mongoose");

// Profile photos are kept in MongoDB (GridFS, bucket "userPhotos"), like task files and policy PDFs, rather than on
// the server's disk (which hosts like Render wipe on restart) or an outside image service.
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "userPhotos" });

// The portal crops photos to a 640 px square JPEG (~100 KB) before sending, so this only stops misuse.
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

const startsWith = (b, text) => b.subarray(0, text.length).toString("latin1") === text;

// The browser's claimed type is easy to fake, so the stored type comes from the file's first bytes.
const KINDS = [
  { type: "image/png", matches: (b) => b.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) },
  { type: "image/jpeg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/webp", matches: (b) => startsWith(b, "RIFF") && b.subarray(8, 12).toString("latin1") === "WEBP" },
];

/** The content type to store for this photo, or null when it isn't a PNG, JPG or WebP. */
const photoType = (buffer) => (buffer?.length ? KINDS.find((k) => k.matches(buffer))?.type ?? null : null);

const saveUserPhoto = (buffer, { contentType, userId }) =>
  new Promise((resolve, reject) => {
    const upload = bucket().openUploadStream(`photo-${userId}`, { metadata: { contentType, userId: String(userId) } });
    upload.once("error", reject).once("finish", () => resolve(upload.id));
    upload.end(buffer);
  });

/** The stored file's record (its type and size), or null when it's gone. */
const findUserPhoto = async (fileId) => (await bucket().find({ _id: fileId }).limit(1).toArray())[0] ?? null;

const openUserPhoto = (fileId) => bucket().openDownloadStream(fileId);

const deleteUserPhoto = async (fileId) => {
  if (!fileId) return;
  // a photo already gone is fine: the goal is that it isn't there
  await bucket()
    .delete(fileId)
    .catch((error) => {
      if (!/FileNotFound|not found/i.test(error.message)) throw error;
    });
};

module.exports = { PHOTO_MAX_BYTES, photoType, saveUserPhoto, findUserPhoto, openUserPhoto, deleteUserPhoto };
