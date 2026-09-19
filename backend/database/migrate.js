const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

logger.info('[1/3] Script initialized. Loading database module...');

const db = require('./connection');

const runMigrations = async () => {
  logger.info('[2/3] Connecting to Neon PostgreSQL cloud database...');
  try {
    const migrationDirectory = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationDirectory)
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();

    logger.info(`[3/3] Executing ${migrationFiles.length} database migrations...`);
    for (const migrationFile of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationDirectory, migrationFile), 'utf8');
      await db.query(sql);
      logger.info(`Applied migration ${migrationFile}`);
    }
    logger.info('SUCCESS: Database migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed with error:', error.message);
    process.exit(1);
  }
};

runMigrations();