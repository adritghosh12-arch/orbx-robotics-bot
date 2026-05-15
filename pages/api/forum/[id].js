import { query } from '../../../lib/db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    // Get thread and replies
    try {
      const threadResult = await query(
        'SELECT * FROM forum_threads WHERE id = $1',
        [id]
      );

      if (threadResult.rows.length === 0) {
        return res.status(404).json({ error: 'Thread not found' });
      }

      const repliesResult = await query(
        `SELECT fr.*, u.email as author_email FROM forum_replies fr
         JOIN users u ON fr.user_id = u.id
         WHERE fr.thread_id = $1
         ORDER BY fr.created_at ASC`,
        [id]
      );

      return res.status(200).json({
        thread: threadResult.rows[0],
        replies: repliesResult.rows,
      });
    } catch (error) {
      console.error('Thread fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch thread' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
