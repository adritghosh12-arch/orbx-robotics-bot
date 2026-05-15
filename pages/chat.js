import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import styles from '../styles/Chat.module.css';

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: '👋 Welcome to Orbx AI! I\'m an FTC expert assistant. Ask me anything about FIRST Tech Challenge - rules, games, team eligibility, robot design, scouting, and more!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);

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
                <p>{message.text}</p>
                {message.sources && message.sources.length > 0 && (
                  <small className={styles.sources}>
                    Sources: {message.sources.join(', ')}
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
