const mongoose = require("mongoose");

const EmailVerificationSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    encryptedPassword: { type: String, required: true }, // AES-256-CBC encrypted
    token: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-expires in 24 hours
}, { timestamps: true });

module.exports = mongoose.model("EmailVerification", EmailVerificationSchema);
