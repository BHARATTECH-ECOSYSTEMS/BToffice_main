const Certificate = require("../models/Certificate");
const nodemailer = require("nodemailer");

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// -----------------------------------------------------------
// CREATE INDEPENDENT CERTIFICATE (NO COURSE PROGRESS REQUIRED)
// -----------------------------------------------------------
exports.createCertificate = async (req, res) => {
  try {
    const {
      recipientName,
      recipientEmail,
      certificateType,
      courseName,
      fileUrl
    } = req.body;

    const certificateNumber =
      `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const cert = await Certificate.create({
      recipientName,
      recipientEmail,
      certificateType,
      courseName,
      certificateNumber,
      fileUrl
    });

    // ✅ EMAIL SENDING STARTS HERE
    if (!EMAIL_USER || !EMAIL_PASS) {
      return res.status(500).json({
        message: "Certificate email is not configured. Set EMAIL_USER and EMAIL_PASS.",
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: EMAIL_USER,
      to: recipientEmail,
      subject: "Your Certificate 🎓",
      text: `Hello ${recipientName}, your certificate is ready.`,
      attachments: [
        {
          filename: "certificate.pdf",
          path: fileUrl, // must be correct file path
        },
      ],
    });

    res.status(201).json({
      id: cert._id,
      certificateNumber: cert.certificateNumber,
      recipientName: cert.recipientName,
      recipientEmail: cert.recipientEmail,
      courseName: cert.courseName,
      certificateType: cert.certificateType,
      issueDate: cert.createdAt,
      status: "Sent", // ✅ changed
      fileUrl: cert.fileUrl
    });

  } catch (error) {
    console.error("Certificate Create Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// -----------------------------------------------------------
// ADMIN — GET ALL CERTIFICATES
// -----------------------------------------------------------
exports.getAllCertificates = async (req, res) => {
  try {
    const certs = await Certificate.find().sort({ createdAt: -1 });

    res.status(200).json(certs.map(cert => ({
      id: cert._id,
      certificateNumber: cert.certificateNumber,
      recipientName: cert.recipientName,
      recipientEmail: cert.recipientEmail,
      courseName: cert.courseName,
      certificateType: cert.certificateType,
      issueDate: cert.createdAt,
      status: "Active",
      fileUrl: cert.fileUrl
    })));

  } catch (error) {
    console.error("Get Certificates Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// -----------------------------------------------------------
// USER — GET MY CERTIFICATES (Filtered by user email)
// -----------------------------------------------------------
exports.getMyCertificates = async (req, res) => {
  try {
    // Get current user's email from the token
    const User = require("../models/User");
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const userEmail = currentUser.email.toLowerCase();

    // Find certificates where recipientEmail matches user's email (case-insensitive)
    const certs = await Certificate.find({
      recipientEmail: { $regex: new RegExp(`^${userEmail}$`, "i") }
    }).sort({ createdAt: -1 });

    res.status(200).json(certs.map(cert => ({
      id: cert._id,
      _id: cert._id,
      certificateNumber: cert.certificateNumber,
      recipientName: cert.recipientName,
      recipientEmail: cert.recipientEmail,
      courseName: cert.courseName,
      certificateType: cert.certificateType,
      issueDate: cert.createdAt,
      status: "Active",
      fileUrl: cert.fileUrl
    })));

  } catch (error) {
    console.error("Get My Certificates Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// -----------------------------------------------------------
// UPDATE CERTIFICATE
// -----------------------------------------------------------
exports.updateCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      recipientName,
      recipientEmail,
      certificateType,
      courseName,
      fileUrl
    } = req.body;

    const cert = await Certificate.findByIdAndUpdate(
      id,
      {
        recipientName,
        recipientEmail,
        certificateType,
        courseName,
        fileUrl
      },
      { new: true, runValidators: true }
    );

    if (!cert) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    res.status(200).json({
      id: cert._id,
      certificateNumber: cert.certificateNumber,
      recipientName: cert.recipientName,
      recipientEmail: cert.recipientEmail,
      courseName: cert.courseName,
      certificateType: cert.certificateType,
      issueDate: cert.createdAt,
      status: "Active",
      fileUrl: cert.fileUrl
    });

  } catch (error) {
    console.error("Update Certificate Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// -----------------------------------------------------------
// DELETE CERTIFICATE
// -----------------------------------------------------------
exports.deleteCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    const cert = await Certificate.findByIdAndDelete(id);

    if (!cert) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    res.status(200).json({ message: "Certificate deleted successfully" });

  } catch (error) {
    console.error("Delete Certificate Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};
