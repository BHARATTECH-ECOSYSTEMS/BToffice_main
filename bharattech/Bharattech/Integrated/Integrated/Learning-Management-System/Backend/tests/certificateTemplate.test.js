const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

// Owner, 2026-10-29: every certificate type (Bonafide, Character, Transfer, Course Completion) looks and reads exactly
// like the company's "Certificate of Experience" sample: job title, from and to dates, the same two sentences, the
// founder as signatory, the certificate ID and issue date at the foot. Only the small side words change per type.

const nodemailer = require("nodemailer");
nodemailer.createTransport = () => ({ sendMail: async () => ({ messageId: "test" }) });
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";

const { PDFDocument } = require("pdf-lib");
const User = require("../models/User");
const Certificate = require("../models/Certificate");
const certificateRoutes = require("../routes/certificateRoutes");
const { pdfDetails } = require("../controllers/certificateAccessController");
const { buildCertificatePdf } = require("../utils/generateCertifcate");
const { certificateContent, readCertificateDetails } = require("../utils/certificateTemplate");
const { todayInIndia } = require("../utils/days");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

let server;
let root;
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use("/api/certificates", (req, _res, next) => ((req.user = JSON.parse(req.get("x-test-user"))), next()), certificateRoutes);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  root = `http://127.0.0.1:${server.address().port}/api`;
});
beforeEach(clearTestDb);
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const issue = async (who, body) => {
  const quiet = console.error;
  console.error = () => {};
  try {
    const res = await fetch(`${root}/certificates/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-user": JSON.stringify({ id: String(who._id), role: who.role, email: who.email }) },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  } finally {
    console.error = quiet;
  }
};

const SAMPLE = {
  name: "Dev Bhatt",
  jobTitle: "Fullstack Intern",
  fromDate: "2026-07-08",
  toDate: "2026-10-15",
  certificateNumber: "BT-EFS-528",
  issuedAt: new Date("2026-10-16T05:00:00Z"),
};
const TYPES = ["Bonafide Certificate", "Character Certificate", "Transfer Certificate", "Course Completion"];

test("a certificate reads exactly like the company's sample", () => {
  const content = certificateContent({ ...SAMPLE, title: "Character Certificate" });
  assert.equal(content.statement, "THIS IS TO CERTIFY THAT");
  assert.equal(content.name, "Dev Bhatt");
  assert.equal(content.servedAs, "Fullstack Intern");
  assert.equal(content.from, "08-July-2026");
  assert.equal(content.to, "15-October-2026");
  assert.deepEqual(content.paragraphs, [
    "During this tenure, the individual has demonstrated dedication, professionalism and valuable contributions to the organization.",
    "We wish them all the best for future endeavors.",
  ]);
  assert.deepEqual(content.signatory, { name: "TUSHAR TRIVEDI", title: "Founder & CEO", company: "Bharattech Origin Pvt. Ltd." });
  assert.equal(content.id, "BT-EFS-528");
  assert.equal(content.issued, "OCT 16, 2026");
});

test("all four types share the wording; only the side words change", () => {
  const sides = Object.fromEntries(TYPES.map((title) => [title, certificateContent({ ...SAMPLE, title }).sideWords]));
  assert.deepEqual(sides, {
    "Bonafide Certificate": "BONAFIDE",
    "Character Certificate": "OF CHARACTER",
    "Transfer Certificate": "OF TRANSFER",
    "Course Completion": "OF COMPLETION",
  });
  const { sideWords: _a, ...first } = certificateContent({ ...SAMPLE, title: TYPES[0] });
  for (const title of TYPES.slice(1)) {
    const { sideWords: _b, ...other } = certificateContent({ ...SAMPLE, title });
    assert.deepEqual(other, first, title);
  }
});

test("the issue date is the day in India, and a missing end date reads as the issue day", () => {
  const late = certificateContent({ ...SAMPLE, title: TYPES[0], issuedAt: new Date("2026-10-15T20:00:00Z"), toDate: undefined });
  assert.equal(late.issued, "OCT 16, 2026");
  assert.equal(late.to, "16-October-2026");
  assert.equal(certificateContent({ ...SAMPLE, title: TYPES[0], fromDate: undefined }).from, null);
});

test("the issue details are checked: a job title and real dates, from before to, nothing in the future", () => {
  assert.deepEqual(readCertificateDetails({ jobTitle: "  Fullstack Intern ", fromDate: "2026-07-08", toDate: "2026-10-15" }), {
    jobTitle: "Fullstack Intern",
    fromDate: "2026-07-08",
    toDate: "2026-10-15",
  });
  assert.match(readCertificateDetails({ fromDate: "2026-07-08", toDate: "2026-10-15" }).error, /job title/i);
  assert.match(readCertificateDetails({ jobTitle: "x".repeat(81), fromDate: "2026-07-08", toDate: "2026-10-15" }).error, /80/);
  assert.match(readCertificateDetails({ jobTitle: "Intern", fromDate: "2026-02-30", toDate: "2026-10-15" }).error, /start date/i);
  assert.match(readCertificateDetails({ jobTitle: "Intern", fromDate: "2026-07-08", toDate: "15/10/2026" }).error, /end date/i);
  assert.match(readCertificateDetails({ jobTitle: "Intern", fromDate: "2026-10-16", toDate: "2026-10-15" }).error, /before/i);
  assert.match(readCertificateDetails({ jobTitle: "Intern", fromDate: "2026-07-08", toDate: "2999-01-01" }).error, /future/i);
  assert.match(readCertificateDetails({ jobTitle: { $ne: "" }, fromDate: "2026-07-08", toDate: "2026-10-15" }).error, /job title/i);
  assert.equal(readCertificateDetails({ jobTitle: "Intern", fromDate: "2026-07-08", toDate: todayInIndia() }).error, undefined);
});

test("the PDF is one page in the sample's portrait shape, in the sample's fonts, and stays light", async () => {
  const pdf = await buildCertificatePdf({ ...SAMPLE, title: "Course Completion" });
  const doc = await PDFDocument.load(pdf);
  assert.equal(doc.getPageCount(), 1);
  const { width, height } = doc.getPage(0).getSize();
  assert.ok(width < height, "portrait");
  assert.ok(Math.abs(width / height - 1122 / 1402) < 0.005, `ratio ${width / height}`);
  const { PDFDict, PDFName } = require("pdf-lib");
  const fonts = doc.context
    .enumerateIndirectObjects()
    .map(([, obj]) => obj instanceof PDFDict && obj.get(PDFName.of("BaseFont")))
    .filter(Boolean)
    .map(String)
    .join(" ");
  assert.match(fonts, /Montserrat/);
  assert.match(fonts, /DMSerifDisplay/);
  assert.doesNotMatch(fonts, /GreatVibes/);
  assert.ok(pdf.length < 400 * 1024, `the PDF is ${Math.round(pdf.length / 1024)} KB`);
});

// owner, 2026-10-29: "signature is missing", then "upper side logo": the logo, the top violet square, the signature and
// the seal are cut from the company's image and drawn where they sit in it
test("every certificate carries the logo, the top square, the signature and the seal", async () => {
  const { PDFDict, PDFName } = require("pdf-lib");
  const doc = await PDFDocument.load(await buildCertificatePdf({ ...SAMPLE, title: "Bonafide Certificate" }));
  // the colour images; each transparency is a separate grey mask image (its SMask)
  const images = doc.context
    .enumerateIndirectObjects()
    .map(([, obj]) => obj.dict)
    .filter((dict) => dict instanceof PDFDict && String(dict.get(PDFName.of("Subtype"))) === "/Image" && String(dict.get(PDFName.of("ColorSpace"))) === "/DeviceRGB");
  const transparent = images.filter((dict) => dict.has(PDFName.of("SMask")));
  assert.equal(images.length, 4, "logo, top square, signature, seal");
  assert.equal(transparent.length, 3, "logo, signature and seal keep their transparency");
});

test("issuing saves the job title and dates, and refuses without them", async () => {
  const admin = await User.create(userFields({ role: "Admin" }));
  const dev = await User.create(userFields({ fullName: "Dev Bhatt", role: "Intern" }));

  const missing = await issue(admin, { userId: String(dev._id), title: "Character Certificate", fromDate: "2026-07-08", toDate: "2026-10-15" });
  assert.equal(missing.status, 400);
  assert.match(missing.body.message, /job title/i);
  assert.equal(await Certificate.countDocuments(), 0);

  const made = await issue(admin, { userId: String(dev._id), title: "Character Certificate", jobTitle: "Fullstack Intern", fromDate: "2026-07-08", toDate: "2026-10-15" });
  assert.equal(made.status, 201);
  const saved = await Certificate.findOne().lean();
  assert.equal(saved.jobTitle, "Fullstack Intern");
  assert.equal(saved.fromDate, "2026-07-08");
  assert.equal(saved.toDate, "2026-10-15");
});

test("a certificate issued before job titles were asked for still fills the sample from the profile", () => {
  const old = { title: "Bonafide Certificate", certificateNumber: "CERT-1", issuedAt: new Date("2026-10-20T06:00:00Z") };
  const details = pdfDetails(old, { fullName: "Asha Rao", role: "Employee", joinedOn: "2025-04-01" });
  assert.equal(details.jobTitle, "Employee");
  assert.equal(details.fromDate, "2025-04-01");
  assert.equal(details.toDate, undefined);
  const saved = { ...old, jobTitle: "Fullstack Intern", fromDate: "2026-07-08", toDate: "2026-10-15" };
  assert.equal(pdfDetails(saved, { fullName: "Asha Rao", role: "Employee", joinedOn: "2025-04-01" }).fromDate, "2026-07-08");
});
