import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import styles from '../styles/Dashboard.module.css';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const userRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
        
        // Fetch chat history
        const histRes = await fetch('/api/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (histRes.ok) {
          const data = await histRes.json();
          setChatHistory(data.history || []);
        }
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (loading) return <div className={styles.container}><p>Loading...</p></div>;
  if (!user) return null;

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className={styles.header}>
        <h1>📊 Your Dashboard</h1>
        <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
      </div>

      <div className={styles.userInfo}>
        <h2>Welcome, {user.email}!</h2>
        <p>Member since {new Date(user.created_at).toLocaleDateString()}</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <h3>{chatHistory.length}</h3>
          <p>Chat Messages</p>
        </div>
        <div className={styles.stat}>
          <h3>Avg</h3>
          <p>Confidence Score</p>
        </div>
      </div>

      <div className={styles.section}>
        <h2>📝 Recent Chat History</h2>
        {chatHistory.length === 0 ? (
          <p>No chat history yet. <Link href="/chat">Start chatting!</Link></p>
        ) : (
          <div className={styles.historyList}>
            {chatHistory.slice(0, 10).map((item) => (
              <motion.div
                key={item.id}
                className={styles.historyItem}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className={styles.question}><strong>Q:</strong> {item.question.substring(0, 100)}...</p>
                <p className={styles.date}>{new Date(item.created_at).toLocaleDateString()}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <Link href="/chat" className={styles.actionBtn}>Continue Chatting</Link>
        <Link href="/forum" className={styles.actionBtn}>Visit Forum</Link>
      </div>
    </motion.div>
  );
}
