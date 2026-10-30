import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    // Keycloak tokens carry no picture, so a first-time educator has none.
    imageUrl: { type: String, default: "" },
    enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    // set on an old record while its history moves to the person's new sign-in account (utils/currentUser.js)
    movedTo: { type: String, index: true, sparse: true },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });

const User = mongoose.model("User", userSchema);
export default User;
