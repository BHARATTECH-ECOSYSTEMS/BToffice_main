const mongoose = require("mongoose");

const threadSchema = new mongoose.Schema(
  {
    workspaceId: String,
    repoId: String,
    engineId: String,
    modelId: String,
    title: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Thread", threadSchema);