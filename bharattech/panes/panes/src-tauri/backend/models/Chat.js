const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  threadId: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Chat", chatSchema);