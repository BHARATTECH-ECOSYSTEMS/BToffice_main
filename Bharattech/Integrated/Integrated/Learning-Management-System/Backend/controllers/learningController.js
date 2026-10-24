const mongoose = require("mongoose");
const LearningCourse = require("../models/LearningCourse");
const LearningEnrollment = require("../models/LearningEnrollment");
const { TITLE_MAX, PARAGRAPH_MAX, PARAGRAPHS_MAX, CHAPTERS_MAX, LECTURES_MAX, MINUTES_MAX } = LearningCourse;
const { noteCourse, forgetNotesAbout } = require("../utils/notify");
const { imageStore, photoType } = require("../utils/userPhotos");
const { Refusal, answerError, isAdmin, isManager, isObjectId } = require("../utils/refusal");

/*
 * The portal's learning platform (/api/learning; server.js signs everyone in). Courses are free.
 * - Everyone signed in sees live courses and enrolls in them. Lecture videos are sent only to people who may watch:
 *   free previews to everyone, the rest once enrolled, and all of them to whoever may change the course.
 * - Superadmins, admins and sub admins publish courses (live at once); admins and superadmins change, unpublish or
 *   delete any, a sub admin only their own (the same rule as calendar events and tasks).
 * - Going live tells everyone else in their bell and by email (utils/notify.js noteCourse); unpublishing takes that
 *   note back.
 */

const thumbs = imageStore("courseThumbs");
const PEOPLE = "fullName email isDeleted";

const idOf = (ref) => String(ref?._id ?? ref);
const canChange = (course, user) => isAdmin(user) || (isManager(user) && idOf(course.educator) === String(user.id));
const nameOf = (person) => (!person || person.isDeleted ? "" : person.fullName || person.email || "");

const text = (value, max, problem) => {
  const out = typeof value === "string" ? value.trim() : "";
  if (!out || out.length > max) throw new Refusal(400, problem);
  return out;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
/**
 * The address when it is a YouTube video (youtube.com/watch, youtu.be, youtube.com/embed over https), else null. The
 * portal embeds it in an iframe, so nothing else may get through.
 */
const readVideoUrl = (value) => {
  let url;
  try {
    url = new URL(String(value ?? "").trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");
  const id =
    host === "youtu.be" ? url.pathname.slice(1) : host === "youtube.com" ? (url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/embed\/([^/]+)$/)?.[1]) : null;
  return id && YOUTUBE_ID.test(id) ? url.toString() : null;
};

const readList = (value, max, problem) => {
  if (!Array.isArray(value) || !value.length || value.length > max) throw new Refusal(400, problem);
  return value;
};

/**
 * The course as the request would leave it, all checked: only title, description, chapters and (when changing)
 * published are read. A chapter or lecture keeps its id only when `current` already has it, so progress survives an
 * edit and nobody can bring in ids of their own.
 */
const readCourse = (body = {}, current) => {
  const out = {};
  if (!current || "title" in body) out.title = text(body.title, TITLE_MAX, `Give the course a title of up to ${TITLE_MAX} characters.`);
  if (!current || "description" in body) {
    const problem = `Describe the course in up to ${PARAGRAPHS_MAX} paragraphs of up to ${PARAGRAPH_MAX} characters each.`;
    out.description = readList(body.description, PARAGRAPHS_MAX, problem).map((p) => text(p, PARAGRAPH_MAX, problem));
  }
  if (!current || "chapters" in body) {
    const known = new Set(current ? current.chapters.flatMap((c) => [String(c._id), ...c.lectures.map((l) => String(l._id))]) : []);
    const keep = (id) => (known.has(String(id)) ? { _id: String(id) } : {});
    out.chapters = readList(body.chapters, CHAPTERS_MAX, `Add between 1 and ${CHAPTERS_MAX} chapters.`).map((chapter = {}) => {
      const title = text(chapter.title, TITLE_MAX, `Give each chapter a name of up to ${TITLE_MAX} characters.`);
      const lectures = readList(chapter.lectures, LECTURES_MAX, `Add between 1 and ${LECTURES_MAX} lectures to "${title}".`).map((lecture = {}) => {
        const lectureTitle = text(lecture.title, TITLE_MAX, `Give each lecture in "${title}" a name of up to ${TITLE_MAX} characters.`);
        if (!Number.isInteger(lecture.minutes) || lecture.minutes < 1 || lecture.minutes > MINUTES_MAX) {
          throw new Refusal(400, `"${lectureTitle}" needs a length of 1 to ${MINUTES_MAX} whole minutes.`);
        }
        const videoUrl = readVideoUrl(lecture.videoUrl);
        if (!videoUrl) throw new Refusal(400, `"${lectureTitle}" needs a YouTube address (youtube.com or youtu.be).`);
        return { ...keep(lecture.id), title: lectureTitle, minutes: lecture.minutes, videoUrl, preview: lecture.preview === true };
      });
      return { ...keep(chapter.id), title, lectures };
    });
  }
  if (current && "published" in body) {
    if (typeof body.published !== "boolean") throw new Refusal(400, "Say whether the course is published (true or false).");
    out.published = body.published;
  }
  return out;
};

const thumbnailOf = (course) => (course.thumbFileId ? `/api/learning/courses/${course._id}/thumbnail?v=${course.thumbFileId}` : "");

/** What one person sees of a course: videos only where they may watch, their own progress, and the course's audience. */
const view = (course, user, { enrollment, enrollments = [] } = {}) => {
  const mayChange = canChange(course, user);
  const watches = mayChange || !!enrollment;
  const rated = enrollments.filter((e) => e.rating);
  const average = rated.length ? Math.round((rated.reduce((n, e) => n + e.rating, 0) / rated.length) * 10) / 10 : 0;
  return {
    id: String(course._id),
    title: course.title,
    description: course.description,
    educator: { id: idOf(course.educator), name: nameOf(course.educator) },
    published: course.published,
    publishedAt: course.publishedAt,
    thumbnail: thumbnailOf(course),
    chapters: course.chapters.map((c) => ({
      id: String(c._id),
      title: c.title,
      lectures: c.lectures.map((l) => ({ id: String(l._id), title: l.title, minutes: l.minutes, preview: l.preview, videoUrl: watches || l.preview ? l.videoUrl : "" })),
    })),
    students: enrollments.length,
    rating: { average, count: rated.length },
    mine: { enrolled: !!enrollment, enrolledAt: enrollment?.enrolledAt ?? null, completed: enrollment?.completed ?? [], rating: enrollment?.rating ?? null },
    canChange: mayChange,
  };
};

/** The courses' views for this person, with every course's enrollments loaded in one query. */
const viewAll = async (courses, user) => {
  const enrollments = await LearningEnrollment.find({ course: { $in: courses.map((c) => c._id) } }).lean();
  return courses.map((course) => {
    const its = enrollments.filter((e) => idOf(e.course) === String(course._id));
    return view(course, user, { enrollments: its, enrollment: its.find((e) => idOf(e.user) === String(user.id)) });
  });
};

/** Courses this person may see: live ones, plus those they may change. */
const visibleTo = (user) => (isAdmin(user) ? {} : isManager(user) ? { $or: [{ published: true }, { educator: user.id }] } : { published: true });

const findVisible = async (id, user) => {
  const course = isObjectId(id) ? await LearningCourse.findOne({ _id: id, ...visibleTo(user) }).populate("educator", PEOPLE) : null;
  if (!course) throw new Refusal(404, "That course isn't available.");
  return course;
};

/** A course this person may change; one they can't even see answers 404, one they only see 403. */
const findChangeable = async (id, user) => {
  const course = await findVisible(id, user);
  if (!canChange(course, user)) throw new Refusal(403, "You can only change courses you published.");
  return course;
};

const lectureCount = (course) => course.chapters.reduce((n, c) => n + c.lectures.length, 0);

/** Tells everyone else the course is live: notes now, emails after the reply has gone. */
const tellEveryone = (course, user) =>
  noteCourse({ course, detail: [user.fullName && `By ${user.fullName}`, `${lectureCount(course)} lecture${lectureCount(course) === 1 ? "" : "s"}`].filter(Boolean).join(" · "), actorId: user.id });

const answerCourse = async (res, status, course, user) => res.status(status).json((await viewAll([course], user))[0]);

// GET /api/learning/courses
exports.listCourses = async (req, res) => {
  try {
    const courses = await LearningCourse.find(visibleTo(req.user)).sort({ publishedAt: -1, createdAt: -1 }).populate("educator", PEOPLE);
    return res.status(200).json(await viewAll(courses, req.user));
  } catch (error) {
    return answerError(res, error, "List courses");
  }
};

// GET /api/learning/courses/:id
exports.getCourse = async (req, res) => {
  try {
    return await answerCourse(res, 200, await findVisible(req.params.id, req.user), req.user);
  } catch (error) {
    return answerError(res, error, "Get course");
  }
};

// POST /api/learning/courses { title, description: [paragraphs], chapters: [{ title, lectures: [...] }] }
exports.publishCourse = async (req, res) => {
  try {
    if (!isManager(req.user) || !isObjectId(req.user.id)) throw new Refusal(403, "Only admins and sub admins publish courses.");
    const course = await LearningCourse.create({ ...readCourse(req.body), educator: req.user.id, published: true, publishedAt: new Date() });
    const sendEmails = await tellEveryone(course, req.user);
    await course.populate("educator", PEOPLE);
    await answerCourse(res, 201, course, req.user);
    await sendEmails();
  } catch (error) {
    return answerError(res, error, "Publish course");
  }
};

// PATCH /api/learning/courses/:id { any of title, description, chapters, published }
exports.changeCourse = async (req, res) => {
  try {
    const course = await findChangeable(req.params.id, req.user);
    const wasLive = course.published;
    Object.assign(course, readCourse(req.body, course));
    if (!wasLive && course.published) course.publishedAt = new Date();
    await course.save();
    // progress on lectures that were removed no longer counts
    const lectureIds = course.chapters.flatMap((c) => c.lectures.map((l) => String(l._id)));
    await LearningEnrollment.updateMany({ course: course._id }, { $pull: { completed: { $nin: lectureIds } } });
    let sendEmails = async () => {};
    if (!wasLive && course.published) sendEmails = await tellEveryone(course, req.user);
    if (wasLive && !course.published) await forgetNotesAbout(course._id);
    await answerCourse(res, 200, course, req.user);
    await sendEmails();
  } catch (error) {
    return answerError(res, error, "Change course");
  }
};

// DELETE /api/learning/courses/:id
exports.deleteCourse = async (req, res) => {
  try {
    const course = await findChangeable(req.params.id, req.user);
    await LearningEnrollment.deleteMany({ course: course._id });
    await thumbs.remove(course.thumbFileId);
    await forgetNotesAbout(course._id);
    await course.deleteOne();
    return res.status(200).json({ message: "Course deleted" });
  } catch (error) {
    return answerError(res, error, "Delete course");
  }
};

// POST /api/learning/courses/:id/enroll (free; enrolling again changes nothing)
exports.enroll = async (req, res) => {
  try {
    const course = await findVisible(req.params.id, req.user);
    if (!course.published) throw new Refusal(404, "That course isn't available.");
    if (!isObjectId(req.user.id)) throw new Refusal(403, "Your account can't enroll yet.");
    await LearningEnrollment.updateOne({ course: course._id, user: req.user.id }, { $setOnInsert: { enrolledAt: new Date() } }, { upsert: true }).catch((error) => {
      // two enrollments at the same moment: the other one won, which is the same result
      if (error.code !== 11000) throw error;
    });
    return await answerCourse(res, 200, course, req.user);
  } catch (error) {
    return answerError(res, error, "Enroll");
  }
};

const findEnrollment = async (course, user) => {
  const enrollment = isObjectId(user.id) ? await LearningEnrollment.findOne({ course: course._id, user: user.id }) : null;
  if (!enrollment) throw new Refusal(403, "Enroll in the course first.");
  return enrollment;
};

// PUT /api/learning/courses/:id/lectures/:lectureId { done: true | false }
exports.markLecture = async (req, res) => {
  try {
    if (typeof req.body?.done !== "boolean") throw new Refusal(400, "Say whether the lecture is done (true or false).");
    const course = await findVisible(req.params.id, req.user);
    const enrollment = await findEnrollment(course, req.user);
    const lectureId = String(req.params.lectureId);
    if (!course.chapters.some((c) => c.lectures.some((l) => String(l._id) === lectureId))) throw new Refusal(404, "That lecture isn't in this course.");
    await LearningEnrollment.updateOne({ _id: enrollment._id }, req.body.done ? { $addToSet: { completed: lectureId } } : { $pull: { completed: lectureId } });
    return await answerCourse(res, 200, course, req.user);
  } catch (error) {
    return answerError(res, error, "Mark lecture");
  }
};

// PUT /api/learning/courses/:id/rating { stars: 1–5 }
exports.rateCourse = async (req, res) => {
  try {
    const { stars } = req.body ?? {};
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new Refusal(400, "Give 1 to 5 stars.");
    const course = await findVisible(req.params.id, req.user);
    const enrollment = await findEnrollment(course, req.user);
    await LearningEnrollment.updateOne({ _id: enrollment._id }, { rating: stars });
    return await answerCourse(res, 200, course, req.user);
  } catch (error) {
    return answerError(res, error, "Rate course");
  }
};

// GET /api/learning/students: who enrolled in the courses this person may change, newest first
exports.listStudents = async (req, res) => {
  try {
    if (!isManager(req.user)) throw new Refusal(403, "Only educators see who enrolled.");
    const courses = await LearningCourse.find(isAdmin(req.user) ? {} : { educator: req.user.id }).select("title").lean();
    const enrollments = await LearningEnrollment.find({ course: { $in: courses.map((c) => c._id) } })
      .sort({ enrolledAt: -1 })
      .populate("user", PEOPLE)
      .lean();
    const titles = new Map(courses.map((c) => [String(c._id), c.title]));
    return res.status(200).json(
      enrollments.map((e) => ({
        courseId: idOf(e.course),
        courseTitle: titles.get(idOf(e.course)),
        person: { id: idOf(e.user), name: nameOf(e.user), email: e.user && !e.user.isDeleted ? e.user.email : "" },
        enrolledAt: e.enrolledAt,
      }))
    );
  } catch (error) {
    return answerError(res, error, "List students");
  }
};

// PUT /api/learning/courses/:id/thumbnail (form field "thumbnail": PNG, JPG or WebP)
exports.setThumbnail = async (req, res) => {
  try {
    const course = await findChangeable(req.params.id, req.user);
    if (!req.file?.buffer?.length) throw new Refusal(400, "Choose an image for the cover.");
    const contentType = photoType(req.file.buffer);
    if (!contentType) throw new Refusal(400, "The cover must be a PNG, JPG or WebP image.");
    const old = course.thumbFileId;
    course.thumbFileId = await thumbs.save(req.file.buffer, { name: `course-${course._id}`, contentType, metadata: { courseId: String(course._id) } });
    await course.save();
    await thumbs.remove(old);
    return await answerCourse(res, 200, course, req.user);
  } catch (error) {
    return answerError(res, error, "Set course cover");
  }
};

// DELETE /api/learning/courses/:id/thumbnail (back to the generated cover)
exports.removeThumbnail = async (req, res) => {
  try {
    const course = await findChangeable(req.params.id, req.user);
    const old = course.thumbFileId;
    course.thumbFileId = undefined;
    await course.save();
    await thumbs.remove(old);
    return await answerCourse(res, 200, course, req.user);
  } catch (error) {
    return answerError(res, error, "Remove course cover");
  }
};

// GET /api/learning/courses/:id/thumbnail
exports.getThumbnail = async (req, res) => {
  try {
    const course = await findVisible(req.params.id, req.user);
    const file = course.thumbFileId ? await thumbs.find(new mongoose.Types.ObjectId(String(course.thumbFileId))) : null;
    if (!file) throw new Refusal(404, "No cover");
    res.setHeader("Content-Type", file.metadata?.contentType || "application/octet-stream");
    res.setHeader("Content-Length", String(file.length));
    res.setHeader("X-Content-Type-Options", "nosniff");
    // each cover has its own address (?v=), so a browser may keep it; "private" keeps shared caches out
    res.setHeader("Cache-Control", "private, max-age=86400");
    return thumbs
      .open(file._id)
      .once("error", (error) => {
        console.error("Stream course cover error:", error.message);
        if (!res.headersSent) res.status(404).json({ message: "No cover" });
        else res.end();
      })
      .pipe(res);
  } catch (error) {
    return answerError(res, error, "Get course cover");
  }
};

exports.readVideoUrl = readVideoUrl;
