const { Pool } = require('pg');
const dbConfig = require('../config/db.config');
const logger = require('../utils/logger');

// Strip Neon/host-specific settings that can break pg connections
let cleanConnectionString = dbConfig.connectionString;
if (cleanConnectionString) {
  cleanConnectionString = cleanConnectionString
    .replace(/([?&])channel_binding=[^&]*/g, '$1')
    .replace(/[?&]$/, '');
}

const sslConfig = dbConfig.ssl && typeof dbConfig.ssl === 'object'
  ? dbConfig.ssl
  : false;

const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: sslConfig,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000
});

pool.on('connect', () => {
  logger.info('Connected to PostgreSQL Database Pool');
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL Client Error', err);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      logger.info(`Executed Query [${duration}ms]: ${text.substring(0, 80)}...`);
    }
    return res;
  } catch (error) {
    logger.error('Database Query Failure', { text, error: error.message });
    throw error;
  }
};

const getClient = async () => {
  const client = await pool.connect();
  return client;
};

module.exports = {
  query,
  getClient,
  pool
};