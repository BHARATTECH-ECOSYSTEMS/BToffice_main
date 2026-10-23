const express = require("express");
const bcrypt = require("bcryptjs");
const fs = require("fs/promises");
const { randomUUID } = require("crypto");
const mongoose = require("mongoose");
const path = require("path");

const router = express.Router();

const {
  keycloakAuth,
  requireAdmin,
} = require("../middlewares/keycloakAuth");
const Certificate = require("../models/Certificate");
const generateCertificate = require("../utils/generateCertifcate");
const User = require("../models/User");
const { notifyCertificateIssued, forgetNotesAbout } = require("../utils/notify");
const { myCertificates, certificatePdf } = require("../controllers/certificateAccessController");

const resolveIssuerUser = async (req) => {
  if (mongoose.Types.ObjectId.isValid(req.user?.id)) {
    const issuerById = await User.findById(req.user.id);
    if (issuerById) return issuerById;
  }

  if (req.user?.keycloakId) {
    const issuerByKeycloakId = await User.findOne({
      keycloakId: req.user.keycloakId,
      isDeleted: { $ne: true },
    });
    if (issuerByKeycloakId) return issuerByKeycloakId;
  }

  if (req.user?.email) {
    const issuerByEmail = await User.findOne({
      email: req.user.email.toLowerCase(),
      isDeleted: { $ne: true },
    });
    if (issuerByEmail) return issuerByEmail;
  }

  const fallbackAdmin = await User.findOne({
    role: "Admin",
    isDeleted: { $ne: true },
  }).sort({ createdAt: 1 });

  if (fallbackAdmin) return fallbackAdmin;

  const safeEmail = (req.user?.email || "admin@bharattech.local").toLowerCase();
  const safeUsername =
    req.user?.fullName?.toLowerCase().replace(/\s+/g, ".") ||
    safeEmail.split("@")[0] ||
    `admin-${Date.now()}`;

  return User.create({
    fullName: req.user?.fullName || "Admin User",
    username: safeUsername,
    email: safeEmail,
    password: await bcrypt.hash(randomUUID(), 10),
    keycloakId: req.user?.keycloakId || req.user?.sub || `demo-admin-${Date.now()}`,
    role: "Admin",
    authProvider: "keycloak",
    isDeleted: false,
    isBanned: false,
  });
};

router.post("/generate", keycloakAuth, requireAdmin, async (req, res) => {
  const { userId, title } = req.body;

  try {
    if (!userId || !title) {
      return res.status(400).json({
        message: "User and certificate type are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const name =
      user.fullName ||
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      user.email ||
      "User";

    const certificateNumber = `CERT-${Date.now()}-${Math.floor(
      Math.random() * 10000
    )}`;

    const filePath = await generateCertificate({
      name,
      title,
      certificateNumber,
      role: user.role,
      email: user.email,
      username: user.username,
    });

    const issuer = await resolveIssuerUser(req);

    const cert = new Certificate({
      userId: user._id,
      title,
      certificateNumber,
      filePath,
      issuedBy: issuer._id,
    });

    await cert.save();
    await notifyCertificateIssued({ certificate: cert, recipient: user, issuer });

    res.status(201).json({
      message: "Certificate generated successfully",
      certificate: cert,
    });
  } catch (error) {
    console.error("Certificate error:", error);
    res.status(500).json({
      message: error.message || "Server error",
    });
  }
});

router.get("/", keycloakAuth, requireAdmin, async (req, res) => {
  try {
    const certificates = await Certificate.find({})
      .populate("issuedBy", "fullName email role")
      .populate("userId", "fullName email username role")
      .sort({ issuedAt: -1, createdAt: -1 });

    res.json(certificates);
  } catch (error) {
    console.error("Certificate history error:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch certificate history",
    });
  }
});

// The signed-in person's own certificates (matched by account, never by name)
router.get("/my", keycloakAuth, myCertificates);

// A certificate as a PDF, built fresh each time; for its owner, admins and superadmins
router.get("/:id/pdf", keycloakAuth, certificatePdf);

router.delete("/:id", keycloakAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid certificate id" });
    }

    const certificate = await Certificate.findById(id);

    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    await Certificate.deleteOne({ _id: id });
    await forgetNotesAbout(id);

    if (certificate.filePath) {
      const certificatesDir = path.resolve(__dirname, "../certificates");
      const fileName = path.basename(certificate.filePath);
      const filePath = path.join(certificatesDir, fileName);

      try {
        await fs.unlink(filePath);
      } catch (fileError) {
        if (fileError.code !== "ENOENT") {
          console.warn("Certificate file cleanup failed:", fileError.message);
        }
      }
    }

    res.json({ message: "Certificate deleted successfully" });
  } catch (error) {
    console.error("Delete certificate error:", error);
    res.status(500).json({
      message: error.message || "Failed to delete certificate",
    });
  }
});

router.get("/test-auth", keycloakAuth, (req, res) => {
  res.json({
    message: "Auth working",
    user: req.user,
  });
});

module.exports = router;
