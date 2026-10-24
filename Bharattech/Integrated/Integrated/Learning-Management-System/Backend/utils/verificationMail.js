const { createMailTransporter, escapeHtml, EMAIL_FROM } = require("./mailer");

/*
 * The two emails another company gets about a verification request it sent from the website: a receipt with its
 * reference, and the answer once HR decides. They only ever repeat what the requester sent and say yes or no about
 * it: never the admin's note and nothing else from our records, which are other people's personal data.
 * Neither throws; each resolves true when the email went out.
 */

const monthText = (month) =>
  month ? new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" }) : "now";

/** "Asha Rao (Software Engineer, Mar 2024 to now)": the details as the requester sent them. */
const detailsSent = (request) => `${request.candidate} (${request.designation}, ${monthText(request.fromMonth)} to ${monthText(request.toMonth)})`;

async function send(request, { subject, lines }) {
  try {
    await createMailTransporter().sendMail({
      from: EMAIL_FROM,
      to: request.requesterEmail,
      subject,
      text: `${lines.join("\n\n")}\n\nBharattech HR`,
      html: `${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}<p>Bharattech HR</p>`,
    });
    return true;
  } catch (error) {
    console.error(`Verification email (${request.reference}) failed:`, error.message);
    return false;
  }
}

const sendReceipt = (request) =>
  send(request, {
    subject: `We received your verification request ${request.reference}`,
    lines: [
      `Hello ${request.requesterName},`,
      `We received your request to verify ${detailsSent(request)}. Your reference is ${request.reference}.`,
      "Our HR team checks it against our records and emails the answer to this address.",
    ],
  });

const sendAnswer = (request) =>
  send(request, {
    subject: `Your verification request ${request.reference}: ${request.status === "verified" ? "confirmed" : "not confirmed"}`,
    lines: [
      `Hello ${request.requesterName},`,
      request.status === "verified"
        ? `About your request ${request.reference} to verify ${detailsSent(request)}: we confirm the details you sent.`
        : `About your request ${request.reference} to verify ${detailsSent(request)}: we couldn't confirm the details you sent. We can't share more than this.`,
    ],
  });

module.exports = { sendReceipt, sendAnswer };
