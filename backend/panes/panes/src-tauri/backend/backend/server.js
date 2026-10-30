require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const moment = require('moment');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date },
  status: { type: String, enum: ['present', 'absent'], default: 'present' }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

// Routes
app.post('/api/attendance/checkin', async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    // Check if already checked in
    const existingCheckIn = await Attendance.findOne({
      employeeId,
      checkOut: null
    });
    
    if (existingCheckIn) {
      return res.status(400).json({ message: 'Already checked in' });
    }
    
    const attendance = new Attendance({
      employeeId,
      checkIn: new Date(),
      status: 'present'
    });
    
    await attendance.save();
    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/attendance/checkout', async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    // Check if already checked out
    const existingCheckOut = await Attendance.findOne({
      employeeId,
      checkOut: { $ne: null }
    });
    
    if (existingCheckOut) {
      return res.status(400).json({ message: 'Already checked out' });
    }
    
    const attendance = await Attendance.findOneAndUpdate(
      { employeeId, checkOut: null },
      { checkOut: new Date() },
      { new: true }
    );
    
    if (!attendance) {
      return res.status(404).json({ message: 'No active check-in found' });
    }
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/attendance/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date } = req.query;
    
    let startDate, endDate;
    
    if (date) {
      startDate = moment(date).startOf('day').toDate();
      endDate = moment(date).endOf('day').toDate();
    } else {
      startDate = moment().startOf('day').toDate();
      endDate = moment().endOf('day').toDate();
    }
    
    const attendance = await Attendance.find({
      employeeId,
      checkIn: { $gte: startDate, $lte: endDate }
    }).sort({ checkIn: 1 });
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/attendance', async (req, res) => {
  try {
    const { date } = req.query;
    
    let startDate, endDate;
    
    if (date) {
      startDate = moment(date).startOf('day').toDate();
      endDate = moment(date).endOf('day').toDate();
    } else {
      startDate = moment().startOf('day').toDate();
      endDate = moment().endOf('day').toDate();
    }
    
    const attendance = await Attendance.find({
      checkIn: { $gte: startDate, $lte: endDate }
    }).populate('employeeId', 'name');
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});