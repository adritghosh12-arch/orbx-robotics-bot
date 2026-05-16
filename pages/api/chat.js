import { callGroqDirectly } from '../../lib/groq-direct.js';
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
    console.log('=== BULLETPROOF CHAT API ===');
    console.log('Question received:', question);
    console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);

    // Get user from token if available
    let userId = null;
    const token = extractToken(req);
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.userId;
      }
    }

    console.log('Calling direct Groq API...');
    // Use direct API call - NO LANGCHAIN
    const result = await callGroqDirectly(question);
    console.log('Direct API result:', result);
    
    // Always try to save to chat history (but don't fail if DB is down)
    if (userId && result.success) {
      try {
        await query(
          `INSERT INTO chat_history (user_id, question, answer, confidence, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [userId, question, result.answer, result.confidence || 0.8]
        );
        console.log('Chat history saved successfully');
      } catch (dbError) {
        console.error('Error saving chat history (non-fatal):', dbError);
        // Don't fail the request if history save fails
      }
    }

    // ALWAYS return a successful response structure
    return res.status(200).json({
      success: result.success,
      answer: result.answer,
      confidence: result.confidence || 0.8,
      sources: result.sources || ['Direct API'],
      savedToHistory: !!userId,
      debug: result.debug || {},
      error: result.success ? undefined : result.error
    });
  } catch (error) {
    console.error('=== FATAL CHAT API ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      hasGroqKey: !!process.env.GROQ_API_KEY,
      timestamp: new Date().toISOString()
    });

    // NEVER return 500 - always return 200 with error details
    return res.status(200).json({
      success: false,
      answer: `System error: ${error.message}. This has been logged for debugging.`,
      confidence: 0,
      sources: ['Error Handler'],
      error: error.message,
      errorType: error.name,
      debug: {
        timestamp: new Date().toISOString(),
        hasApiKey: !!process.env.GROQ_API_KEY,
        nodeEnv: process.env.NODE_ENV
      }
    });
  }
}
