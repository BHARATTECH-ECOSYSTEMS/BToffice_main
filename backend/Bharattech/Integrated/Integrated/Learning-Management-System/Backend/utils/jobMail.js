const { portalUrl } = require("./mailer");
const { messageFrom } = require("./bulkMail");

// The emails an internal job sends to former colleagues' personal emails (controllers/jobController.js): the posting
// itself, the knowledge check, "not this time" (no reason given), and "welcome back" with how to sign in.

const MODE_LABEL = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" };
const STOP = "To stop emails from Bharattech HR, reply and ask, and an admin removes your address.";

/** "15 Nov 2026" for "2026-11-15", read as a calendar day. */
const dayText = (day) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const postingMessage = (job) =>
  messageFrom(`Bharattech is hiring, and asking you first: ${job.title}`, [
    `We're hiring for ${job.title} and want to offer it to former colleagues before anyone else.`,
    job.about,
    [`Location: ${job.location}`, `Work mode: ${MODE_LABEL[job.mode]}`, `Experience: ${job.experience}`, `Openings: ${job.openings}`, `Apply by: ${job.closes ? dayText(job.closes) : "until the role is filled"}`].join("\n"),
    ["Who can apply:", ...job.criteria.map((c) => `- ${c}`)].join("\n"),
    `There's no interview. ${job.check}`,
    `To apply, write to ${job.applyEmail} with "${job.title}" in the subject.`,
    STOP,
  ]);

const checkMessage = (job, instructions) =>
  messageFrom(`Your knowledge check for ${job.title}`, [
    `Thank you for applying for ${job.title}. You meet the criteria, so here is your knowledge check instead of an interview:`,
    instructions,
    `If anything is unclear, reply to this email or write to ${job.applyEmail}.`,
  ]);

const declinedMessage = (job) =>
  messageFrom(`About your application for ${job.title}`, [
    `Thank you for applying for ${job.title}.`,
    "It's not this time, but we're glad to stay in touch, and we'll keep offering you roles first.",
    STOP,
  ]);

// `needsInvite`: their sign-in account was gone, so there's no old password; an admin sends them an invite
const welcomeMessage = (job, person, needsInvite = false) =>
  messageFrom("Welcome back to Bharattech", [
    `You passed the knowledge check for ${job.title}. Welcome back!`,
    ...(needsInvite
      ? [`Your sign-in was removed after you left, so our HR team will email ${person.email} an invite to set it up again.`]
      : [
          `Sign in at ${portalUrl("/portal")} with your work email ${person.email}${person.employeeId ? ` or your Employee ID ${person.employeeId}` : ""}, and your old password.`,
          'Forgotten it? Press "Forgot password?" on the sign-in window and we\'ll email you a link.',
        ]),
  ]);

module.exports = { postingMessage, checkMessage, declinedMessage, welcomeMessage };
