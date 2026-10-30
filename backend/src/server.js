import { authenticate } from "./middleware/authenticate.js";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleChatMessage } from "./services/chat.service.js";
import { testDatabaseConnection } from "./config/db.js";
import { persistChatTurn } from "./services/chatPersistence.service.js";
import {
  getUserConversations,
  getConversationHistory,
  getRecentConversationContext
} from "./services/chatHistory.service.js";

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173"
  })
);

app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "unwind-chatbot-test" });
});

app.post("/api/chat", authenticate, async (req, res) => {
  try {
    const message = req.body?.message;
    const conversationId = req.body?.conversationId || null;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please enter a message."
      });
    }

    if (conversationId) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(conversationId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid conversation ID."
        });
      }
    }

    // Retrieve trusted history from PostgreSQL.
    // A new conversation starts with an empty history.
    const history = conversationId
      ? await getRecentConversationContext(
          req.user.user_id,
          conversationId
        )
      : [];

    const startedAt = Date.now();

    const result = await handleChatMessage({
      message,
      history
    });

    const responseTimeMs = Date.now() - startedAt;

    const persisted = await persistChatTurn({
      userId: req.user.user_id,
      conversationId,
      userMessage: message.trim(),
      assistantMessage: result.reply,
      result,
      responseTimeMs
    });

    res.json({
      ...result,
      conversationId: persisted.conversationId
    });

  } catch (error) {
    console.error("Chat request failed:", error);

    res.status(error.status || 500).json({
      success: false,
      error: error.status
        ? error.message
        : "The chatbot could not process that request."
    });
  }
});

app.get("/api/conversations", authenticate, async (req, res) => {
  try {
    const conversations = await getUserConversations(
      req.user.user_id
    );

    res.json({
      success: true,
      conversations
    });

  } catch (error) {
    console.error("Fetch conversations error:", error);

    res.status(500).json({
      success: false,
      error: "Unable to fetch conversations."
    });
  }
});

app.get(
  "/api/conversations/:conversationId/messages",
  authenticate,
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(conversationId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid conversation ID."
        });
      }

      const history = await getConversationHistory(
        req.user.user_id,
        conversationId
      );

      res.json({
        success: true,
        ...history
      });

    } catch (error) {
      console.error("Fetch conversation history error:", error);

      res.status(error.status || 500).json({
        success: false,
        error: error.status
          ? error.message
          : "Unable to fetch conversation history."
      });
    }
  }
);

app.listen(port, () => {
  console.log(`UNWIND chatbot backend listening on http://localhost:${port}`);

  testDatabaseConnection().catch(() => {
    console.error("Database unavailable. Chatbot server is still running.");
  });
});