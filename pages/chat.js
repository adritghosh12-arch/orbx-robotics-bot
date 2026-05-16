import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import styles from '../styles/Chat.module.css';

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: `# Welcome to Orbx AI! 🤖

Hello! I'm your **FTC expert assistant** here to help with everything about FIRST Tech Challenge.

## What I Can Help With:
• **Game Rules** - Current season (INTO THE DEEP) and game mechanics
• **Robot Design** - Specifications, mechanisms, and build strategies
• **Programming** - Java, Blocks, OnBot Java, and autonomous development
• **Competition** - Tournament format, scoring, and alliance strategies
• **Team Management** - Awards, engineering notebooks, and outreach

## Popular Questions:
• "What are the robot size requirements?"
• "How does the INTO THE DEEP game work?"
• "What programming languages can I use?"
• "How do FTC competitions work?"

*Ask me anything about FTC - I'm here to help your team succeed!* 🏆`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);

  // Format message text with basic markdown-like formatting
  const formatMessage = (text) => {
    return text
      // Headers
      .replace(/^# (.*$)/gim, '<h2 class="message-h2">$1</h2>')
      .replace(/^## (.*$)/gim, '<h3 class="message-h3">$1</h3>')
      .replace(/^### (.*$)/gim, '<h4 class="message-h4">$1</h4>')

      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

      // Bullet points
      .replace(/^• (.*$)/gim, '<div class="bullet-point">• $1</div>')

      // Numbered lists (basic)
      .replace(/^(\d+)\. (.*$)/gim, '<div class="numbered-item"><strong>$1.</strong> $2</div>')

      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

      // Italic text in asterisks
      .replace(/\*(.*?)\*/g, '<em>$1</em>')

      // Code blocks (inline)
      .replace(/`([^`]+)`/g, '<code>$1</code>')

      // Line breaks
      .replace(/\n/g, '<br>');
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user session
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
        }
      }
    };
    checkAuth();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: input,
      timestamp: new Date(),
    };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user && { Authorization: `Bearer ${localStorage.getItem('token')}` }),
        },
        body: JSON.stringify({ question: input, userId: user?.id }),
      });

      const data = await response.json();
      
      const botMessage = {
        id: messages.length + 2,
        type: 'bot',
        text: data.answer || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        confidence: data.confidence,
        sources: data.sources,
      };
      
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: messages.length + 2,
        type: 'bot',
        text: 'Error connecting to the server. Please try again later.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.chatContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h1>🤖 Orbx AI Chat</h1>
        <p>Ask me anything about FTC!</p>
        {user && <p className={styles.userInfo}>Logged in as: {user.email}</p>}
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        <motion.div
          className={styles.messages}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {messages.map((message) => (
            <motion.div
              key={message.id}
              className={`${styles.message} ${styles[message.type]}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.messageBubble}>
                <div className={styles.messageContent}
                     dangerouslySetInnerHTML={{
                       __html: formatMessage(message.text)
                     }}
                />
                {message.sources && message.sources.length > 0 && (
                  <small className={styles.sources}>
                    Sources: {message.sources.join(', ')}
                  </small>
                )}
                {message.debug && message.debug.modelUsed && (
                  <small className={styles.debug}>
                    Model: {message.debug.modelUsed}
                  </small>
                )}
              </div>
              <small className={styles.timestamp}>
                {message.timestamp.toLocaleTimeString()}
              </small>
            </motion.div>
          ))}
          {loading && (
            <motion.div
              className={`${styles.message} ${styles.bot}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className={styles.messageBubble}>
                <div className={styles.typing}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </motion.div>
      </div>

      {/* Input Form */}
      <form className={styles.inputForm} onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="Ask about FTC rules, games, robots, teams..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className={styles.input}
        />
        <button type="submit" disabled={loading} className={styles.sendButton}>
          {loading ? '...' : 'Send'}
        </button>
      </form>

      {/* Quick Suggestions */}
      <div className={styles.suggestions}>
        <p className={styles.suggestionsTitle}>Quick questions:</p>
        <div className={styles.suggestionButtons}>
          <button onClick={() => setInput('What are the current FTC game rules?')}>
            Current Rules
          </button>
          <button onClick={() => setInput('How do I join FTC?')}>
            How to Join
          </button>
          <button onClick={() => setInput('What are robot weight limits?')}>
            Robot Specs
          </button>
          <button onClick={() => setInput('What is scouting in FTC?')}>
            About Scouting
          </button>
        </div>
      </div>
    </div>
  );
}
