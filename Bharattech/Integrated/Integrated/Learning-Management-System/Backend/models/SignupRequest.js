const mongoose = require("mongoose");

const SignupRequestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed password
    role: { 
        type: String, 
        enum: ["Admin", "Subadmin", "Employee", "Intern"], 
        required: true 
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    notes: { type: String }, // Admin notes when reviewing
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("SignupRequest", SignupRequestSchema);

