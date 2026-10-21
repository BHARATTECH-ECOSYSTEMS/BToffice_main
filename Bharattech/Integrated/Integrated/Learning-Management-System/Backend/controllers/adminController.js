const User = require("../models/User");
const SignupRequest = require("../models/SignupRequest");
const bcrypt = require("bcryptjs");
const Course = require("../models/Course");
const {
    authAdminClient,
    ensureKeycloakUser,
    setTemporaryPassword,
} = require("./inviteController");

// ✅ Create user (Admin only - stores in User collection, visible in Admin Dashboard)
exports.createUser = async (req, res) => {
    try {
        const { name, email, role, status } = req.body;

        // Validation
        if (!name || !email || !role) {
            return res.status(400).json({ message: "Name, email, and role are required" });
        }

        // Check if email already exists
        const exists = await User.findOne({ email });
        if (exists && !exists.isDeleted) {
            return res.status(409).json({ message: "Email already exists" });
        }

        // Normalize role
        const roleMap = {
            "employee": "Employee",
            "intern": "Intern",
            "subadmin": "Subadmin",
            "admin": "Admin"
        };
        const normalizedRole = roleMap[role?.toLowerCase()] || role;

        // Validate role
        const validRoles = ["Admin", "Subadmin", "Employee", "Intern"];
        if (!validRoles.includes(normalizedRole)) {
            return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
        }

        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create the account in Keycloak first (it's the system of record for
        // login) so the dashboard never ends up with a Mongo-only user that
        // can't actually sign in or show up in the Keycloak user list.
        await authAdminClient();
        const { keycloakUserId, username: keycloakUsername } = await ensureKeycloakUser({ name, email, role: normalizedRole });
        await setTemporaryPassword({ userId: keycloakUserId, temporaryPassword: tempPassword });

        // Create user (admin-created, visible in Admin Dashboard)
        const newUser = new User({
            fullName: name,
            username: keycloakUsername || email.split("@")[0],
            email,
            password: hashedPassword,
            role: normalizedRole,
            keycloakId: keycloakUserId,
            authProvider: "keycloak",
            isBanned: status === "Inactive" || status === "inactive",
            isDeleted: false
        });

        await newUser.save();

        console.log("✅ Admin-created user:", newUser.email, newUser.role);

        // Remove password from response
        const userResponse = newUser.toObject();
        delete userResponse.password;

        res.status(201).json({
            id: userResponse._id,
            _id: userResponse._id,
            name: userResponse.fullName || userResponse.username,
            fullName: userResponse.fullName,
            email: userResponse.email,
            role: userResponse.role,
            status: userResponse.isBanned ? "Inactive" : "Active",
            createdAt: userResponse.createdAt
        });
    } catch (error) {
        console.error("❌ Create User Error:", error?.response?.data || error);
        const message =
            error?.response?.data?.errorMessage ||
            error?.response?.data?.message ||
            error.message;
        res.status(500).json({ message: "Server Error", error: message });
    }
};

// ✅ Get all users (visible in Admin Dashboard - Admin can manage all users)
exports.getAdminUsers = async (req, res) => {
    try {
        // Get ALL users (Admin, Subadmin, Employee, Intern) - Admin can manage all
        const users = await User.find({ isDeleted: { $ne: true } })
            .select("-password")
            .sort({ createdAt: -1 });

        const normalizedUsers = users.map(user => ({
            id: user._id,
            _id: user._id,
            name: user.fullName || user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            status: user.isBanned ? "Inactive" : "Active",
            createdAt: user.createdAt
        }));

        res.status(200).json(normalizedUsers);
    } catch (error) {
        console.error("❌ Get Admin Users Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

exports.getDashboard = async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments();
    const pendingCourses = await Course.countDocuments({ approved: false });
    const totalUsers = await User.countDocuments();

    res.json({
      success: true,
      data: {
        totalCourses,
        pendingCourses,
        totalUsers,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Dashboard error" });
  }
};

// ✅ Get assignable users (Subadmin, Employee, Intern - for task assignment)
exports.getAssignableUsers = async (req, res) => {
    try {
        const assignableRoles = ["Subadmin", "Employee", "Intern"];
        
        const users = await User.find({
            role: { $in: assignableRoles },
            isDeleted: { $ne: true },
            isBanned: { $ne: true }
        })
        .select("-password")
        .sort({ createdAt: -1 });

        const normalizedUsers = users.map(user => ({
            id: user._id,
            _id: user._id,
            name: user.fullName || user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            status: user.isBanned ? "Inactive" : "Active"
        }));

        res.status(200).json(normalizedUsers);
    } catch (error) {
        console.error("❌ Get Assignable Users Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// ✅ Get signup requests (for admin to review)
exports.getSignupRequests = async (req, res) => {
    try {
        const requests = await SignupRequest.find({ status: "pending" })
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json(requests);
    } catch (error) {
        console.error("❌ Get Signup Requests Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// ✅ Approve signup request (create user account)
exports.approveSignupRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const signupRequest = await SignupRequest.findById(id);

        if (!signupRequest) {
            return res.status(404).json({ message: "Signup request not found" });
        }

        if (signupRequest.status !== "pending") {
            return res.status(400).json({ message: "Signup request already processed" });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email: signupRequest.email });
        if (userExists) {
            return res.status(409).json({ message: "User already exists" });
        }

        // Create user account
        const newUser = new User({
            fullName: signupRequest.name,
            username: signupRequest.email.split("@")[0],
            email: signupRequest.email,
            password: signupRequest.password, // Already hashed
            role: signupRequest.role,
            isBanned: false,
            isDeleted: false
        });

        await newUser.save();

        // Update signup request status
        signupRequest.status = "approved";
        signupRequest.reviewedBy = req.user.id;
        signupRequest.reviewedAt = new Date();
        await signupRequest.save();

        console.log("✅ Signup request approved, user created:", newUser.email);

        res.status(201).json({
            message: "Signup request approved and user account created",
            user: {
                id: newUser._id,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error("❌ Approve Signup Request Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

module.exports = exports;

