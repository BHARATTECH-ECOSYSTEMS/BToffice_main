const mongoose = require("mongoose");

// Policy PDFs are kept in MongoDB (GridFS, bucket "policyFiles") rather than on the server's disk, which hosts like
// Render wipe on every restart and deploy. Files are found by the policy's storedFileName.
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "policyFiles" });

exports.savePolicyFile = (filename, buffer) =>
  new Promise((resolve, reject) => {
    const upload = bucket().openUploadStream(filename, { metadata: { contentType: "application/pdf" } });
    upload.once("error", reject).once("finish", () => resolve(upload.id));
    upload.end(buffer);
  });

exports.findPolicyFile = async (filename) => (await bucket().find({ filename }).limit(1).toArray())[0] || null;

exports.openPolicyFile = (fileId) => bucket().openDownloadStream(fileId);

exports.deletePolicyFiles = async (filename) => {
  for (const file of await bucket().find({ filename }).toArray()) {
    await bucket().delete(file._id);
  }
};
