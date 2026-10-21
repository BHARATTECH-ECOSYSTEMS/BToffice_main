const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedEmail: { type: String }, // Store email for easier filtering
    assignedRole: { type: String }, // Store role for easier filtering
    createdBy: { type: String, enum: ["admin", "subadmin"], default: "subadmin" }, // Track who created the task
    status: { 
        type: String, 
        enum: ["pending", "in-progress", "completed"], 
        default: "pending" 
    },
    priority: { 
        type: String, 
        enum: ["Low", "Medium", "High", "Normal"],
        default: "Normal"
    },
    dueDate: { type: Date },
    // Project document (uploaded by subadmin when creating task)
    projectFile: {
        url: { type: String },
        fileName: { type: String },
        uploadedAt: { type: Date }
    },
    // Submissions (uploaded by employee/intern)
    submissions: [{
        fileUrl: { type: String, required: true },
        fileName: { type: String },
        submittedAt: { type: Date, default: Date.now },
        submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        notes: { type: String }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes for faster queries
TaskSchema.index({ assignedBy: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ assignedEmail: 1 });
TaskSchema.index({ assignedRole: 1 });
TaskSchema.index({ status: 1 });

module.exports = mongoose.model("Task", TaskSchema);

