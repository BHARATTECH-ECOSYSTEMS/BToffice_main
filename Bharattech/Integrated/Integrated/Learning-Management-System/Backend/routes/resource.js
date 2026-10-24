const express = require("express");
const mongoose = require("mongoose");
const Resource = require("../models/Resource");
const User = require("../models/User");

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

const TITLE_MAX = 120;
const LINK_MAX = 2048;

const readTitle = (value) => {
  const title = typeof value === "string" ? value.trim() : "";
  return title && title.length <= TITLE_MAX ? title : null;
};

// Only web addresses: links are opened with window.open / <a href>, where a javascript: or data: address would run code.
const readLink = (value) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > LINK_MAX) return null;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

const isObjectId = (value) => typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

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

  const title = readTitle(req.body.title);
  if (!title) {
    return res.status(400).json({ message: `Give the resource a name (up to ${TITLE_MAX} characters).` });
  }
  const link = readLink(req.body.link);
  if (!link) {
    return res
      .status(400)
      .json({ message: `Enter a full web address starting with http:// or https:// (up to ${LINK_MAX} characters).` });
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
    if (!isObjectId(userId) || !isObjectId(resourceId)) {
      return res.status(400).json({ message: "Invalid resource or user id" });
    }
    // only a current account: an unknown or deleted id would leave a name nobody can resolve
    if (!(await User.exists({ _id: userId, isDeleted: { $ne: true } }))) {
      return res.status(404).json({ message: "Person not found" });
    }

    const resource = await Resource.findByIdAndUpdate(
      resourceId,
      { $addToSet: { assignedTo: userId } },
      { returnDocument: "after" }
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
 * REMOVE a person from a resource (Admin only). Works for deleted accounts too, so stale names can be cleared.
 */
router.delete("/:resourceId/assign/:userId", async (req, res) => {
  if (!hasAdminAccess(req.user.role)) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const { resourceId, userId } = req.params;
    if (!isObjectId(resourceId) || !isObjectId(userId)) {
      return res.status(400).json({ message: "Invalid resource or user id" });
    }

    const resource = await Resource.findByIdAndUpdate(
      resourceId,
      { $pull: { assignedTo: userId } },
      { returnDocument: "after" }
    );

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    return res.json({ message: "Removed from resource", resource });
  } catch (err) {
    console.error("UNASSIGN resource error:", err);
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
    if (!isObjectId(id)) {
      return res.status(400).json({ message: "Invalid resource id" });
    }

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
