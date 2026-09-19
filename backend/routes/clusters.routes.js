const express = require('express');
const db = require('../database/connection');

const router = express.Router();

const CLUSTERS = [
  { id: 1, name: 'Alfonso Lista Cluster' },
  { id: 2, name: 'BRASO Cluster' },
  { id: 3, name: 'Cabatuan Cluster' },
  { id: 4, name: 'Ramon Cluster' },
  { id: 5, name: 'San Mateo Cluster' },
  { id: 6, name: 'VillaSS Cluster' }
];

const CHURCHES_BY_CLUSTER = {
  1: ['Alfonso Lista First UMC', 'Bagong Sikat UMC', 'Namillangan UMC', 'San Quintin UMC', 'Sta. Maria UMC', 'Zion UMC'],
  2: ['Burgos UMC', 'General Aguinaldo UMC', 'Oscariz UMC', 'Rising Hope UMC', 'San Marcos UMC'],
  3: ['Cabatuan UMC', 'La Paz UMC', 'Namnama UMC', 'Tandul UMC'],
  4: ['Aldersgate UMC', 'Grace UMC', 'Ramon UMC', 'San Sebastian UMC', 'Wesley UMC'],
  5: ['Gaddanan UMC', 'Salinungan East UMC', 'Salinungan West UMC', 'San Mateo UMC', 'The Crossroad UMC', 'Victoria MC'],
  6: ['Sinamar Norte UMC', 'Sinamar Sur UMC', 'Villa Cruz UMC', 'Villa Fuerte UMC', 'Villa Magat UMC']
};

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name FROM clusters ORDER BY name ASC');
    if (result.rows.length > 0) {
      return res.json(result.rows);
    }

    return res.json(CLUSTERS);
  } catch (error) {
    return res.json(CLUSTERS);
  }
});

router.get('/:clusterId/churches', async (req, res) => {
  const clusterId = Number(req.params.clusterId);
  const churches = CHURCHES_BY_CLUSTER[clusterId] || [];

  if (churches.length > 0) {
    return res.json(churches.map((name, index) => ({ id: index + 1, name })));
  }

  try {
    const result = await db.query(
      'SELECT id, name FROM local_churches WHERE cluster_id = $1 ORDER BY name ASC',
      [clusterId]
    );

    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load church list.' });
  }
});

module.exports = router;
