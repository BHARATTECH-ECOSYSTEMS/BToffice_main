const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

const {
  createThread,
  saveMessage,
  getMessages,
} = require("../controllers/chatController");

// ✅ CREATE THREAD
router.post("/thread", createThread);

// ✅ SEND MESSAGE
router.post("/", saveMessage);

// ✅ GET MESSAGES
router.get("/:threadId", getMessages);

module.exports = router;