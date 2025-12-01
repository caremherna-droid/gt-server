# GameTribe Newsletter Email System Setup

This document explains how to set up the automatic newsletter email system for GameTribe.

## Features

- **Automatic Newsletter Sending**: Scheduled emails using cron jobs
- **Multiple Newsletter Types**: Weekly, monthly, daily digest, new releases, community updates
- **Welcome Emails**: Automatic welcome emails for new subscribers
- **Batch Processing**: Efficient email sending with rate limiting
- **HTML Templates**: Beautiful, responsive email templates
- **Unsubscribe Support**: Built-in unsubscribe functionality

## Email Configuration

Create a `.env.production` file in the `gt-server` directory with the following variables:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email Templates
EMAIL_FROM_NAME=GameTribe
EMAIL_FROM_ADDRESS=noreply@gametribe.com
EMAIL_REPLY_TO=support@gametribe.com

# Website URLs
WEBSITE_URL=https://gametribe.com
UNSUBSCRIBE_URL=https://gametribe.com/unsubscribe

# Newsletter Configuration
NEWSLETTER_SCHEDULE=0 10 * * 5
EMAIL_BATCH_SIZE=50
EMAIL_BATCH_DELAY=1000

# Environment
NODE_ENV=production
```

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in `SMTP_PASS`

## Alternative Email Providers

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-access-key
SMTP_PASS=your-ses-secret-key
```

## Newsletter Schedules

The system supports multiple newsletter types with different schedules:

- **Weekly Newsletter**: Every Friday at 10 AM UTC (`0 10 * * 5`)
- **Monthly Newsletter**: First day of month at 9 AM UTC (`0 9 1 * *`)
- **Daily Digest**: Every day at 6 PM UTC (`0 18 * * *`)

### Customizing Schedules

You can modify the schedules in `config/emailConfig.js`:

```javascript
const newsletterConfig = {
  schedule: process.env.NEWSLETTER_SCHEDULE || '0 10 * * 5', // Weekly
  // ... other config
};
```

## API Endpoints

### Newsletter Management

- `GET /api/newsletter/scheduler/status` - Get scheduler status
- `POST /api/newsletter/scheduler/initialize` - Initialize scheduler
- `POST /api/newsletter/scheduler/trigger` - Manually trigger newsletter
- `POST /api/newsletter/scheduler/stop` - Stop all jobs
- `PUT /api/newsletter/scheduler/schedule` - Update job schedule

### Email Service

- `GET /api/newsletter/email/status` - Get email service status
- `POST /api/newsletter/email/test` - Send test email

### Manual Newsletter Sending

- `POST /api/newsletter/send/weekly` - Send weekly newsletter
- `POST /api/newsletter/send/monthly` - Send monthly newsletter
- `POST /api/newsletter/send/daily` - Send daily digest
- `POST /api/newsletter/send/new-releases` - Send new releases newsletter

## Testing the System

### 1. Test Email Configuration

```bash
curl -X POST http://localhost:3000/api/newsletter/email/test \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 2. Test Newsletter Sending

```bash
# Send weekly newsletter
curl -X POST http://localhost:3000/api/newsletter/send/weekly

# Send new releases newsletter
curl -X POST http://localhost:3000/api/newsletter/send/new-releases \
  -H "Content-Type: application/json" \
  -d '{"games": [{"title": "Test Game", "description": "A test game"}]}'
```

### 3. Check Scheduler Status

```bash
curl http://localhost:3000/api/newsletter/scheduler/status
```

## Email Templates

The system includes several email templates:

1. **Welcome Email**: Sent to new subscribers
2. **Weekly Newsletter**: Featured games, latest news, community updates
3. **Monthly Newsletter**: Monthly statistics and highlights
4. **Daily Digest**: Daily updates and new content
5. **New Releases**: New games added to the platform
6. **Community Updates**: Events, contests, achievements

### Customizing Templates

Templates are located in `services/emailTemplates.js`. You can modify:

- HTML structure and styling
- Content sections
- Email subjects
- Call-to-action buttons

## Database Schema

The newsletter system uses the following Firestore collections:

### newsletter_subscriptions
```javascript
{
  email: "user@example.com",
  status: "active", // active, unsubscribed
  source: "footer_form",
  confirmedAt: "2024-01-01T00:00:00.000Z",
  subscribedAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

## Production Deployment

### Vercel Deployment

1. Set environment variables in Vercel dashboard
2. The scheduler will automatically initialize in production
3. Monitor logs for email sending status

### Manual Deployment

1. Set up environment variables
2. Start the server: `npm start`
3. Initialize scheduler: `POST /api/newsletter/scheduler/initialize`

## Monitoring and Logs

The system provides comprehensive logging:

- Email sending success/failure
- Scheduler job execution
- Subscriber management
- Error tracking

### Key Log Messages

- `Email service initialized successfully`
- `Newsletter scheduler initialized successfully`
- `Weekly newsletter sent: X successful, Y failed`
- `Welcome email sent to user@example.com`

## Troubleshooting

### Common Issues

1. **SMTP Authentication Failed**
   - Check SMTP credentials
   - Verify app password for Gmail
   - Ensure 2FA is enabled

2. **Emails Not Sending**
   - Check email service status: `GET /api/newsletter/email/status`
   - Verify SMTP configuration
   - Check server logs for errors

3. **Scheduler Not Running**
   - Initialize scheduler: `POST /api/newsletter/scheduler/initialize`
   - Check scheduler status: `GET /api/newsletter/scheduler/status`
   - Verify cron schedule format

4. **Rate Limiting**
   - Reduce `EMAIL_BATCH_SIZE` in configuration
   - Increase `EMAIL_BATCH_DELAY` between batches
   - Check email provider limits

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` and check console output for detailed information.

## Security Considerations

1. **Environment Variables**: Never commit email credentials to version control
2. **Rate Limiting**: Configure appropriate batch sizes to avoid provider limits
3. **Unsubscribe**: Always include unsubscribe links in emails
4. **Data Privacy**: Follow GDPR and other privacy regulations
5. **Email Validation**: Validate email addresses before sending

## Support

For issues or questions about the newsletter system:

1. Check server logs for error messages
2. Test email configuration with test endpoint
3. Verify environment variables are set correctly
4. Check email provider documentation for specific requirements 