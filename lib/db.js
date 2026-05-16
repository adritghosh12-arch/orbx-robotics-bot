import { Pool } from 'pg';

let pool;

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Add connection pool settings for better reliability
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
};

export const query = (text, params) => {
  // Only initialize pool when actually needed
  if (typeof window === 'undefined') {
    return getPool().query(text, params);
  }
  throw new Error('Database queries are not supported on the client side');
};

export const getClient = () => {
  if (typeof window === 'undefined') {
    return getPool().connect();
  }
  throw new Error('Database connections are not supported on the client side');
};

export default { query, getClient };
