
import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "./services/chatApi";
import "./App.css";

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Hi there 🌿 I'm your UNWIND companion. This is a space where you can slow down, share what's on your mind, and take things one step at a time. How are you feeling today?",
};

function App() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit(event) {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) return;

    const updatedMessages = [
      ...messages,
      { role: "user", content: message },
    ];

    setMessages(updatedMessages);
    setInput("");
    setError("");
    setLoading(true);

    // Send the conversation before the latest message as context.
    const history = messages
      .filter((item) => item.role === "user" || item.role === "assistant")
      .map((item) => ({
        role: item.role,
        content: item.content,
      }));

    try {
      const data = await sendChatMessage(message, history);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply,
          source: data.source,
          provider: data.provider,
        },
      ]);
    } catch (err) {
      setError(
        err.message ||
          "We couldn't connect right now. Please try again."
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function startNewChat() {
    if (loading) return;

    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setError("");
    inputRef.current?.focus();
  }

  return (
    <main className="unwind-app">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="UNWIND home">
          <span className="brand-mark">u.</span>
          <span>unwind</span>
        </a>

        <div className="sidebar-intro">
          <span className="eyebrow">YOUR PERSONAL SPACE</span>
          <h2>A moment for you.</h2>
          <p>
            No pressure. No judgment. Just a little space to breathe.
          </p>
        </div>

        <button
          className="new-chat-button"
          type="button"
          onClick={startNewChat}
          disabled={loading}
        >
          <span aria-hidden="true">＋</span> New conversation
        </button>

        <div className="sidebar-note">
          <span aria-hidden="true">✳</span>
          <p>
            You don't have to figure everything out today. One step is
            enough.
          </p>
        </div>

        <div className="sidebar-footer">
          YOUR WELLNESS JOURNEY
          <span>Take it at your own pace.</span>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <div className="companion-avatar" aria-hidden="true">
            <span>u</span>
          </div>

          <div className="companion-info">
            <h1>AI Companion</h1>
            <p>
              <span className="status-dot" />
              Here for you
            </p>
          </div>

          <button
            className="header-reset"
            type="button"
            onClick={startNewChat}
            disabled={loading}
          >
            New chat
          </button>
        </header>

        <div
          className="messages-area"
          aria-label="Conversation"
          aria-live="polite"
          aria-relevant="additions text"
        >
          <div className="date-divider">
            <span>YOUR SPACE TO UNWIND</span>
          </div>

          {messages.map((message, index) => (
            <div
              className={`message-row ${message.role}`}
              key={`${index}-${message.role}`}
            >
              {message.role === "assistant" && (
                <div className="message-avatar" aria-hidden="true">
                  u
                </div>
              )}

              <div className="message-content">
                <span className="message-author">
                  {message.role === "assistant" ? "UNWIND" : "YOU"}
                </span>
                <div className="message-bubble">
                  {message.content}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row assistant">
              <div className="message-avatar" aria-hidden="true">
                u
              </div>
              <div className="message-content">
                <span className="message-author">UNWIND</span>
                <div className="message-bubble typing">
                  <span />
                  <span />
                  <span />
                  <span className="sr-only">
                    Your companion is thinking
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="composer-section">
          {error && (
            <div className="chat-error" role="alert">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          <form className="message-form" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Share what's on your mind..."
              aria-label="Your message"
              rows={1}
              maxLength={4000}
              disabled={loading}
            />

            <button
              className="send-button"
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send message"
            >
              <span aria-hidden="true">↑</span>
            </button>
          </form>

          <p className="composer-disclaimer">
            A safe space to reflect. AI responses may not always be accurate.
          </p>
        </div>
      </section>
    </main>
  );
}

export default App;
