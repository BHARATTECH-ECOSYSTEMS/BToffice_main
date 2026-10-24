const express = require("express");
const router = express.Router();
const attendance = require("../controllers/attendanceController");

// server.js signs everyone in before these routes (app.use("/api/attendance", keycloakAuth, attendanceRoutes)); who may
// do what is checked in the controller.

// Your own visits: today, or the days between from and to
router.get("/me", attendance.myAttendance);

// Join and leave the e-Office (everyone, for themselves)
router.post("/check-in", attendance.checkIn);
router.post("/check-out", attendance.checkOut);

// Everyone's day, and one person's history (admins, superadmins and sub admins)
router.get("/day", attendance.dayOverview);
router.get("/people/:userId", attendance.personHistory);

// Correct a finished visit's times, with a reason (admins and superadmins)
router.patch("/visits/:id", attendance.correctVisit);

module.exports = router;
