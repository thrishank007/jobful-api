const { latestNotifications, topicScraper, smartScraper } = require('./scraper');
const signale = require('signale');
const stateCodes = require('../../data/freeJobAlertStateMap.json');

const log = signale.scope('handler:global');

//const TOPICS = ['Banking Jobs', 'All India Engineering Jobs'];
//const STATES = Object.keys(stateCodes).map(key => stateCodes[key].code);

async function fetchLatestNotifications() {
  try {
    const notifications = await latestNotifications();
    log.success('Fetched latest notifications:', notifications);
    return notifications;
  } catch (error) {
    log.error('Error fetching latest notifications:', error);
    throw error;
  }
}

async function fetchTopicNotifications(topic) {
  try {
    const notifications = await topicScraper(topic);
    log.success(`Fetched notifications for topic ${topic}:`, notifications);
    return notifications;
  } catch (error) {
    log.error(`Error fetching notifications for topic ${topic}:`, error);
    throw error;
  }
}

async function fetchStateWiseNotifications(stateCode) {
  try {
    const state = stateCodes.find(item => item.code === stateCode);
    if (!state) {
      throw new Error(`State code ${stateCode} not found`);
    }
    const notifications = await smartScraper(state.link);
    log.success(`Fetched notifications for state ${stateCode}:`, notifications);
    return notifications;
  } catch (error) {
    log.error(`Error fetching notifications for state ${stateCode}:`, error);
    throw error;
  }
}

/* Example usage
(async () => {
  try {
    await fetchLatestNotifications();

    for (const topic of TOPICS) {
      await fetchTopicNotifications(topic);
    }

    for (const state of STATES) {
      await fetchStateWiseNotifications(state);
    }
  } catch (error) {
    log.fatal('An unexpected error occurred:', error);
  }
})();
*/