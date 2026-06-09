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
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Flash-It API', version: '1.0.0', timestamp: new Date().toISOString() });
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
