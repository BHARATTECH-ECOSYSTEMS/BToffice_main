const mongoose = require("mongoose");
const Counter = require("./Counter");

const STREAMS = ["tech", "operations", "hr", "finance"];

const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: false },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: function () {
    return this.authProvider === "local";
  }},
  keycloakId: {  // ✅ Keycloak UUID (string)
    type: String,
    required: true,
    unique: true,
    index: true
  },
    role: { 
        type: String, 
        enum: ["Superadmin", "Admin", "Subadmin", "Employee", "Intern"], 
        required: true 
    },
    profilePicture: { type: String, default: "" },
    // the photo stored in GridFS (utils/userPhotos.js); profilePicture holds the address it's served from
    photoFileId: { type: mongoose.Schema.Types.ObjectId },
    tokens: [{ token: String, createdAt: { type: Date, default: Date.now } }], // ✅ Store JWT token here
    authProvider: {
  type: String,
  enum: ["local", "keycloak"],
  default: "local"
}
,

    // Employee record. employeeId is handed out automatically (see the pre-save hook) and never changes.
    employeeId: { type: String, unique: true, sparse: true },
    stream: { type: String, enum: STREAMS },
    team: { type: String, trim: true, maxlength: 80 },

    // Common fields
    phoneNumber: { type: String },
    phone: { type: String },
    workPhone: { type: String },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    dateOfBirth: { type: Date },
    address: {
        local: { type: String },
        city: { type: String },
        state: { type: String },
        country: { type: String },
        pincode: { type: String },
    },

    // Learner-Specific Fields
    qualification: { type: String }, // Graduate, Post Graduate, etc.
    degree: { type: String }, // Engineering, Arts, etc.
    qualificationStatus: {
        type: String,
        enum: ["Pursuing", "Completed"],
        default: "Pursuing", // ✅ Set a default value
        required: function () { return this.role === "learner"; } // Required only for learners
    },
    profession: { type: String }, // Student, Working Professional, etc.
    organization: { name: String, address: String },
    interests: { type: String },

    enrolledCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course"
    }],

    enrolledExams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exam"
    }],
    // Examiner-Specific Fields
    canEnrollCourses: { type: Boolean, default: false }, // Cannot enroll unless upgraded

    // Trainer-Specific Fields
    professionalTitle: { type: String }, // Industry Expert, Professor, etc.
    totalExperience: { type: Number },
    socialLinks: {
        linkedIn: { type: String },
        github: { type: String },
        youtube: { type: String },
        twitter: { type: String },
    },
    careerDescription: { type: String },

    // Admin-Specific Fields
    accessLevel: {
        type: String,
        enum: ["Full Admin", "Content Manager", "Finance Manager"],
        default: "Full Admin", // ✅ Set a default value
        required: function () { return this.role === "admin"; } // Required only for admins
    },
    // Privacy Settings
    privacySettings: {
        showEmail: { type: Boolean, default: true },
        showPhone: { type: Boolean, default: true },
        showProfession: { type: Boolean, default: true },
    },
    // Notification emails this person switched off (the bell still shows them); see utils/notify.js
    mutedNotifications: {
        type: [{ type: String, enum: ["tasks", "certificates", "policies", "courses", "events"] }],
        default: [],
    },
    // ✅ Ban/Unban Feature
    isBanned: { type: Boolean, default: false }, // ✅ Banned users can't access the system
    // Soft Delete (for deactivation)
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
});

const formatEmployeeId = (n) => `BT-${String(n).padStart(4, "0")}`;

// Every way a person is created or re-synced ends in save(), so this one hook covers them all. People from before
// employee IDs existed get theirs on their next save, or from scripts/assignEmployeeIds.js. A save that then fails
// (e.g. a duplicate email) leaves a gap in the numbers, which is fine: IDs only need to be unique.
UserSchema.pre("save", async function () {
  if (!this.employeeId) this.employeeId = formatEmployeeId(await Counter.next("employeeId"));
});

UserSchema.statics.STREAMS = STREAMS;
UserSchema.statics.formatEmployeeId = formatEmployeeId;

module.exports = mongoose.model("User", UserSchema);
