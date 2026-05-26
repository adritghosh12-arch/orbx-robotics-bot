import { Pool } from 'pg';

// Enhanced PostgreSQL connection with pooling and protection
class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async connect() {
    if (this.pool && this.isConnected) {
      return this.pool;
    }

    try {
      console.log('Initializing enhanced database connection...');

      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: parseInt(process.env.DATABASE_MAX_CONNECTIONS) || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        // Enhanced connection settings
        statement_timeout: 30000, // 30 seconds
        query_timeout: 30000,
        application_name: 'orbx-ai-chatbot',
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      console.log('Enhanced database connected successfully');

      // Connection event listeners
      this.pool.on('error', (err) => {
        console.error('Database pool error:', err);
        this.isConnected = false;
      });

      this.pool.on('connect', () => {
        console.log('New database client connected');
      });

      this.pool.on('remove', () => {
        console.log('Database client removed from pool');
      });

      return this.pool;
    } catch (error) {
      console.error('Enhanced database connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async query(text, params = []) {
    if (!this.pool || !this.isConnected) {
      await this.connect();
    }

    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        console.log('Executing query:', text.substring(0, 100) + '...');
        const start = Date.now();
        const result = await this.pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`Query executed in ${duration}ms, returned ${result.rows.length} rows`);
        return result;
      } catch (error) {
        retries++;
        console.error(`Query attempt ${retries} failed:`, error.message);

        if (retries >= this.maxRetries) {
          console.error('Max retries exceeded for query:', text.substring(0, 50) + '...');
          throw error;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * retries));

        // Try to reconnect if connection was lost
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          console.log('Connection lost, attempting to reconnect...');
          this.isConnected = false;
          await this.connect();
        }
      }
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      console.log('Transaction started');

      const result = await callback(client);

      await client.query('COMMIT');
      console.log('Transaction committed');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction rolled back:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async getDatabaseSize() {
    try {
      const result = await this.query(`
        SELECT
          pg_size_pretty(pg_database_size(current_database())) as size_pretty,
          pg_database_size(current_database()) as size_bytes
      `);
      return {
        sizeBytes: parseInt(result.rows[0].size_bytes),
        sizePretty: result.rows[0].size_pretty,
        sizeGB: parseInt(result.rows[0].size_bytes) / (1024 * 1024 * 1024)
      };
    } catch (error) {
      console.error('Failed to get database size:', error);
      return { sizeBytes: 0, sizePretty: 'Unknown', sizeGB: 0 };
    }
  }

  async getConnectionStats() {
    try {
      const result = await this.query(`
        SELECT
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);
      return {
        total: parseInt(result.rows[0].total_connections),
        active: parseInt(result.rows[0].active_connections),
        idle: parseInt(result.rows[0].idle_connections),
        pool: {
          total: this.pool?.totalCount || 0,
          idle: this.pool?.idleCount || 0,
          waiting: this.pool?.waitingCount || 0
        }
      };
    } catch (error) {
      console.error('Failed to get connection stats:', error);
      return { total: 0, active: 0, idle: 0, pool: { total: 0, idle: 0, waiting: 0 } };
    }
  }

  async healthCheck() {
    try {
      const start = Date.now();
      await this.query('SELECT 1 as health');
      const responseTime = Date.now() - start;

      const [dbSize, connectionStats] = await Promise.all([
        this.getDatabaseSize(),
        this.getConnectionStats()
      ]);

      return {
        status: 'healthy',
        responseTime,
        database: dbSize,
        connections: connectionStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async close() {
    if (this.pool) {
      console.log('Closing database pool...');
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('Database pool closed');
    }
  }
}

// Singleton instance
const dbManager = new DatabaseManager();

// Enhanced query functions with backward compatibility
export async function query(text, params) {
  return await dbManager.query(text, params);
}

export async function transaction(callback) {
  return await dbManager.transaction(callback);
}

export async function getDatabaseHealth() {
  return await dbManager.healthCheck();
}

export async function getDatabaseSize() {
  return await dbManager.getDatabaseSize();
}

export async function getConnectionStats() {
  return await dbManager.getConnectionStats();
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connections...');
  await dbManager.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connections...');
  await dbManager.close();
  process.exit(0);
});

export default dbManager;