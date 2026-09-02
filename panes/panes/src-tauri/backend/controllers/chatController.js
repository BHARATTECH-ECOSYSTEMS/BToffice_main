const Chat = require("../models/Chat");
const { generateReply } = require("../services/aiService"); // ✅ ADD THIS

// ✅ CREATE THREAD
exports.createThread = async (req, res) => {
  try {
    const threadId = "thread_" + Date.now();
    res.json({ id: threadId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ✅ SAVE MESSAGE + AI REPLY
exports.saveMessage = async (req, res) => {
  try {
    const { message, threadId, engine = "openai" } = req.body;

    console.log("Received:", message);
    console.log("Engine:", engine);

    // ✅ Save user message
    await Chat.create({
      threadId,
      role: "user",
      content: message,
    });

    // 🔥 CALL AI SERVICE
    const reply = await generateReply(engine, message);

    // ✅ Save assistant message
    await Chat.create({
      threadId,
      role: "assistant",
      content: reply,
    });

    // ✅ Return response
    res.json({
      success: true,
      reply,
    });

  } catch (err) {
    console.error("❌ AI Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};


// ✅ GET MESSAGES
exports.getMessages = async (req, res) => {
  try {
    const { threadId } = req.params;

    const messages = await Chat.find({ threadId })
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};