import pool from "../config/db.js";

/**
 * Fetch all conversations belonging to a user.
 */
export async function getUserConversations(userId) {
  const result = await pool.query(
    `
      SELECT
        conversation_id,
        title,
        is_title_generated,
        conversation_status,
        total_messages,
        first_message_at,
        last_message_at,
        is_pinned,
        created_at,
        updated_at
      FROM chatbot_conversations
      WHERE user_id = $1
      ORDER BY
  is_pinned DESC,
  last_message_at DESC NULLS LAST,
  created_at DESC
    `,
    [userId]
  );

  return result.rows;
}

/**
 * Fetch messages belonging to one conversation.
 * The ownership check prevents users from accessing
 * conversations belonging to other users.
 */
export async function getConversationHistory(userId, conversationId) {
  const conversationResult = await pool.query(
    `
      SELECT
        conversation_id,
        title,
        is_title_generated,
        conversation_status,
        total_messages,
        is_pinned,
        first_message_at,
        last_message_at,
        created_at,
        updated_at
      FROM chatbot_conversations
      WHERE conversation_id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [conversationId, userId]
  );

  if (conversationResult.rows.length === 0) {
    const error = new Error("Conversation not found.");
    error.status = 404;
    throw error;
  }

  const messagesResult = await pool.query(
    `
      SELECT
        message_id,
        message_role,
        message_content,
        message_status,
        response_source,
        provider_name,
        model_name,
        response_time_ms,
        metadata,
        created_at
      FROM chatbot_messages
      WHERE conversation_id = $1
        AND user_id = $2
        AND is_deleted = false
      ORDER BY message_sequence ASC
    `,
    [conversationId, userId]
  );

  return {
    conversation: conversationResult.rows[0],
    messages: messagesResult.rows
  };
}


/**
 * Retrieve trusted context for continuing a conversation.
 * Only completed, non-deleted messages from the owner
 * of an active conversation are included.
 */
export async function getRecentConversationContext(
  userId,
  conversationId,
  limit = 12
) {
  const conversationResult = await pool.query(
    `
      SELECT conversation_id
      FROM chatbot_conversations
      WHERE conversation_id = $1
        AND user_id = $2
        AND conversation_status = 'active'
      LIMIT 1
    `,
    [conversationId, userId]
  );

  if (conversationResult.rows.length === 0) {
    const error = new Error(
      "Conversation not found or unavailable."
    );
    error.status = 404;
    throw error;
  }

  const result = await pool.query(
    `
      SELECT
        message_role,
        message_content,
        created_at,
        message_id,
        message_sequence
      FROM (
        SELECT
          message_role,
          message_content,
          created_at,
          message_id,
          message_sequence
        FROM chatbot_messages
        WHERE conversation_id = $1
          AND user_id = $2
          AND message_role IN ('user', 'assistant')
          AND message_status = 'completed'
          AND is_deleted = false
        ORDER BY message_sequence DESC
        LIMIT $3
      ) AS recent_messages
      ORDER BY message_sequence ASC
    `,
    [conversationId, userId, limit]
  );

  return result.rows.map((message) => ({
    role: message.message_role,
    content: message.message_content
  }));
}


/**
 * Rename a conversation belonging to the authenticated user.
 */
export async function renameConversation(
  userId,
  conversationId,
  newTitle
) {
  const title = newTitle.trim();

  if (!title) {
    const error = new Error("Conversation title cannot be empty.");
    error.status = 400;
    throw error;
  }

  if (title.length > 100) {
    const error = new Error("Conversation title cannot exceed 100 characters.");
    error.status = 400;
    throw error;
  }

  const result = await pool.query(
    `
      UPDATE chatbot_conversations
      SET
        title = $1,
        is_title_generated = false,
        updated_at = NOW()
      WHERE conversation_id = $2
        AND user_id = $3
        AND conversation_status = 'active'
      RETURNING
        conversation_id,
        title,
        is_title_generated,
        updated_at
    `,
    [title, conversationId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error("Conversation not found or unavailable.");
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}


/**
 * Pin or unpin a conversation belonging to the authenticated user.
 */
export async function setConversationPinned(
  userId,
  conversationId,
  isPinned
) {
  const result = await pool.query(
    `
      UPDATE chatbot_conversations
      SET
        is_pinned = $1,
        updated_at = NOW()
      WHERE conversation_id = $2
        AND user_id = $3
        AND conversation_status = 'active'
      RETURNING
        conversation_id,
        title,
        is_pinned,
        updated_at
    `,
    [isPinned, conversationId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error(
      "Conversation not found or unavailable."
    );
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}
