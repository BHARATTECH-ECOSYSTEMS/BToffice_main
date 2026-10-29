const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
      default: function () {
        return `CERT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      },
    },
    filePath: {
      type: String,
      required: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    // What the certificate states (utils/certificateTemplate.js): the job title and the period, "YYYY-MM-DD" as the
    // admin chose them. Certificates issued before 2026-10-29 have none; their PDF fills them from the profile.
    jobTitle: { type: String, trim: true, maxlength: 80 },
    fromDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    toDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Certificate", certificateSchema);
