const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Create task (admin or manager only)
router.post('/', auth, role(['admin', 'manager']), async (req, res) => {
  try {
    const { title, description, assignedTo } = req.body;
    const task = new Task({
      title,
      description,
      assignedBy: req.user.id,
      assignedTo
    });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all tasks (admin only)
router.get('/', auth, role(['admin']), async (req, res) => {
  try {
    const tasks = await Task.find().populate('assignedBy', 'name').populate('assignedTo', 'name');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get tasks assigned to current user
router.get('/my-tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.id }).populate('assignedBy', 'name');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get tasks assigned by current user (admin or manager)
router.get('/assigned-by-me', auth, role(['admin', 'manager']), async (req, res) => {
  try {
    const tasks = await Task.find({ assignedBy: req.user.id }).populate('assignedTo', 'name');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update task status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    // Only allow assigned user or admin to update status
    if (task.assignedTo.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    task.status = status;
    task.updatedAt = Date.now();
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;