import dbManager from './db-enhanced.js';

// Data Retention Manager for automatic database cleanup
class DataRetentionManager {
  constructor() {
    this.enabled = process.env.ENABLE_AUTO_PURGE === 'true';
    this.checkInterval = parseInt(process.env.PURGE_CHECK_INTERVAL) || 86400000; // 24 hours
    this.dbSizeLimit = parseFloat(process.env.DB_SIZE_LIMIT_GB) || 2.8; // 2.8GB trigger
    this.isRunning = false;
    this.timer = null;
  }

  async startMonitoring() {
    if (!this.enabled) {
      console.log('Data retention monitoring disabled (ENABLE_AUTO_PURGE=false)');
      return;
    }

    console.log(`Starting data retention monitoring (check every ${this.checkInterval/1000/60/60}h)`);
    console.log(`Database size limit: ${this.dbSizeLimit}GB`);

    this.isRunning = true;

    // Initial check
    await this.checkAndPurge();

    // Schedule periodic checks
    this.timer = setInterval(async () => {
      if (this.isRunning) {
        await this.checkAndPurge();
      }
    }, this.checkInterval);

    console.log('Data retention monitoring started');
  }

  async stopMonitoring() {
    console.log('Stopping data retention monitoring...');
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('Data retention monitoring stopped');
  }

  async checkAndPurge() {
    try {
      console.log('\n=== DATA RETENTION CHECK ===');
      console.log('Timestamp:', new Date().toISOString());

      // Get current database size
      const sizeInfo = await dbManager.getDatabaseSize();
      console.log(`Database size: ${sizeInfo.sizePretty} (${sizeInfo.sizeGB.toFixed(3)}GB)`);
      console.log(`Usage: ${((sizeInfo.sizeGB / 3) * 100).toFixed(1)}% of 3GB limit`);

      // Check if purging is needed
      const needsPurge = sizeInfo.sizeGB >= this.dbSizeLimit;
      const urgentPurge = sizeInfo.sizeGB >= 2.9; // 96.7% full

      if (needsPurge) {
        if (urgentPurge) {
          console.warn('🚨 URGENT: Database is 96%+ full - executing immediate purge');
          await this.executePurge(true);
        } else {
          console.warn('⚠️  Database approaching limit - scheduling purge with notification');
          await this.notifyAndSchedulePurge();
        }
      } else {
        console.log('✅ Database size within limits - no purge needed');
        await this.logRetentionStatus();
      }

      // Update monitoring statistics
      await this.updateMonitoringStats(sizeInfo);

    } catch (error) {
      console.error('Data retention check failed:', error);
      // Continue monitoring even if check fails
    }
  }

  async notifyAndSchedulePurge() {
    console.log('\n📧 PURGE NOTIFICATION - 24 Hour Warning');
    console.log('Database will be purged in 24 hours if size remains above limit');

    // Log notification in database for admin visibility
    try {
      await dbManager.query(`
        INSERT INTO data_retention_config (table_name, retention_days, last_purge, purge_count)
        VALUES ('_purge_notifications', 0, CURRENT_TIMESTAMP, 1)
        ON CONFLICT (table_name) DO UPDATE SET
          last_purge = CURRENT_TIMESTAMP,
          purge_count = data_retention_config.purge_count + 1;
      `);
    } catch (error) {
      console.error('Failed to log purge notification:', error);
    }

    // Schedule purge for 24 hours from now
    setTimeout(async () => {
      const currentSize = await dbManager.getDatabaseSize();
      if (currentSize.sizeGB >= this.dbSizeLimit) {
        console.log('⏰ 24-hour grace period expired - executing scheduled purge');
        await this.executePurge(false);
      } else {
        console.log('✅ Database size reduced below limit - canceling scheduled purge');
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  async executePurge(urgent = false) {
    console.log(`\n🗑️  EXECUTING ${urgent ? 'URGENT' : 'SCHEDULED'} DATA PURGE`);

    const startTime = Date.now();
    let totalPurged = 0;
    const results = {};

    try {
      await dbManager.transaction(async (client) => {
        console.log('Starting purge transaction...');

        // Get retention policies
        const policies = await client.query(`
          SELECT table_name, retention_days
          FROM data_retention_config
          WHERE enabled = true AND table_name != '_purge_notifications'
          ORDER BY retention_days ASC;
        `);

        console.log(`Found ${policies.rows.length} retention policies to enforce`);

        // Execute purging for each table
        for (const policy of policies.rows) {
          const tableName = policy.table_name;
          const retentionDays = policy.retention_days;

          console.log(`  → Purging ${tableName} (${retentionDays} day retention)...`);

          let purgeQuery = '';
          let dateColumn = '';

          // Define purge queries for each table
          switch (tableName) {
            case 'chat_history':
              dateColumn = 'timestamp';
              purgeQuery = `
                DELETE FROM chat_history
                WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
              `;
              break;

            case 'forum_posts':
              dateColumn = 'created_at';
              purgeQuery = `
                DELETE FROM forum_posts
                WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
              `;
              break;

            case 'forum_replies':
              dateColumn = 'created_at';
              purgeQuery = `
                DELETE FROM forum_replies
                WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
              `;
              break;

            case 'sessions':
              dateColumn = 'expires';
              purgeQuery = `
                DELETE FROM sessions
                WHERE expires < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
              `;
              break;

            case 'verification_tokens':
              dateColumn = 'expires';
              purgeQuery = `
                DELETE FROM verification_tokens
                WHERE expires < CURRENT_TIMESTAMP
              `;
              break;

            default:
              console.warn(`    ⚠️  Unknown table ${tableName} - skipping`);
              continue;
          }

          // Execute purge
          const purgeResult = await client.query(purgeQuery);
          const rowsPurged = purgeResult.rowCount || 0;
          totalPurged += rowsPurged;
          results[tableName] = rowsPurged;

          console.log(`    ✅ Purged ${rowsPurged} rows from ${tableName}`);

          // Update last purge timestamp
          await client.query(`
            UPDATE data_retention_config
            SET last_purge = CURRENT_TIMESTAMP,
                purge_count = purge_count + 1
            WHERE table_name = $1
          `, [tableName]);
        }

        // Vacuum tables to reclaim space (non-blocking)
        console.log('  → Running VACUUM to reclaim space...');
        for (const policy of policies.rows) {
          if (results[policy.table_name] > 0) {
            try {
              await client.query(`VACUUM ${policy.table_name}`);
              console.log(`    ✅ Vacuumed ${policy.table_name}`);
            } catch (vacuumError) {
              console.warn(`    ⚠️  Vacuum failed for ${policy.table_name}:`, vacuumError.message);
            }
          }
        }

        console.log('Purge transaction completed successfully');
      });

      const duration = Date.now() - startTime;
      const sizeAfter = await dbManager.getDatabaseSize();

      console.log('\n📊 PURGE COMPLETED SUCCESSFULLY');
      console.log(`Duration: ${duration}ms`);
      console.log(`Total rows purged: ${totalPurged}`);
      console.log(`Database size after: ${sizeAfter.sizePretty} (${sizeAfter.sizeGB.toFixed(3)}GB)`);
      console.log(`New usage: ${((sizeAfter.sizeGB / 3) * 100).toFixed(1)}% of 3GB limit`);

      // Log detailed results
      console.log('\nPurge breakdown:');
      Object.entries(results).forEach(([table, rows]) => {
        console.log(`  • ${table}: ${rows} rows`);
      });

      return {
        success: true,
        totalPurged,
        duration,
        sizeAfter: sizeAfter.sizeGB,
        results
      };

    } catch (error) {
      console.error('\n❌ PURGE FAILED:', error);
      throw error;
    }
  }

  async logRetentionStatus() {
    try {
      // Get table statistics
      const stats = await dbManager.query(`
        SELECT
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows
        FROM pg_stat_user_tables
        WHERE tablename IN ('chat_history', 'forum_posts', 'forum_replies', 'sessions')
        ORDER BY tablename;
      `);

      console.log('\n📋 Table Statistics:');
      stats.rows.forEach(stat => {
        console.log(`  • ${stat.tablename}: ${stat.live_rows} live rows, ${stat.dead_rows} dead rows`);
      });

      // Get recent retention activity
      const recentPurges = await dbManager.query(`
        SELECT table_name, last_purge, purge_count
        FROM data_retention_config
        WHERE last_purge IS NOT NULL
        ORDER BY last_purge DESC
        LIMIT 5;
      `);

      if (recentPurges.rows.length > 0) {
        console.log('\n🕒 Recent Purges:');
        recentPurges.rows.forEach(purge => {
          const lastPurge = new Date(purge.last_purge).toLocaleString();
          console.log(`  • ${purge.table_name}: ${lastPurge} (${purge.purge_count} total purges)`);
        });
      }

    } catch (error) {
      console.error('Failed to log retention status:', error);
    }
  }

  async updateMonitoringStats(sizeInfo) {
    try {
      await dbManager.query(`
        INSERT INTO data_retention_config (table_name, retention_days, last_purge, purge_count)
        VALUES ('_monitoring_stats', 0, CURRENT_TIMESTAMP, $1)
        ON CONFLICT (table_name) DO UPDATE SET
          last_purge = CURRENT_TIMESTAMP,
          purge_count = $1;
      `, [Math.round(sizeInfo.sizeGB * 1000)]); // Store size in MB as integer
    } catch (error) {
      console.error('Failed to update monitoring stats:', error);
    }
  }

  async getRetentionReport() {
    try {
      const policies = await dbManager.query(`
        SELECT
          table_name,
          retention_days,
          last_purge,
          purge_count,
          enabled
        FROM data_retention_config
        WHERE table_name != '_monitoring_stats'
        ORDER BY table_name;
      `);

      const sizeInfo = await dbManager.getDatabaseSize();
      const connectionStats = await dbManager.getConnectionStats();

      return {
        databaseSize: sizeInfo,
        connections: connectionStats,
        retentionPolicies: policies.rows,
        monitoringEnabled: this.enabled,
        sizeLimit: this.dbSizeLimit,
        checkInterval: this.checkInterval,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to generate retention report:', error);
      throw error;
    }
  }
}

// Singleton instance
const retentionManager = new DataRetentionManager();

// Export functions
export async function startDataRetention() {
  return await retentionManager.startMonitoring();
}

export async function stopDataRetention() {
  return await retentionManager.stopMonitoring();
}

export async function executePurgeNow(urgent = false) {
  return await retentionManager.executePurge(urgent);
}

export async function checkRetentionStatus() {
  return await retentionManager.checkAndPurge();
}

export async function getRetentionReport() {
  return await retentionManager.getRetentionReport();
}

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_AUTO_PURGE === 'true') {
  console.log('Starting automatic data retention monitoring...');
  startDataRetention().catch(error => {
    console.error('Failed to start data retention monitoring:', error);
  });
}

export default retentionManager;