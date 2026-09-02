const mongoose = require("mongoose");

const acceptanceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      default: "",
    },
    fullName: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      default: "",
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const policySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    pdfUrl: {
      type: String,
      required: true,
    },
    pdfName: {
      type: String,
      required: true,
    },
    storedFileName: {
      type: String,
      required: true,
    },
    pages: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
    acceptedBy: {
      type: [acceptanceSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Policy", policySchema);
