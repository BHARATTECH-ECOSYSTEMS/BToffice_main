const Notification = require("../models/Notification");
const User = require("../models/User");
const { createMailTransporter, escapeHtml, portalUrl, EMAIL_FROM } = require("./mailer");

/*
 * Notifications: a note in the person's bell and, unless they switched that kind of email off, an email.
 * Nothing here ever throws: a note or an email failing must not undo the task, certificate or policy that caused it.
 */

// which email switch (User.mutedNotifications) covers each kind of note
const SWITCH_FOR_KIND = { task: "tasks", "task-update": "tasks", "work-handed-in": "tasks", certificate: "certificates", policy: "policies", event: "events", course: "courses" };
const PEOPLE_FIELDS = "email fullName mutedNotifications isBanned isDeleted";

/** Emails one person about a note, unless they can't sign in or switched this kind off. Resolves true when sent. */
async function emailAbout(person, { kind, title, detail, link }) {
  if (!person?.email || person.isDeleted || person.isBanned) return false;
  if ((person.mutedNotifications || []).includes(SWITCH_FOR_KIND[kind])) return false;
  try {
    const url = portalUrl(link);
    await createMailTransporter().sendMail({
      from: EMAIL_FROM,
      to: person.email,
      subject: title,
      text: `${title}\n${detail ? `${detail}\n` : ""}\nOpen the portal: ${url}\n\nYou can switch these emails off from the bell in the portal.`,
      html: `<p><strong>${escapeHtml(title)}</strong></p>${detail ? `<p>${escapeHtml(detail)}</p>` : ""}<p><a href="${escapeHtml(url)}">Open the portal</a></p><p style="color:#777">You can switch these emails off from the bell in the portal.</p>`,
    });
    return true;
  } catch (error) {
    console.error(`Notification email (${kind}) failed:`, error.message);
    return false;
  }
}

/** Saves a note for one person and emails them. */
async function notify({ userId, kind, title, detail = "", link, refId }) {
  try {
    await Notification.create({ userId, kind, title, detail, link, refId: refId && String(refId) });
    await emailAbout(await User.findById(userId).select(PEOPLE_FIELDS), { kind, title, detail, link });
  } catch (error) {
    console.error(`Notification (${kind}) failed:`, error.message);
  }
}

/** Removes the notes about something that was deleted (a task, a certificate, a policy). */
async function forgetNotesAbout(refId) {
  try {
    await Notification.deleteMany({ refId: String(refId) });
  } catch (error) {
    console.error("Removing notifications failed:", error.message);
  }
}

// a task's people may be loaded (populated) or just ids
const idOf = (ref) => ref?._id ?? ref;
const formatDay = (date) => new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const notifyTaskGiven = (task, giverName) =>
  notify({
    userId: idOf(task.assignedTo),
    kind: "task",
    title: `New task: ${task.title}`,
    detail: [giverName && `From ${giverName}`, task.dueDate && `Due ${formatDay(task.dueDate)}`].filter(Boolean).join(" · "),
    link: "/portal",
    refId: task._id,
  });

const notifyTaskChanged = (task, changerName) =>
  notify({ userId: idOf(task.assignedTo), kind: "task-update", title: `Task changed: ${task.title}`, detail: changerName ? `By ${changerName}` : "", link: "/portal", refId: task._id });

const notifyWorkHandedIn = (task, doerName) =>
  notify({ userId: idOf(task.assignedBy), kind: "work-handed-in", title: `Work handed in: ${task.title}`, detail: doerName ? `By ${doerName}` : "", link: "/portal", refId: task._id });

const notifyCertificateIssued = ({ certificate, recipient, issuer }) =>
  notify({
    userId: recipient._id,
    kind: "certificate",
    title: `${certificate.title} issued to you`,
    detail: issuer?.fullName ? `By ${issuer.fullName}` : "",
    link: "/portal/certificates",
    refId: certificate._id,
  });

/**
 * A new policy: every employee and intern who keeps policy emails on is emailed. Their bell note comes from the live
 * to-do list (controllers/notificationController.js), so people who join later still see it.
 */
async function notifyPolicyPublished(policy) {
  try {
    const people = await User.find({ role: { $in: ["Employee", "Intern"] }, isDeleted: { $ne: true }, isBanned: { $ne: true } }).select(PEOPLE_FIELDS);
    const note = { kind: "policy", title: `Policy to review: ${policy.name}`, detail: `${policy.pages} pages`, link: "/portal/policy" };
    await Promise.allSettled(people.map((person) => emailAbout(person, note)));
  } catch (error) {
    console.error("Policy notification failed:", error.message);
  }
}

/**
 * One note about `refId` for everyone who can sign in except `actorId`, replacing any earlier note about the same
 * thing, so the bell always shows its latest state. The notes are saved now; the returned function sends the emails
 * (unless someone switched that kind off), so the caller can answer first and email afterwards.
 */
async function noteEveryoneElse({ note, refId, actorId }) {
  try {
    const people = await User.find({ _id: { $ne: actorId }, isDeleted: { $ne: true }, isBanned: { $ne: true } }).select(PEOPLE_FIELDS);
    await Notification.deleteMany({ refId });
    await Notification.insertMany(people.map((person) => ({ userId: person._id, ...note, refId })));
    return () => Promise.allSettled(people.map((person) => emailAbout(person, note)));
  } catch (error) {
    console.error(`Notification (${note.kind}) for everyone failed:`, error.message);
    return async () => {};
  }
}

const EVENT_HEADLINE = { added: "New event", changed: "Event changed", cancelled: "Event cancelled" };

/** A calendar event was added, changed or cancelled: everyone else is told (see noteEveryoneElse). */
const noteEvent = ({ event, action, detail, actorId }) =>
  noteEveryoneElse({ note: { kind: "event", title: `${EVENT_HEADLINE[action]}: ${event.title}`, detail, link: "/portal" }, refId: String(event._id), actorId });

/** A learning course went live: everyone but its educator is told (see noteEveryoneElse). */
const noteCourse = ({ course, detail, actorId }) =>
  noteEveryoneElse({ note: { kind: "course", title: `New course: ${course.title}`, detail, link: `/portal/lms/course/${course._id}` }, refId: String(course._id), actorId });

module.exports = {
  notify,
  noteEvent,
  noteCourse,
  forgetNotesAbout,
  notifyTaskGiven,
  notifyTaskChanged,
  notifyWorkHandedIn,
  notifyCertificateIssued,
  notifyPolicyPublished,
  SWITCH_FOR_KIND,
};
