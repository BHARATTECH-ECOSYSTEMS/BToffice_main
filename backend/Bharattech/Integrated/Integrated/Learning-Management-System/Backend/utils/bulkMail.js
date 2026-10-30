const { createMailTransporter, escapeHtml, EMAIL_FROM } = require("./mailer");

// Emails to former colleagues (referrals, internal jobs): one email per person, so nobody sees anyone else's
// address, a few at a time. A failure is counted and logged with any address masked (mail servers often repeat it),
// and never stops the rest.

const AT_ONCE = 5;

/** A plain-text and escaped-HTML email from these lines (empty ones left out); line breaks typed inside one are kept. */
const messageFrom = (subject, lines) => {
  const kept = lines.filter(Boolean);
  return { from: EMAIL_FROM, subject, text: kept.join("\n\n"), html: kept.map((line) => `<p>${escapeHtml(line).replace(/\r?\n/g, "<br>")}</p>`).join("") };
};

const logFailure = (what, error) => console.error(`${what} email failed:`, String(error?.message ?? "unknown error").replace(/\S+@\S+/g, "<address>"));

/** Sends `message` to each of `addresses` separately; resolves with how many went and how many didn't. */
const sendOneEach = async (addresses, message, what) => {
  if (!addresses.length) return { emailed: 0, failed: 0 };
  let transporter;
  try {
    transporter = createMailTransporter();
  } catch (error) {
    console.error(`${what} emails: mail isn't set up:`, error.message);
    return { emailed: 0, failed: addresses.length };
  }
  let emailed = 0;
  let failed = 0;
  for (let i = 0; i < addresses.length; i += AT_ONCE) {
    const results = await Promise.allSettled(addresses.slice(i, i + AT_ONCE).map((to) => transporter.sendMail({ ...message, to })));
    for (const result of results) {
      if (result.status === "fulfilled") emailed += 1;
      else {
        failed += 1;
        logFailure(what, result.reason);
      }
    }
  }
  return { emailed, failed };
};

/** Sends `message` to one address; resolves with whether it went. */
const sendTo = async (to, message, what) => (await sendOneEach([to], message, what)).emailed === 1;

module.exports = { messageFrom, sendOneEach, sendTo };
