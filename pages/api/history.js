import { extractToken, verifyToken } from '../../lib/auth.js';
import { query } from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = extractToken(req);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await query(
      `SELECT id, question, answer, confidence, created_at
       FROM chat_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [decoded.userId]
    );
    
    return res.status(200).json({ history: result.rows });
  } catch (error) {
    console.error('History fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
}
