const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const db = require('./database/connection');
const app = express();
const PORT = Number(process.env.PORT || 5001);

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS policy: origin not allowed for local debugging'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

app.use(helmet());
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() AS current_time');
    return res.json({
      status: 'ok',
      message: 'YouthSphere API is online',
      db: 'connected',
      timestamp: result.rows[0].current_time
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      ...(process.env.NODE_ENV !== 'production' ? { error: error.message } : {})
    });
  }
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/clusters', require('./routes/clusters.routes'));
app.use('/api/posts', require('./routes/posts.routes'));
app.use('/api/announcements', require('./routes/announcements.routes'));
app.use('/api/rewards', require('./routes/rewards.routes'));
app.use('/api/users', require('./routes/users.routes'));

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

const startServer = (port) => {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`YouthSphere API running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = port + 1;
      console.warn(`Port ${port} is busy. Retrying on ${fallbackPort}...`);
      startServer(fallbackPort);
      return;
    }

    throw err;
  });
};

if (require.main === module) {
  startServer(PORT);
}

module.exports = app;