import Course from "../models/Course.js";
import CourseProgress from "../models/CourseProgress.js";
import Purchase from "../models/Purchase.js";
import User from "../models/User.js";

/**
 * Points everything that belonged to an old record at the person's new sign-in account, then removes the old record.
 * Each step can be run again, so a move cut short is simply finished on the next visit.
 */
async function finishMove(oldId, newId) {
  // (the new record got the old one's course list when it was made, in moveToNewAccount)
  await Purchase.updateMany({ userId: oldId }, { $set: { userId: newId } });
  await CourseProgress.updateMany({ userId: oldId }, { $set: { userId: newId } });
  await Course.updateMany({ educator: oldId }, { $set: { educator: newId } });
  await Course.updateMany({ enrolledStudents: oldId }, { $set: { "enrolledStudents.$": newId } });
  await Course.updateMany(
    { "courseRatings.userId": oldId },
    { $set: { "courseRatings.$[mine].userId": newId } },
    { arrayFilters: [{ "mine.userId": oldId }] }
  );
  await User.deleteOne({ _id: oldId });
}

/**
 * Someone whose sign-in account was made again (deleted, then invited again) comes back with a new id and the same
 * email (owner's 5A, 2026-10-26): their old record's courses, progress, ratings and the courses they teach become the
 * new account's. The old record gives up its email first, since emails are unique.
 */
async function moveToNewAccount(old, id, name, email) {
  await User.updateOne({ _id: old._id }, { $set: { email: `moved-${old._id}@bharattech.local`, movedTo: id } });
  await User.create({ _id: id, name: name || old.name, email: email || old.email, imageUrl: old.imageUrl || "", enrolledCourses: old.enrolledCourses });
  await finishMove(old._id, id);
  return User.findById(id);
}

/**
 * The signed-in person's LMS record, made on their first visit. Its name follows the name in their sign-in, so a
 * rename in the portal shows here on their next visit; a sign-in without a name keeps the one on file.
 */
export async function ensureUser(req) {
  const id = req.user?.id;
  if (!id) return null;
  const name = req.user?.name;
  const email = req.user?.email;

  let user = await User.findById(id);
  if (user) {
    const unfinished = await User.findOne({ movedTo: id }).select("_id").lean();
    if (unfinished) {
      await finishMove(unfinished._id, id);
      user = await User.findById(id);
    }
    if (name && user.name !== name) {
      user.name = name;
      await user.save();
    }
    return user;
  }

  // an old record already giving up its email to this account (a move cut short), else one with the same email
  const old = (await User.findOne({ movedTo: id })) || (email ? await User.findOne({ email }) : null);
  if (old) return moveToNewAccount(old, id, name, email);

  try {
    return await User.create({
      _id: id,
      name: name || req.user?.username || email || "BharatTech User",
      email: email || `${id}@bharattech.local`,
      imageUrl: "",
      enrolledCourses: [],
    });
  } catch (error) {
    // two first requests at once: the other one made it
    if (error?.code === 11000) {
      const made = await User.findById(id);
      if (made) return made;
    }
    throw error;
  }
}
