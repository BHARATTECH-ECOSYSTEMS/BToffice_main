const mongoose = require("mongoose");

// When an invite's temporary password was last emailed (utils/inviteExpiry.js), so it can expire after 12 hours as
// the email says. One per Keycloak account; removed once the invite is finished or cancelled. Never the password.
const InviteSentSchema = new mongoose.Schema({
  keycloakId: { type: String, required: true, unique: true },
  // the names the invitee may sign in with before finishing, lower-cased
  email: { type: String, required: true, index: true },
  username: { type: String, index: true },
  sentAt: { type: Date, required: true },
  // set when the hourly check replaced the expired emailed password
  voidedAt: { type: Date },
});

module.exports = mongoose.model("InviteSent", InviteSentSchema);
