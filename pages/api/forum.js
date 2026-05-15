import { extractToken, verifyToken } from '../../lib/auth.js';
import { query } from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get all threads
    try {
      const result = await query(
        `SELECT id, title, content, replies_count, views_count, created_at 
         FROM forum_threads 
         ORDER BY created_at DESC 
         LIMIT 20`
      );
      
      return res.status(200).json({ threads: result.rows });
    } catch (error) {
      console.error('Forum fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch threads' });
    }
  } else if (req.method === 'POST') {
    // Create new thread (requires auth)
    const token = extractToken(req);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' });
    }

    try {
      const result = await query(
        `INSERT INTO forum_threads (user_id, title, content, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, title, created_at`,
        [decoded.userId, title, content]
      );
      
      return res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Thread creation error:', error);
      return res.status(500).json({ error: 'Failed to create thread' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
