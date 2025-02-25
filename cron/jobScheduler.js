const cron = require('node-cron');
let axios = require('axios');
const Job = require('../models/Jobs');
const {
  latestEdu,
  getDefault,
  otherAllIndiaExam,
  bankJobs,
  allIndiaDefenceJobs,
  allIndiaEngineeringJobs,
  stateWiseGovjobs,
  allIndiaTeachingJobs,
  allIndiaRailwayJobs,
} = require("../customModules/freejobalerts/handler");
const stateCodes = require('../data/freeJobAlertStateMap.json');


async function saveJobs(jobsArray, category) {
  const results = await Promise.allSettled(
    jobsArray.map(async (jobData) => {
      try {
        const exists = await Job.findOne({ link: jobData.link });
        if (!exists) {
          if (jobData.lastDate) {
            const parts = jobData.lastDate.split("-");
            if (parts.length === 3) {
              const [day, month, year] = parts;
              const dateObj = new Date(Date.UTC(year, month - 1, day));
              if (!isNaN(dateObj.getTime())) {
                jobData.lastDate = dateObj.toISOString();
              } else {
                console.error(`Invalid date parsed for job with advtNo ${jobData.advtNo}: ${jobData.lastDate}`);
                jobData.lastDate = null;
              }
            } else {
              console.error(`Unexpected date format for job with advtNo ${jobData.advtNo}: ${jobData.lastDate}`);
              jobData.lastDate = null;
            }
          } else {
            jobData.lastDate = null;
          }

          // Remove advtNo before saving
          delete jobData.advtNo;
          jobData.category = category;

          await new Job(jobData).save();
          // Optionally log a success message.
           console.log(`Job with advtNo ${jobData.advtNo} saved successfully.`);
        } else {
          // Optionally log that the job already exists.
           console.log(`Job with advtNo ${jobData.advtNo} already exists. Skipping.`);
        }
      } catch (error) {
        if (error.code === 11000) {
          // Handle duplicate key error.
           console.warn(`Duplicate job detected for advtNo ${jobData.advtNo}:`, error.message);
        } else {
          console.error(`Error saving job with advtNo ${jobData.advtNo}:`, error);
        }
      }
    })
  );


  // Log any unexpected errors from processing individual jobs
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Error processing job index ${index}:`, result.reason);
    }
  });
}

async function scrapeStateWiseJobs() {
  console.log("Starting state-wise job scraping...");
  for (const state of stateCodes) {
    try {
      console.log(`Scraping jobs for ${state.name}...`);
      const jobsData = await stateWiseGovjobs(state.code);
      if (jobsData.success && jobsData.length > 0) {
        // Optionally add state info to each job
        jobsData = jobsData.map(job => ({ ...job, state: state.name }));
        await saveJobs(jobsData, "State-Wise-Gov-Jobs");
        console.log(`Saved ${jobsData.length} jobs for ${state.name}.`);
      } else {
        console.log(`No new jobs found for ${state.name}.`);
      }
    } catch (err) {
      console.error(`Error scraping ${state.name}:`, err.message);
    }
  }
}

// Cron task to fetch and save jobs every minute (adjust for production)
cron.schedule('*/2 * * * *', async () => {
  console.log("Cron Job: Fetching new job postings...");
  try {
    let jobsResponse = await getDefault();
    if (jobsResponse.data.length > 0) {
      await saveJobs(jobsResponse.data, "Latest-Notifications");
    } else {
      console.log("No new jobs fetched for Latest-Notifications.",jobsResponse);
    }
    jobsResponse = await latestEdu();
    if (jobsResponse.data && jobsResponse.success && jobsResponse.data.length > 0) {
      await saveJobs(jobsResponse.data, "Latest-Education");
    } else {
      console.log("No new jobs fetched for Latest-Education.",jobsResponse);
    }
    return;
    jobsResponse = await otherAllIndiaExam();
    if (jobsResponse.data && jobsResponse.success && jobsResponse.data.length > 0) {
      await saveJobs(jobsResponse.data, "Other-All-India-Exams");
    } else {
      console.log("No new jobs fetched for Other-All-India-Exams.");
    }
    
    jobsResponse = await bankJobs();
    if (jobsResponse.data && jobsResponse.success && jobsResponse.data.length > 0) {
      await saveJobs(jobsResponse.data, "Bank-Jobs");
    } else {
      console.log("No new jobs fetched for Bank-Jobs.");
    }
    
    jobsResponse = await allIndiaDefenceJobs();
    if (jobsResponse.data && jobsResponse.success && jobsResponse.data.length > 0) {
      await saveJobs(jobsResponse.data, "All-India-Defence-Jobs");
    } else {
      console.log("No new jobs fetched for All-India-Defence-Jobs.");
    }
    
    jobsResponse = await allIndiaEngineeringJobs();
    if (jobsResponse.data && jobsResponse.success && jobsResponse.data.length > 0) {
      await saveJobs(jobsResponse.data, "All-India-Engineering-Jobs");
    } else {
      console.log("No new jobs fetched for All-India-Engineering-Jobs.");
    }
    
    jobsResponse = await allIndiaRailwayJobs();
    if (jobsResponse.data && jobsResponse.success && jobsResponse.data.length > 0) {
      await saveJobs(jobsResponse.data, "All-India-Railway-Jobs");
    } else {
      console.log("No new jobs fetched for All-India-Railway-Jobs.");
    }

    jobsResponse = await allIndiaTeachingJobs();
    if (jobsResponse.data && jobsResponse.success && jobsResponse.data.length > 0) {
      await saveJobs(jobsResponse.data, "All-India-Teaching-Jobs");
    } else {
      console.log("No new jobs fetched for All-India-Teaching-Jobs.");
    }

    // Run the state-wise scraper for all states
    await scrapeStateWiseJobs();
  } catch (error) {
    console.error("Error in scheduled job processing:", error);
  }
});


// Cleanup function to delete expired jobs (scheduled to run at midnight)
cron.schedule('0 0 * * *', async () => {
  console.log("Cleaning up expired job notifications...");
  const now = new Date();
  try {
    // Remove jobs whose lastDate is before the current time
    await Job.deleteMany({ lastDate: { $lt: now.toISOString() } });
    console.log("Cleanup completed.");
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
});
