// Using the maintained Express-5-compatible forks — the original
// express-mongo-sanitize / xss-clean packages throw on req.query in
// Express 5, which is what caused your earlier CORS symptom.
const mongoSanitize = require("@exortek/express-mongo-sanitize");
const hpp = require("hpp");

// The input cleaners every request passes through, in one place so the tests run exactly what server.js runs.
//
// There is deliberately no HTML cleaner here. express-xss-sanitizer rewrote every saved text ("R&D" became
// "R&amp;D", links with & broke) while still letting tags like <b> through. Text is made safe where it is shown:
// React escapes it, and anything that builds HTML from saved text (emails) must escape it, as inviteController does.
const applyRequestSanitizers = (app) => {
  app.use(mongoSanitize());
  app.use(hpp());
};

module.exports = { applyRequestSanitizers };
