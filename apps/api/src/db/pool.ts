import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err: Error) => {
  logger.error('PostgreSQL pool error:', err);
});

pool.on('connect', () => {
  logger.debug('New DB client connected');
});

export const query = async (text: string, params?: unknown[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  logger.debug('query', { text: text.slice(0, 80), duration, rows: res.rowCount });
  return res;
};

export const getClient = () => pool.connect();

export const transaction = async <T>(
  fn: (q: (text: string, params?: any[]) => Promise<any>) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn((text, params) => client.query(text, params));
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export default pool;
