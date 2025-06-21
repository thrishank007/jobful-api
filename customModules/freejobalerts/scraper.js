const axios = require('axios');
const cheerio = require('cheerio');
const signale = require('signale');
const log = signale.scope('scraper:global');
const dataManager = require('./dataManager');

function getRandomUserAgent() {
  const userAgents = [
    // Desktop Browsers
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15",
// Mobile Browsers
"Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Mobile Safari/537.36",
"Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
  ];
  const randomIndex = Math.floor(Math.random() * userAgents.length);
  return userAgents[randomIndex];
}

const axiosInstance = axios.create({
  headers: { 'User-Agent': getRandomUserAgent()},
  timeout: 10000,
  httpAgent: new (require('http')).Agent({ keepAlive: true }),
  //httpsAgent: new (require('https')).Agent({ keepAlive: true })
});


async function extractAdditionalLinks(detailPageUrl) {
    try {
      const response = await axiosInstance.get(detailPageUrl);
      const $ = cheerio.load(response.data);
  const links = {
    apply_online: '',
    notification: '',
    official_website: ''
  };

  const relevantRows = $('tr').has('a');

  for (const element of relevantRows) {
    const text = $(element).find('td').first().text().trim();
    const href = $(element).find('a').attr('href');
    if (!href) continue;

    if (text.includes('Apply Online') && !links.apply_online) {
      links.apply_online = href;
    } else if (text.includes('Notification') && !links.notification) {
      links.notification = href;
    } else if (text.includes('Official Website') && !links.official_website) {
      links.official_website = href;
    }

    if (links.apply_online && links.notification && links.official_website) {
      break;
    }
  }

  return links;
} catch (error) {
  log.error('Error extracting additional links:', error);
  return null;
}
}
async function topicScraper(URL, topic) {
  const log = signale.scope('scraper:TopicScraper');
  try {
    const response = await axiosInstance.get(URL);
    log.success('Successfully fetched',topic, 'page');
    const $ = cheerio.load(response.data);
    const topicTable = $('table.lattbl');
    const entries = $(topicTable).find('tr').toArray();
const basicData = entries.slice(1)
  .map(el => {
    const tds = $(el).find('td');
    return {
      postDate: tds.eq(0).text().trim(),
      postBoard: tds.eq(1).text().trim(),
      postName: tds.eq(2).text().trim(),
      qualification: tds.eq(3).text().trim(),
      advtNo: tds.eq(4).text().trim(),
      lastDate: tds.eq(5).text().trim(),
      link: tds.eq(6).find('a').attr('href')
    };
  })
  .filter(item => item.postDate && item.postBoard && item.postName && item.qualification && item.advtNo && item.lastDate && item.link);

const pLimit = (await import('p-limit')).default;
const limit = pLimit(20); // Adjust concurrency limit as needed

const enrichedData = await Promise.all(
  basicData.map(item => limit(async () => {
    if (item.link) {
      const additionalLinks = await extractAdditionalLinks(item.link);
      return additionalLinks ? { ...item, ...additionalLinks } : item;
    }
    return item;
  }))
);

const uniqueMap = new Map();
enrichedData.forEach(item => {
  const key = `${item.postBoard}-${item.postName}-${item.advtNo}`;
  if (!uniqueMap.has(key)) {
    uniqueMap.set(key, item);
  }
});

const data = Array.from(uniqueMap.values());
data.sort((a, b) => {
  const [dayA, monthA, yearA] = a.postDate.split('/').map(Number);
  const [dayB, monthB, yearB] = b.postDate.split('/').map(Number);
  const dateA = new Date(yearA, monthA - 1, dayA);
  const dateB = new Date(yearB, monthB - 1, dayB);
  return dateB - dateA; 
});
const result = { success: true, data, total: data.length };
  
await dataManager.saveToJson('topicScraper', result, topic);
return result;
  } catch (error) {
    log.error('Could not fetch the source', error);
    return { success: false, error: error.message };
  }
}
async function latestNotifications(URL) {
  const log = signale.scope('scraper:latestNotifications');
  try {
    const response = await axios.get(URL);
    log.success('Successfully fetched the latest Notifications page');
const $ = cheerio.load(response.data);
let currentSector = '';
const sectorNotifications = {};
const detailPageUrls = [];
const notificationReferences = [];

$('table.lattbl').each((i, table) => {
  const sectorHeading = $(table).prev('h4.latsec');
  if (sectorHeading.length) {
    currentSector = sectorHeading.text().trim();
  }

  if (!sectorNotifications[currentSector]) {
    sectorNotifications[currentSector] = [];
  }

  const rows = $(table).find('tbody tr.lattrbord');
  rows.each((i, row) => {
    const cells = $(row).find('td');
    const notification = {
      postDate: $(cells[0]).text().trim(),
      postBoard: $(cells[1]).text().trim(),
      postName: $(cells[2]).text().trim(),
      qualification: $(cells[3]).text().trim(),
      advtNo: $(cells[4]).text().trim(),
      lastDate: $(cells[5]).text().trim(),
      link: $(cells[6]).find('a').attr('href') || '',
      apply_online: '',
      notification: '',
      official_website: ''
    };

    sectorNotifications[currentSector].push(notification);
    if (notification.link) {
      detailPageUrls.push(notification.link);
      notificationReferences.push({
        sector: currentSector,
        index: sectorNotifications[currentSector].length - 1
      });
    }
  });
});

const detailResponses = await Promise.all(
  detailPageUrls.map(url =>
    axios.get(url).catch(error => {
      log.error(`Failed to fetch ${url}: ${error.message}`);
      return null;
    })
  )
);

detailResponses.forEach((response, idx) => {
  if (response && response.data) {
    const $ = cheerio.load(response.data);
    const { sector, index } = notificationReferences[idx];
    const notification = sectorNotifications[sector][index];

    $('tr').each((i, element) => {
      const text = $(element).find('td').first().text().trim();
      const href = $(element).find('a').attr('href') || '';
      if (text.includes('Apply Online')) {
        notification.apply_online = href;
      } else if (text.includes('Notification')) {
        notification.notification = href;
      } else if (text.includes('Official Website')) {
        notification.official_website = href;
      }
    });
  }
});

// Step 5: Flatten and return the notifications
const allNotifications = Object.values(sectorNotifications).flat();
allNotifications.sort((a, b) => {
  const [dayA, monthA, yearA] = a.postDate.split('/').map(Number);
  const [dayB, monthB, yearB] = b.postDate.split('/').map(Number);
  const dateA = new Date(yearA, monthA - 1, dayA);
  const dateB = new Date(yearB, monthB - 1, dayB);
  return dateB - dateA;
});
const result = {
  success: true,
  data: allNotifications,
  total: allNotifications.length
};
  
await dataManager.saveToJson('latestNotifications', result);
return result;
  } catch (error) {
    log.error('Failed to fetch notifications:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
async function smartScraper(URL) {
  const log = signale.scope('scraper:stateWiseScraper');
  try {
    // Fetch the page
    const response = await axiosInstance.get(URL);
    log.success('Successfully fetched:\n',URL);
    const $ = cheerio.load(response.data);
// Parse the table efficiently
const posts = $('table.lattbl');
const entries = $(posts).find('tr').toArray();

const basicData = entries.slice(1)
  .map(el => {
    const tds = $(el).find('td'); // Fetch <td> elements once
    return {
      postDate: tds.eq(0).text().trim(),
      postBoard: tds.eq(1).text().trim(),
      postName: tds.eq(2).text().trim(),
      qualification: tds.eq(3).text().trim(),
      advtNo: tds.eq(4).text().trim(),
      lastDate: tds.eq(5).text().trim(),
      link: tds.eq(6).find('a').attr('href')
    };
  })
  .filter(item => item.postDate && item.postBoard && item.postName && item.qualification && item.advtNo && item.lastDate && item.link);

// Enrich data with controlled concurrency
const pLimit = (await import('p-limit')).default;
const limit = pLimit(20); // Adjust concurrency limit as needed
const enrichedData = await Promise.all(
  basicData.map(item => limit(async () => {
    if (item.link) {
      const additionalLinks = await extractAdditionalLinks(item.link);
      return additionalLinks ? { ...item, ...additionalLinks } : item;
    }
    return item;
  }))
);

// Deduplicate entries efficiently
const uniqueMap = new Map();
enrichedData.forEach(item => {
  const key = `${item.postBoard}-${item.postName}-${item.advtNo}`;
  if (!uniqueMap.has(key)) {
    uniqueMap.set(key, item);
  }
});

const data = Array.from(uniqueMap.values());
data.sort((a, b) => {
  const [dayA, monthA, yearA] = a.postDate.split('/').map(Number);
  const [dayB, monthB, yearB] = b.postDate.split('/').map(Number);
  const dateA = new Date(yearA, monthA - 1, dayA);
  const dateB = new Date(yearB, monthB - 1, dayB);
  return dateB - dateA;
});
const result = { success: true, data, total: data.length };
  
await dataManager.saveToJson('smartScraper', result);
return result;
  } catch (error) {
    log.error('Could not fetch the source', error);
    return { success: false, error: error.message };
  }
}
async function educationNotifications(URL) {
  const log = signale.scope('scraper:educationNotifications');
  try {
    // Step 1: Fetch the main education page
    const response = await axios.get(URL);
    log.success('Successfully fetched the education page');
// Step 2: Parse the HTML with Cheerio
const $ = cheerio.load(response.data);
const notifications = [];
const detailPageUrls = [];
const notificationReferences = [];

function cleanText(text) {
  return text
    .replace(/\t/g, ' ')    // Replace all whitespace (tabs, newlines, etc.) with a single space
    .replace(/ /g, ' ')      // Replace non-breaking spaces
    .trim()
    .split('\n')
    .filter(item => item && item.trim() !== "")
    .map(item => item.trim()); // Remove leading/trailing spaces
}

// Step 3: Extract sectors and notifications from the main page
$('h4.edtitl').each((i, heading) => {
  const sector = $(heading).text().trim();
  const table = $(heading).next('table.edtbl');

  if (table.length) {
    table.find('tr.edthr').each((j, row) => {
      const cells = $(row).find('td');
      const notification = {
        sector: sector,
        postDate: $(cells[0]).text().trim(),
        updateInformation: $(cells[1]).text().trim(),
        detailLink: $(cells[2]).find('a').attr('href') || '',
        applicationFee: '',
        importantDates: '',
        ageLimit: '',
        qualification: '',
        importantLinks: {}
      };

      notifications.push(notification);
      if (notification.detailLink) {
        detailPageUrls.push(notification.detailLink);
        notificationReferences.push(notifications.length - 1);
      }
    });
  }
});

// Step 4: Fetch all detail pages concurrently
const detailResponses = await Promise.all(
  detailPageUrls.map(url =>
    axios.get(url).catch(error => {
      log.error(`Failed to fetch ${url}: ${error.message}`);
      return null;
    })
  )
);

// Step 5: Process each detail page to extract required information
detailResponses.forEach((response, idx) => {
  if (!response?.data) return;

  const $ = cheerio.load(response.data);
  const notification = notifications[notificationReferences[idx]];
  const importantLinksTable = $('table').has('strong:contains("Important Links")');

  if (importantLinksTable.length) {
    // Build the importantLinks object from table rows, excluding specific link texts.
    importantLinksTable.find('tr').each((_, tr) => {
      const linkText = $(tr).find('td').first().text().trim();
      const linkHref = $(tr).find('a').attr('href') || '';
      if (!['Download Mobile App', 'Join Telegram Channel', 'Join WhatsApp Channel', 'Join Whatsapp Channel', 'Join Whats App Channel'].includes(linkText)) {
        notification.importantLinks[linkText] = linkHref;
      }
    });

    // Filter out keys that come before (and including) "Important Links"
    const keys = Object.keys(notification.importantLinks);
    const targetIndex = keys.indexOf("Important Links");

    // Only update importantLinks if the target key is found.
    if (targetIndex !== -1) {
      notification.importantLinks = keys.slice(targetIndex + 1)
        .reduce((acc, key) => ({ ...acc, [key]: notification.importantLinks[key] }), {});
    }

    // Extract details from table rows
    $('tr').each((i, tr) => {
      const td = $(tr).find('td').first();
      const headerP = td.find('p').has('strong').first();

      if (headerP.length) {
        const sectionTitle = headerP.find('strong').text().trim().toLowerCase();
        headerP.remove(); // Remove the header paragraph to get the content only
        const content = td.text().trim();

        // Map section titles to notification fields using keyword matching
        if (sectionTitle.includes('fee')) {
          notification.applicationFee = cleanText(content);
        } else if (sectionTitle.includes('date')) {
          notification.importantDates = cleanText(content);
        } else if (sectionTitle.includes('age')) {
          notification.ageLimit = cleanText(content).filter(item => item && item === "WWW.FREEJOBALERT.COM" && item === "Download Mobile App");
        } else if (sectionTitle.includes('qualification')) {
          notification.qualification = cleanText(content);
        }
      }
    });
  }
});

// Step 6: Sort notifications by post date (ascending order)
notifications.sort((a, b) => {
  const [dayA, monthA, yearA] = a.postDate.split('/').map(Number);
  const [dayB, monthB, yearB] = b.postDate.split('/').map(Number);
  const dateA = new Date(yearA, monthA - 1, dayA);
  const dateB = new Date(yearB, monthB - 1, dayB);
  return dateB - dateA; // For descending order, reverse to dateB - dateA
});

// Step 7: Return the collected notifications
const result = {
  success: true,
  data: notifications,
  total: notifications.length
};
  
await dataManager.saveToJson('educationNotifications', result);
return result;
  } catch (error) {
    log.error('Failed to fetch education notifications:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
module.exports = {
  latestNotifications,
  topicScraper,
  smartScraper,
  educationNotifications
};