const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'on-leave'],
    default: 'present'
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;