const fs = require('fs/promises');
const path = require('path');
const { mailService } = require('../../services/mailService');
const User = require('../../models/User');
const { getLatestJobForCategory, updateJobTracking } = require('../../db/sqlite');
const notificationService = require('../../services/notificationService');

class DataManager {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
  }

  async ensureDataDir() {
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  async saveToJson(functionName, data, topic = null) {
    // Disabled: do not write any JSON files
    return;
  }

  async handleJobUpdates(newData) {
    if (!newData.success || !newData.data || !newData.data.length) {
      return;
    }

    const newFirstJob = newData.data[0];
    const firstJobPath = path.join(this.dataDir, 'firstJob.json');
    
    // Load or create first job record
    let previousFirstJob;
    try {
      const content = await fs.readFile(firstJobPath, 'utf-8');
      previousFirstJob = JSON.parse(content);
    } catch {
      // First run - save initial job and exit
      await fs.writeFile(firstJobPath, JSON.stringify(newFirstJob, null, 2));
      return;
    }

    // Compare jobs using unique identifier
    const jobKey = job => `${job.postBoard}-${job.postName}-${job.advtNo}`;
    const hasJobChanged = jobKey(previousFirstJob) !== jobKey(newFirstJob);

    // Find new jobs
    const existingJobKeys = new Set(previousFirstJob ? [jobKey(previousFirstJob)] : []);
    const newJobs = newData.data.filter(job => !existingJobKeys.has(jobKey(job)));

    if (hasJobChanged || newJobs.length > 0) {
      // Update first job record
      await fs.writeFile(firstJobPath, JSON.stringify(newFirstJob, null, 2));
      
      // Send notifications
      await this.notifyUsers(previousFirstJob, newFirstJob, newJobs);
    }
  }

  async notifyUsers(previousFirstJob, newFirstJob, newJobs) {
    const users = await User.find({}).select('email').lean();

    if (!users || users.length === 0) {
      console.log("No users found to notify.");
      return;
    }

    const timestamp = new Date().toISOString();

    // Extract email list
    const emailList = users.map(user => user.email);
    const emailBody = `
# Job Updates - ${timestamp}

${previousFirstJob && newFirstJob ? `
## First Job Update
### Previous First Job
- Board: ${previousFirstJob.postBoard}
- Name: ${previousFirstJob.postName}
- Date: ${previousFirstJob.postDate}

### New First Job
- Board: ${newFirstJob.postBoard}
- Name: ${newFirstJob.postName}
- Date: ${newFirstJob.postDate}
` : ''}

${newJobs.length > 0 ? `
## New Jobs (${newJobs.length})
${newJobs.map(job => `
- ${job.postBoard}: ${job.postName}
  Posted: ${job.postDate} | Last Date: ${job.lastDate}
  Links: [Apply](${job.apply_online}) | [Details](${job.link})
`).join('\n')}
` : ''}

_Updated at: ${timestamp}_
    `;

    for (const email of emailList) {
      await mailService.sendJobNotification(email, emailBody);
    }
  }

  async checkForNewJobs(category, scrapedData) {
    if (!scrapedData.success || !scrapedData.data || !scrapedData.data.length) {
      return;
    }

    const latestJob = scrapedData.data[0]; // First job is latest (sorted by date)
    const trackedJob = await getLatestJobForCategory(category);

    if (!trackedJob) {
      // First time tracking this category
      await updateJobTracking(category, latestJob);
      return;
    }

    // Check if there's a new job
    const currentJobId = `${latestJob.postBoard}-${latestJob.postName}-${latestJob.advtNo}`;
    const hasNewJob = trackedJob.latest_job_id !== currentJobId;

    if (hasNewJob) {
      // Find new jobs (jobs that weren't in the previous scrape)
      const newJobs = this.findNewJobs(scrapedData.data, trackedJob);
      
      // Send notifications
      await notificationService.sendJobNotifications(category, newJobs);
      
      // Update tracking
      await updateJobTracking(category, latestJob);
    }
  }

  findNewJobs(allJobs, trackedJob) {
    // Since jobs are sorted by date (newest first), 
    // find jobs that are newer than the tracked job date
    const trackedDate = new Date(trackedJob.latest_job_date.split('/').reverse().join('-'));
    
    return allJobs.filter(job => {
      const jobDate = new Date(job.postDate.split('/').reverse().join('-'));
      return jobDate >= trackedDate;
    });
  }
}

module.exports = new DataManager();