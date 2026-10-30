const mongoose = require("mongoose");
const Counter = require("./Counter");
const { readDay, todayInIndia } = require("../utils/days");

const STREAMS = ["tech", "operations", "hr", "finance"];
const JOINED_EARLIEST = "1990-01-01";

// A join date before 1990 or over a year ahead is a typo; a start date up to a year away is someone set up early.
const isJoinDate = (value) => {
  if (value == null) return true;
  const today = todayInIndia();
  const latest = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
  return readDay(value) !== null && value >= JOINED_EARLIEST && value <= latest;
};

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
    // The first working day, "YYYY-MM-DD" as an admin typed it (not a moment in time, so it never shifts a day).
    // It drives the ID card and the calendar's work anniversaries; nobody has one until an admin sets it.
    joinedOn: {
      type: String,
      validate: { validator: isJoinDate, message: "Give a real join date (YYYY-MM-DD), from 1990 up to a year from today." },
    },

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
        // no default since step 17 Part 2: every account was stamped "Full Admin", and nothing reads it
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
    // Leaving (controllers/communityController.js): someone who left is also isDeleted, so every list of current
    // staff skips them; leftOn ("YYYY-MM-DD", India time) is what puts them in the community instead of just gone.
    leftOn: { type: String },
    // Where the community reaches them once their work email stops; staff may give it before they leave.
    personalEmail: { type: String, lowercase: true, trim: true },
}, { timestamps: true }); // createdAt/updatedAt from now on; records made before this have none

// One person per personal email, held by the database too, so two people saving the same one at once can't both win.
UserSchema.index({ personalEmail: 1 }, { unique: true, partialFilterExpression: { personalEmail: { $type: "string" } } });

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
