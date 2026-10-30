const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Attendance must belong to a user']
  },
  checkIn: {
    type: Date,
    required: [true, 'Check-in time is required']
  },
  checkOut: {
    type: Date
  },
  status: {
    type: String,
    enum: ['checked-in', 'checked-out'],
    default: 'checked-in'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
attendanceSchema.index({ user: 1, checkIn: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);