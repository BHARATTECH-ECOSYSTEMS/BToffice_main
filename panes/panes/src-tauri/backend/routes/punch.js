const express = require('express');
const router = express.Router();
const Punch = require('../models/Punch');
const auth = require('../middleware/auth');

// Punch In
router.post('/in', auth, async (req, res) => {
  try {
    const punch = new Punch({ userId: req.user.id, punchIn: new Date() });
    await punch.save();
    res.status(201).json(punch);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Punch Out
router.post('/out', auth, async (req, res) => {
  try {
    const punch = await Punch.findOne({ userId: req.user.id, punchOut: null }).sort({ date: -1 });
    if (!punch) throw new Error('No active punch-in found');
    punch.punchOut = new Date();
    await punch.save();
    res.json(punch);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get Punch History
router.get('/history', auth, async (req, res) => {
  try {
    const punches = await Punch.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(punches);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;