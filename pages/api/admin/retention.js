import { getServerSession } from 'next-auth/next';
import { authConfig } from '../../../lib/auth.config.js';
import { getRetentionReport, executePurgeNow, checkRetentionStatus } from '../../../lib/data-retention.js';

export default async function handler(req, res) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, authConfig);

    // For now, allow access to any authenticated user
    // In production, you might want to add admin role checks
    if (!session?.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please sign in to access retention management'
      });
    }

    console.log('Data retention API called by:', session.user.email);

    switch (req.method) {
      case 'GET':
        // Get retention report
        const report = await getRetentionReport();
        return res.status(200).json({
          success: true,
          data: report,
          timestamp: new Date().toISOString()
        });

      case 'POST':
        const { action, urgent } = req.body;

        switch (action) {
          case 'check':
            // Check retention status
            await checkRetentionStatus();
            return res.status(200).json({
              success: true,
              message: 'Retention check completed',
              timestamp: new Date().toISOString()
            });

          case 'purge':
            // Execute manual purge
            console.log(`Manual purge requested by ${session.user.email}, urgent: ${urgent}`);
            const purgeResult = await executePurgeNow(urgent === true);
            return res.status(200).json({
              success: true,
              data: purgeResult,
              message: 'Purge completed successfully',
              timestamp: new Date().toISOString()
            });

          default:
            return res.status(400).json({
              error: 'Invalid action',
              validActions: ['check', 'purge']
            });
        }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Data retention API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}