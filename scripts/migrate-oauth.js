import dbManager from '../lib/db-enhanced.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('=== OAUTH DATABASE MIGRATION ===');
console.log('Starting database migration for federated authentication...');

async function migrateDatabase() {
  try {
    console.log('\n1. Testing database connection...');
    const health = await dbManager.healthCheck();
    console.log('Database health:', health.status);
    if (health.status !== 'healthy') {
      throw new Error(`Database unhealthy: ${health.error}`);
    }

    console.log('\n2. Creating migration transaction...');
    await dbManager.transaction(async (client) => {

      // Step 1: Enhance existing users table (backward compatible)
      console.log('   → Enhancing users table...');
      await client.query(`
        DO $$
        BEGIN
          -- Add OAuth provider columns if they don't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='provider') THEN
            ALTER TABLE users ADD COLUMN provider VARCHAR(50) DEFAULT 'email';
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='provider_id') THEN
            ALTER TABLE users ADD COLUMN provider_id VARCHAR(255);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='name') THEN
            ALTER TABLE users ADD COLUMN name VARCHAR(255);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='image') THEN
            ALTER TABLE users ADD COLUMN image VARCHAR(500);
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified') THEN
            ALTER TABLE users ADD COLUMN email_verified TIMESTAMP;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login') THEN
            ALTER TABLE users ADD COLUMN last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
          END IF;
        END $$;
      `);

      // Step 2: Create NextAuth.js required tables
      console.log('   → Creating NextAuth accounts table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          type VARCHAR(255) NOT NULL,
          provider VARCHAR(255) NOT NULL,
          "providerAccountId" VARCHAR(255) NOT NULL,
          refresh_token TEXT,
          access_token TEXT,
          expires_at INTEGER,
          token_type VARCHAR(255),
          scope VARCHAR(255),
          id_token TEXT,
          session_state VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(provider, "providerAccountId")
        );
      `);

      console.log('   → Creating NextAuth sessions table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          "sessionToken" VARCHAR(255) UNIQUE NOT NULL,
          "userId" INTEGER NOT NULL,
          expires TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      console.log('   → Creating NextAuth verification_tokens table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS verification_tokens (
          identifier VARCHAR(255) NOT NULL,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires TIMESTAMP NOT NULL,
          PRIMARY KEY (identifier, token)
        );
      `);

      // Step 3: Create data retention configuration table
      console.log('   → Creating data retention configuration...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS data_retention_config (
          id SERIAL PRIMARY KEY,
          table_name VARCHAR(100) NOT NULL UNIQUE,
          retention_days INTEGER NOT NULL,
          last_purge TIMESTAMP,
          purge_count INTEGER DEFAULT 0,
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Step 4: Insert default retention policies
      console.log('   → Setting up retention policies...');
      await client.query(`
        INSERT INTO data_retention_config (table_name, retention_days) VALUES
          ('chat_history', 90),
          ('forum_posts', 180),
          ('forum_replies', 180),
          ('sessions', 30),
          ('verification_tokens', 1)
        ON CONFLICT (table_name) DO NOTHING;
      `);

      // Step 5: Create indexes for performance
      console.log('   → Creating performance indexes...');
      await client.query(`
        DO $$
        BEGIN
          -- Users table indexes
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_provider ON users(email, provider);
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_provider_id ON users(provider, provider_id);
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login);

          -- Accounts table indexes
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_userid ON accounts("userId");
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_provider ON accounts(provider, "providerAccountId");

          -- Sessions table indexes
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_token ON sessions("sessionToken");
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_userid ON sessions("userId");
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires ON sessions(expires);

          -- Chat history retention index
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp);
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at);
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_replies_created_at ON forum_replies(created_at);
        EXCEPTION
          WHEN duplicate_object THEN
            NULL; -- Index already exists
        END $$;
      `);

      // Step 6: Update existing users to have email provider
      console.log('   → Updating existing users...');
      await client.query(`
        UPDATE users
        SET provider = 'email', last_login = CURRENT_TIMESTAMP
        WHERE provider IS NULL;
      `);

      // Step 7: Create database size monitoring function
      console.log('   → Creating monitoring functions...');
      await client.query(`
        CREATE OR REPLACE FUNCTION get_database_size_info()
        RETURNS TABLE(
          size_bytes BIGINT,
          size_mb NUMERIC,
          size_gb NUMERIC,
          percentage_of_limit NUMERIC
        ) AS $$
        DECLARE
          db_size BIGINT;
          limit_gb NUMERIC := 3.0; -- 3GB Neon free tier limit
        BEGIN
          SELECT pg_database_size(current_database()) INTO db_size;

          RETURN QUERY
          SELECT
            db_size,
            ROUND(db_size / (1024.0 * 1024.0), 2),
            ROUND(db_size / (1024.0 * 1024.0 * 1024.0), 3),
            ROUND((db_size / (1024.0 * 1024.0 * 1024.0)) / limit_gb * 100, 2);
        END;
        $$ LANGUAGE plpgsql;
      `);

      console.log('   → Migration transaction completed successfully!');
    });

    // Step 8: Verify migration results
    console.log('\n3. Verifying migration results...');

    const tableCheck = await dbManager.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('accounts', 'sessions', 'verification_tokens', 'data_retention_config')
      ORDER BY table_name;
    `);

    console.log('   → Created tables:', tableCheck.rows.map(r => r.table_name).join(', '));

    const columnCheck = await dbManager.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('provider', 'provider_id', 'name', 'image', 'email_verified', 'last_login')
      ORDER BY column_name;
    `);

    console.log('   → Added user columns:', columnCheck.rows.map(r => r.column_name).join(', '));

    const retentionPolicies = await dbManager.query(`
      SELECT table_name, retention_days, enabled
      FROM data_retention_config
      ORDER BY table_name;
    `);

    console.log('   → Retention policies:');
    retentionPolicies.rows.forEach(policy => {
      console.log(`     • ${policy.table_name}: ${policy.retention_days} days (${policy.enabled ? 'enabled' : 'disabled'})`);
    });

    // Step 9: Database size check
    const sizeInfo = await dbManager.query('SELECT * FROM get_database_size_info()');
    const size = sizeInfo.rows[0];
    console.log('\n4. Database size check:');
    console.log(`   → Size: ${size.size_mb} MB (${size.size_gb} GB)`);
    console.log(`   → Usage: ${size.percentage_of_limit}% of 3GB limit`);

    if (size.percentage_of_limit > 80) {
      console.warn('   ⚠️  Database is over 80% full - consider running data purge');
    }

    console.log('\n✅ OAuth database migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Set up environment variables for OAuth providers');
    console.log('2. Configure NextAuth.js with provider settings');
    console.log('3. Create enhanced authentication middleware');
    console.log('4. Update frontend to support OAuth login');

    return {
      success: true,
      tablesCreated: tableCheck.rows.length,
      columnsAdded: columnCheck.rows.length,
      retentionPolicies: retentionPolicies.rows.length,
      databaseSize: size
    };

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    await dbManager.close();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateDatabase()
    .then(result => {
      console.log('\nMigration result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateDatabase };