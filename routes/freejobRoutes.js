const express = require('express');
const router = express.Router();
const signale = require('signale');
const { latestNotifications, topicScraper, smartScraper } = require('../customModules/freejobalerts/scraper');
const stateCodes = require('../data/freeJobAlertStateMap.json');
const { protect } = require('../middleware/authMiddleware');

const log = signale.scope('freejobalert:global');

// Middleware to handle async routes
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Middleware to parse query parameters for page and limit
function parsePaginationParams(req, res, next) {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  req.pagination = { page, limit };
  next();
}

// Routes
router.get('/', parsePaginationParams, protect, asyncHandler(getDefault));
router.get('/gov/other-all-india-exam', parsePaginationParams, protect, asyncHandler(otherAllIndiaExam));
router.get('/gov/state/:code([a-zA-Z]{2})', parsePaginationParams, protect, asyncHandler(stateWiseGovjobs));
router.get('/bank-jobs', parsePaginationParams, protect, asyncHandler(bankJobs));
router.get('/teaching-jobs', parsePaginationParams, protect, asyncHandler(allIndiaTeachingJobs));
router.get('/engineering-jobs', parsePaginationParams, protect, asyncHandler(allIndiaEngineeringJobs));
router.get('/railway-jobs', parsePaginationParams, protect, asyncHandler(allIndiaRailwayJobs));
router.get('/defence-jobs', parsePaginationParams, protect, asyncHandler(allIndiaDefenceJobs));

// Invalid URL
router.all('*', notFound);

// Middleware functions
async function stateWiseGovjobs(req, res) {
  const log = signale.scope('freejobalert:stateWiseGovjobs');
  const stateCode = req.params.code.toUpperCase();
  const state = stateCodes.find(item => item.code === stateCode);
  if (!state) {
    log.error(`State code ${stateCode} not found`);
    res.status(404).json({ success: false, error: 'State code not found' });
    return;
  }
  const URL = state.link;
  log.info(URL);
  const { page, limit } = req.pagination;
  const result = await smartScraper(URL, page, limit);
  if (!result.success) {
    log.error(result.error);
    res.status(404).json({ success: false, error: 'Something went wrong' });
    return;
  }
  log.success(result);
  res.status(200).json(result);
}

async function allIndiaDefenceJobs(req, res) {
  const log = signale.scope('freejobalert:allIndiaDefenceJobs');
  const URL = 'http://www.freejobalert.com/police-defence-jobs/';
  const topic = 'All India Defence Jobs';
  const { page, limit } = req.pagination;
  const result = await topicScraper(URL, topic, page, limit);
  if (!result.success) {
    log.error(result.error);
    res.status(404).json({ success: false, error: 'Something went wrong' });
    return;
  }
  log.success(result);
  res.status(200).json(result);
}

async function allIndiaRailwayJobs(req, res) {
  const log = signale.scope('freejobalert:allIndiaRailwayJobs');
  const URL = 'http://www.freejobalert.com/railway-jobs/';
  const topic = 'All India Railway Jobs';
  const { page, limit } = req.pagination;
  const result = await topicScraper(URL, topic, page, limit);
  if (!result.success) {
    log.error(result.error);
    res.status(404).json({ success: false, error: 'Something went wrong' });
    return;
  }
  log.success(result);
  res.status(200).json(result);
}

async function allIndiaEngineeringJobs(req, res) {
  const log = signale.scope('freejobalert:allIndiaEngineeringJobs');
  const URL = 'http://www.freejobalert.com/engineering-jobs/';
  const topic = 'All India Engineering Jobs';
  const { page, limit } = req.pagination;
  const result = await topicScraper(URL, topic, page, limit);
  if (!result.success) {
    log.error(result.error);
    res.status(404).json({ success: false, error: 'Something went wrong' });
    return;
  }
  log.success(result);
  res.status(200).json(result);
}

async function bankJobs(req, res) {
  const log = signale.scope('freejobalert:bankJobs');
  const URL = 'http://www.freejobalert.com/bank-jobs/';
  const topic = 'Banking Jobs';
  const { page, limit } = req.pagination;
  const result = await topicScraper(URL, topic, page, limit);
  if (!result.success) {
    log.error(result.error);
    res.status(404).json({ success: false, error: 'Something went wrong' });
    return;
  }
  log.success(result);
  res.status(200).json(result);
}

async function otherAllIndiaExam(req, res) {
  const log = signale.scope('freejobalert:otherAllIndiaExam');
  const URL = 'http://www.freejobalert.com/government-jobs/';
  const topic = 'Other All India Exams';
  const { page, limit } = req.pagination;
  const result = await topicScraper(URL, topic, page, limit);
  if (!result.success) {
    log.error(result.error);
    res.status(404).json({ success: false, error: 'Something went wrong' });
    return;
  }
  log.success(result);
  res.status(200).json(result);
}

async function allIndiaTeachingJobs(req, res) {
  const log = signale.scope('freejobalert:allIndiaTeachingJobs');
  const URL = 'http://www.freejobalert.com/teaching-faculty-jobs/';
  const topic = 'All India Teaching Jobs';
  const { page, limit } = req.pagination;
  const result = await topicScraper(URL, topic, page, limit);
  if (!result.success) {
    log.error(result.error);
    res.status(404).json({ success: false, error: 'Something went wrong' });
    return;
  }
  log.success(result);
  res.status(200).json(result);
}

async function getDefault(req, res) {
  const log = signale.scope('freejobalert:getDefault');
  const URL = 'https://www.freejobalert.com/latest-notifications/';
  const { page, limit } = req.pagination;
  const result = await latestNotifications(URL, page, limit);
  if (!result.success) {
    log.error(result.error);
    res.status(404).json({ success: false, error: 'Something went wrong' });
    return;
  }
  log.success(result);
  res.status(200).json(result);
}

function notFound(req, res) {
  log.error('Invalid URL');
  res.status(404).json({ success: false, error: '404: Invalid URL' });
}

module.exports = router;