require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const captureRouter = require('./routes/capture');
const eventsRouter = require('./routes/events');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: [
    'https://flash-it-kiosk.vercel.app',
    'http://localhost:5173',
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-admin-key'],
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  const keys = {
    FAL_API_KEY:          !!process.env.FAL_API_KEY && !process.env.FAL_API_KEY.startsWith('your_'),
    R2_ACCOUNT_ID:        !!process.env.R2_ACCOUNT_ID && !process.env.R2_ACCOUNT_ID.startsWith('your_'),
    R2_ACCESS_KEY_ID:     !!process.env.R2_ACCESS_KEY_ID && !process.env.R2_ACCESS_KEY_ID.startsWith('your_'),
    R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY && !process.env.R2_SECRET_ACCESS_KEY.startsWith('your_'),
    R2_BUCKET_NAME:       !!process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL:        !!process.env.R2_PUBLIC_URL && !process.env.R2_PUBLIC_URL.startsWith('https://your'),
    TWILIO_ACCOUNT_SID:   !!process.env.TWILIO_ACCOUNT_SID && !process.env.TWILIO_ACCOUNT_SID.startsWith('your_'),
    MONDAY_API_KEY:       !!process.env.MONDAY_API_KEY,
  };
  const allReady = Object.values(keys).every(Boolean);
  res.status(200).json({
    status: allReady ? 'ok' : 'missing_config',
    service: 'Flash-It API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    keys,
  });
});

app.use('/capture', captureRouter);
app.use('/events', eventsRouter);
app.use('/admin', adminRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Flash-It API running on port ${PORT}`);
});

module.exports = app;
