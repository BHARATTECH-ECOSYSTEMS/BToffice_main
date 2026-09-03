const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    link: { type: String, required: true },
    assignedTo:[
      {type:mongoose.Schema.Types.ObjectId,
        ref:"User"
      }
    ],
    createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resource", resourceSchema);
