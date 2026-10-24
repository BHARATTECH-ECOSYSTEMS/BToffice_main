const Verification = require("../models/Verification");
const Counter = require("../models/Counter");
const { NAME_MAX, EMAIL_MAX, PERSON_NAME_MAX, DESIGNATION_MAX, EMPLOYEE_ID_MAX } = Verification;
const { Refusal, answerError } = require("../utils/refusal");
const { todayInIndia } = require("../utils/days");
const { noteVerificationRequest } = require("../utils/notify");
const { sendReceipt } = require("../utils/verificationMail");

/*
 * POST /api/verification-requests: the website's footer form, where another company (a new employer, a background
 * check agency) asks us to confirm that someone worked here. No sign-in, so it takes only what the form sends, checks
 * all of it, and is limited to a few an hour per address (server.js, middlewares/rateLimits.js publicForm).
 * - The request is filed for HR OPS (kind "employment") with a reference, VR-0001…, which the requester is shown.
 * - Every current Super Admin and Admin gets a bell note; the requester gets a receipt email.
 * - `website` is a field people never see (the form hides it): something that fills it in is a bot, and gets a calm
 *   answer while nothing is saved, so it learns nothing.
 */

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONTH_SHAPE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const EMPLOYEE_ID_SHAPE = /^[A-Z0-9-]*$/;
const EARLIEST_YEAR = 1950;

const text = (value, max, problem) => {
  const out = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!out || out.length > max) throw new Refusal(400, problem);
  return out;
};
const readMonth = (value, problem) => {
  const month = typeof value === "string" ? value.trim() : "";
  const match = MONTH_SHAPE.exec(month);
  if (!match || Number(match[1]) < EARLIEST_YEAR) throw new Refusal(400, problem);
  return month;
};

/** The form as it will be filed, all checked. */
const readForm = (body) => {
  const requesterCompany = text(body.requesterCompany, NAME_MAX, `Enter your company's name, up to ${NAME_MAX} characters.`);
  const requesterName = text(body.requesterName, PERSON_NAME_MAX, `Enter your name, up to ${PERSON_NAME_MAX} characters.`);
  const requesterEmail = typeof body.requesterEmail === "string" ? body.requesterEmail.trim().toLowerCase() : "";
  if (!EMAIL_SHAPE.test(requesterEmail) || requesterEmail.length > EMAIL_MAX) throw new Refusal(400, "Enter your work email, like name@company.com.");
  const candidate = text(body.candidate, PERSON_NAME_MAX, `Enter the full name of the person you're checking, up to ${PERSON_NAME_MAX} characters.`);
  const designation = text(body.designation, DESIGNATION_MAX, `Enter the designation they gave you, up to ${DESIGNATION_MAX} characters.`);
  const givenEmployeeId = typeof body.employeeId === "string" ? body.employeeId.trim().toUpperCase() : "";
  if (givenEmployeeId.length > EMPLOYEE_ID_MAX || !EMPLOYEE_ID_SHAPE.test(givenEmployeeId)) throw new Refusal(400, "An Employee ID has only letters, digits and dashes, like BT-0001.");
  const fromMonth = readMonth(body.from, "Pick the month and year they joined.");
  const rawTo = typeof body.to === "string" ? body.to.trim() : "";
  const toMonth = rawTo ? readMonth(rawTo, "Pick the month and year they left, or leave it empty if they still work here.") : "";
  const thisMonth = todayInIndia().slice(0, 7);
  if (fromMonth > thisMonth || (toMonth && toMonth > thisMonth)) throw new Refusal(400, "Employment months can't be in the future.");
  if (toMonth && toMonth < fromMonth) throw new Refusal(400, "The month they left can't be before the month they joined.");
  if (body.consent !== true) throw new Refusal(400, "Confirm that the candidate has given written consent for this check.");
  return { requesterCompany, requesterName, requesterEmail, candidate, designation, givenEmployeeId, fromMonth, toMonth };
};

const formatReference = (n) => `VR-${String(n).padStart(4, "0")}`;

exports.submitRequest = async (req, res) => {
  try {
    const body = req.body ?? {};
    if (typeof body.website === "string" && body.website.trim()) {
      return res.status(202).json({ message: "Request received." });
    }
    const fields = readForm(body);
    const from = `${fields.requesterName} (${fields.requesterCompany})`;
    const request = await Verification.create({
      kind: "employment",
      ...fields,
      reference: formatReference(await Counter.next("verificationRequest")),
      consentAt: new Date(),
      openedByName: from,
      log: [{ at: new Date(), by: from, text: "Sent the request from the website" }],
    });
    await noteVerificationRequest(request);
    res.status(201).json({ reference: request.reference, message: "Request received." });
    // the receipt goes after the reply; if it fails, the file says so
    if (!(await sendReceipt(request))) {
      await Verification.updateOne({ _id: request._id }, { $push: { log: { at: new Date(), by: "System", text: `Couldn't email the receipt to ${request.requesterEmail}` } } });
    }
  } catch (error) {
    if (res.headersSent) return console.error("Verification request after reply error:", error.message);
    return answerError(res, error, "Verification request");
  }
};
