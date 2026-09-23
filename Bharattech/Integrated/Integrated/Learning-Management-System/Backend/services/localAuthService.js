const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const cloudinary = require("../config/cloudinary");

const handleRegisterUser = async (body, file) => {
  const {
    fullName,
    username,
    email,
    password,
    role,
    phoneNumber,
    gender,
    dateOfBirth,
    qualification,
    degree,
    qualificationStatus,
    profession,
    organization,
    interests,
    professionalTitle,
    totalExperience,
    socialLinks,
    careerDescription,
    accessLevel,
    address,
  } = body;

  if (!username || !email || !password || !role) {
    throw new Error("All required fields must be provided.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  let profilePicture = body.profilePicture || "";

  if (file) {
    const uploadedImage = await cloudinary.uploader.upload(file.path, {
      folder: "user_profiles",
      transformation: [{ width: 500, height: 500, crop: "limit" }],
    });
    profilePicture = uploadedImage.secure_url;
  }

  const userData = {
    fullName,
    username,
    email,
    password: hashedPassword,
    role,
    profilePicture: profilePicture || "",
    phoneNumber,
    gender: gender || "Other",
    dateOfBirth,
    address,
    isDeleted: false,
    deletedAt: null,
  };

  if (role === "learner") {
    Object.assign(userData, {
      qualification,
      degree,
      qualificationStatus: qualificationStatus || "Pursuing",
      profession,
      organization: organization ? { name: organization, address: "" } : null,
      interests,
    });
  } else if (role === "trainer") {
    Object.assign(userData, {
      professionalTitle,
      totalExperience,
      socialLinks,
      careerDescription,
    });
  } else if (role === "examiner") {
    Object.assign(userData, { canEnrollCourses: false });
  }

  if (userData.role === "admin") {
    userData.accessLevel = accessLevel || "Full Admin";
  }

  const user = new User(userData);
  await user.save();
  return user;
};

const handleLoginUser = async (email, password) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const user = await User.findOne({
    $or: [
      { email: { $regex: new RegExp(`^${escaped}$`, "i") } },
      { username: { $regex: new RegExp(`^${escaped}$`, "i") } },
    ],
  });

  if (!user) {
    const err = new Error(
      "Invalid credentials. If you're a new user, please contact your admin or sign up first."
    );
    err.status = 400;
    throw err;
  }

  if (user.isDeleted) {
    const err = new Error("Your account has been deactivated. Contact support.");
    err.status = 403;
    throw err;
  }

  if (user.isBanned) {
    const err = new Error("Your account has been banned. Contact support.");
    err.status = 403;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error("Invalid email or password");
    err.status = 400;
    throw err;
  }

  const token = generateToken(user._id, user.role);
  return {
    _id: user._id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    role: user.role,
    profilePicture: user.profilePicture,
    token,
  };
};

module.exports = {
  handleRegisterUser,
  handleLoginUser,
};
