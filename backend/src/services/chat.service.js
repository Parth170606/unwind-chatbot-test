
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateProviderReply } from "./provider.service.js";
import { inspectUserMessage, guardGeneratedReply } from "./safety.service.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(currentDir, "../data");

function readIntents(filename) {
  const filePath = path.join(dataDir, filename);

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(parsed.intents) ? parsed.intents : [];
  } catch (error) {
    console.warn(`Could not load ${filename}: ${error.message}`);
    return [];
  }
}

const intents = [
  ...readIntents("intents.json"),
  ...readIntents("KB.json")
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/i['’]m/g, "i am")
    .replace(/can['’]t/g, "cannot")
    .replace(/won['’]t/g, "will not")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPredefinedReply(message) {
  const normalizedMessage = normalize(message);

  for (const intent of intents) {
    if (!Array.isArray(intent.patterns) || !Array.isArray(intent.responses)) {
      continue;
    }

    for (const pattern of intent.patterns) {
      const normalizedPattern = normalize(pattern);
      if (!normalizedPattern) continue;

      // Exact matches are safest, especially for short greetings.
      // Longer saved patterns can also match when they form a full phrase.
      const matches =
        normalizedMessage === normalizedPattern ||
        (normalizedPattern.length >= 5 &&
          normalizedMessage.includes(normalizedPattern));

      if (matches && intent.responses.length > 0) {
        const reply =
          intent.responses[Math.floor(Math.random() * intent.responses.length)];

        return {
          reply,
          source: "predefined",
          intent: intent.tag || "predefined"
        };
      }
    }
  }

  return null;
}

const CREATOR_RESPONSE =
  "Unwind is the brainchild of Harshita Arava, Co-founder and CEO. It was developed by Atharva Padwal, Co-founder and Co-CEO, and Parth Nikam, Co-founder and CTO.";

function isCreatorQuestion(message) {
  const text = normalize(message);

  return (
    /\b(who (created|made|built|developed|founded) (this )?(website|site|unwind))\b/.test(text) ||
    /\b(who is behind (this )?(website|site|unwind))\b/.test(text) ||
    /\b(who (are|is) the (creator|creators|founder|founders) of (unwind|this website))\b/.test(text)
  );
}

export async function handleChatMessage({ message, history = [] }) {
  if (typeof message !== "string" || !message.trim()) {
    const error = new Error("Please enter a message.");
    error.status = 400;
    throw error;
  }

  const normalizedMessage = message.trim();

  if (normalizedMessage.length > 4000) {
    const error = new Error("Please keep your message under 4,000 characters.");
    error.status = 400;
    throw error;
  }

  // Safety checks always run before creator intent or saved responses.
  const safety = inspectUserMessage(normalizedMessage);

  if (safety.blocked) {
    return {
      reply: safety.reply,
      source: "safety",
      intent: safety.kind
    };
  }

  // Exact user-specified creator response; no API call.
  if (isCreatorQuestion(normalizedMessage)) {
    return {
      reply: CREATOR_RESPONSE,
      source: "predefined",
      intent: "about_unwind"
    };
  }

  if (process.env.ENABLE_PREDEFINED_RESPONSES !== "false") {
    const predefined = getPredefinedReply(normalizedMessage);

    if (predefined) {
      return predefined;
    }
  }

  if (process.env.ENABLE_AI_RESPONSES === "false") {
    return {
      reply: "I don't have a saved response for that yet. You can ask me about stress, mindfulness, or emotional well-being.",
      source: "fallback",
      intent: "unknown"
    };
  }

  const safeHistory = Array.isArray(history)
    ? history
        .filter(
          (item) =>
            item &&
            ["user", "assistant"].includes(item.role) &&
            typeof item.content === "string"
        )
        .slice(-12)
        .map((item) => ({
          role: item.role,
          content: item.content.slice(0, 4000)
        }))
    : [];

  // The current user message is appended exactly once.
  safeHistory.push({ role: "user", content: normalizedMessage });

  try {
    const result = await generateProviderReply(safeHistory);

    return {
      reply: guardGeneratedReply(result.reply),
      source: "ai",
      provider: result.provider,
      model: result.model,
      intent: "unknown"
    };
  } catch (error) {
    console.error("All chatbot providers failed.", error.providerErrors || error.message);

    return {
      reply: "I'm having trouble responding right now. Please try again shortly. If you'd like, you can ask me about a saved wellness topic.",
      source: "fallback",
      intent: "provider_unavailable"
    };
  }
}
