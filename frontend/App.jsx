
import { useState } from "react";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event) {
    event.preventDefault();

    const message = input.trim();
    if (!message || loading) return;

    const previousMessages = messages;

    setMessages((current) => [
      ...current,
      { role: "user", content: message },
    ]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const history = previousMessages.map(({ role, content }) => ({
        role,
        content,
      }));

      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const data = await response.json();

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply,
          provider: data.provider,
        },
      ]);
    } catch {
      setError(
        "Couldn't reach the chatbot. Check that the backend and model server are running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="chat">
        <header className="header">
          <div className="brand-mark">u</div>
          <div>
            <h1>unwind</h1>
            <p>Your space to pause and talk.</p>
          </div>
          <span className="status">Test mode</span>
        </header>

        <div className="welcome">
          <span className="eyebrow">A MOMENT FOR YOU</span>
          <h2>What's on your mind?</h2>
          <p>
            You don't have to figure everything out at once.
            Start wherever you feel comfortable.
          </p>
        </div>

        <section
          className="messages"
          aria-label="Conversation"
          aria-live="polite"
        >
          {messages.length === 0 && (
            <div className="empty">
              <span>✳</span>
              <p>Try saying hello, or tell me how your day is going.</p>
            </div>
          )}

          {messages.map((item, index) => (
            <article
              key={`${index}-${item.role}`}
              className={`message ${item.role}`}
            >
              <div className="bubble">{item.content}</div>

              {item.role === "assistant" && item.provider && (
                <small className="provider">
                  {item.provider === "predefined"
                    ? "Predefined response"
                    : item.provider === "custom-llm"
                    ? "Custom Unwind LLM"
                    : item.provider === "primary"
                    ? "Primary AI"
                    : "Service unavailable"}
                </small>
              )}
            </article>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="bubble typing">
                Unwind is thinking…
              </div>
            </div>
          )}

          {error && <p className="error">{error}</p>}
        </section>

        <form className="composer" onSubmit={sendMessage}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Write what's on your mind..."
            aria-label="Your message"
            maxLength={4000}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            ↑
          </button>
        </form>

        <p className="disclaimer">
          Test application · Not a substitute for professional care
        </p>
      </section>
    </main>
  );
}
