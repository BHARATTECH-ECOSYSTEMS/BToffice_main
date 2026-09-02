const express = require("express");
const mongoose = require("mongoose");
const Resource = require("../models/Resource");

const router = express.Router();

const hasAdminAccess = (role = "") => {
  const normalizedRole = String(role).trim().toLowerCase().replace(/[-_\s]/g, "");
  return normalizedRole === "admin" || normalizedRole === "superadmin";
};

const getValidObjectIds = (...values) =>
  values
    .flat()
    .filter(Boolean)
    .map((value) => String(value))
    .filter((value) => mongoose.Types.ObjectId.isValid(value));

console.log("✅ RESOURCE ROUTE LOADED");
/**
 * GET resources
 * Admin  -> all resources
 * Others -> resources assigned to them, plus public/unassigned resources
 */
router.get("/", async (req, res) => {
  console.log("🔥 HIT /api/resources");
  console.log("🔥 RESOURCE ROUTE HIT");
  try {
    const { role, id, keycloakId } = req.user;

    let resources;

    if (hasAdminAccess(role)) {
      resources = await Resource.find().sort({ createdAt: -1 });
    } else {
      const assignedCandidates = getValidObjectIds(id, keycloakId);
      resources = await Resource.find({
        $or: [
          { assignedTo: { $in: assignedCandidates } },
          { assignedTo: { $exists: false } },
          { assignedTo: null },
          { assignedTo: { $size: 0 } },
        ],
      }).sort({ createdAt: -1 });
    }

    return res.json(resources);
  } catch (err) {
    console.error("GET /resources error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * ADD resource (Admin only)
 */
router.post("/", async (req, res) => {
  if (!hasAdminAccess(req.user.role)) {
    return res.status(403).json({ message: "Admin access required" });
  }

  const { title, link } = req.body;
  if (!title || !link) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const resource = await Resource.create({
      title,
      link,
      createdBy: req.user.id,
    });

    return res.status(201).json(resource);
  } catch (err) {
    console.error("POST /resources error:", err);
    return res.status(500).json({ message: "Failed to add resource" });
  }
});

/**
 * ASSIGN resource to user (Admin only)
 */
router.post("/:resourceId/assign", async (req, res) => {
  if (!hasAdminAccess(req.user.role)) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const { userId } = req.body;
    const { resourceId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const resource = await Resource.findByIdAndUpdate(
      resourceId,
      { $addToSet: { assignedTo: userId } },
      { new: true }
    );

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    return res.json({
      message: "Resource assigned successfully",
      resource,
    });
  } catch (err) {
    console.error("ASSIGN resource error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE resource (Admin only)
 */
router.delete("/delete/:id", async (req, res) => {
  if (!hasAdminAccess(req.user.role)) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const { id } = req.params;

    const resource = await Resource.findByIdAndDelete(id);

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    return res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE resource error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
