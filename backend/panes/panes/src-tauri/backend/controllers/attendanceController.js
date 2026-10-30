const Attendance = require('../models/Attendance');

const markAttendance = async (req, res) => {
  const { userId, date, status } = req.body;
  try {
    let attendance = await Attendance.findOne({ user: userId, date });
    if (attendance) {
      attendance.status = status;
      await attendance.save();
    } else {
      attendance = new Attendance({ user: userId, date, status });
      await attendance.save();
    }
    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const getAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({ user: req.params.userId }).populate('user', 'name email');
    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = { markAttendance, getAttendance };