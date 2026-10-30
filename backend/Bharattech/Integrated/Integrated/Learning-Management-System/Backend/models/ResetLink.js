const mongoose = require("mongoose");

const ResetLinkSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    userRole: { 
        type: String, 
        enum: ["Admin", "Subadmin", "Employee", "Intern"],
        required: true 
    },
    resetToken: { type: String, required: true, unique: true },
    link: { type: String, required: true },
    status: {
        type: String,
        enum: ["Pending", "Sent", "Used", "Expired"],
        default: "Pending"
    },
    used: { type: Boolean, default: false },
    usedAt: { type: Date },
    expiresAt: { type: Date, required: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for faster lookups (resetToken already has its unique index from the field; a second one clashes with it)
ResetLinkSchema.index({ userEmail: 1 });
ResetLinkSchema.index({ userRole: 1 });

module.exports = mongoose.model("ResetLink", ResetLinkSchema);

