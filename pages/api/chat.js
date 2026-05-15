import { getRagChain } from '../../lib/rag-chain.js';
import { query } from '../../lib/db.js';
import { extractToken, verifyToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question } = req.body;
  
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid question' });
  }

  try {
    // Get user from token if available
    let userId = null;
    const token = extractToken(req);
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.userId;
      }
    }

    // Initialize RAG chain
    const ragChain = await getRagChain();
    
    // Get answer from RAG
    const result = await ragChain.invoke(question);
    
    // Save to chat history if user is logged in
    if (userId) {
      try {
        await query(
          `INSERT INTO chat_history (user_id, question, answer, confidence, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [userId, question, result.answer, result.confidence || 0.8]
        );
      } catch (dbError) {
        console.error('Error saving chat history:', dbError);
        // Don't fail the request if history save fails
      }
    }

    return res.status(200).json({
      answer: result.answer,
      confidence: result.confidence,
      sources: result.sources || [],
      savedToHistory: !!userId,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    
    return res.status(500).json({
      error: 'Failed to process your question',
      answer: 'I encountered an error. Please try again or visit firstinspires.org for more information.',
      confidence: 0,
    });
  }
}
