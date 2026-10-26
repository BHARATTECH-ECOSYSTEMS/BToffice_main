const mongoose = require("mongoose");
const Certificate = require("../models/Certificate");
const User = require("../models/User");
const { getOrCreateUser } = require("../middlewares/keycloakAuth");
const { buildCertificatePdf } = require("../utils/generateCertifcate");

const isAdminRole = (role) => ["admin", "superadmin"].includes(String(role || "").toLowerCase());

/**
 * The signed-in person's account records: their own record, plus any older record under the same Keycloak login or
 * email. Never by name, since two people can share one (they used to see each other's certificates).
 */
const ownRecordIds = async (req) => {
  const decoded = req.user?.decoded || {};
  const me = await getOrCreateUser(decoded);
  const keycloakIds = [...new Set([req.user?.keycloakId, decoded.sub, me?.keycloakId].filter(Boolean))];
  // the sign-in's email finds older records only when Keycloak has verified it: anyone can change their own email
  const signInEmails = decoded.email_verified === true ? [req.user?.email, decoded.email] : [];
  const emails = [...new Set([...signInEmails, me?.email].filter(Boolean).map((e) => String(e).toLowerCase().trim()))];
  const lookup = [
    ...(me?._id ? [{ _id: me._id }] : []),
    ...(keycloakIds.length ? [{ keycloakId: { $in: keycloakIds } }] : []),
    ...(emails.length ? [{ email: { $in: emails } }] : []),
  ];
  const records = lookup.length ? await User.find({ $or: lookup }).select("_id").lean() : [];
  return records.map((r) => String(r._id));
};

exports.myCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ userId: { $in: await ownRecordIds(req) } })
      .populate("issuedBy", "fullName email role")
      .populate("userId", "fullName email username role")
      .sort({ issuedAt: -1 });
    res.json({ count: certificates.length, certificates });
  } catch (err) {
    console.error("My certificates error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** What goes on the certificate: the recipient as they are now, and the number and date it was issued with. */
exports.pdfDetails = (certificate, recipient) => ({
  name: recipient?.fullName || recipient?.email || "User",
  title: certificate.title,
  certificateNumber: certificate.certificateNumber,
  role: recipient?.role,
  email: recipient?.email,
  username: recipient?.username,
  issuedAt: certificate.issuedAt,
});

/**
 * The certificate as a PDF, built fresh from the database, so it never depends on a file on the server's disk.
 * Only the person it was issued to, admins and superadmins may open it.
 */
exports.certificatePdf = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid certificate id" });

    const certificate = await Certificate.findById(id);
    if (!certificate) return res.status(404).json({ message: "Certificate not found" });

    const allowed = isAdminRole(req.user?.role) || (await ownRecordIds(req)).includes(String(certificate.userId));
    if (!allowed) return res.status(403).json({ message: "You can only open your own certificates." });

    const recipient = await User.findById(certificate.userId).lean();
    const pdf = await buildCertificatePdf(exports.pdfDetails(certificate, recipient));

    res
      .set("Content-Type", "application/pdf")
      .set("Content-Disposition", `inline; filename="${certificate.certificateNumber}.pdf"`)
      .set("Cache-Control", "private, no-store")
      .send(Buffer.from(pdf));
  } catch (error) {
    console.error("Certificate PDF error:", error);
    res.status(500).json({ message: "Failed to open the certificate" });
  }
};
