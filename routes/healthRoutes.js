const express = require('express');
const mongoose = require('mongoose');
const { db } = require('../db/sqlite');
const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {},
    version: process.env.npm_package_version || '1.0.0'
  };

  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      health.services.mongodb = { status: 'connected' };
    } else {
      health.services.mongodb = { status: 'disconnected' };
      health.status = 'degraded';
    }

    // Check SQLite connection
    try {
      await new Promise((resolve, reject) => {
        db.get('SELECT 1', (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      health.services.sqlite = { status: 'connected' };
    } catch (error) {
      health.services.sqlite = { status: 'error', error: error.message };
      health.status = 'degraded';
    }

    // Check environment variables
    const requiredEnvVars = [
      'MONGO_URI',
      'JWT_ACCESS_SECRET',
      'FIREBASE_PROJECT_ID',
      'SMTP_HOST'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      health.services.environment = { 
        status: 'error', 
        missing: missingVars 
      };
      health.status = 'unhealthy';
    } else {
      health.services.environment = { status: 'ok' };
    }

    health.responseTime = `${Date.now() - startTime}ms`;

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});

// Readiness check (for container orchestration)
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are available
    const mongoReady = mongoose.connection.readyState === 1;
    const sqliteReady = await new Promise((resolve) => {
      db.get('SELECT 1', (err) => resolve(!err));
    });

    if (mongoReady && sqliteReady) {
      res.status(200).json({ ready: true });
    } else {
      res.status(503).json({ ready: false });
    }
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

// Liveness check (for container orchestration)
router.get('/live', (req, res) => {
  res.status(200).json({ alive: true });
});

module.exports = router;
