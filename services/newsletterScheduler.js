import cron from 'node-cron';
import { 
  initializeEmailService,
  sendWeeklyNewsletter,
  sendMonthlyNewsletter,
  sendDailyDigest,
  sendNewReleasesNewsletter,
  sendCommunityNewsletter
} from './emailService.js';
import { newsletterConfig } from '../config/emailConfig.js';

// Simple state management
const jobs = new Map();
let isInitialized = false;

// Initialize the scheduler
export const initializeNewsletterScheduler = async () => {
  try {
    // Initialize email service first
    const emailInitialized = await initializeEmailService();
    if (!emailInitialized) {
      throw new Error('Failed to initialize email service');
    }

    isInitialized = true;
    console.log('Newsletter scheduler initialized successfully');
    
    // Start scheduled jobs
    startScheduledJobs();
    
    return true;
  } catch (error) {
    console.error('Failed to initialize newsletter scheduler:', error);
    isInitialized = false;
    return false;
  }
};

// Start all scheduled newsletter jobs
export const startScheduledJobs = () => {
  if (!isInitialized) {
    console.error('Newsletter scheduler not initialized');
    return;
  }

  // Weekly newsletter (every Friday at 10 AM)
  startWeeklyNewsletter();
  
  // Monthly newsletter (first day of month at 9 AM)
  startMonthlyNewsletter();
  
  // Daily digest (every day at 6 PM)
  startDailyDigest();
  
  console.log('All newsletter jobs started');
};

// Start weekly newsletter job
export const startWeeklyNewsletter = () => {
  const jobName = 'weekly-newsletter';
  
  if (jobs.has(jobName)) {
    jobs.get(jobName).stop();
  }

  const job = cron.schedule(newsletterConfig.schedule, async () => {
    console.log('Running weekly newsletter job...');
    try {
      const result = await sendWeeklyNewsletter();
      console.log('Weekly newsletter job completed:', result);
    } catch (error) {
      console.error('Weekly newsletter job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  jobs.set(jobName, job);
  console.log(`Weekly newsletter job scheduled: ${newsletterConfig.schedule}`);
};

// Start monthly newsletter job
export const startMonthlyNewsletter = () => {
  const jobName = 'monthly-newsletter';
  
  if (jobs.has(jobName)) {
    jobs.get(jobName).stop();
  }

  const job = cron.schedule('0 9 1 * *', async () => {
    console.log('Running monthly newsletter job...');
    try {
      const result = await sendMonthlyNewsletter();
      console.log('Monthly newsletter job completed:', result);
    } catch (error) {
      console.error('Monthly newsletter job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  jobs.set(jobName, job);
  console.log('Monthly newsletter job scheduled: 0 9 1 * *');
};

// Start daily digest job
export const startDailyDigest = () => {
  const jobName = 'daily-digest';
  
  if (jobs.has(jobName)) {
    jobs.get(jobName).stop();
  }

  const job = cron.schedule('0 18 * * *', async () => {
    console.log('Running daily digest job...');
    try {
      const result = await sendDailyDigest();
      console.log('Daily digest job completed:', result);
    } catch (error) {
      console.error('Daily digest job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  jobs.set(jobName, job);
  console.log('Daily digest job scheduled: 0 18 * * *');
};

// Manually trigger a newsletter send
export const triggerNewsletter = async (type, customData = null) => {
  if (!isInitialized) {
    throw new Error('Newsletter scheduler not initialized');
  }

  console.log(`Manually triggering ${type} newsletter...`);

  try {
    let result;
    
    switch (type) {
      case 'weekly':
        result = await sendWeeklyNewsletter();
        break;
      case 'monthly':
        result = await sendMonthlyNewsletter();
        break;
      case 'daily':
        result = await sendDailyDigest();
        break;
      case 'new-releases':
        if (!customData || !customData.games) {
          throw new Error('New games data required for new-releases newsletter');
        }
        result = await sendNewReleasesNewsletter(customData.games);
        break;
      case 'community':
        result = await sendCommunityNewsletter(customData || {});
        break;
      default:
        throw new Error(`Unknown newsletter type: ${type}`);
    }

    console.log(`${type} newsletter sent successfully:`, result);
    return result;
  } catch (error) {
    console.error(`Failed to send ${type} newsletter:`, error);
    throw error;
  }
};

// Stop all scheduled jobs
export const stopAllJobs = () => {
  console.log('Stopping all newsletter jobs...');
  
  for (const [jobName, job] of jobs) {
    job.stop();
    console.log(`Stopped job: ${jobName}`);
  }
  
  jobs.clear();
};

// Get job status
export const getJobStatus = () => {
  const status = {};
  
  for (const [jobName, job] of jobs) {
    status[jobName] = {
      running: job.running,
      nextDate: job.nextDate(),
      lastDate: job.lastDate()
    };
  }
  
  return status;
};

// Get scheduler status
export const getSchedulerStatus = () => {
  return {
    initialized: isInitialized,
    jobs: getJobStatus(),
    totalJobs: jobs.size
  };
};

// Update schedule for a specific job
export const updateSchedule = (jobName, newSchedule) => {
  if (!jobs.has(jobName)) {
    throw new Error(`Job ${jobName} not found`);
  }

  // Stop existing job
  jobs.get(jobName).stop();
  jobs.delete(jobName);

  // Create new job with updated schedule
  const job = cron.schedule(newSchedule, async () => {
    console.log(`Running ${jobName} job...`);
    try {
      let result;
      
      switch (jobName) {
        case 'weekly-newsletter':
          result = await sendWeeklyNewsletter();
          break;
        case 'monthly-newsletter':
          result = await sendMonthlyNewsletter();
          break;
        case 'daily-digest':
          result = await sendDailyDigest();
          break;
        default:
          console.error(`Unknown job type: ${jobName}`);
          return;
      }
      
      console.log(`${jobName} job completed:`, result);
    } catch (error) {
      console.error(`${jobName} job failed:`, error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  jobs.set(jobName, job);
  console.log(`Updated schedule for ${jobName}: ${newSchedule}`);
};

// Default export for backward compatibility
export default {
  initialize: initializeNewsletterScheduler,
  startScheduledJobs,
  startWeeklyNewsletter,
  startMonthlyNewsletter,
  startDailyDigest,
  triggerNewsletter,
  stopAllJobs,
  getJobStatus,
  getStatus: getSchedulerStatus,
  updateSchedule
}; 