import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config({ path: ".env.development" });
}

// Email configuration
const emailConfig = {
  // SMTP Configuration
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Optional: TLS configuration
  tls: {
    rejectUnauthorized: false
  }
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter(emailConfig);
};

// Email templates configuration
const emailTemplates = {
  from: {
    name: process.env.EMAIL_FROM_NAME || 'GameTribe',
    email: process.env.EMAIL_FROM_ADDRESS || 'noreply@gametribe.com'
  },
  replyTo: process.env.EMAIL_REPLY_TO || 'support@gametribe.com',
  websiteUrl: process.env.WEBSITE_URL || 'https://gametribe.com',
  unsubscribeUrl: process.env.UNSUBSCRIBE_URL || 'https://gametribe.com/unsubscribe'
};

// Newsletter configuration
const newsletterConfig = {
  // How often to send newsletters (in cron format)
  schedule: process.env.NEWSLETTER_SCHEDULE || '0 10 * * 5', // Every Friday at 10 AM
  // Maximum emails per batch to avoid rate limits
  batchSize: parseInt(process.env.EMAIL_BATCH_SIZE) || 50,
  // Delay between batches (in milliseconds)
  batchDelay: parseInt(process.env.EMAIL_BATCH_DELAY) || 1000,
  // Newsletter types
  types: {
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    FEATURED_GAMES: 'featured_games',
    NEW_RELEASES: 'new_releases',
    COMMUNITY_UPDATES: 'community_updates'
  }
};

export { createTransporter, emailTemplates, newsletterConfig }; 