const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

// server.js signs everyone in before these routes (app.use("/api/events", keycloakAuth, eventRoutes)); who may do
// what with an event is checked in the controller.

// Events between two dates (everyone signed in)
router.get("/", eventController.listEvents);

// Add an event (admins, superadmins and sub admins)
router.post("/", eventController.addEvent);

// Change or cancel an event (admins and superadmins any; a sub admin their own)
router.patch("/:id", eventController.changeEvent);
router.delete("/:id", eventController.cancelEvent);

module.exports = router;
