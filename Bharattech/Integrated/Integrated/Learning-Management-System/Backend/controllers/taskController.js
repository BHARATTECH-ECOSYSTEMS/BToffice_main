const Task = require("../models/Task");

// CREATE TASK (Sub-admin assigns)
exports.createTask = async (req, res) => {
    try {
        const { title, description, assignedTo, status, fileUrl } = req.body;

        console.log("📝 Task creation request:", {
            title,
            description,
            assignedTo,
            status,
            assignedBy: req.user.id,
            assignedByRole: req.user.role
        });

        // Validation
        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Task title is required" });
        }

        if (!assignedTo) {
            return res.status(400).json({ message: "Assigned user is required" });
        }

        // Validate MongoDB ObjectId format
        const mongoose = require("mongoose");
        if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
            return res.status(400).json({ message: "Invalid user ID format" });
        }

        // Check if assigned user exists
        const User = require("../models/User");
        const assignedUser = await User.findById(assignedTo);
        if (!assignedUser) {
            return res.status(404).json({ message: "Assigned user not found" });
        }

        // Validate status
        const validStatuses = ["pending", "in-progress", "completed"];
        const taskStatus = status && validStatuses.includes(status.toLowerCase()) 
            ? status.toLowerCase() 
            : "pending";

        // Determine creator role (admin or subadmin)
        const userRole = (req.user.role || "").toString().toLowerCase();
        const createdBy = userRole === "admin" ? "admin" : "subadmin";

        // Store email and role for easier filtering
        const taskData = {
            title: title.trim(),
            description: description || "",
            assignedBy: req.user.id,
            assignedTo: assignedTo,
            assignedEmail: assignedUser.email,
            assignedRole: assignedUser.role,
            createdBy: createdBy, // Store creator type
            status: taskStatus,
            priority: req.body.priority || "Normal",
            dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
            projectFile: req.body.projectFile ? {
                url: req.body.projectFile.url || req.body.fileUrl,
                fileName: req.body.projectFile.fileName,
                uploadedAt: new Date()
            } : null,
            fileUrl: fileUrl || null
        };

        console.log("💾 Saving task to MongoDB:", taskData);

        // Create task in MongoDB
        const task = await Task.create(taskData);
        console.log("✅ Task saved to MongoDB with ID:", task._id);
        
        // Populate user details for response
        const populatedTask = await Task.findById(task._id)
            .populate("assignedBy", "fullName email")
            .populate("assignedTo", "fullName email");

        console.log("✅ Task created successfully:", {
            id: populatedTask._id,
            title: populatedTask.title,
            assignedTo: populatedTask.assignedTo?.email
        });

        // Return normalized response for frontend
        res.status(201).json({
            _id: populatedTask._id,
            id: populatedTask._id,
            title: populatedTask.title,
            description: populatedTask.description,
            status: populatedTask.status,
            assignedBy: populatedTask.assignedBy,
            assignedTo: populatedTask.assignedTo,
            assignedEmail: populatedTask.assignedEmail,
            assignedRole: populatedTask.assignedRole,
            createdBy: populatedTask.createdBy || "subadmin",
            dueDate: populatedTask.dueDate,
            priority: populatedTask.priority,
            projectFile: populatedTask.projectFile,
            fileUrl: populatedTask.fileUrl,
            createdAt: populatedTask.createdAt,
            updatedAt: populatedTask.updatedAt
        });
    } catch (error) {
        console.error("❌ Create Task Error:", error);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        
        // Ensure we always return JSON, not HTML
        if (error.name === "ValidationError") {
            return res.status(400).json({ 
                message: "Validation Error", 
                error: error.message,
                details: error.errors 
            });
        }
        if (error.name === "CastError") {
            return res.status(400).json({ 
                message: "Invalid ID format", 
                error: error.message 
            });
        }
        
        res.status(500).json({ 
            message: "Server Error", 
            error: error.message 
        });
    }
};

// GET TASKS FOR USER (Assigned tasks - filter by assignedEmail or assignedRole)
exports.getTasksForUser = async (req, res) => {
    try {
        const { assignedEmail, assignedRole } = req.query;
        const User = require("../models/User");
        
        // Get current user to check their email/role
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Build query - filter by assignedEmail or assignedRole
        const query = { assignedTo: req.user.id };
        
        // Also support filtering by email/role if provided
        if (assignedEmail) {
            query.assignedEmail = assignedEmail;
        }
        if (assignedRole) {
            query.assignedRole = assignedRole;
        }

        const tasks = await Task.find(query)
            .populate("assignedBy", "fullName email role")
            .populate("assignedTo", "fullName email role")
            .sort({ createdAt: -1 });
        
        // Normalize response to include all fields
        const normalizedTasks = tasks.map(task => ({
            _id: task._id,
            id: task._id,
            title: task.title,
            description: task.description,
            status: task.status,
            assignedBy: task.assignedBy,
            assignedTo: task.assignedTo,
            assignedEmail: task.assignedEmail,
            assignedRole: task.assignedRole,
            createdBy: task.createdBy || "subadmin",
            dueDate: task.dueDate,
            priority: task.priority,
            projectFile: task.projectFile,
            fileUrl: task.fileUrl,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));
        
        res.status(200).json(normalizedTasks);
    } catch (error) {
        console.error("❌ Get Tasks For User Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// GET TASKS ASSIGNED BY USER (For Sub-admin/Admin to see tasks they assigned)
// Also returns tasks from both Admin and Subadmin for dashboards
exports.getAssignedTasks = async (req, res) => {
    try {
        console.log("📋 Fetching tasks assigned by user:", req.user.id, "Role:", req.user.role);
        
        const userRole = (req.user.role || "").toString().toLowerCase();
        
        // If user is Admin, show all tasks (from both Admin and Subadmin)
        // If user is Subadmin, show tasks from both Admin and Subadmin (all tasks)
        // This allows both dashboards to see all tasks
        let query = {};
        
        if (userRole === "admin") {
            // Admin can see all tasks (from both admin and subadmin)
            query = {};
        } else {
            // Subadmin can see all tasks too (both admin and subadmin created)
            query = {};
        }
        
        const tasks = await Task.find(query)
            .populate("assignedBy", "fullName email role")
            .populate("assignedTo", "fullName email role")
            .sort({ createdAt: -1 });
        
        console.log("✅ Found", tasks.length, "tasks (from both Admin and Subadmin)");
        
        // Normalize response to include all fields
        const normalizedTasks = tasks.map(task => ({
            _id: task._id,
            id: task._id,
            title: task.title,
            description: task.description,
            status: task.status,
            assignedBy: task.assignedBy,
            assignedTo: task.assignedTo,
            assignedEmail: task.assignedEmail,
            assignedRole: task.assignedRole,
            createdBy: task.createdBy || "subadmin",
            dueDate: task.dueDate,
            priority: task.priority,
            projectFile: task.projectFile,
            fileUrl: task.fileUrl,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
        }));
        
        res.status(200).json(normalizedTasks);
    } catch (error) {
        console.error("❌ Error fetching assigned tasks:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// GET TASK BY ID
exports.getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate("assignedBy", "fullName email")
            .populate("assignedTo", "fullName email");

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json(task);
    } catch (error) {
        console.error("❌ Get Task By ID Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// UPDATE TASK STATUS (for assigned users only)
exports.updateTaskStatus = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Check if user is assigned to this task
        if (task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({ message: "Access denied. You can only update your assigned tasks." });
        }

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            { 
                status: req.body.status, 
                updatedAt: new Date()
            },
            { new: true }
        ).populate("assignedBy", "fullName email")
         .populate("assignedTo", "fullName email");

        res.status(200).json(updatedTask);
    } catch (error) {
        console.error("❌ Update Task Status Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// UPDATE TASK (general update - allows creator to update all fields, assigned user to update status only)
exports.updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const isCreator = task.assignedBy.toString() === req.user.id;
        const isAssigned = task.assignedTo.toString() === req.user.id;
        const isAdmin = req.user.role === "Admin" || req.user.role === "admin";

        // Only creator or admin can update task details (title, description, assignedTo, etc.)
        // Assigned user can only update status
        if (!isCreator && !isAdmin && !isAssigned) {
            return res.status(403).json({ message: "Access denied. You can only update tasks you created or are assigned to." });
        }

        // Build update object
        const updateData = {
            updatedAt: new Date()
        };

        // If user is creator or admin, allow updating all fields
        if (isCreator || isAdmin) {
            if (req.body.title !== undefined) updateData.title = req.body.title.trim();
            if (req.body.description !== undefined) updateData.description = req.body.description;
            if (req.body.status !== undefined) {
                const validStatuses = ["pending", "in-progress", "completed"];
                updateData.status = validStatuses.includes(req.body.status.toLowerCase()) 
                    ? req.body.status.toLowerCase() 
                    : task.status;
            }
            if (req.body.dueDate !== undefined) {
                updateData.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
            }
            if (req.body.priority !== undefined) updateData.priority = req.body.priority;
            if (req.body.fileUrl !== undefined) updateData.fileUrl = req.body.fileUrl;

            // If assignedTo is being updated, validate and update related fields
            if (req.body.assignedTo !== undefined && req.body.assignedTo !== task.assignedTo.toString()) {
                const mongoose = require("mongoose");
                const User = require("../models/User");
                
                if (!mongoose.Types.ObjectId.isValid(req.body.assignedTo)) {
                    return res.status(400).json({ message: "Invalid user ID format" });
                }

                const assignedUser = await User.findById(req.body.assignedTo);
                if (!assignedUser) {
                    return res.status(404).json({ message: "Assigned user not found" });
                }

                updateData.assignedTo = req.body.assignedTo;
                updateData.assignedEmail = assignedUser.email;
                updateData.assignedRole = assignedUser.role;
            }
        } 
        // If user is only assigned (not creator), only allow status update
        else if (isAssigned) {
            if (req.body.status !== undefined) {
                const validStatuses = ["pending", "in-progress", "completed"];
                updateData.status = validStatuses.includes(req.body.status.toLowerCase()) 
                    ? req.body.status.toLowerCase() 
                    : task.status;
            } else {
                return res.status(403).json({ message: "Access denied. You can only update the status of your assigned tasks." });
            }
        }

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate("assignedBy", "fullName email")
         .populate("assignedTo", "fullName email");

        // Return normalized response
        res.status(200).json({
            _id: updatedTask._id,
            id: updatedTask._id,
            title: updatedTask.title,
            description: updatedTask.description,
            status: updatedTask.status,
            assignedBy: updatedTask.assignedBy,
            assignedTo: updatedTask.assignedTo,
            assignedEmail: updatedTask.assignedEmail,
            assignedRole: updatedTask.assignedRole,
            dueDate: updatedTask.dueDate,
            priority: updatedTask.priority,
            projectFile: updatedTask.projectFile,
            fileUrl: updatedTask.fileUrl,
            createdAt: updatedTask.createdAt,
            updatedAt: updatedTask.updatedAt
        });
    } catch (error) {
        console.error("❌ Update Task Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// UPLOAD PROJECT DOCUMENT (Subadmin uploads when creating task)
exports.uploadProjectDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { fileUrl, fileName } = req.body;

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Check if user created this task
        if (task.assignedBy.toString() !== req.user.id) {
            return res.status(403).json({ message: "Access denied. You can only upload documents to tasks you created." });
        }

        task.projectFile = {
            url: fileUrl,
            fileName: fileName || "project-document",
            uploadedAt: new Date()
        };
        task.updatedAt = new Date();

        await task.save();

        const populatedTask = await Task.findById(task._id)
            .populate("assignedBy", "fullName email")
            .populate("assignedTo", "fullName email");

        res.status(200).json(populatedTask);
    } catch (error) {
        console.error("❌ Upload Project Document Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// SUBMIT TASK (Employee/Intern uploads completed work)
exports.submitTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { fileUrl, fileName, notes } = req.body;

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Check if user is assigned to this task
        if (task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({ message: "Access denied. You can only submit your assigned tasks." });
        }

        // Add submission
        task.submissions.push({
            fileUrl,
            fileName: fileName || "submission",
            submittedBy: req.user.id,
            notes: notes || "",
            submittedAt: new Date()
        });

        // Update status to completed if not already
        if (task.status !== "completed") {
            task.status = "completed";
        }

        task.updatedAt = new Date();
        await task.save();

        const populatedTask = await Task.findById(task._id)
            .populate("assignedBy", "fullName email")
            .populate("assignedTo", "fullName email")
            .populate("submissions.submittedBy", "fullName email");

        res.status(200).json(populatedTask);
    } catch (error) {
        console.error("❌ Submit Task Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// GET ALL TASKS (Admin only)
exports.getAllTasks = async (req, res) => {
    try {
        const tasks = await Task.find()
            .populate("assignedBy", "fullName email")
            .populate("assignedTo", "fullName email")
            .sort({ createdAt: -1 });
        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// DELETE TASK (Sub-admin can delete tasks they assigned, Admin can delete any)
exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Check if user is the assigner or is admin
        const isAdmin = req.user.role === "Admin" || req.user.role === "admin";
        const isAssigner = task.assignedBy.toString() === req.user.id;

        if (!isAdmin && !isAssigner) {
            return res.status(403).json({ message: "Access denied. You can only delete tasks you assigned." });
        }

        await Task.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

