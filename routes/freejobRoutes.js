const express = require("express");
const router = express.Router();
const signale = require('signale');
const { latestNotifications, topicScraper, smartScraper, educationNotifications } = require('../customModules/freejobalerts/scraper');
const { getJobs } = require('../db/sqlite');
const stateCodes = require('../data/freeJobAlertStateMap.json');

const log = signale.scope('freejobalert:global');

// Middleware to handle async routes
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Routes with pagination
router.get('/', asyncHandler(paginatedHandler('latest')));
router.get('/gov/other-all-india-exam', asyncHandler(paginatedHandler('otherallindia')));
router.get('/gov/state/:code([a-zA-Z]{2})', asyncHandler(stateWiseGovjobs));
router.get('/bank-jobs', asyncHandler(paginatedHandler('bank')));
router.get('/teaching-jobs', asyncHandler(paginatedHandler('teaching')));
router.get('/engineering-jobs', asyncHandler(paginatedHandler('engineering')));
router.get('/railway-jobs', asyncHandler(paginatedHandler('railway')));
router.get('/defence-jobs', asyncHandler(paginatedHandler('defence')));
router.get('/latest-edu', asyncHandler(paginatedHandler('education')));
// Invalid URL
router.all('*', notFound);

// Middleware functions
function paginatedHandler(type) {
  return async function (req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const result = await getJobs(type, offset, limit);
    res.status(200).json({ success: true, ...result, page, limit });
  };
}

async function stateWiseGovjobs(req, res) {
  const log = signale.scope('freejobalert:stateWiseGovjobs');
  const stateCode = req.params.code.toUpperCase();
  const state = stateCodes.find(item => item.code === stateCode);
  if (!state) {
    log.error(`State code ${stateCode} not found`);
    res.status(404).json({ success: false, error: 'State code not found' });
    return;
  }
  // Use state code as type for caching
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const type = `state_${stateCode}`;
  let result = await getJobs(type, offset, limit);
  // If not found in DB, fallback to scrape and cache
  if (!result.data || result.data.length === 0) {
    const URL = state.link;
    log.info('Cache miss, scraping:', URL);
    const scrapeResult = await smartScraper(URL);
    if (!scrapeResult.success) {
      log.error(scrapeResult.error);
      res.status(404).json({ success: false, error: 'Something went wrong' });
      return;
    }
    // Save to DB
    const { upsertJobs } = require('../db/sqlite');
    await upsertJobs(type, scrapeResult.data);
    result = await getJobs(type, offset, limit);
  }
  res.status(200).json({ success: true, ...result, page, limit });
}

// ...existing code...

function notFound(req, res) {
  log.error("Invalid URL");
  res.status(404).json({ success: false, error: "404: Invalid URL" });
}

module.exports = router;
