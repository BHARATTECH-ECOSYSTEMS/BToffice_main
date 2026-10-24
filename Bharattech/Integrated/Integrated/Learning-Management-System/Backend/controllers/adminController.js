const User = require("../models/User");
const Course = require("../models/Course");
const { inviteSomeone } = require("./inviteController");

// ✅ "Add user" on the company's admin dashboard (Super Admins and Admins). It sends the same invite as the portal's
// "Add people": before step 17 Part 2 it made a Keycloak account with a temporary password nobody was ever told, so
// the person could never sign in. Like every invite, the person shows up in the user lists once they first sign in.
exports.createUser = async (req, res) => {
    try {
        const { name, email, role } = req.body;

        // Validation
        if (!name || !email || !role) {
            return res.status(400).json({ message: "Name, email, and role are required" });
        }

        // someone who already has an account: an invite would reset their password to a temporary one
        const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
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

        // the invite's own rules decide who may add whom (an Admin invites Employees and Interns; a Super Admin any)
        const { status, body } = await inviteSomeone({ name, email, role: normalizedRole, actorRole: req.user?.role });
        if (status >= 400) return res.status(status).json(body);

        res.status(201).json({
            id: body.user.id,
            _id: body.user.id,
            name: body.user.name,
            fullName: body.user.name,
            email: body.user.email,
            role: body.user.role,
            status: "Invited",
            inviteEmailSent: body.inviteEmailSent,
        });
    } catch (error) {
        console.error("❌ Create User Error:", error?.response?.data || error);
        res.status(500).json({ message: "Server Error" });
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
        res.status(500).json({ message: "Server Error" });
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
        res.status(500).json({ message: "Server Error" });
    }
};

// ✅ Get signup requests (for admin to review)
module.exports = exports;

