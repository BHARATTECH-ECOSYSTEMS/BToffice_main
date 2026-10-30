// What a certificate says, apart from how it is drawn (utils/generateCertifcate.js). Every type reads like the
// company's "Certificate of Experience" sample (owner, 2026-10-29); only the small side words change per type.

const { indiaDayOf, readDay, todayInIndia } = require("./days");

const JOB_TITLE_MAX = 80;

const SIDE_WORDS = {
  "Bonafide Certificate": "BONAFIDE",
  "Character Certificate": "OF CHARACTER",
  "Transfer Certificate": "OF TRANSFER",
  "Course Completion": "OF COMPLETION",
};

const SIGNATORY = { name: "TUSHAR TRIVEDI", title: "Founder & CEO", company: "Bharattech Origin Pvt. Ltd." };

const PARAGRAPHS = [
  "During this tenure, the individual has demonstrated dedication, professionalism and valuable contributions to the organization.",
  "We wish them all the best for future endeavors.",
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-07-08" → "08-July-2026", as the sample writes the period. */
const periodDay = (day) => {
  const [y, m, d] = day.split("-");
  return `${d}-${MONTHS[Number(m) - 1]}-${y}`;
};

/** The India day of `moment` → "OCT 16, 2026", as the sample's foot writes it. */
const footDay = (moment) => {
  const [y, m, d] = indiaDayOf(moment).split("-");
  return `${MONTHS[Number(m) - 1].slice(0, 3).toUpperCase()} ${Number(d)}, ${y}`;
};

/** A type the portal doesn't know keeps its own name on the side, without the word "certificate". */
const sideWordsOf = (title) =>
  SIDE_WORDS[title] ?? (String(title || "").replace(/\bcertificate\b/gi, "").replace(/\s+/g, " ").trim().toUpperCase() || "OF RECOGNITION");

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

/** The text of one certificate. A missing start date leaves the period out; a missing end date is the issue day. */
const certificateContent = ({ title, name, jobTitle, fromDate, toDate, certificateNumber, issuedAt = new Date() }) => {
  const from = readDay(fromDate);
  return {
    sideWords: sideWordsOf(title),
    statement: "THIS IS TO CERTIFY THAT",
    name: clean(name) || "User",
    servedAs: clean(jobTitle),
    from: from ? periodDay(from) : null,
    to: from ? periodDay(readDay(toDate) ?? indiaDayOf(issuedAt)) : null,
    paragraphs: PARAGRAPHS,
    signatory: SIGNATORY,
    id: clean(certificateNumber),
    issued: footDay(issuedAt),
  };
};

/** The job title and period an admin gives when issuing, checked; `{ error }` says what to fix. */
const readCertificateDetails = ({ jobTitle, fromDate, toDate } = {}) => {
  const title = typeof jobTitle === "string" ? clean(jobTitle) : "";
  if (!title) return { error: "Add the job title the certificate names (for example, Fullstack Intern)." };
  if (title.length > JOB_TITLE_MAX) return { error: `Keep the job title to ${JOB_TITLE_MAX} characters.` };
  const from = readDay(fromDate);
  if (!from) return { error: "Choose the start date." };
  const to = readDay(toDate);
  if (!to) return { error: "Choose the end date." };
  if (from > to) return { error: "The start date has to be before the end date." };
  if (to > todayInIndia()) return { error: "The end date can't be in the future." };
  return { jobTitle: title, fromDate: from, toDate: to };
};

module.exports = { certificateContent, readCertificateDetails, JOB_TITLE_MAX };
