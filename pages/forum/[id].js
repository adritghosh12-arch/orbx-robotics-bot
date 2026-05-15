import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from '../../styles/ForumThread.module.css';

export default function ForumThread() {
  const router = useRouter();
  const { id } = router.query;
  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check auth
    const token = localStorage.getItem('token');
    if (token) {
      setUser(true);
    }

    if (id) {
      fetchThread();
    }
  }, [id]);

  const fetchThread = async () => {
    try {
      const res = await fetch(`/api/forum/${id}`);
      if (res.ok) {
        const data = await res.json();
        setThread(data.thread);
        setReplies(data.replies || []);
      }
    } catch (error) {
      console.error('Failed to load thread:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to reply');
      return;
    }

    try {
      const res = await fetch(`/api/forum/${id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ content: replyContent }),
      });

      if (res.ok) {
        setReplyContent('');
        fetchThread();
      }
    } catch (error) {
      console.error('Failed to post reply:', error);
    }
  };

  if (loading) return <div className={styles.container}><p>Loading...</p></div>;
  if (!thread) return <div className={styles.container}><p>Thread not found</p></div>;

  return (
    <div className={styles.container}>
      <Link href="/forum" className={styles.backLink}>← Back to Forum</Link>

      <motion.div
        className={styles.thread}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1>{thread.title}</h1>
        <p className={styles.meta}>
          Posted on {new Date(thread.created_at).toLocaleDateString()}
        </p>
        <div className={styles.content}>{thread.content}</div>
      </motion.div>

      <div className={styles.replies}>
        <h2>Replies ({replies.length})</h2>
        
        {replies.length === 0 ? (
          <p>No replies yet. Be the first!</p>
        ) : (
          replies.map((reply) => (
            <motion.div
              key={reply.id}
              className={styles.reply}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className={styles.replyMeta}>
                {reply.author_email} • {new Date(reply.created_at).toLocaleDateString()}
              </p>
              <p>{reply.content}</p>
            </motion.div>
          ))
        )}
      </div>

      {user && (
        <motion.form
          className={styles.replyForm}
          onSubmit={handleReply}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            required
            rows={4}
          />
          <button type="submit">Post Reply</button>
        </motion.form>
      )}
    </div>
  );
}
