const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

logger.info('[1/3] Script initialized. Loading database module...');

const db = require('./connection');

const runMigrations = async () => {
  logger.info('[2/3] Connecting to Neon PostgreSQL cloud database...');
  try {
    const migrationFilePath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    const sql = fs.readFileSync(migrationFilePath, 'utf8');
    
    logger.info('[3/3] Executing database table creation queries...');
    await db.query(sql);
    logger.info('SUCCESS: All 15 database tables created successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed with error:', error.message);
    process.exit(1);
  }
};

runMigrations();