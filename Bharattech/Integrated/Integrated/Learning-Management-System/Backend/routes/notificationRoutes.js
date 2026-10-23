const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

// server.js signs everyone in before these routes (app.use("/api/notifications", keycloakAuth, notificationRoutes));
// every route works on the signed-in person's own notes and settings only.

router.get("/", notificationController.listMine);
router.post("/read-all", notificationController.markAllRead);
router.get("/prefs", notificationController.getPrefs);
router.patch("/prefs", notificationController.setPrefs);
router.post("/:id/read", notificationController.markRead);

module.exports = router;
