const fs = require("fs");
const path = require("path");
const Policy = require("../models/Policy");
const { savePolicyFile, findPolicyFile, openPolicyFile, deletePolicyFiles } = require("../utils/policyFiles");
const { notifyPolicyPublished, forgetNotesAbout } = require("../utils/notify");

// every PDF starts with these bytes; the browser-reported type alone is easy to fake or get wrong
const PDF_SIGNATURE = Buffer.from("%PDF-");

const getRequestOrigin = (req) => {
  const configuredOrigin =
    process.env.PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.API_BASE_URL;

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }

  const forwardedProto = req.get("x-forwarded-proto");
  const proto = (forwardedProto || req.protocol || "http")
    .split(",")[0]
    .trim();
  const host = (req.get("x-forwarded-host") || req.get("host"))
    .split(",")[0]
    .trim();

  return `${proto}://${host}`;
};

const buildPolicyPath = (filename) => `/uploads/policies/${filename}`;

const buildPolicyUrl = (req, filename) =>
  `${getRequestOrigin(req)}${buildPolicyPath(filename)}`;

const isPolicyAdmin = (user) => {
  const role = (user?.role || "").toString().trim().toLowerCase();
  return role === "admin" || role === "superadmin";
};

const getPolicyFilePath = (storedFileName) =>
  path.join(__dirname, "..", "uploads", "policies", storedFileName);

// PDFs live in MongoDB (utils/policyFiles.js); documents uploaded before that are still read from the disk.
const streamPolicyFile = async (res, storedFileName, displayName = storedFileName) => {
  const stored = await findPolicyFile(storedFileName);
  if (stored) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(displayName)}"`);
    return openPolicyFile(stored._id)
      .once("error", (error) => {
        console.error("Stream stored policy PDF error:", error);
        if (res.headersSent) return res.end();
        // the answer is a message now, not the PDF it was going to be
        res.removeHeader("Content-Type");
        res.removeHeader("Content-Disposition");
        res.status(500).json({ message: "Failed to load PDF" });
      })
      .pipe(res);
  }

  const filePath = getPolicyFilePath(storedFileName);

  // a folder exists too, and reading one as a file throws outside any try/catch, stopping the whole backend
  if (!fs.statSync(filePath, { throwIfNoEntry: false })?.isFile()) {
    return res.status(404).send("PDF file not found. Please re-upload this document.");
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(displayName)}"`
  );

  return fs.createReadStream(filePath)
    .once("error", (error) => {
      console.error("Stream disk policy PDF error:", error);
      if (res.headersSent) return res.end();
      res.removeHeader("Content-Type");
      res.removeHeader("Content-Disposition");
      res.status(500).json({ message: "Failed to load PDF" });
    })
    .pipe(res);
};

const normalizePolicy = (policy, req) => {
  const policyObject =
    typeof policy.toObject === "function" ? policy.toObject() : { ...policy };

  const acceptedBy = Array.isArray(policyObject.acceptedBy)
    ? policyObject.acceptedBy
    : [];

  return {
    ...policyObject,
    fileUrl: buildPolicyPath(policyObject.storedFileName),
    pdfUrl: buildPolicyUrl(req, policyObject.storedFileName),
    userAccepted: acceptedBy.some(
      (acceptance) => acceptance.userId === req.user?.id
    ),
  };
};

exports.createPolicy = async (req, res) => {
  try {
    const { name, pages, category } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "PDF required" });
    }

    if (!name || !pages || !category) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!req.file.buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
      return res.status(400).json({ message: "That file isn't a real PDF." });
    }

    const storedFileName = `${Date.now()}-${path.basename(req.file.originalname).replace(/\s+/g, "-")}`;
    await savePolicyFile(storedFileName, req.file.buffer);

    let newPolicy;
    try {
      newPolicy = await Policy.create({
        name: name.trim(),
        pages: Number(pages),
        category: category.trim(),
        pdfName: req.file.originalname,
        storedFileName,
        pdfUrl: buildPolicyPath(storedFileName),
        uploadedBy:
          req.user?.decoded?.preferred_username ||
          req.user?.fullName ||
          req.user?.email ||
          "Admin",
      });
    } catch (error) {
      // no document, so no stored file left behind
      await deletePolicyFiles(storedFileName);
      throw error;
    }

    // employees and interns are emailed; their bell note comes from the live to-do list
    await notifyPolicyPublished(newPolicy);
    res.status(201).json(normalizePolicy(newPolicy, req));
  } catch (error) {
    console.error("Create policy error:", error);
    res.status(500).json({ message: "Failed to upload policy" });
  }
};

exports.getPolicies = async (req, res) => {
  try {
    const policies = await Policy.find().sort({ createdAt: -1 });

    if (isPolicyAdmin(req.user)) {
      return res.json(policies.map((policy) => normalizePolicy(policy, req)));
    }

    return res.json(
      policies.map((policy) => {
        const normalized = normalizePolicy(policy, req);
        return {
          ...normalized,
          acceptedBy: normalized.acceptedBy.filter(
            (acceptance) => acceptance.userId === req.user?.id
          ),
        };
      })
    );
  } catch (error) {
    console.error("Get policies error:", error);
    res.status(500).json({ message: "Failed to fetch policies" });
  }
};

exports.acceptPolicy = async (req, res) => {
  try {
    // the person's own "I have read and understood this policy" tick (owner's 4A), so no app accepts for them without it
    if (req.body?.readConfirmed !== true) {
      return res.status(400).json({ message: "Tick “I have read and understood this policy” first." });
    }
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    // one step that adds the acceptance only if theirs isn't there yet, so two clicks at once record it once
    await Policy.updateOne(
      { _id: policy._id, "acceptedBy.userId": { $ne: req.user?.id } },
      {
        $push: {
          acceptedBy: {
            userId: req.user?.id,
            username: req.user?.decoded?.preferred_username || "",
            fullName: req.user?.fullName || "",
            email: req.user?.email || "",
            role: req.user?.role || "",
          },
        },
      }
    );

    res.json(normalizePolicy(await Policy.findById(policy._id), req));
  } catch (error) {
    console.error("Accept policy error:", error);
    res.status(500).json({ message: "Failed to accept policy" });
  }
};

exports.streamPolicyPdf = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
      return res.status(404).send("Policy not found");
    }

    return await streamPolicyFile(res, policy.storedFileName, policy.pdfName);
  } catch (error) {
    console.error("Stream policy PDF error:", error);
    res.status(500).send("Failed to load PDF");
  }
};

exports.streamPolicyPdfFile = async (req, res) => {
  try {
    const storedFileName = path.basename(
      decodeURIComponent(req.params.filename || "")
    );

    // "." and ".." survive basename and name a folder, never a stored PDF
    if (!storedFileName || /^\.+$/.test(storedFileName)) {
      return res.status(400).send("PDF filename required");
    }

    return await streamPolicyFile(res, storedFileName);
  } catch (error) {
    console.error("Stream policy PDF file error:", error);
    res.status(500).send("Failed to load PDF");
  }
};

exports.deletePolicy = async (req, res) => {
  try {
    const policy = await Policy.findByIdAndDelete(req.params.id);

    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    await deletePolicyFiles(policy.storedFileName);
    await forgetNotesAbout(policy._id);

    const filePath = path.join(
      __dirname,
      "..",
      "uploads",
      "policies",
      policy.storedFileName
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Delete policy error:", error);
    res.status(500).json({ message: "Delete failed" });
  }
};
