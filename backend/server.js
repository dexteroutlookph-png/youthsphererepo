const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const db = require('./database/connection');
const app = express();
const PORT = Number(process.env.PORT || 5001);
const frontendRoot = path.resolve(__dirname, '../frontend');

const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS policy: origin not allowed'));
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

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));
app.use(express.static(frontendRoot));

app.get('/api/health', async (req, res) => {
  const configuration = {
    database: Boolean(process.env.DATABASE_URL),
    jwt: Boolean(process.env.JWT_SECRET),
    cloudinary: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    )
  };

  if (!configuration.database || !configuration.jwt) {
    return res.status(503).json({
      status: 'error',
      message: 'Required production configuration is missing.',
      configuration
    });
  }

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
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/reports', require('./routes/reports.routes'));

const frontendPages = {
  '/': 'index.html',
  '/login': 'login.html',
  '/register': 'register.html',
  '/announcements': 'announcements.html',
  '/rewards': 'rewards.html',
  '/profile': 'profile.html',
  '/notifications': 'notifications.html',
  '/forgot-password': 'forgot-password.html',
  '/reset-password': 'reset-password.html'
};

Object.entries(frontendPages).forEach(([route, file]) => {
  app.get(route, (req, res) => res.sendFile(path.join(frontendRoot, file)));
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' ? { detail: err.message } : {})
  });
});

const startServer = (port) => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`YouthSphere API running on port ${port}`);
  });
};

if (require.main === module) {
  startServer(PORT);
}

module.exports = app;