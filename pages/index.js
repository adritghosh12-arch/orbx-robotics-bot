import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from '../styles/Home.module.css';

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <h1 className={styles.logo}>🛸 Orbx AI</h1>
          <div className={styles.navLinks}>
            <Link href="/about">About</Link>
            <Link href="/chat">Chat</Link>
            <Link href="/forum">Forum</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.main
        className={styles.main}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className={styles.hero} variants={itemVariants}>
          <h2 className={styles.heroTitle}>Welcome to Orbx AI</h2>
          <p className={styles.heroSubtitle}>
            Your AI-powered guide to FIRST Tech Challenge
          </p>
          <p className={styles.heroDesc}>
            Get instant answers about FTC rules, games, robot design, team eligibility, and competition strategies powered by intelligent assistants trained on FTC knowledge.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div className={styles.features} variants={itemVariants}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🤖</div>
            <h3>Smart Chatbot</h3>
            <p>AI assistant focused entirely on FTC topics with guardrails to ensure accurate information</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>💬</div>
            <h3>Community Forum</h3>
            <p>Discuss strategies, share experiences, and learn from other FTC teams worldwide</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📚</div>
            <h3>Knowledge Base</h3>
            <p>Access comprehensive FTC information: rules, game elements, specifications, and more</p>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div className={styles.cta} variants={itemVariants}>
          <Link href="/chat" className={styles.ctaButton}>
            Start Chatting
          </Link>
          <Link href="/about" className={styles.ctaSecondary}>
            Learn More
          </Link>
        </motion.div>

        {/* Recent Stats */}
        <motion.div className={styles.stats} variants={itemVariants}>
          <div className={styles.stat}>
            <h4>109,000+</h4>
            <p>FTC Participants</p>
          </div>
          <div className={styles.stat}>
            <h4>14</h4>
            <p>Seasons Supported</p>
          </div>
          <div className={styles.stat}>
            <h4>100%</h4>
            <p>Free Forever</p>
          </div>
        </motion.div>
      </motion.main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>Orbx AI © 2026 | Dedicated to the FTC Community</p>
        <p>Built with ❤️ for FIRST Tech Challenge</p>
      </footer>
    </div>
  );
}
