const mongoose = require("mongoose");

// An HR OPS verification request (controllers/verificationController.js, /api/verifications): a company we check
// before working with it, an employee's background check, or another company asking us to confirm that someone
// worked here (sent from the website's form, controllers/verificationRequestController.js). Admins tick off each
// check, then verify or reject; every change is written to `log`, the audit trail a verification has to keep.
const KINDS = ["company", "employee", "employment"];
const STATUSES = ["pending", "verified", "rejected"];

// The documents an admin ticks off, by kind; ids match the portal's (src/portal/data.ts) and labels go into the log.
const CHECKS = {
  company: [
    { id: "registration", label: "Registration certificate" },
    { id: "tax", label: "GST / tax registration" },
    { id: "address", label: "Registered address" },
    { id: "bank", label: "Bank account details" },
    { id: "director", label: "Director identity" },
  ],
  employee: [
    { id: "aadhaar", label: "Aadhaar card" },
    { id: "pan", label: "PAN card" },
    { id: "education", label: "Education certificates" },
    { id: "employment", label: "Previous employment" },
    { id: "references", label: "References" },
  ],
  employment: [
    { id: "record", label: "Found in our records" },
    { id: "dates", label: "Dates of employment match" },
    { id: "designation", label: "Designation matches" },
    { id: "consent", label: "Candidate consent on file" },
  ],
};
// The files an employee uploads for their verification (controllers/idDocumentController.js), each with the check it
// proves; ids match the portal's (src/portal/data.ts) and labels go into the log. Education takes up to three.
const DOCUMENTS = [
  { id: "aadhaar", check: "aadhaar", label: "Aadhaar card" },
  { id: "pan", check: "pan", label: "PAN card" },
  { id: "degree", check: "education", label: "Degree certificate" },
  { id: "marksheet", check: "education", label: "Final marksheet" },
  { id: "class12", check: "education", label: "Class 12 marksheet" },
  { id: "experience", check: "employment", label: "Relieving or experience letter" },
];
const DOCUMENT_KINDS = DOCUMENTS.map((d) => d.id);
// Checks HR may mark "Not applicable" with a reason (a first job); it then counts as done.
const SKIPPABLE_CHECKS = ["employment"];
const REASON_MAX = 300;

const NAME_MAX = 120;
const REGISTRATION_MAX = 40;
const EMAIL_MAX = 254;
const URL_MAX = 2048;
const NOTE_MAX = 1000;
const PERSON_NAME_MAX = 80;
const DESIGNATION_MAX = 80;
const EMPLOYEE_ID_MAX = 20;

function requiredUnlessEmployment() {
  return this.kind !== "employment";
}

const LogEntrySchema = new mongoose.Schema(
  {
    at: { type: Date, required: true },
    // the name at the time, so the trail still reads right after someone is renamed or removed
    by: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const IdDocumentSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: DOCUMENT_KINDS, required: true },
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    fileName: { type: String, maxlength: NAME_MAX, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, required: true },
  },
  { _id: false }
);

const NotApplicableSchema = new mongoose.Schema(
  {
    check: { type: String, enum: SKIPPABLE_CHECKS, required: true },
    reason: { type: String, maxlength: REASON_MAX, required: true },
    by: { type: String, required: true },
    // the employee's own "This is my first job", which only they may take back
    byEmployee: { type: Boolean, default: false },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const VerificationSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: KINDS, required: true },
    status: { type: String, enum: STATUSES, default: "pending" },
    done: { type: [String], default: [] },
    note: { type: String, default: "", maxlength: NOTE_MAX },

    // company requests
    company: { type: String, maxlength: NAME_MAX },
    // the name compared without case or extra spaces, for "one pending request per company"
    companyKey: { type: String },
    registration: { type: String, maxlength: REGISTRATION_MAX },
    website: { type: String, maxlength: URL_MAX },
    contactEmail: { type: String, maxlength: EMAIL_MAX },

    // employee requests
    person: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // the employee's own uploads (DOCUMENTS), kept in GridFS "idDocuments" (controllers/idDocumentController.js)
    documents: { type: [IdDocumentSchema], default: [] },
    // checks marked "Not applicable", at most one entry per check
    notApplicable: { type: [NotApplicableSchema], default: [] },

    // requests from other companies, as they sent them; `reference` (VR-0001…) is what they were told
    reference: { type: String },
    requesterCompany: { type: String, maxlength: NAME_MAX },
    requesterName: { type: String, maxlength: PERSON_NAME_MAX },
    requesterEmail: { type: String, maxlength: EMAIL_MAX },
    candidate: { type: String, maxlength: PERSON_NAME_MAX },
    designation: { type: String, maxlength: DESIGNATION_MAX },
    givenEmployeeId: { type: String, maxlength: EMPLOYEE_ID_MAX },
    // "YYYY-MM"; an empty toMonth means they still work here
    fromMonth: { type: String },
    toMonth: { type: String },
    // when the requester confirmed the candidate's written consent
    consentAt: { type: Date },
    // when the current decision was emailed to the requester; cleared on reopening
    answeredAt: { type: Date },

    // the admin who opened it; a request from the website has none, only `openedByName`
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: requiredUnlessEmployment },
    openedByName: { type: String, required: true },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    decidedByName: { type: String, default: "" },
    decidedAt: { type: Date },

    log: { type: [LogEntrySchema], default: [] },
  },
  { timestamps: true }
);

VerificationSchema.index({ kind: 1, createdAt: -1 });
// One pending request per company and per person, held by the database too, so two admins clicking at once can't
// split one check across two records.
VerificationSchema.index({ companyKey: 1 }, { unique: true, partialFilterExpression: { kind: "company", status: "pending" } });
VerificationSchema.index({ person: 1 }, { unique: true, partialFilterExpression: { kind: "employee", status: "pending" } });
VerificationSchema.index({ reference: 1 }, { unique: true, partialFilterExpression: { kind: "employment" } });

module.exports = mongoose.model("Verification", VerificationSchema);
Object.assign(module.exports, {
  KINDS,
  STATUSES,
  CHECKS,
  DOCUMENTS,
  DOCUMENT_KINDS,
  SKIPPABLE_CHECKS,
  REASON_MAX,
  NAME_MAX,
  REGISTRATION_MAX,
  EMAIL_MAX,
  URL_MAX,
  NOTE_MAX,
  PERSON_NAME_MAX,
  DESIGNATION_MAX,
  EMPLOYEE_ID_MAX,
});
