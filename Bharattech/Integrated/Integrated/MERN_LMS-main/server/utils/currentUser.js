import User from "../models/User.js";

/**
 * The signed-in person's LMS record, made on their first visit. Its name follows the name in their sign-in, so a
 * rename in the portal shows here on their next visit; a sign-in without a name keeps the one on file.
 */
export async function ensureUser(req) {
  const id = req.user?.id;
  if (!id) return null;
  const name = req.user?.name;

  // an existing record with the same email (a person whose sign-in account was made again) is used as it is
  const user = (await User.findById(id)) || (req.user?.email ? await User.findOne({ email: req.user.email }) : null);
  if (user) {
    if (name && user.name !== name) {
      user.name = name;
      await user.save();
    }
    return user;
  }

  try {
    return await User.create({
      _id: id,
      name: name || req.user?.username || req.user?.email || "BharatTech User",
      email: req.user?.email || `${id}@bharattech.local`,
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
