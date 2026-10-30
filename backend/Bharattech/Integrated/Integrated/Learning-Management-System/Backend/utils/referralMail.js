const { messageFrom, sendOneEach } = require("./bulkMail");

// The email a shared referral sends to each former colleague in its stream (one each, through utils/bulkMail.js).

const referralLines = (referral) => [
  `${referral.sharedByName} at Bharattech thought you might like this role:`,
  `${referral.title} at ${referral.company}`,
  referral.note,
  referral.link ? `Details and how to apply: ${referral.link}` : "",
  "Shared by Bharattech HR with former colleagues. To stop these emails, reply and ask, and an admin removes your address.",
];

/** Sends the referral to `addresses`; resolves with how many went and how many didn't. */
const sendReferralEmails = (referral, addresses) =>
  sendOneEach(addresses, messageFrom(`A job you might like: ${referral.title} at ${referral.company}`, referralLines(referral)), "Referral");

module.exports = { sendReferralEmails };
