const express = require("express");
const fs = require("fs/promises");
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

/**
 * The signed-in admin's own record, or null. A certificate is issued only in their name: before step 17 an unknown
 * issuer fell back to the oldest Admin, or a new Admin record was made up for them.
 */
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

  return null;
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

    // before the PDF is made, so a refused request leaves no file behind
    const issuer = await resolveIssuerUser(req);
    if (!issuer) {
      return res.status(403).json({ message: "Your account has no record here, so it can't issue certificates." });
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
      message: "Server error",
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
      message: "Failed to fetch certificate history",
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
      message: "Failed to delete certificate",
    });
  }
});

module.exports = router;
