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
  getRecentConversationContext,
  renameConversation,
  setConversationPinned,
  getArchivedConversations,
  setConversationArchived,
  deleteConversation
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


/**
 * Permanently delete a conversation.
 */
app.delete(
  "/api/conversations/:conversationId",
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

      const conversation = await deleteConversation(
        req.user.user_id,
        conversationId
      );

      res.json({
        success: true,
        message: "Conversation permanently deleted.",
        conversation
      });

    } catch (error) {
      console.error("Delete conversation error:", error);

      res.status(error.status || 500).json({
        success: false,
        error: error.status
          ? error.message
          : "Unable to delete conversation."
      });
    }
  }
);

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


/**
 * Fetch archived conversations.
 */
app.get(
  "/api/conversations/archived",
  authenticate,
  async (req, res) => {
    try {
      const conversations = await getArchivedConversations(
        req.user.user_id
      );

      res.json({
        success: true,
        conversations
      });

    } catch (error) {
      console.error("Fetch archived conversations error:", error);

      res.status(500).json({
        success: false,
        error: "Unable to fetch archived conversations."
      });
    }
  }
);

app.patch(
  "/api/conversations/:conversationId/rename",
  authenticate,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { title } = req.body || {};

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(conversationId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid conversation ID."
        });
      }

      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          success: false,
          error: "Please provide a conversation title."
        });
      }

      if (title.trim().length > 100) {
        return res.status(400).json({
          success: false,
          error: "Conversation title cannot exceed 100 characters."
        });
      }

      const conversation = await renameConversation(
        req.user.user_id,
        conversationId,
        title
      );

      res.json({
        success: true,
        message: "Conversation renamed successfully.",
        conversation
      });

    } catch (error) {
      console.error("Rename conversation error:", error);

      res.status(error.status || 500).json({
        success: false,
        error: error.status
          ? error.message
          : "Unable to rename conversation."
      });
    }
  }
);


/**
 * Pin a conversation.
 */
app.patch(
  "/api/conversations/:conversationId/pin",
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

      const conversation = await setConversationPinned(
        req.user.user_id,
        conversationId,
        true
      );

      res.json({
        success: true,
        message: "Conversation pinned successfully.",
        conversation
      });

    } catch (error) {
      console.error("Pin conversation error:", error);

      res.status(error.status || 500).json({
        success: false,
        error: error.status
          ? error.message
          : "Unable to pin conversation."
      });
    }
  }
);

/**
 * Unpin a conversation.
 */
app.patch(
  "/api/conversations/:conversationId/unpin",
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

      const conversation = await setConversationPinned(
        req.user.user_id,
        conversationId,
        false
      );

      res.json({
        success: true,
        message: "Conversation unpinned successfully.",
        conversation
      });

    } catch (error) {
      console.error("Unpin conversation error:", error);

      res.status(error.status || 500).json({
        success: false,
        error: error.status
          ? error.message
          : "Unable to unpin conversation."
      });
    }
  }
);


/**
 * Archive a conversation.
 */
app.patch(
  "/api/conversations/:conversationId/archive",
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

      const conversation = await setConversationArchived(
        req.user.user_id,
        conversationId,
        true
      );

      res.json({
        success: true,
        message: "Conversation archived successfully.",
        conversation
      });

    } catch (error) {
      console.error("Archive conversation error:", error);

      res.status(error.status || 500).json({
        success: false,
        error: error.status
          ? error.message
          : "Unable to archive conversation."
      });
    }
  }
);

/**
 * Restore an archived conversation.
 */
app.patch(
  "/api/conversations/:conversationId/unarchive",
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

      const conversation = await setConversationArchived(
        req.user.user_id,
        conversationId,
        false
      );

      res.json({
        success: true,
        message: "Conversation restored successfully.",
        conversation
      });

    } catch (error) {
      console.error("Restore conversation error:", error);

      res.status(error.status || 500).json({
        success: false,
        error: error.status
          ? error.message
          : "Unable to restore conversation."
      });
    }
  }
);

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