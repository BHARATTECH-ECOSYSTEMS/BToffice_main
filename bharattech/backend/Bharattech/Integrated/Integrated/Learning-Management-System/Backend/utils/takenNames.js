const User = require("../models/User");

// A removed record keeps its email and username forever (removing someone only flips isDeleted), and both must be
// unique, so a new person can't take either while it sits there.
const movedAside = (field, value, prefix, separator) => ({
  $cond: [{ $eq: [`$${field}`, value] }, { $concat: [prefix, { $toString: "$_id" }, separator, `$${field}`] }, `$${field}`],
});

/**
 * Renames the email and/or username of removed records that hold the given ones ("deleted+<id>+<email>",
 * "deleted_<id>_<username>"), so the record being saved can take them. Only the field that clashes moves: a removed
 * person keeps their own email, so they can still come back by it. The record of `keycloakId` or `keepId` is never
 * moved: it's the one being saved.
 */
const moveRemovedRecordsAside = async ({ email, username, keycloakId, keepId }) => {
  const clashes = [...(email ? [{ email }] : []), ...(username ? [{ username }] : [])];
  if (!clashes.length) return;
  await User.updateMany(
    {
      isDeleted: true,
      ...(keycloakId ? { keycloakId: { $ne: keycloakId } } : {}),
      ...(keepId ? { _id: { $ne: keepId } } : {}),
      $or: clashes,
    },
    [
      {
        $set: {
          ...(email ? { email: movedAside("email", email, "deleted+", "+") } : {}),
          ...(username ? { username: movedAside("username", username, "deleted_", "_") } : {}),
        },
      },
    ],
    { updatePipeline: true }
  );
};

/** The username a new record can take: `wanted`, or `wanted.2`, `wanted.3`… while a current person holds it. */
const freeUsernameFor = async (wanted, keycloakId) => {
  await moveRemovedRecordsAside({ username: wanted, keycloakId });
  let username = wanted;
  let suffix = 1;
  while (await User.exists({ username })) {
    suffix += 1;
    username = `${wanted}.${suffix}`;
  }
  return username;
};

module.exports = { moveRemovedRecordsAside, freeUsernameFor };
