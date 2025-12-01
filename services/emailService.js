import { createTransporter, emailTemplates, newsletterConfig } from '../config/emailConfig.js';
import { db } from '../config/firebase.js';
import {
  createWeeklyNewsletter,
  createNewReleasesNewsletter,
  createWelcomeNewsletter,
  createCommunityNewsletter
} from './emailTemplates.js';

// Simple state management
let transporter = null;
let isInitialized = false;

// Utility functions
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Initialize the email service
export const initializeEmailService = async () => {
  try {
    transporter = createTransporter();
    
    // Verify connection
    await transporter.verify();
    isInitialized = true;
    
    console.log('Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    isInitialized = false;
    return false;
  }
};

// Get active newsletter subscribers
export const getActiveSubscribers = async (limit = null) => {
  try {
    const newsletterCollection = db.collection("newsletter_subscriptions");
    let query = newsletterCollection.where("status", "==", "active");
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    const subscribers = [];
    
    snapshot.forEach((doc) => {
      subscribers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return subscribers;
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    throw error;
  }
};

// Send a single email
export const sendEmail = async (to, subject, html, text) => {
  if (!isInitialized) {
    throw new Error('Email service not initialized');
  }

  try {
    const mailOptions = {
      from: `"${emailTemplates.from.name}" <${emailTemplates.from.email}>`,
      to: to,
      subject: subject,
      html: html,
      text: text,
      replyTo: emailTemplates.replyTo
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}:`, result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      to: to
    };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return {
      success: false,
      error: error.message,
      to: to
    };
  }
};

// Send emails in batches to avoid rate limits
export const sendBatchEmails = async (emails, batchSize = newsletterConfig.batchSize, delay = newsletterConfig.batchDelay) => {
  const results = [];
  const batches = chunkArray(emails, batchSize);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Sending batch ${i + 1}/${batches.length} (${batch.length} emails)`);

    // Send emails in parallel within the batch
    const batchPromises = batch.map(emailData => 
      sendEmail(emailData.to, emailData.subject, emailData.html, emailData.text)
    );

    const batchResults = await Promise.allSettled(batchPromises);
    
    // Process results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          error: result.reason.message,
          to: batch[index].to
        });
      }
    });

    // Add delay between batches (except for the last batch)
    if (i < batches.length - 1) {
      console.log(`Waiting ${delay}ms before next batch...`);
      await sleep(delay);
    }
  }

  return results;
};

// Send welcome email to new subscribers
export const sendWelcomeEmail = async (subscriberEmail, subscriberName = null) => {
  try {
    const name = subscriberName || subscriberEmail.split('@')[0];
    const emailData = createWelcomeNewsletter({
      subscriberName: name,
      subscriberEmail: subscriberEmail
    });

    // Replace email placeholder in unsubscribe link
    const html = emailData.html.replace(/\{\{EMAIL\}\}/g, subscriberEmail);
    const text = emailData.text.replace(/\{\{EMAIL\}\}/g, subscriberEmail);

    return await sendEmail(subscriberEmail, emailData.subject, html, text);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// Get content for weekly newsletter
export const getWeeklyNewsletterContent = async () => {
  try {
    // Get featured games
    const gamesSnapshot = await db.collection("games")
      .where("featured", "==", true)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    const featuredGames = [];
    gamesSnapshot.forEach((doc) => {
      const game = doc.data();
      featuredGames.push({
        id: doc.id,
        title: game.title,
        description: game.description,
        rating: game.rating || 0,
        downloadCount: game.downloadCount || 0,
        platform: game.platform || 'PC'
      });
    });

    // Get latest news
    const newsSnapshot = await db.collection("news")
      .orderBy("createdAt", "desc")
      .limit(3)
      .get();

    const latestNews = [];
    newsSnapshot.forEach((doc) => {
      const article = doc.data();
      latestNews.push({
        id: doc.id,
        title: article.title,
        excerpt: article.content.substring(0, 150) + '...'
      });
    });

    // Mock community updates (you can replace this with real data)
    const communityUpdates = [
      {
        title: "New Community Challenge",
        content: "Join our weekly gaming challenge and compete with other players!"
      },
      {
        title: "Tournament Registration Open",
        content: "Sign up for the upcoming GameTribe tournament with amazing prizes."
      }
    ];

    return {
      featuredGames,
      latestNews,
      communityUpdates
    };
  } catch (error) {
    console.error('Error getting weekly newsletter content:', error);
    return {
      featuredGames: [],
      latestNews: [],
      communityUpdates: []
    };
  }
};

// Send weekly newsletter
export const sendWeeklyNewsletter = async () => {
  try {
    console.log('Starting weekly newsletter send...');
    
    // Get newsletter content
    const content = await getWeeklyNewsletterContent();
    
    // Get active subscribers
    const subscribers = await getActiveSubscribers();
    console.log(`Found ${subscribers.length} active subscribers`);

    if (subscribers.length === 0) {
      console.log('No active subscribers found');
      return { sent: 0, failed: 0 };
    }

    // Prepare emails
    const emails = subscribers.map(subscriber => {
      const name = subscriber.name || subscriber.email.split('@')[0];
      const emailData = createWeeklyNewsletter({
        ...content,
        subscriberName: name
      });

      // Replace email placeholder in unsubscribe link
      const html = emailData.html.replace(/\{\{EMAIL\}\}/g, subscriber.email);
      const text = emailData.text.replace(/\{\{EMAIL\}\}/g, subscriber.email);

      return {
        to: subscriber.email,
        subject: emailData.subject,
        html: html,
        text: text
      };
    });

    // Send emails in batches
    const results = await sendBatchEmails(emails);
    
    // Calculate statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Weekly newsletter sent: ${successful} successful, ${failed} failed`);
    
    // Log failed emails for debugging
    const failedEmails = results.filter(r => !r.success);
    if (failedEmails.length > 0) {
      console.log('Failed emails:', failedEmails);
    }

    return { sent: successful, failed: failed, total: subscribers.length };
  } catch (error) {
    console.error('Error sending weekly newsletter:', error);
    throw error;
  }
};

// Send new releases newsletter
export const sendNewReleasesNewsletter = async (newGames) => {
  try {
    console.log('Starting new releases newsletter send...');
    
    // Get active subscribers
    const subscribers = await getActiveSubscribers();
    console.log(`Found ${subscribers.length} active subscribers`);

    if (subscribers.length === 0) {
      console.log('No active subscribers found');
      return { sent: 0, failed: 0 };
    }

    // Prepare emails
    const emails = subscribers.map(subscriber => {
      const name = subscriber.name || subscriber.email.split('@')[0];
      const emailData = createNewReleasesNewsletter({
        newGames: newGames,
        subscriberName: name
      });

      // Replace email placeholder in unsubscribe link
      const html = emailData.html.replace(/\{\{EMAIL\}\}/g, subscriber.email);
      const text = emailData.text.replace(/\{\{EMAIL\}\}/g, subscriber.email);

      return {
        to: subscriber.email,
        subject: emailData.subject,
        html: html,
        text: text
      };
    });

    // Send emails in batches
    const results = await sendBatchEmails(emails);
    
    // Calculate statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`New releases newsletter sent: ${successful} successful, ${failed} failed`);
    
    return { sent: successful, failed: failed, total: subscribers.length };
  } catch (error) {
    console.error('Error sending new releases newsletter:', error);
    throw error;
  }
};

// Send community updates newsletter
export const sendCommunityNewsletter = async (communityData) => {
  try {
    console.log('Starting community newsletter send...');
    
    // Get active subscribers
    const subscribers = await getActiveSubscribers();
    console.log(`Found ${subscribers.length} active subscribers`);

    if (subscribers.length === 0) {
      console.log('No active subscribers found');
      return { sent: 0, failed: 0 };
    }

    // Prepare emails
    const emails = subscribers.map(subscriber => {
      const name = subscriber.name || subscriber.email.split('@')[0];
      const emailData = createCommunityNewsletter({
        ...communityData,
        subscriberName: name
      });

      // Replace email placeholder in unsubscribe link
      const html = emailData.html.replace(/\{\{EMAIL\}\}/g, subscriber.email);
      const text = emailData.text.replace(/\{\{EMAIL\}\}/g, subscriber.email);

      return {
        to: subscriber.email,
        subject: emailData.subject,
        html: html,
        text: text
      };
    });

    // Send emails in batches
    const results = await sendBatchEmails(emails);
    
    // Calculate statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Community newsletter sent: ${successful} successful, ${failed} failed`);
    
    return { sent: successful, failed: failed, total: subscribers.length };
  } catch (error) {
    console.error('Error sending community newsletter:', error);
    throw error;
  }
};

// Get monthly statistics
export const getMonthlyStats = async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get games added this month
    const gamesSnapshot = await db.collection("games")
      .where("createdAt", ">=", startOfMonth)
      .get();

    // Get news articles this month
    const newsSnapshot = await db.collection("news")
      .where("createdAt", ">=", startOfMonth)
      .get();

    return {
      newGames: gamesSnapshot.size,
      newArticles: newsSnapshot.size,
      month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
    };
  } catch (error) {
    console.error('Error getting monthly stats:', error);
    return {
      newGames: 0,
      newArticles: 0,
      month: 'Unknown'
    };
  }
};

// Get content for monthly newsletter
export const getMonthlyNewsletterContent = async () => {
  try {
    // Get monthly statistics
    const monthlyStats = await getMonthlyStats();
    
    // Get top games of the month
    const topGamesSnapshot = await db.collection("games")
      .orderBy("downloadCount", "desc")
      .limit(10)
      .get();

    const topGames = [];
    topGamesSnapshot.forEach((doc) => {
      const game = doc.data();
      topGames.push({
        id: doc.id,
        title: game.title,
        description: game.description,
        downloadCount: game.downloadCount || 0,
        rating: game.rating || 0
      });
    });

    return {
      communityEvents: [
        {
          title: "Monthly Gaming Challenge",
          description: "Join our monthly challenge and compete for prizes",
          date: "Ongoing"
        }
      ],
      userAchievements: [
        {
          title: "Top Games This Month",
          description: `Most downloaded games: ${topGames.slice(0, 3).map(g => g.title).join(', ')}`
        }
      ],
      contestUpdates: [
        {
          title: "Monthly Tournament Results",
          description: "Check out the winners of this month's tournaments",
          deadline: "Results available now"
        }
      ]
    };
  } catch (error) {
    console.error('Error getting monthly newsletter content:', error);
    return {
      communityEvents: [],
      userAchievements: [],
      contestUpdates: []
    };
  }
};

// Send monthly newsletter
export const sendMonthlyNewsletter = async () => {
  try {
    console.log('Starting monthly newsletter send...');
    
    // Get monthly content (similar to weekly but with monthly stats)
    const content = await getMonthlyNewsletterContent();
    
    // Get active subscribers
    const subscribers = await getActiveSubscribers();
    console.log(`Found ${subscribers.length} active subscribers`);

    if (subscribers.length === 0) {
      console.log('No active subscribers found');
      return { sent: 0, failed: 0 };
    }

    // Prepare emails
    const emails = subscribers.map(subscriber => {
      const name = subscriber.name || subscriber.email.split('@')[0];
      const emailData = createCommunityNewsletter({
        ...content,
        subscriberName: name
      });

      // Replace email placeholder in unsubscribe link
      const html = emailData.html.replace(/\{\{EMAIL\}\}/g, subscriber.email);
      const text = emailData.text.replace(/\{\{EMAIL\}\}/g, subscriber.email);

      return {
        to: subscriber.email,
        subject: '📊 GameTribe Monthly Report - Community Highlights',
        html: html,
        text: text
      };
    });

    // Send emails in batches
    const results = await sendBatchEmails(emails);
    
    // Calculate statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Monthly newsletter sent: ${successful} successful, ${failed} failed`);
    
    return { sent: successful, failed: failed, total: subscribers.length };
  } catch (error) {
    console.error('Error sending monthly newsletter:', error);
    throw error;
  }
};

// Get content for daily digest
export const getDailyDigestContent = async () => {
  try {
    // Get today's new games
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const newGamesSnapshot = await db.collection("games")
      .where("createdAt", ">=", startOfDay)
      .limit(5)
      .get();

    const newGames = [];
    newGamesSnapshot.forEach((doc) => {
      const game = doc.data();
      newGames.push({
        id: doc.id,
        title: game.title,
        description: game.description
      });
    });

    // Get today's news
    const newsSnapshot = await db.collection("news")
      .where("createdAt", ">=", startOfDay)
      .limit(3)
      .get();

    const todayNews = [];
    newsSnapshot.forEach((doc) => {
      const article = doc.data();
      todayNews.push({
        id: doc.id,
        title: article.title,
        content: article.content.substring(0, 100) + '...'
      });
    });

    return {
      communityEvents: newGames.length > 0 ? [
        {
          title: "New Games Added Today",
          description: `${newGames.length} new games available for download`,
          date: "Today"
        }
      ] : [],
      userAchievements: todayNews.length > 0 ? [
        {
          title: "Latest News",
          description: `${todayNews.length} new articles published today`
        }
      ] : [],
      contestUpdates: []
    };
  } catch (error) {
    console.error('Error getting daily digest content:', error);
    return {
      communityEvents: [],
      userAchievements: [],
      contestUpdates: []
    };
  }
};

// Send daily digest
export const sendDailyDigest = async () => {
  try {
    console.log('Starting daily digest send...');
    
    // Get daily content
    const content = await getDailyDigestContent();
    
    // Get active subscribers
    const subscribers = await getActiveSubscribers();
    console.log(`Found ${subscribers.length} active subscribers`);

    if (subscribers.length === 0) {
      console.log('No active subscribers found');
      return { sent: 0, failed: 0 };
    }

    // Prepare emails
    const emails = subscribers.map(subscriber => {
      const name = subscriber.name || subscriber.email.split('@')[0];
      const emailData = createCommunityNewsletter({
        ...content,
        subscriberName: name
      });

      // Replace email placeholder in unsubscribe link
      const html = emailData.html.replace(/\{\{EMAIL\}\}/g, subscriber.email);
      const text = emailData.text.replace(/\{\{EMAIL\}\}/g, subscriber.email);

      return {
        to: subscriber.email,
        subject: '📰 GameTribe Daily Digest - Today\'s Highlights',
        html: html,
        text: text
      };
    });

    // Send emails in batches
    const results = await sendBatchEmails(emails);
    
    // Calculate statistics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Daily digest sent: ${successful} successful, ${failed} failed`);
    
    return { sent: successful, failed: failed, total: subscribers.length };
  } catch (error) {
    console.error('Error sending daily digest:', error);
    throw error;
  }
};

// Get email service status
export const getEmailServiceStatus = () => {
  return {
    initialized: isInitialized,
    transporter: transporter ? 'configured' : 'not configured'
  };
};

// Default export for backward compatibility
export default {
  initialize: initializeEmailService,
  getActiveSubscribers,
  sendEmail,
  sendBatchEmails,
  sendWelcomeEmail,
  sendWeeklyNewsletter,
  sendNewReleasesNewsletter,
  sendCommunityNewsletter,
  sendMonthlyNewsletter,
  sendDailyDigest,
  getStatus: getEmailServiceStatus
}; 