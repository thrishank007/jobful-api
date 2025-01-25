const express = require('express');
const signale = require('signale');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const freejobalert = require('./routes/freejobRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
dotenv.config();

const log = signale.scope('server:global');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => log.success('Connected to MongoDB'))
  .catch(err => log.error('MongoDB connection error:', err));

// Security Middleware
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

app.use(express.json());
app.use(cookieParser());

// Public Routes
app.get('/', (req, res) => {
  res.status(200).json({ msg: 'In Root' });
});

app.use('/auth', authRoutes);

app.use('/freejobalert/v1', freejobalert);

// Centralized Error Handling
app.use((err, req, res, next) => {
  log.error('Unhandled Error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

app.all('*', notFound);

function notFound(req, res) {
  log.error('Invalid URL');
  res.status(404).json({ success: false, error: '404: Invalid URL' });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  log.watch(`Listening on port: ${PORT}`);
});