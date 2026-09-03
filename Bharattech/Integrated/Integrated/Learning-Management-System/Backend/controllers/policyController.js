const fs = require("fs");
const path = require("path");
const Policy = require("../models/Policy");

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

const streamPolicyFile = (res, storedFileName, displayName = storedFileName) => {
  const filePath = getPolicyFilePath(storedFileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("PDF file not found. Please re-upload this document.");
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(displayName)}"`
  );

  return fs.createReadStream(filePath).pipe(res);
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

    const newPolicy = await Policy.create({
      name: name.trim(),
      pages: Number(pages),
      category: category.trim(),
      pdfName: req.file.originalname,
      storedFileName: req.file.filename,
      pdfUrl: buildPolicyPath(req.file.filename),
      uploadedBy:
        req.user?.decoded?.preferred_username ||
        req.user?.fullName ||
        req.user?.email ||
        "Admin",
    });

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
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }

    const alreadyAccepted = policy.acceptedBy.some(
      (acceptance) => acceptance.userId === req.user?.id
    );

    if (!alreadyAccepted) {
      policy.acceptedBy.push({
        userId: req.user?.id,
        username: req.user?.decoded?.preferred_username || "",
        fullName: req.user?.fullName || "",
        email: req.user?.email || "",
        role: req.user?.role || "",
      });
      await policy.save();
    }

    res.json(normalizePolicy(policy, req));
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

    return streamPolicyFile(res, policy.storedFileName, policy.pdfName);
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

    if (!storedFileName) {
      return res.status(400).send("PDF filename required");
    }

    return streamPolicyFile(res, storedFileName);
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
