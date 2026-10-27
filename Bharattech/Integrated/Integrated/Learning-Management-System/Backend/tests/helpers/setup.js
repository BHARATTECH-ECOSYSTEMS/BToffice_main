// Loaded before every test file (package.json: node --test --require ./tests/helpers/setup.js).

// The tests' clock is UTC, not India's: code that slips back to the device's clock then fails here too, even on a
// laptop in India, where the device's clock and India's are the same.
process.env.TZ = "UTC";

// No test sends real mail, whatever .env says (one file used to fill the local Mailpit on every run). A test that checks
// its emails puts its own recorder in place of this one, as mailer.js asks nodemailer for a transport only when sending.
const nodemailer = require("nodemailer");
nodemailer.createTransport = () => ({ sendMail: async () => ({ messageId: "test" }) });
