const ResetLink = require("../models/ResetLink");

// ✅ Generate reset link
exports.generateResetLink = async (req, res) => {
    try {
        const { userEmail, userRole } = req.body;

        if (!userEmail || !userRole) {
            return res.status(400).json({ message: "User email and role are required" });
        }

        // Normalize role to match enum values: Admin, Subadmin, Employee, Intern
        const roleMap = {
            "employee": "Employee",
            "intern": "Intern",
            "subadmin": "Subadmin",
            "admin": "Admin"
        };
        const normalizedRole = roleMap[userRole?.toLowerCase()] || userRole;
        
        console.log("🔍 Generating reset link:", { userEmail, originalRole: userRole, normalizedRole });

        // Generate unique token
        const resetToken = Math.random().toString(36).slice(2, 15) + Date.now().toString(36);
        
        // Create reset link URL
        const link = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}&email=${encodeURIComponent(userEmail)}`;

        // Set expiration (24 hours)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Create reset link document
        const resetLink = new ResetLink({
            userEmail,
            userRole: normalizedRole, // Use normalized role
            resetToken,
            link,
            expiresAt,
            status: "Pending",
            generatedBy: req.user.id
        });

        await resetLink.save();

        console.log("✅ Reset link generated:", userEmail, normalizedRole, "Status: Pending");

        res.status(201).json({
            id: resetLink._id,
            userEmail: resetLink.userEmail,
            userRole: resetLink.userRole,
            link: resetLink.link,
            expiresAt: resetLink.expiresAt,
            status: resetLink.status
        });
        
        console.log("📢 Reset link saved to database - should be visible on dashboards");
    } catch (error) {
        console.error("❌ Generate Reset Link Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// ✅ Get reset links by role
exports.getResetLinksByRole = async (req, res) => {
    try {
        const { role } = req.query;

        const query = {};
        if (role) {
            // Normalize role to match enum values (Admin, Subadmin, Employee, Intern)
            const roleMap = {
                "employee": "Employee",
                "intern": "Intern",
                "subadmin": "Subadmin",
                "admin": "Admin"
            };
            const normalizedRole = roleMap[role?.toLowerCase()] || role;
            
            // Use exact match with normalized role (since we normalize when storing)
            // Also include case-insensitive regex as fallback for any legacy data
            query.$or = [
                { userRole: normalizedRole }, // Exact match (most efficient)
                { userRole: { $regex: new RegExp(`^${role}$`, "i") } } // Case-insensitive fallback
            ];
        }

        console.log("🔍 Fetching reset links with query:", JSON.stringify(query));
        console.log("🔍 Requested role:", role);

        const resetLinks = await ResetLink.find(query)
            .populate("generatedBy", "fullName email")
            .sort({ createdAt: -1 });

        console.log(`📋 Found ${resetLinks.length} reset links before filtering`);
        resetLinks.forEach((link, idx) => {
            console.log(`  Link ${idx + 1}: email=${link.userEmail}, role=${link.userRole}, status=${link.status}, expired=${new Date(link.expiresAt) < new Date()}, used=${link.used}`);
        });

        // Check expiration and filter to show "Pending" and "Sent" links (not "Used")
        const now = new Date();
        const linksWithStatus = resetLinks
            .filter(link => {
                const isExpired = new Date(link.expiresAt) < now;
                // Show links that are "Pending" or "Sent" and not expired/used
                const shouldShow = (link.status === "Pending" || link.status === "Sent") && !isExpired && !link.used;
                if (!shouldShow) {
                    console.log(`⏭️ Filtering out link for ${link.userEmail}: status=${link.status}, expired=${isExpired}, used=${link.used}`);
                }
                return shouldShow;
            })
            .map(link => {
                const isExpired = new Date(link.expiresAt) < now;
                return {
                    id: link._id,
                    userEmail: link.userEmail,
                    userRole: link.userRole,
                    link: link.link,
                    expiresAt: link.expiresAt,
                    status: isExpired ? "Expired" : link.status,
                    used: link.used,
                    createdAt: link.createdAt
                };
            });

        console.log(`✅ Returning ${linksWithStatus.length} reset links for role: ${role}`);
        res.status(200).json(linksWithStatus);
    } catch (error) {
        console.error("❌ Get Reset Links Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// ✅ Mark reset link as sent (when admin clicks "Send to Email")
exports.markResetLinkAsSent = async (req, res) => {
    try {
        console.log("🔍 markResetLinkAsSent called");
        console.log("🔍 Request params:", req.params);
        console.log("🔍 Request path:", req.path);
        console.log("🔍 Request method:", req.method);
        
        const { id } = req.params;

        if (!id) {
            console.error("❌ No ID in params");
            return res.status(400).json({ message: "Link ID is required" });
        }
        
        console.log("🔍 Looking for reset link with ID:", id);

        const resetLink = await ResetLink.findById(id);

        if (!resetLink) {
            return res.status(404).json({ message: "Reset link not found" });
        }

        if (resetLink.status === "Used") {
            return res.status(400).json({ message: "Reset link already used" });
        }

        const now = new Date();
        if (new Date(resetLink.expiresAt) < now) {
            return res.status(400).json({ message: "Reset link expired" });
        }

        resetLink.status = "Sent";
        await resetLink.save();

        console.log("✅ Reset link marked as sent:", resetLink.userEmail);

        res.status(200).json({
            message: "Reset link marked as sent",
            resetLink: {
                id: resetLink._id,
                userEmail: resetLink.userEmail,
                userRole: resetLink.userRole,
                link: resetLink.link,
                expiresAt: resetLink.expiresAt,
                status: resetLink.status
            }
        });
    } catch (error) {
        console.error("❌ Mark Reset Link As Sent Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// ✅ Mark reset link as used
exports.markResetLinkUsed = async (req, res) => {
    try {
        const { token } = req.body;

        const resetLink = await ResetLink.findOne({ resetToken: token });

        if (!resetLink) {
            return res.status(404).json({ message: "Reset link not found" });
        }

        if (resetLink.used) {
            return res.status(400).json({ message: "Reset link already used" });
        }

        const now = new Date();
        if (new Date(resetLink.expiresAt) < now) {
            return res.status(400).json({ message: "Reset link expired" });
        }

        resetLink.used = true;
        resetLink.usedAt = now;
        resetLink.status = "Used";
        await resetLink.save();

        res.status(200).json({ message: "Reset link marked as used" });
    } catch (error) {
        console.error("❌ Mark Reset Link Used Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

module.exports = exports;

