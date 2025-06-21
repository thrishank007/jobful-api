const express = require("express");
const router = express.Router();
const signale = require('signale');
const { latestNotifications, topicScraper, smartScraper, educationNotifications } = require('../customModules/freejobalerts/scraper');
const stateCodes = require('../data/freeJobAlertStateMap.json');

const log = signale.scope('freejobalert:global');

// Middleware to handle async routes
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Routes
router.get('/', asyncHandler(getDefault));
router.get('/gov/other-all-india-exam', asyncHandler(otherAllIndiaExam));
router.get('/gov/state/:code([a-zA-Z]{2})', asyncHandler(stateWiseGovjobs));
router.get('/bank-jobs', asyncHandler(bankJobs));
router.get('/teaching-jobs', asyncHandler(allIndiaTeachingJobs));
router.get('/engineering-jobs', asyncHandler(allIndiaEngineeringJobs));
router.get('/railway-jobs', asyncHandler(allIndiaRailwayJobs));
router.get('/defence-jobs', asyncHandler(allIndiaDefenceJobs));
router.get('/latest-edu', asyncHandler(latestEdu));
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
  const result = await smartScraper(URL);
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
  const result = await topicScraper(URL, topic);
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
  const result = await topicScraper(URL, topic);
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
  const result = await topicScraper(URL, topic);
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
  const result = await topicScraper(URL, topic);
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
  const result = await topicScraper(URL, topic);
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
  const result = await topicScraper(URL, topic);
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
  const result = await latestNotifications(URL);
  if (!result.success) {
    log.error(result.error);
    res.status(404).json({ success: false, error: 'Something went wrong' });
    return;
  }
  log.success(result);
  res.status(200).json(result);
}

async function latestEdu(req, res) {
  const log = signale.scope('freejobalert:latestEdu');
  const URL = 'https://www.freejobalert.com/education/';
  const result = await educationNotifications(URL);
  if (!result.success) {
    log.error(result.error);
    res.status(404).json({ success: false, error: 'Something went wrong' });
    return;
  }
  log.success(result);
  res.status(200).json(result);
}

function notFound(req, res) {
  log.error("Invalid URL");
  res.status(404).json({ success: false, error: "404: Invalid URL" });
}

module.exports = router;
