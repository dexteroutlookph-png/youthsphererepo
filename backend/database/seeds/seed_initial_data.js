const bcrypt = require('bcryptjs');
const db = require('../connection');
const logger = require('../../utils/logger');
require('dotenv').config();

const seedInitialData = async () => {
  logger.info('Starting database seeding...');
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Seed ISIED clusters
    const initialClusters = [
      'Alfonso Lista Cluster',
      'BRASO Cluster',
      'Cabatuan Cluster',
      'Ramon Cluster',
      'San Mateo Cluster',
      'VillaSS Cluster'
    ];

    for (const clusterName of initialClusters) {
      await client.query(
        `INSERT INTO clusters (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [clusterName]
      );
    }
    logger.info('Clusters seeded successfully');

    // 2. Seed local churches for each cluster
    const clusterChurchMap = {
      'Alfonso Lista Cluster': [
        'Alfonso Lista First UMC',
        'Bagong Sikat UMC',
        'Namillangan UMC',
        'San Quintin UMC',
        'Sta. Maria UMC',
        'Zion UMC'
      ],
      'BRASO Cluster': [
        'Burgos UMC',
        'General Aguinaldo UMC',
        'Oscariz UMC',
        'Rising Hope UMC',
        'San Marcos UMC'
      ],
      'Cabatuan Cluster': [
        'Cabatuan UMC',
        'La Paz UMC',
        'Namnama UMC',
        'Tandul UMC'
      ],
      'Ramon Cluster': [
        'Aldersgate UMC',
        'Grace UMC',
        'Ramon UMC',
        'San Sebastian UMC',
        'Wesley UMC'
      ],
      'San Mateo Cluster': [
        'Gaddanan UMC',
        'Salinungan East UMC',
        'Salinungan West UMC',
        'San Mateo UMC',
        'The Crossroad UMC',
        'Victoria MC'
      ],
      'VillaSS Cluster': [
        'Sinamar Norte UMC',
        'Sinamar Sur UMC',
        'Villa Cruz UMC',
        'Villa Fuerte UMC',
        'Villa Magat UMC'
      ]
    };

    for (const [clusterName, churches] of Object.entries(clusterChurchMap)) {
      const clusterRes = await client.query(`SELECT id FROM clusters WHERE name = $1`, [clusterName]);
      if (clusterRes.rows.length > 0) {
        const clusterId = clusterRes.rows[0].id;

        for (const churchName of churches) {
          await client.query(
            `INSERT INTO local_churches (cluster_id, name) VALUES ($1, $2) ON CONFLICT (cluster_id, name) DO NOTHING`,
            [clusterId, churchName]
          );
        }
      }
    }
    logger.info('Churches seeded successfully');

    // 3. Seed Initial Admin Account if specified in .env
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@isied-youthsphere.org';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeThisAdminPassword2026!';
    const adminUsername = process.env.SEED_ADMIN_USERNAME || 'isied_admin';

    const existingAdmin = await client.query(`SELECT id FROM users WHERE email = $1 OR username = $2`, [adminEmail, adminUsername]);

    if (existingAdmin.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      await client.query(
        `INSERT INTO users (
          first_name, middle_name, last_name, username, email, password_hash, birthday, role
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'ISIED',
          'District',
          'Admin',
          adminUsername,
          adminEmail,
          hashedPassword,
          '2000-01-01',
          'admin'
        ]
      );
      logger.info(`Seeded initial Admin account: ${adminUsername} (${adminEmail})`);
    } else {
      logger.info('Admin account already exists, skipping.');
    }

    await client.query('COMMIT');
    logger.info('Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Seeding error:', error);
    process.exit(1);
  } finally {
    client.release();
  }
};

seedInitialData();