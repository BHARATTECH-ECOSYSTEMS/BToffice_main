const { test } = require("node:test");
const assert = require("node:assert/strict");

// A local mail server setting so the controller picks its SMTP transport, which the stand-in below replaces.
process.env.SMTP_HOST = "127.0.0.1";
process.env.SMTP_PORT = "1025";
const nodemailer = require("nodemailer");
let sent;
nodemailer.createTransport = () => ({
  sendMail: async (message) => {
    sent = message;
  },
});
const { sendBackendInviteEmail } = require("../controllers/inviteController");

// Text now reaches the backend as typed, so the email is the one place that must escape it, exactly once.
test("an invite email shows a name with & and < correctly: escaped once in HTML, as typed in plain text", async () => {
  await sendBackendInviteEmail({ name: "Lal & Sons <Ltd>", username: "lal.sons", email: "lal@example.test", role: "Employee", temporaryPassword: "Abc123def456GhJk" });

  assert.match(sent.html, /Hello Lal &amp; Sons &lt;Ltd&gt;,/);
  assert.doesNotMatch(sent.html, /&amp;amp;|<Ltd>/);
  assert.match(sent.text, /^Hello Lal & Sons <Ltd>,$/m);
});
