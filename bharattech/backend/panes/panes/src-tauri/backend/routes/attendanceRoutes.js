const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');

// Check-in
router.post('/check-in', async (req, res) => {
  try {
    const { employeeId, name } = req.body;

    if (!employeeId || !name) {
      return res.status(400).json({ error: 'Employee ID and name are required' });
    }

    const existingCheckIn = await Attendance.findOne({
      employeeId,
      date: new Date().toISOString().split('T')[0]
    });

    if (existingCheckIn) {
      return res.status(400).json({ error: 'Check-in already recorded for today' });
    }

    const attendance = new Attendance({
      employeeId,
      name,
      checkIn: new Date(),
      status: 'present'
    });

    await attendance.save();
    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check-out
router.post('/check-out', async (req, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    const today = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.findOne({
      employeeId,
      date: today
    });

    if (!attendance) {
      return res.status(404).json({ error: 'No check-in record found for today' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ error: 'Check-out already recorded for today' });
    }

    attendance.checkOut = new Date();
    await attendance.save();

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance for a specific date
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const attendance = await Attendance.find({ date: new Date(date) });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all attendance records
router.get('/', async (req, res) => {
  try {
    const attendance = await Attendance.find().sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;