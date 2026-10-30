const OpenAI = require("openai");
const { Mistral } = require("@mistralai/mistralai");
const Anthropic = require("@anthropic-ai/sdk");
const axios = require("axios");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateReply(engine, message) {
  console.log("🔥 Engine:", engine);

  // 🔁 TRY SELECTED ENGINE FIRST
  try {
    if (engine === "openai") {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }],
      });
      return res.choices[0].message.content;
    }

    if (engine === "mistral") {
      const res = await mistral.chat.complete({
        model: "mistral-small-latest",   // ✅ FIXED
        messages: [{ role: "user", content: message }],
      });
      return res.choices[0].message.content;
    }

    if (engine === "claude") {
      const res = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        messages: [{ role: "user", content: message }],
      });
      return res.content[0].text;
    }

    if (engine === "ollama") {
      const res = await axios.post(`${process.env.OLLAMA_URL}/api/generate`, {
        model: "llama3",
        prompt: message,
        stream: false,
      });
      return res.data.response;
    }

  } catch (err) {
    console.warn(`❌ ${engine} failed → trying fallback...`);
  }

  // =========================
  // 🔁 FALLBACK 1 → MISTRAL
  // =========================
  try {
    console.log("⚡ Falling back to Mistral...");
    const res = await mistral.chat.complete({
      model: "mistral-small",
      messages: [{ role: "user", content: message }],
    });
    return res.choices[0].message.content;
  } catch (err) {
    console.warn("❌ Mistral failed");
  }

  // =========================
  // 🔁 FALLBACK 2 → OLLAMA
  // =========================
  try {
    console.log("💻 Falling back to Ollama...");
    const res = await axios.post(`${process.env.OLLAMA_URL}/api/generate`, {
      model: "llama3",
      prompt: message,
      stream: false,
    });
    return res.data.response;
  } catch (err) {
    console.warn("❌ Ollama failed");
  }

  // =========================
  // ❌ FINAL FAILSAFE
  // =========================
  return "⚠️ All AI engines failed. Please check API keys or internet.";
}

module.exports = { generateReply };