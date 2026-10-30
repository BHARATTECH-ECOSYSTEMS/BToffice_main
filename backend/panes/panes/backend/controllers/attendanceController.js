const Attendance = require('../models/Attendance');
const AppError = require('../utils/appError');

exports.checkIn = async (req, res, next) => {
  try {
    // Check if user is already checked in
    const existingCheckIn = await Attendance.findOne({
      user: req.user.id,
      status: 'checked-in'
    });
    
    if (existingCheckIn) {
      return next(new AppError('You are already checked in', 400));
    }
    
    const attendance = await Attendance.create({
      user: req.user.id,
      checkIn: Date.now()
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        attendance
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.checkOut = async (req, res, next) => {
  try {
    // Find the most recent check-in that hasn't been checked out
    const attendance = await Attendance.findOne({
      user: req.user.id,
      status: 'checked-in'
    }).sort({ checkIn: -1 });
    
    if (!attendance) {
      return next(new AppError('No active check-in found', 400));
    }
    
    attendance.checkOut = Date.now();
    attendance.status = 'checked-out';
    await attendance.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        attendance
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.find({ user: req.user.id }).sort({ checkIn: -1 });
    
    res.status(200).json({
      status: 'success',
      results: attendance.length,
      data: {
        attendance
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return next(new AppError('No attendance found with that ID', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        attendance
      }
    });
  } catch (err) {
    next(err);
  }
};