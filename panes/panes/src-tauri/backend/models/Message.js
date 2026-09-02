const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    threadId: { type: String, required: true }, // ✅ FIXED (NOT ObjectId)
    role: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);