const mongoose = require('mongoose');

const PunchSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  punchIn: { type: Date },
  punchOut: { type: Date },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Punch', PunchSchema);