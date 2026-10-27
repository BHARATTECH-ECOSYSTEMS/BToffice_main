const Verification = require("../models/Verification");
const { DOCUMENTS, DOCUMENT_KINDS, NAME_MAX } = Verification;
const { imageStore } = require("../utils/userPhotos");
const { Refusal, answerError, isAdmin, isObjectId } = require("../utils/refusal");

/*
 * An employee's own part of their HR OPS verification (/api/verification-documents; server.js signs everyone in):
 * the files they upload (Aadhaar, PAN, up to three education certificates, a previous employer's letter) and "This
 * is my first job". These are the most sensitive records the portal keeps:
 * - Only the employee adds them, and only while HR has a verification of theirs pending. Uploading again replaces
 *   the file, and the old one is deleted at once.
 * - The employee can open their own; Super Admins and Admins can open anyone's, and every such opening is written
 *   to the request's log. Nobody else gets them.
 * - PDFs only (checked from the file's own bytes), 1 MB at most; never cached by the browser.
 * - They stay until the request is deleted, or until 60 days after the person leaves (utils/leaverDocuments.js).
 */

// the same GridFS helper as photos and covers, in a bucket of its own
const store = imageStore("idDocuments");
const LABEL = Object.fromEntries(DOCUMENTS.map((d) => [d.id, d.label]));
const isPdf = (buffer) => buffer?.subarray(0, 5).toString("latin1") === "%PDF-";
const nameOf = (user) => user.fullName || user.email || "Someone";

/** The documents as they are shown: never the store's own file id. */
const documentsView = (request) =>
  [...(request?.documents ?? [])]
    .sort((a, b) => DOCUMENT_KINDS.indexOf(a.kind) - DOCUMENT_KINDS.indexOf(b.kind))
    .map((d) => ({ kind: d.kind, fileName: d.fileName, size: d.size, uploadedAt: d.uploadedAt }));

const readKind = (kind) => {
  if (!DOCUMENT_KINDS.includes(kind)) throw new Refusal(400, `Upload one of these: ${DOCUMENTS.map((d) => d.label).join(", ")}.`);
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
  // which checks are skipped, and whether it was their own "first job"; HR's reasons are HR's own notes
  notApplicable: (request?.notApplicable ?? []).map((n) => ({ check: n.check, byYou: !!n.byEmployee })),
});

const findPending = (userId) => Verification.findOne({ kind: "employee", person: userId, status: "pending" });
const NOT_ASKED = "HR hasn't asked for your documents, or your verification is already decided.";

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
    const request = await findPending(req.user.id);
    if (!request) throw new Refusal(409, NOT_ASKED);
    if (kind === "experience" && request.notApplicable.some((n) => n.check === "employment")) {
      throw new Refusal(409, "Previous employment is marked as your first job. Undo that first, then upload the letter.");
    }

    const fileId = await store.save(req.file.buffer, {
      name: `${kind}-${request._id}`,
      contentType: "application/pdf",
      metadata: { verificationId: String(request._id), kind, personId: String(req.user.id) },
    });
    const now = new Date();
    const doc = { kind, fileId, fileName: cleanFileName(req.file.originalname, kind), size: req.file.buffer.length, uploadedAt: now };
    // One database step swaps this kind's file in the list as it is at that moment, so an upload running at the same
    // time can't lose its file; the state just before says which file this one replaced. ($literal: a name starting
    // with "$" stays a name; $ifNull: a request made before a list existed has none stored.)
    const before = await Verification.findOneAndUpdate(
      { _id: request._id, status: "pending" },
      [
        {
          $set: {
            documents: { $concatArrays: [{ $filter: { input: { $ifNull: ["$documents", []] }, cond: { $ne: ["$$this.kind", kind] } } }, [{ $literal: doc }]] },
            log: {
              $concatArrays: [
                { $ifNull: ["$log", []] },
                [{ at: now, by: { $literal: nameOf(req.user) }, text: { $cond: [{ $in: [kind, { $ifNull: ["$documents.kind", []] }] }, `Replaced the ${LABEL[kind]}`, `Uploaded the ${LABEL[kind]}`] } }],
              ],
            },
          },
        },
      ],
      { returnDocument: "before", updatePipeline: true }
    );
    if (!before) {
      // decided in the meantime: the new file goes, nothing changed
      await store.remove(fileId);
      throw new Refusal(409, "Your verification was decided a moment ago, so the file wasn't added.");
    }
    const old = before.documents.find((d) => d.kind === kind);
    if (old) await store.remove(old.fileId);
    return res.status(200).json(mineView(await Verification.findById(request._id)));
  } catch (error) {
    return answerError(res, error, "Upload verification document");
  }
};

// PUT /api/verification-documents/mine/first-job { firstJob: true | false }
// Yes marks previous employment not applicable (it counts toward verifying); no takes back their own yes.
exports.setFirstJob = async (req, res) => {
  try {
    const { firstJob } = req.body ?? {};
    if (typeof firstJob !== "boolean") throw new Refusal(400, "Say whether this is your first job (true or false).");
    const request = await findPending(req.user.id);
    if (!request) throw new Refusal(409, NOT_ASKED);
    const marked = request.notApplicable.find((n) => n.check === "employment");
    if (firstJob) {
      if (marked) return res.status(200).json(mineView(request));
      if (request.documents.some((d) => d.kind === "experience")) {
        throw new Refusal(409, "You've uploaded a letter from a previous job, so it isn't your first job.");
      }
    } else {
      if (!marked) return res.status(200).json(mineView(request));
      if (!marked.byEmployee) throw new Refusal(409, "HR marked previous employment as not needed. Ask them if that should change.");
    }
    const now = new Date();
    const updated = await Verification.findOneAndUpdate(
      // nothing changed in between: no letter arrived, and the mark is still as it was read
      firstJob
        ? { _id: request._id, status: "pending", "documents.kind": { $ne: "experience" }, "notApplicable.check": { $ne: "employment" } }
        : { _id: request._id, status: "pending", notApplicable: { $elemMatch: { check: "employment", byEmployee: true } } },
      firstJob
        ? {
            $addToSet: { done: "employment" },
            $push: {
              notApplicable: { check: "employment", reason: "This is their first job", by: nameOf(req.user), byEmployee: true, at: now },
              log: { at: now, by: nameOf(req.user), text: "Said this is their first job" },
            },
          }
        : {
            $pull: { done: "employment", notApplicable: { check: "employment" } },
            $push: { log: { at: now, by: nameOf(req.user), text: "Said it isn't their first job after all" } },
          },
      { returnDocument: "after" }
    );
    if (!updated) throw new Refusal(409, "Your verification changed a moment ago. Reload the page and try again.");
    return res.status(200).json(mineView(updated));
  } catch (error) {
    return answerError(res, error, "Set first job");
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
