const mongoose = require("mongoose");

// A named running number, e.g. the last employee ID handed out. One document per name.
const CounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

/**
 * The next number for `name`. MongoDB applies the $inc atomically, so two requests at the same moment always get
 * different numbers, even across several backend servers.
 */
CounterSchema.statics.next = async function (name) {
  const counter = await this.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return counter.seq;
};

module.exports = mongoose.model("Counter", CounterSchema);
