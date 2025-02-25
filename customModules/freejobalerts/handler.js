const signale = require('signale');
const { latestNotifications, topicScraper, smartScraper, educationNotifications } = require('./scraper');
const stateCodes = require('../../data/freeJobAlertStateMap.json');

const log = signale.scope('handler:global');
// Assuming you have already imported signale and stateCodes, and your scraper functions (e.g., smartScraper, topicScraper, educationNotifications, latestNotifications) are available.

async function stateWiseGovjobs(stateCode) { 
  const log = signale.scope('freejobalert:stateWiseGovjobs');
  const state = stateCodes.find(item => item.code === stateCode);
  if (!state) {
    log.error(`State code ${stateCode} not found`);
    throw new Error('State code not found');
  }
  const URL = state.link;
  log.info(URL);
  const result = await smartScraper(URL);
  if (!result.success) {
    log.error(result.error);
    throw new Error('Something went wrong');
  }
  log.success(result);
  return result.data;
}

async function allIndiaDefenceJobs() {
  const log = signale.scope('freejobalert:allIndiaDefenceJobs');
  const URL = 'http://www.freejobalert.com/police-defence-jobs/';
  const topic = 'All India Defence Jobs';
  const result = await topicScraper(URL, topic);
  if (!result.success) {
    log.error(result.error);
    throw new Error('Something went wrong');
  }
  log.success(result);
  return result.data;
}

async function allIndiaRailwayJobs() {
  const log = signale.scope('freejobalert:allIndiaRailwayJobs');
  const URL = 'http://www.freejobalert.com/railway-jobs/';
  const topic = 'All India Railway Jobs';
  const result = await topicScraper(URL, topic);
  if (!result.success) {
    log.error(result.error);
    throw new Error('Something went wrong');
  }
  log.success(result);
  return result.data;
}

async function allIndiaEngineeringJobs() {
  const log = signale.scope('freejobalert:allIndiaEngineeringJobs');
  const URL = 'http://www.freejobalert.com/engineering-jobs/';
  const topic = 'All India Engineering Jobs';
  const result = await topicScraper(URL, topic);
  if (!result.success) {
    log.error(result.error);
    throw new Error('Something went wrong');
  }
  log.success(result);
  return result.data;
}

async function bankJobs() {
  const log = signale.scope('freejobalert:bankJobs');
  const URL = 'http://www.freejobalert.com/bank-jobs/';
  const topic = 'Banking Jobs';
  const result = await topicScraper(URL, topic);
  if (!result.success) {
    log.error(result.error);
    throw new Error('Something went wrong');
  }
  log.success(result);
  return result.data;
}

async function otherAllIndiaExam() {
  const log = signale.scope('freejobalert:otherAllIndiaExam');
  const URL = 'http://www.freejobalert.com/government-jobs/';
  const topic = 'Other All India Exams';
  const result = await topicScraper(URL, topic);
  if (!result.success) {
    log.error(result.error);
    throw new Error('Something went wrong');
  }
  log.success(result);
  return result.data;
}

async function allIndiaTeachingJobs() {
  const log = signale.scope('freejobalert:allIndiaTeachingJobs');
  const URL = 'http://www.freejobalert.com/teaching-faculty-jobs/';
  const topic = 'All India Teaching Jobs';
  const result = await topicScraper(URL, topic);
  if (!result.success) {
    log.error(result.error);
    throw new Error('Something went wrong');
  }
  log.success(result);
  return result.data;
}

async function latestEdu() {
  const log = signale.scope('freejobalert:latestEdu');
  const URL = 'https://www.freejobalert.com/education/';
  const result = await educationNotifications(URL);
  if (!result.success) {
    log.error(result.error);
    throw new Error('Something went wrong');
  }
  return result.data;
}

async function getDefault() {
  const log = signale.scope('freejobalert:getDefault');
  const URL = 'https://www.freejobalert.com/latest-notifications/';
  const result = await latestNotifications(URL);
  if (!result.success) {
    log.error(result.error);
    throw new Error('Something went wrong');
  }
  return result.data;
}


module.exports = {
  stateWiseGovjobs,
  allIndiaDefenceJobs,
  allIndiaRailwayJobs,
  allIndiaEngineeringJobs,
  bankJobs,
  otherAllIndiaExam,
  allIndiaTeachingJobs,
  latestEdu,
  getDefault
}