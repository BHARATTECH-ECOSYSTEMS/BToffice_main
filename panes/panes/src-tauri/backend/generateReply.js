const OpenAI = require("openai");
const { Mistral } = require("@mistralai/mistralai");
const Anthropic = require("@anthropic-ai/sdk");
const axios = require("axios");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateReply(engine, message) {
  console.log("🔥 Engine:", engine);

  const systemPrompt = `
You are a coding AI.

NEVER modify:
- .env
- package.json
- config files
- server.js

Always respond ONLY in JSON format:

{
  "files": [
    {
      "path": "relative/file/path.js",
      "content": "full file content"
    }
  ]
}

No explanation. Only JSON.
`;

  try {
    if (engine === "openai") {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
      });
      return res.choices[0].message.content;
    }

    if (engine === "mistral") {
      const res = await mistral.chat.complete({
        model: "mistral-small-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
      });
      return res.choices[0].message.content;
    }

    if (engine === "claude") {
      const res = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: systemPrompt + "\n\n" + message
          }
        ],
      });
      return res.content[0].text;
    }

  } catch (err) {
    console.warn(`❌ ${engine} failed`);
  }

  return "⚠️ All AI engines failed.";
}

module.exports = { generateReply };