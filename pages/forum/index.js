import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from '../styles/Forum.module.css';

export default function Forum() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewThread, setShowNewThread] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check auth
    const token = localStorage.getItem('token');
    if (token) {
      setUser(true);
    }
    
    // Load threads
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      const res = await fetch('/api/forum');
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewThread = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to create a thread');
      return;
    }

    try {
      const res = await fetch('/api/forum', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ title, content }),
      });

      if (res.ok) {
        setTitle('');
        setContent('');
        setShowNewThread(false);
        fetchThreads();
      }
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  return (
    <div className={styles.container}>
      <h1>📢 FTC Community Forum</h1>
      
      {user && (
        <button 
          onClick={() => setShowNewThread(!showNewThread)}
          className={styles.newThreadBtn}
        >
          {showNewThread ? 'Cancel' : 'Start New Thread'}
        </button>
      )}

      {showNewThread && (
        <motion.form 
          className={styles.newThreadForm}
          onSubmit={handleNewThread}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <input
            type="text"
            placeholder="Thread title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Share your thoughts about FTC..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={5}
          />
          <button type="submit">Post Thread</button>
        </motion.form>
      )}

      {loading ? (
        <p>Loading threads...</p>
      ) : threads.length === 0 ? (
        <p>No threads yet. Be the first to start a discussion!</p>
      ) : (
        <div className={styles.threadsList}>
          {threads.map((thread) => (
            <motion.div
              key={thread.id}
              className={styles.threadCard}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Link href={`/forum/${thread.id}`}>
                <h3>{thread.title}</h3>
                <p className={styles.threadMeta}>
                  {thread.replies_count} replies • {thread.views_count} views
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
