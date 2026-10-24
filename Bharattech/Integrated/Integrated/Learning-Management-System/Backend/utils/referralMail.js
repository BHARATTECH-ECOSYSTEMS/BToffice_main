const { createMailTransporter, escapeHtml, EMAIL_FROM } = require("./mailer");

// The email a shared referral sends to each former colleague in its stream: one email per person (nobody sees the
// others' addresses), a few at a time. A failure is counted and logged without the address, and never stops the rest.

const AT_ONCE = 5;

const referralLines = (referral) =>
  [
    `${referral.sharedByName} at Bharattech thought you might like this role:`,
    `${referral.title} at ${referral.company}`,
    referral.note,
    referral.link ? `Details and how to apply: ${referral.link}` : "",
    "Shared by Bharattech HR with former colleagues. To stop these emails, reply and ask, and an admin removes your address.",
  ].filter(Boolean);

/** Sends the referral to `addresses`; resolves with how many went and how many didn't. */
const sendReferralEmails = async (referral, addresses) => {
  if (!addresses.length) return { emailed: 0, failed: 0 };
  let transporter;
  try {
    transporter = createMailTransporter();
  } catch (error) {
    console.error("Referral emails: mail isn't set up:", error.message);
    return { emailed: 0, failed: addresses.length };
  }

  const lines = referralLines(referral);
  const message = {
    from: EMAIL_FROM,
    subject: `A job you might like: ${referral.title} at ${referral.company}`,
    text: lines.join("\n\n"),
    html: lines.map((line) => `<p>${escapeHtml(line)}</p>`).join(""),
  };

  let emailed = 0;
  let failed = 0;
  for (let i = 0; i < addresses.length; i += AT_ONCE) {
    const results = await Promise.allSettled(addresses.slice(i, i + AT_ONCE).map((to) => transporter.sendMail({ ...message, to })));
    for (const result of results) {
      if (result.status === "fulfilled") emailed += 1;
      else {
        failed += 1;
        // the mail server's reply often repeats the address, so only its kind of failure is logged
        console.error("Referral email failed:", String(result.reason?.message ?? "unknown error").replace(/\S+@\S+/g, "<address>"));
      }
    }
  }
  return { emailed, failed };
};

module.exports = { sendReferralEmails };
