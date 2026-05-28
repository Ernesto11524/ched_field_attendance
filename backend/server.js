require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes       = require('./src/routes/auth.routes');
const workerRoutes     = require('./src/routes/worker.routes');
const siteRoutes       = require('./src/routes/site.routes');
const checkinRoutes    = require('./src/routes/checkin.routes');
const webauthnRoutes   = require('./src/routes/webauthn.routes');
const adminRoutes      = require('./src/routes/admin.routes');
const errorHandler     = require('./src/middleware/error.middleware');

const app = express();

// ── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: [
    'https://ched-field-attendance.vercel.app',
    'https://ched-field-attendance-1yo8.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
}));
app.use(express.json());

// ── Health check ──────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/workers',  workerRoutes);
app.use('/api/sites',    siteRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/webauthn', webauthnRoutes);
app.use('/api/admin',    adminRoutes);

// ── Global error handler (must be last) ──────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
