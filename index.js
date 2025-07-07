const express = require('express');
const signale = require('signale');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const helmet = require('helmet');
const apicache = require('apicache');
const cache = apicache.middleware;
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const freejobalert = require('./routes/freejobRoutes');
const authRoutes = require('./routes/authRoutes');
const userInterestRoutes = require('./routes/userInterestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { protect } = require('./middleware/authMiddleware');
const securityMiddleware = require('./middleware/security');
const { latestNotifications, topicScraper, smartScraper, educationNotifications } = require('./customModules/freejobalerts/scraper');
const { upsertJobs, initDB, closeDB } = require('./db/sqlite');
const dataManager = require('./customModules/freejobalerts/dataManager');
const stateCodes = require('./data/freeJobAlertStateMap.json');
const cron = require('node-cron');
const firebaseService = require('./services/firebaseService');
const EnvValidator = require('./utils/envValidator');

// Load environment variables
dotenv.config();

// Validate environment variables
try {
  EnvValidator.validateEnvironment();
  EnvValidator.validateDatabaseConnection();
  EnvValidator.validateFirebaseConfig();
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  process.exit(1);
}

const app = express();

// Configure apicache
apicache.options({
  statusCodes: { include: [200, 201] }, // Only cache successful responses
  headers: { 'cache-control': 'no-cache' }, // Don't cache sensitive data
});

const log = signale.scope('server:global');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    log.success('✅ Connected to MongoDB');
    // Initialize SQLite database
    return initDB();
  })
  .then(() => {
    log.success('✅ SQLite database initialized');
  })
  .catch(err => {
    log.error('❌ Database connection error:', err.message);
    process.exit(1);
  });

// Graceful shutdown handler
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('uncaughtException', (error) => {
  log.error('❌ Uncaught Exception:', error.message);
  gracefulShutdown();
});
process.on('unhandledRejection', (reason, promise) => {
  log.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

async function gracefulShutdown() {
  console.log('📴 Shutting down gracefully...');
  
  try {
    await closeDB();
    await mongoose.connection.close();
    console.log('✅ Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
}

// Security Middleware
app.set('trust proxy', 1); // Trust first proxy for rate limiting when deployed behind a reverse proxy

// Apply comprehensive security middleware
securityMiddleware(app);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health and monitoring routes
app.use('/health', healthRoutes);

// Public Routes
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Jobful API Server',
    status: 'operational',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.use('/auth', authRoutes);
app.use('/user', userInterestRoutes);
app.use('/notifications', notificationRoutes);

app.use('/freejobalert/v1', protect, cache('10 minutes'), freejobalert);

// Centralized Error Handling
app.use((err, req, res, next) => {
  log.error('❌ Unhandled Error:', err.message);
  
  // Don't expose sensitive information in production
  const isDev = process.env.NODE_ENV === 'development';
  const errorResponse = {
    success: false,
    message: isDev ? err.message : 'Internal Server Error',
    ...(isDev && { stack: err.stack })
  };
  
  res.status(err.status || 500).json(errorResponse);
});

app.all('*', notFound);

function notFound(req, res) {
  log.error('❌ Invalid URL:', req.originalUrl);
  res.status(404).json({ 
    success: false, 
    message: '404: Resource not found',
    path: req.originalUrl 
  });
}

// Pre-fetch and cache all state jobs
const refreshAllJobData = async () => {
  const startTime = Date.now();
  log.info('🔄 Starting job data refresh cycle...');
  
  try {
    const categories = [
      { name: 'latest', scraper: () => latestNotifications('https://www.freejobalert.com/latest-notifications/') },
      { name: 'defence', scraper: () => topicScraper('http://www.freejobalert.com/police-defence-jobs/', 'All India Defence Jobs') },
      { name: 'railway', scraper: () => topicScraper('http://www.freejobalert.com/railway-jobs/', 'All India Railway Jobs') },
      { name: 'engineering', scraper: () => topicScraper('http://www.freejobalert.com/engineering-jobs/', 'All India Engineering Jobs') },
      { name: 'bank', scraper: () => topicScraper('http://www.freejobalert.com/bank-jobs/', 'Banking Jobs') },
      { name: 'teaching', scraper: () => topicScraper('http://www.freejobalert.com/teaching-faculty-jobs/', 'All India Teaching Jobs') },
      { name: 'education', scraper: () => educationNotifications('https://www.freejobalert.com/education/') }
    ];

    let successCount = 0;
    let errorCount = 0;

    // Process categories with error handling
    for (const category of categories) {
      try {
        log.info(`📊 Processing category: ${category.name}`);
        const result = await category.scraper();
        
        if (result.success && result.data) {
          await upsertJobs(category.name, result.data);
          await dataManager.checkForNewJobs(category.name, result);
          successCount++;
          log.success(`✅ ${category.name}: ${result.data.length} jobs processed`);
        } else {
          log.error(`❌ ${category.name}: ${result.error || 'Unknown error'}`);
          errorCount++;
        }
      } catch (error) {
        log.error(`❌ ${category.name} failed:`, error.message);
        errorCount++;
      }
    }

    // Handle state jobs with error handling
    for (const state of stateCodes) {
      try {
        const categoryName = `state_${state.code}`;
        log.info(`📊 Processing state: ${state.name} (${state.code})`);
        
        const result = await smartScraper(state.link);
        if (result.success && result.data) {
          await upsertJobs(categoryName, result.data);
          await dataManager.checkForNewJobs(categoryName, result);
          successCount++;
          log.success(`✅ ${state.name}: ${result.data.length} jobs processed`);
        } else {
          log.error(`❌ ${state.name}: ${result.error || 'Unknown error'}`);
          errorCount++;
        }
      } catch (error) {
        log.error(`❌ State ${state.name} failed:`, error.message);
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;
    log.success(`🎉 Job refresh completed in ${duration}ms - Success: ${successCount}, Errors: ${errorCount}`);
    
    // Log errors if any
    if (errorCount > 0) {
      log.warn(`⚠️ ${errorCount} categories failed during refresh`);
    }
    
  } catch (error) {
    log.error('❌ Critical error during job refresh:', error.message);
    // Don't throw here to prevent cron job from stopping
  }
}

// Schedule cron job with error handling
cron.schedule('*/30 * * * *', async () => {
  try {
    await refreshAllJobData();
  } catch (error) {
    log.error('❌ Cron job failed:', error.message);
  }
}); 

// Initial run with delay to ensure all services are ready
setTimeout(async () => {
  try {
    log.info('🚀 Running initial job data refresh...');
    await refreshAllJobData();
  } catch (error) {
    log.error('❌ Initial refresh failed:', error.message);
  }
}, 5000);

// Initialize Firebase with error handling
try {
  firebaseService.initialize();
  log.success('✅ Firebase service initialized');
} catch (error) {
  log.error('❌ Firebase initialization failed:', error.message);
}

const PORT = process.env.PORT || 5115;
const server = app.listen(PORT, () => {
  log.watch(`🚀 Server listening on port: ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  log.error('❌ Server error:', error.message);
  process.exit(1);
});