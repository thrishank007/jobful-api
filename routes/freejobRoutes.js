const express = require("express");
const router = express.Router();
const signale = require("signale");
const stateCodes = require("../data/freeJobAlertStateMap.json");
const { protect } = require('../middleware/authMiddleware');
const { parse } = require("dotenv");
const log = signale.scope("freejobalert:global");

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
// router.get("/",parsePaginationParams,protect, asyncHandler(getDefault));
// router.get("/latest-edu", parsePaginationParams, protect, asyncHandler(latestEdu));
// router.get('/gov/other-all-india-exam', parsePaginationParams, protect, asyncHandler(otherAllIndiaExam));
// router.get('/gov/state/:code([a-zA-Z]{2})', parsePaginationParams, protect, asyncHandler(stateWiseGovjobs));
// router.get('/bank-jobs', parsePaginationParams, protect, asyncHandler(bankJobs));
// router.get('/teaching-jobs', parsePaginationParams, protect, asyncHandler(allIndiaTeachingJobs));
// router.get('/engineering-jobs', parsePaginationParams, protect, asyncHandler(allIndiaEngineeringJobs));
// router.get('/railway-jobs', parsePaginationParams, protect, asyncHandler(allIndiaRailwayJobs));
// router.get('/defence-jobs', parsePaginationParams, protect, asyncHandler(allIndiaDefenceJobs));

// Invalid URL
router.all("*", notFound);

function notFound(req, res) {
  log.error("Invalid URL");
  res.status(404).json({ success: false, error: "404: Invalid URL" });
}

module.exports = router;
