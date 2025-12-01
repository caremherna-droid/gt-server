import express from "express";
import {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getNewsletterSubscriptions,
  getNewsletterStats,
  deleteNewsletterSubscription,
  getNewsletterStatus,
} from "../../controllers/tribeControllers/newsletterController.js";
import { 
  initializeNewsletterScheduler,
  triggerNewsletter,
  stopAllJobs,
  updateSchedule,
  getSchedulerStatus
} from "../../services/newsletterScheduler.js";
import { 
  getEmailServiceStatus,
  sendEmail,
  sendWeeklyNewsletter,
  sendMonthlyNewsletter,
  sendDailyDigest,
  sendNewReleasesNewsletter
} from "../../services/emailService.js";

const router = express.Router();

// Log incoming requests for debugging
router.use((req, res, next) => {
  console.log("Newsletter request:", {
    method: req.method,
    url: req.url,
    body: req.body,
  });
  next();
});

// Public routes
router.post("/subscribe", subscribeToNewsletter);
router.post("/unsubscribe", unsubscribeFromNewsletter);
router.get("/status", getNewsletterStatus);

// Admin routes (these could be protected with auth middleware later)
router.get("/subscriptions", getNewsletterSubscriptions);
router.get("/stats", getNewsletterStats);
router.delete("/subscriptions/:id", deleteNewsletterSubscription);

// Newsletter management routes
router.get("/scheduler/status", async (req, res) => {
  try {
    const status = getSchedulerStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status'
    });
  }
});

router.post("/scheduler/initialize", async (req, res) => {
  try {
    const initialized = await initializeNewsletterScheduler();
    if (initialized) {
      res.json({
        success: true,
        message: 'Newsletter scheduler initialized successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to initialize newsletter scheduler'
      });
    }
  } catch (error) {
    console.error('Error initializing scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize scheduler'
    });
  }
});

router.post("/scheduler/trigger", async (req, res) => {
  try {
    const { type, customData } = req.body;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Newsletter type is required'
      });
    }

    const result = await triggerNewsletter(type, customData);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error triggering newsletter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger newsletter'
    });
  }
});

router.post("/scheduler/stop", async (req, res) => {
  try {
    stopAllJobs();
    res.json({
      success: true,
      message: 'All newsletter jobs stopped'
    });
  } catch (error) {
    console.error('Error stopping scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop scheduler'
    });
  }
});

router.put("/scheduler/schedule", async (req, res) => {
  try {
    const { jobName, schedule } = req.body;
    
    if (!jobName || !schedule) {
      return res.status(400).json({
        success: false,
        error: 'Job name and schedule are required'
      });
    }

    updateSchedule(jobName, schedule);
    res.json({
      success: true,
      message: `Schedule updated for ${jobName}`
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update schedule'
    });
  }
});

// Email service routes
router.get("/email/status", async (req, res) => {
  try {
    const status = getEmailServiceStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting email service status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get email service status'
    });
  }
});

router.post("/email/test", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    // Send a test email
    const result = await sendEmail(
      email,
      '🧪 GameTribe Newsletter Test',
      '<h1>Test Email</h1><p>This is a test email from GameTribe newsletter system.</p>',
      'Test Email\n\nThis is a test email from GameTribe newsletter system.'
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email'
    });
  }
});

// Manual newsletter sending routes
router.post("/send/weekly", async (req, res) => {
  try {
    const result = await sendWeeklyNewsletter();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error sending weekly newsletter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send weekly newsletter'
    });
  }
});

router.post("/send/monthly", async (req, res) => {
  try {
    const result = await sendMonthlyNewsletter();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error sending monthly newsletter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send monthly newsletter'
    });
  }
});

router.post("/send/daily", async (req, res) => {
  try {
    const result = await sendDailyDigest();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error sending daily digest:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send daily digest'
    });
  }
});

router.post("/send/new-releases", async (req, res) => {
  try {
    const { games } = req.body;
    
    if (!games || !Array.isArray(games)) {
      return res.status(400).json({
        success: false,
        error: 'Games array is required'
      });
    }

    const result = await sendNewReleasesNewsletter(games);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error sending new releases newsletter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send new releases newsletter'
    });
  }
});

export default router; 