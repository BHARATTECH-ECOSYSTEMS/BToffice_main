const Verification = require("../models/Verification");
const { CHECKS, UPLOAD_CHECKS, NAME_MAX } = Verification;
const { imageStore } = require("../utils/userPhotos");
const { Refusal, answerError, isAdmin, isObjectId } = require("../utils/refusal");

/*
 * An employee's government IDs for their HR OPS verification (/api/verification-documents; server.js signs everyone
 * in). These are the most sensitive files the portal keeps:
 * - Only the employee uploads them, and only while HR has a verification of theirs pending. Uploading again replaces
 *   the file, and the old one is deleted at once.
 * - The employee can open their own; Super Admins and Admins can open anyone's, and every such opening is written
 *   to the request's log. Nobody else gets them.
 * - PDFs only (checked from the file's own bytes), 1 MB at most; never cached by the browser.
 * - They stay until the request is deleted, or until 60 days after the person leaves (utils/leaverDocuments.js).
 */

// the same GridFS helper as photos and covers, in a bucket of its own
const store = imageStore("idDocuments");
const LABEL = Object.fromEntries(CHECKS.employee.filter((c) => UPLOAD_CHECKS.includes(c.id)).map((c) => [c.id, c.label]));
const isPdf = (buffer) => buffer?.subarray(0, 5).toString("latin1") === "%PDF-";
const nameOf = (user) => user.fullName || user.email || "Someone";

/** The documents as they are shown: never the store's own file id. */
const documentsView = (request) =>
  [...(request?.documents ?? [])]
    .sort((a, b) => UPLOAD_CHECKS.indexOf(a.kind) - UPLOAD_CHECKS.indexOf(b.kind))
    .map((d) => ({ kind: d.kind, fileName: d.fileName, size: d.size, uploadedAt: d.uploadedAt }));

const readKind = (kind) => {
  if (!UPLOAD_CHECKS.includes(kind)) throw new Refusal(400, "Upload an Aadhaar card or a PAN card.");
  return kind;
};

/**
 * A file name that's only for showing: no folders, no control characters or quotes, not too long. Both kinds of
 * slash count as folders, whatever system the server runs on (path.basename only knows its own).
 */
const cleanFileName = (raw, kind) => {
  const name = String(raw ?? "")
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f"]/g, "")
    .trim();
  return (name || `${kind}.pdf`).slice(0, NAME_MAX);
};

/** This person's verification: the pending one, else the latest that still holds their files. */
const findMine = async (userId) =>
  (await Verification.findOne({ kind: "employee", person: userId, status: "pending" })) ??
  (await Verification.findOne({ kind: "employee", person: userId, "documents.0": { $exists: true } }).sort({ createdAt: -1 }));

const mineView = (request) => ({
  request: request ? { id: String(request._id), status: request.status, openedAt: request.createdAt } : null,
  documents: documentsView(request),
});

const streamFile = (res, doc) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Disposition", `inline; filename="${doc.kind}.pdf"`);
  store
    .open(doc.fileId)
    .on("error", () => (res.headersSent ? res.end() : res.status(404).json({ message: "That file isn't there any more." })))
    .pipe(res);
};

// GET /api/verification-documents/mine
exports.getMine = async (req, res) => {
  try {
    return res.status(200).json(mineView(await findMine(req.user.id)));
  } catch (error) {
    return answerError(res, error, "My verification documents");
  }
};

// PUT /api/verification-documents/mine/:kind (form field "file": a PDF up to 1 MB)
exports.uploadMine = async (req, res) => {
  try {
    const kind = readKind(req.params.kind);
    if (!req.file?.buffer?.length) throw new Refusal(400, "Choose a PDF to upload.");
    if (!isPdf(req.file.buffer)) throw new Refusal(400, "Only PDF files can be uploaded.");
    const request = await Verification.findOne({ kind: "employee", person: req.user.id, status: "pending" });
    if (!request) throw new Refusal(409, "HR hasn't asked for your documents, or your verification is already decided.");

    const old = request.documents.find((d) => d.kind === kind);
    const fileId = await store.save(req.file.buffer, {
      name: `${kind}-${request._id}`,
      contentType: "application/pdf",
      metadata: { verificationId: String(request._id), kind, personId: String(req.user.id) },
    });
    const doc = { kind, fileId, fileName: cleanFileName(req.file.originalname, kind), size: req.file.buffer.length, uploadedAt: new Date() };
    const updated = await Verification.findOneAndUpdate(
      { _id: request._id, status: "pending" },
      {
        $set: { documents: [...request.documents.filter((d) => d.kind !== kind), doc] },
        $push: { log: { at: new Date(), by: nameOf(req.user), text: `${old ? "Replaced" : "Uploaded"} the ${LABEL[kind]}` } },
      },
      { returnDocument: "after" }
    );
    if (!updated) {
      // decided in the meantime: the new file goes, nothing changed
      await store.remove(fileId);
      throw new Refusal(409, "Your verification was decided a moment ago, so the file wasn't added.");
    }
    if (old) await store.remove(old.fileId);
    return res.status(200).json(mineView(updated));
  } catch (error) {
    return answerError(res, error, "Upload verification document");
  }
};

// GET /api/verification-documents/mine/:kind/file
exports.openMine = async (req, res) => {
  try {
    const kind = readKind(req.params.kind);
    const doc = (await findMine(req.user.id))?.documents.find((d) => d.kind === kind);
    if (!doc) throw new Refusal(404, "You haven't uploaded that one.");
    return streamFile(res, doc);
  } catch (error) {
    return answerError(res, error, "Open my verification document");
  }
};

// GET /api/verification-documents/:verificationId/:kind/file (Super Admins and Admins; every opening is logged)
exports.openForAdmin = async (req, res) => {
  try {
    if (!isAdmin(req.user)) throw new Refusal(403, "Only Super Admins and Admins open verification documents.");
    const id = req.params.verificationId;
    if (!isObjectId(id)) throw new Refusal(404, "That request isn't there any more.");
    const kind = readKind(req.params.kind);
    const request = await Verification.findOne({ _id: id, kind: "employee" });
    const doc = request?.documents.find((d) => d.kind === kind);
    if (!doc) throw new Refusal(404, "That file hasn't been uploaded.");
    await Verification.updateOne({ _id: request._id }, { $push: { log: { at: new Date(), by: nameOf(req.user), text: `Opened the ${LABEL[kind]}` } } });
    return streamFile(res, doc);
  } catch (error) {
    return answerError(res, error, "Open verification document");
  }
};

/** Deletes a request's files from the store (when the request itself is deleted). */
exports.removeFilesOf = async (request) => {
  for (const doc of request.documents ?? []) await store.remove(doc.fileId);
};
exports.documentsView = documentsView;
// multer already strips folders from upload names; this is the second layer, tested on its own
exports.cleanFileName = cleanFileName;
