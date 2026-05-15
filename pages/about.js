import React from 'react';
import { motion } from 'framer-motion';
import styles from '../styles/About.module.css';

export default function About() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className={styles.container}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <h1>About FTC & Orbx AI</h1>

      <motion.section variants={itemVariants} className={styles.section}>
        <h2>What is FIRST Tech Challenge?</h2>
        <p>
          FIRST Tech Challenge (FTC) is a robotics competition for students in grades 7-12 (ages 12-18). 
          Teams work with mentors to design, build, and operate robots to compete in a game challenge 
          released annually. FTC emphasizes engineering practice, teamwork, and community outreach.
        </p>
        <ul>
          <li><strong>109,000+</strong> participants worldwide</li>
          <li><strong>81</strong> countries represented</li>
          <li><strong>14</strong> seasons of challenges</li>
          <li><strong>61%</strong> of alumni pursue STEM careers</li>
        </ul>
      </motion.section>

      <motion.section variants={itemVariants} className={styles.section}>
        <h2>Competition Structure</h2>
        <div className={styles.grid}>
          <div className={styles.box}>
            <h3>🎮 Games</h3>
            <p>Annual challenges with new rules, mechanics, and scoring systems. Current season: BIOBUZZ™</p>
          </div>
          <div className={styles.box}>
            <h3>🏆 Levels</h3>
            <p>Regional → State → National competitions. Teams compete within their local region first.</p>
          </div>
          <div className={styles.box}>
            <h3>🤝 Alliances</h3>
            <p>Teams form alliances during tournaments to compete together for higher scores.</p>
          </div>
          <div className={styles.box}>
            <h3>📊 Scouting</h3>
            <p>Teams gather data on competitors' robots and strategies to make smart alliance decisions.</p>
          </div>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className={styles.section}>
        <h2>Robot Specifications</h2>
        <ul>
          <li><strong>Size:</strong> Must fit in 18" × 18" × 18" at start; can expand during match</li>
          <li><strong>Weight:</strong> Maximum 42 lbs</li>
          <li><strong>Motors & Servos:</strong> Must be from approved vendors (Andymark, VEXpro, etc.)</li>
          <li><strong>Programming:</strong> Android-based using FTC SDK or TeleOp blocks</li>
          <li><strong>Power:</strong> 12V battery system</li>
        </ul>
      </motion.section>

      <motion.section variants={itemVariants} className={styles.section}>
        <h2>How to Get Started</h2>
        <ol>
          <li>Visit <a href="https://www.firstinspires.org/programs/ftc/get-started" target="_blank" rel="noopener noreferrer">firstinspires.org/programs/ftc/get-started</a></li>
          <li>Find teams in your area or register a new team</li>
          <li>Gather a team of 10-15 students and at least one mentor</li>
          <li>Get access to game resources and team guidelines</li>
          <li>Register for regional tournaments</li>
        </ol>
      </motion.section>

      <motion.section variants={itemVariants} className={styles.section}>
        <h2>About Orbx AI</h2>
        <p>
          Orbx AI is a free, AI-powered chatbot specifically trained on FTC knowledge to help teams, 
          mentors, and enthusiasts get instant answers about:
        </p>
        <ul>
          <li>Current and past game rules</li>
          <li>Robot specifications and regulations</li>
          <li>Team eligibility and registration</li>
          <li>Scouting strategies</li>
          <li>Engineering and design concepts</li>
          <li>Competition structure and events</li>
        </ul>
        <p>
          <strong>Guardrails:</strong> Orbx AI is specifically designed to answer only FTC-related questions. 
          If you ask about non-FTC topics, it will politely redirect you to FTC content.
        </p>
      </motion.section>

      <motion.section variants={itemVariants} className={styles.section}>
        <h2>Resources</h2>
        <ul>
          <li><a href="https://www.firstinspires.org/robotics/ftc" target="_blank" rel="noopener noreferrer">Official FTC Website</a></li>
          <li><a href="https://community.firstinspires.org/" target="_blank" rel="noopener noreferrer">FTC Community & Resources</a></li>
          <li><a href="https://www.firstinspires.org/team-event-search" target="_blank" rel="noopener noreferrer">Find FTC Teams & Events</a></li>
          <li><a href="https://www.firstinspires.org/programs/ftc/get-started" target="_blank" rel="noopener noreferrer">FTC Getting Started Guide</a></li>
        </ul>
      </motion.section>
    </motion.div>
  );
}
