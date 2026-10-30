import pool from "../config/db.js";

/**
 * Generate a clean conversation title from the first user message.
 */
function generateConversationTitle(message) {
  const cleanedMessage = String(message || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, "");

  if (!cleanedMessage) {
    return "New Chat";
  }

  // Use the first sentence as the conversation title.
  const sentenceMatch = cleanedMessage.match(/^.*?[.!?](?=\s|$)/);

  let title = sentenceMatch
    ? sentenceMatch[0]
    : cleanedMessage;

  title = title.replace(/[.!?]+$/, "").trim();

  // Keep the title within 80 characters.
  if (title.length > 80) {
    let shortened = title.slice(0, 77);
    const lastSpace = shortened.lastIndexOf(" ");

    if (lastSpace > 40) {
      shortened = shortened.slice(0, lastSpace);
    }

    title = `${shortened}...`;
  }

  // Capitalize the first character.
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export async function persistChatTurn({
  userId,
  conversationId = null,
  userMessage,
  assistantMessage,
  result,
  responseTimeMs = null
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let conversation;

    if (conversationId) {
      // A conversation can only be accessed by its owner.
      const existing = await client.query(
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

      if (existing.rows.length === 0) {
        const error = new Error(
          "Conversation not found or unavailable."
        );
        error.status = 404;
        throw error;
      }

      conversation = existing.rows[0];
    } else {
      const title = generateConversationTitle(userMessage);

const created = await client.query(
  `
    INSERT INTO chatbot_conversations (
      user_id,
      title,
      is_title_generated,
      first_message_at,
      last_message_at
    )
    VALUES ($1, $2, TRUE, NOW(), NOW())
    RETURNING conversation_id
  `,
  [userId, title]
);

      conversation = created.rows[0];
    }

    // Lock the conversation row to prevent concurrent
// requests from assigning the same message sequence.
await client.query(
  `
    SELECT conversation_id
    FROM chatbot_conversations
    WHERE conversation_id = $1
      AND user_id = $2
    FOR UPDATE
  `,
  [conversation.conversation_id, userId]
);

const sequenceResult = await client.query(
  `
    SELECT COALESCE(MAX(message_sequence), 0) AS last_sequence
    FROM chatbot_messages
    WHERE conversation_id = $1
  `,
  [conversation.conversation_id]
);

const nextSequence =
  Number(sequenceResult.rows[0].last_sequence) + 1;

    // Save the user's message.
await client.query(
  `
    INSERT INTO chatbot_messages (
      conversation_id,
      user_id,
      message_role,
      message_content,
      message_sequence
    )
    VALUES ($1, $2, 'user', $3, $4)
  `,
  [
    conversation.conversation_id,
    userId,
    userMessage,
    nextSequence
  ]
);

    // Save the assistant's response and provider metadata.
await client.query(
  `
    INSERT INTO chatbot_messages (
      conversation_id,
      user_id,
      message_role,
      message_content,
      response_source,
      provider_name,
      model_name,
      response_time_ms,
      metadata,
      message_sequence
    )
    VALUES ($1, $2, 'assistant', $3, $4, $5, $6, $7, $8, $9)
  `,
  [
    conversation.conversation_id,
    userId,
    assistantMessage,
    result.source || null,
    result.provider || null,
    result.model || null,
    responseTimeMs,
    JSON.stringify({
      intent: result.intent || null
    }),
    nextSequence + 1
  ]
);

    // Update conversation statistics.
    await client.query(
      `
        UPDATE chatbot_conversations
        SET
          total_messages = total_messages + 2,
          first_message_at = COALESCE(first_message_at, NOW()),
          last_message_at = NOW(),
          updated_at = NOW()
        WHERE conversation_id = $1
          AND user_id = $2
      `,
      [conversation.conversation_id, userId]
    );

    await client.query("COMMIT");

    return {
      conversationId: conversation.conversation_id
    };

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;

  } finally {
    client.release();
  }
}