const axios = require('axios');
const cheerio = require('cheerio');
const stateCodes = require('../../data/freeJobAlertStateMap.json');
const signale = require('signale');

const log = signale.scope('scraper:global');

const axiosInstance = axios.create({
  headers: { 'User-Agent': 'Mozilla/5.0' },
  timeout: 10000,
  httpAgent: new (require('http')).Agent({ keepAlive: true }),
  httpsAgent: new (require('https')).Agent({ keepAlive: true })
});

const hasNoEmptyValues = (item) => Object.values(item).every(value => value !== "" && value !== undefined && value !== null);

async function extractAdditionalLinks(detailPageUrl) {
  try {
    const response = await axiosInstance.get(detailPageUrl);
    const $ = cheerio.load(response.data);

    const links = {
      apply_online: '',
      notification: '',
      official_website: ''
    };

    $('tr').each((i, element) => {
      const text = $(element).find('td').first().text().trim();
      const href = $(element).find('a').attr('href');
      if (!href) return;
      if (text.includes('Apply Online')) {
        links.apply_online = href;
      } else if (text.includes('Notification')) {
        links.notification = href;
      } else if (text.includes('Official Website')) {
        links.official_website = href;
      }
    });

    return links;
  } catch (error) {
    log.error('Error extracting additional links:', error);
    return null;
  }
}

async function topicScraper(URL, topic, page = 1, limit = 10) {
  const log = signale.scope('scraper:TopicScraper');
  try {
    const response = await axiosInstance.get(URL);
    log.success('Successfully fetched');
    const $ = cheerio.load(response.data);
    const topicTable = $('table.lattbl');
    const entries = $(topicTable).find('tr').toArray();

    const basicData = entries.slice(1)
      .map(el => ({
        postDate: $(el).find('td').eq(0).text().trim(),
        postBoard: $(el).find('td').eq(1).text().trim(),
        postName: $(el).find('td').eq(2).text().trim(),
        qualification: $(el).find('td').eq(3).text().trim(),
        advtNo: $(el).find('td').eq(4).text().trim(),
        lastDate: $(el).find('td').eq(5).text().trim(),
        link: $(el).find('td').eq(6).find('a').attr('href')
      }))
      .filter(hasNoEmptyValues);

    const enrichedData = await Promise.all(
      basicData.map(async (item) => {
        if (item.link) {
          const additionalLinks = await extractAdditionalLinks(item.link);
          return additionalLinks ? { ...item, ...additionalLinks } : item;
        }
        return item;
      })
    );

    const uniqueMap = new Map();
    enrichedData.forEach(item => {
      const key = `${item.postBoard}-${item.postName}-${item.advtNo}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    const data = Array.from(uniqueMap.values());
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = data.slice(startIndex, endIndex);

    return { success: true, data: paginatedData, total: data.length };
  } catch (error) {
    log.error('Could not fetch the source', error);
    return { success: false, error: error.message };
  }
}

async function latestNotifications(URL, page = 1, limit = 10) {
  const log = signale.scope('scraper:latestNotifications');
  try {
    const response = await axiosInstance.get(URL);
    log.success('Successfully fetched the page');

    const $ = cheerio.load(response.data);
    let currentSector = '';
    const sectorNotifications = {};

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
          link: $(cells[6]).find('a').attr('href')
        };

        sectorNotifications[currentSector].push(notification);
      });
    });

    const allNotifications = Object.values(sectorNotifications).flat();
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = allNotifications.slice(startIndex, endIndex);

    return { success: true, data: paginatedData, total: allNotifications.length };
  } catch (error) {
    log.error('Failed to fetch notifications:', error);
    return { success: false, error: error.message };
  }
}

async function smartScraper(URL, page = 1, limit = 10) {
  const log = signale.scope('scraper:stateWiseScraper');
  try {
    const response = await axiosInstance.get(URL);
    log.success('Successfully fetched');
    const $ = cheerio.load(response.data);
    const posts = $('table.lattbl');
    const entries = $(posts).find('tr').toArray();

    const results = entries.slice(1)
      .map(el => ({
        postDate: $(el).find('td').eq(0).text().trim(),
        postBoard: $(el).find('td').eq(1).text().trim(),
        postName: $(el).find('td').eq(2).text().trim(),
        qualification: $(el).find('td').eq(3).text().trim(),
        advtNo: $(el).find('td').eq(4).text().trim(),
        lastDate: $(el).find('td').eq(5).text().trim(),
        link: $(el).find('td').eq(6).find('a').attr('href')
      }))
      .filter(hasNoEmptyValues)
      .reduce((unique, item) => {
        const key = `${item.postBoard}-${item.postName}-${item.advtNo}`;
        return unique.has(key) ? unique : unique.set(key, item);
      }, new Map())
      .values();

    const data = Array.from(results);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = data.slice(startIndex, endIndex);

    return { success: true, data: paginatedData, total: data.length };
  } catch (error) {
    log.error('Could not fetch the source', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  latestNotifications,
  topicScraper,
  smartScraper
};