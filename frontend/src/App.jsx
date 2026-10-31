import { useEffect, useRef, useState } from "react";
import "./App.css";

const suggestions = [
  {
    icon: "sun",
    title: "A little check-in",
    description: "Help me understand how I'm feeling today.",
    prompt: "I'd like to check in with how I'm feeling today."
  },
  {
    icon: "heart",
    title: "I've been stressed",
    description: "Let's talk about what's been on your mind.",
    prompt: "I've been feeling stressed lately. Can we talk?"
  },
  {
    icon: "book",
    title: "Reflect & journal",
    description: "Help me make sense of my thoughts.",
    prompt: "Can you help me reflect on my thoughts today?"
  },
  {
    icon: "moon",
    title: "Find some calm",
    description: "Take a moment to slow down and reset.",
    prompt: "I'd like to find a little calm and relax."
  }
];

const demoReplies = [
  "Thank you for sharing that with me. Sometimes putting what we're feeling into words is a meaningful first step. Would you like to tell me a little more about what's been happening?",
  "I hear you. You don't have to have everything figured out right now. Let's take this one step at a time. What's been weighing on you the most?",
  "That sounds like something worth giving yourself time and space to explore. Be gentle with yourself. What do you think you need most in this moment?"
];

const initialConversations = [
  {
    id: 1,
    title: "A little space to breathe",
    date: "Today",
    messages: []
  },
  {
    id: 2,
    title: "Managing everyday stress",
    date: "Yesterday",
    messages: []
  },
  {
    id: 3,
    title: "Finding a better routine",
    date: "Yesterday",
    messages: []
  }
];

function Icon({ name, size = 20, className = "" }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": true
  };

  const paths = {
    plus: <><path d="M12 5v14M5 12h14" /></>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    moon: <><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    chevron: <><path d="m9 18 6-6-6-6" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" /></>,
    leaf: <><path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z" /><path d="M4 21c3-5 7-8 12-11" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>
  };

  return <svg {...common}>{paths[name] || paths.sparkle}</svg>;
}

function formatTime() {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

function App() {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState(1);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeId
  );

  const messages = activeConversation?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function createConversation() {
    const newConversation = {
      id: Date.now(),
      title: "New conversation",
      date: "Today",
      messages: []
    };

    setConversations((current) => [newConversation, ...current]);
    setActiveId(newConversation.id);
    setInput("");
    setSidebarOpen(false);
  }

  function selectConversation(id) {
    setActiveId(id);
    setSidebarOpen(false);
  }

  function updateConversation(id, updater) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id ? updater(conversation) : conversation
      )
    );
  }

  async function sendMessage(event) {
    event?.preventDefault();

    const content = input.trim();
    if (!content || sending) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content,
      time: formatTime()
    };

    const currentId = activeId;

    updateConversation(currentId, (conversation) => ({
      ...conversation,
      title:
        conversation.messages.length === 0
          ? content.length > 30
            ? `${content.slice(0, 30)}…`
            : content
          : conversation.title,
      messages: [...conversation.messages, userMessage]
    }));

    setInput("");
    setSending(true);

    // Temporary frontend preview. Replace with the API call during integration.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const assistantMessage = {
      id: Date.now() + 1,
      role: "assistant",
      content: demoReplies[Math.floor(Math.random() * demoReplies.length)],
      time: formatTime()
    };

    updateConversation(currentId, (conversation) => ({
      ...conversation,
      messages: [...conversation.messages, assistantMessage]
    }));

    setSending(false);
  }

  async function copyMessage(message) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setCopiedId(null);
    }
  }

  const filteredConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="app-shell">
      {sidebarOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <a className="brand" href="#" aria-label="Unwind home">
            <span className="brand-symbol">
              <Icon name="leaf" size={23} />
            </span>
            <span className="brand-word">unwind<span>.</span></span>
          </a>

          <button
            className="icon-button sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <Icon name="close" />
          </button>
        </div>

        <button className="new-chat-button" onClick={createConversation}>
          <Icon name="plus" size={18} />
          <span>New conversation</span>
          <span className="new-chat-shortcut">+</span>
        </button>

        <div className="sidebar-search">
          <Icon name="search" size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search">
              <Icon name="close" size={15} />
            </button>
          )}
        </div>

        <div className="history-area">
          <div className="sidebar-label">YOUR CONVERSATIONS</div>

          {filteredConversations.length > 0 ? (
            <div className="conversation-list">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={`conversation-item ${
                    activeId === conversation.id ? "conversation-active" : ""
                  }`}
                  onClick={() => selectConversation(conversation.id)}
                >
                  <Icon name="message" size={17} />
                  <span className="conversation-title">
                    {conversation.title}
                  </span>
                  <Icon name="chevron" size={15} />
                </button>
              ))}
            </div>
          ) : (
            <div className="no-search-results">
              No conversations found.
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon"><Icon name="heart" size={17} /></span>
            <div>
              <strong>A gentle reminder</strong>
              <p>You deserve the same kindness you give others.</p>
            </div>
          </div>

          <div className="profile-row">
            <div className="profile-avatar">U</div>
            <div className="profile-info">
              <strong>Your space</strong>
              <span>Personal wellness</span>
            </div>
            <button className="icon-button" aria-label="More options">
              <Icon name="more" />
            </button>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Icon name="menu" />
            </button>

            <div className="breadcrumb">
              <span>UNWIND</span>
              <Icon name="chevron" size={14} />
              <strong>AI Companion</strong>
            </div>
          </div>

          <div className="topbar-right">
            <div className="connection-indicator">
              <span />
              Preview mode
            </div>
            <div className="topbar-divider" />
            <div className="companion-avatar">
              <Icon name="sparkle" size={19} />
            </div>
          </div>
        </header>

        <div className="chat-scroll-area">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-art">
                <div className="art-ring art-ring-one" />
                <div className="art-ring art-ring-two" />
                <div className="art-center">
                  <Icon name="leaf" size={36} />
                </div>
                <span className="art-dot dot-one" />
                <span className="art-dot dot-two" />
                <span className="art-dot dot-three" />
              </div>

              <div className="welcome-copy">
                <span className="welcome-kicker">
                  <span /> YOUR PERSONAL SPACE
                </span>
                <h1>A little space to<br /><em>be yourself.</em></h1>
                <p>
                  Whatever is on your mind, you can start here.
                  No pressure, no judgement. Just a moment for you.
                </p>
              </div>

              <div className="suggestion-heading">
                <span>WHERE WOULD YOU LIKE TO BEGIN?</span>
                <span className="suggestion-line" />
              </div>

              <div className="suggestion-grid">
                {suggestions.map((suggestion) => (
                  <button
                    className="suggestion-card"
                    key={suggestion.title}
                    onClick={() => {
                      setInput(suggestion.prompt);
                      inputRef.current?.focus();
                    }}
                  >
                    <span className="suggestion-icon">
                      <Icon name={suggestion.icon} size={19} />
                    </span>
                    <span className="suggestion-content">
                      <strong>{suggestion.title}</strong>
                      <small>{suggestion.description}</small>
                    </span>
                    <Icon name="arrow" size={16} className="suggestion-arrow" />
                  </button>
                ))}
              </div>

              <div className="welcome-footnote">
                <Icon name="sparkle" size={15} />
                <span>Start wherever you feel comfortable.</span>
              </div>
            </div>
          ) : (
            <div className="conversation-view">
              <div className="conversation-intro">
                <span className="conversation-date">YOUR CONVERSATION</span>
                <h2>{activeConversation?.title}</h2>
              </div>

              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`chat-message ${message.role}`}
                >
                  {message.role === "assistant" && (
                    <div className="message-avatar">
                      <Icon name="leaf" size={18} />
                    </div>
                  )}

                  <div className="message-body">
                    <div className="message-meta">
                      <strong>
                        {message.role === "assistant" ? "Unwind" : "You"}
                      </strong>
                      <span>{message.time}</span>
                    </div>

                    <div className="message-text">{message.content}</div>

                    {message.role === "assistant" && (
                      <button
                        className="copy-button"
                        onClick={() => copyMessage(message)}
                      >
                        <Icon
                          name={copiedId === message.id ? "check" : "copy"}
                          size={14}
                        />
                        {copiedId === message.id ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="user-avatar">U</div>
                  )}
                </article>
              ))}

              {sending && (
                <div className="chat-message assistant">
                  <div className="message-avatar">
                    <Icon name="leaf" size={18} />
                  </div>
                  <div className="message-body">
                    <div className="message-meta">
                      <strong>Unwind</strong>
                      <span>Thinking</span>
                    </div>
                    <div className="typing-indicator">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <footer className="composer-area">
          <form className="message-composer" onSubmit={sendMessage}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage(event);
                }
              }}
              placeholder="Share what's on your mind..."
              rows={1}
              maxLength={4000}
              aria-label="Write your message"
            />
            <div className="composer-controls">
              <span className="composer-hint">
                <Icon name="sparkle" size={14} />
                A safe space to express yourself
              </span>
              <div className="composer-actions">
                <span className="character-count">
                  {input.length > 0 ? `${input.length}/4000` : ""}
                </span>
                <button
                  className="send-button"
                  type="submit"
                  disabled={!input.trim() || sending}
                  aria-label="Send message"
                >
                  <Icon name="send" size={18} />
                </button>
              </div>
            </div>
          </form>

          <p className="composer-disclaimer">
            Unwind is here to support your wellbeing, not replace professional care.
          </p>
        </footer>
      </section>
    </main>
  );
}

export default App;