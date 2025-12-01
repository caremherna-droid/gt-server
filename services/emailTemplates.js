import { emailTemplates } from '../config/emailConfig.js';

// Base email template wrapper
const createEmailWrapper = (content, subject) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .email-container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #6c5ce7;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #6c5ce7;
          margin-bottom: 10px;
        }
        .tagline {
          color: #666;
          font-size: 16px;
        }
        .content {
          margin-bottom: 30px;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #eee;
          color: #666;
          font-size: 14px;
        }
        .unsubscribe-link {
          color: #6c5ce7;
          text-decoration: none;
        }
        .unsubscribe-link:hover {
          text-decoration: underline;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #6c5ce7;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin: 10px 0;
        }
        .button:hover {
          background-color: #5541d7;
        }
        .game-card {
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
          background-color: #f9f9f9;
        }
        .game-title {
          font-size: 18px;
          font-weight: bold;
          color: #333;
          margin-bottom: 8px;
        }
        .game-description {
          color: #666;
          margin-bottom: 10px;
        }
        .game-meta {
          font-size: 14px;
          color: #888;
        }
        .news-item {
          margin: 15px 0;
          padding: 15px;
          border-left: 4px solid #6c5ce7;
          background-color: #f8f9fa;
        }
        .news-title {
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
        }
        .news-excerpt {
          color: #666;
          font-size: 14px;
        }
        @media (max-width: 600px) {
          body {
            padding: 10px;
          }
          .email-container {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">GameTribe</div>
          <div class="tagline">Your Gaming Community</div>
        </div>
        
        <div class="content">
          ${content}
        </div>
        
        <div class="footer">
          <p>© 2024 GameTribe. All rights reserved.</p>
          <p>
            <a href="${emailTemplates.unsubscribeUrl}?email={{EMAIL}}" class="unsubscribe-link">
              Unsubscribe from this newsletter
            </a>
          </p>
          <p>
            <a href="${emailTemplates.websiteUrl}" class="unsubscribe-link">
              Visit GameTribe
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
};

// Weekly newsletter template
export const createWeeklyNewsletter = (data) => {
  const {
    featuredGames = [],
    latestNews = [],
    communityUpdates = [],
    subscriberName = 'Gamer'
  } = data;

  const content = `
    <h2>🎮 Weekly Gaming Roundup</h2>
    <p>Hello ${subscriberName}!</p>
    <p>Here's what's new in the GameTribe community this week:</p>
    
    ${featuredGames.length > 0 ? `
      <h3>🔥 Featured Games</h3>
      ${featuredGames.map(game => `
        <div class="game-card">
          <div class="game-title">${game.title}</div>
          <div class="game-description">${game.description}</div>
          <div class="game-meta">
            Rating: ${game.rating}/5 ⭐ | Downloads: ${game.downloadCount} | Platform: ${game.platform}
          </div>
          <a href="${emailTemplates.websiteUrl}/games/${game.id}" class="button">Play Now</a>
        </div>
      `).join('')}
    ` : ''}
    
    ${latestNews.length > 0 ? `
      <h3>📰 Latest News</h3>
      ${latestNews.map(article => `
        <div class="news-item">
          <div class="news-title">${article.title}</div>
          <div class="news-excerpt">${article.excerpt}</div>
          <a href="${emailTemplates.websiteUrl}/news/${article.id}" class="unsubscribe-link">Read More →</a>
        </div>
      `).join('')}
    ` : ''}
    
    ${communityUpdates.length > 0 ? `
      <h3>👥 Community Updates</h3>
      ${communityUpdates.map(update => `
        <div class="news-item">
          <div class="news-title">${update.title}</div>
          <div class="news-excerpt">${update.content}</div>
        </div>
      `).join('')}
    ` : ''}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${emailTemplates.websiteUrl}" class="button">Explore More Games</a>
    </div>
  `;

  return {
    subject: '🎮 GameTribe Weekly: New Games & Community Updates',
    html: createEmailWrapper(content, 'GameTribe Weekly Newsletter'),
    text: `GameTribe Weekly Newsletter\n\nHello ${subscriberName}!\n\nCheck out the latest games and updates in our community.\n\nVisit ${emailTemplates.websiteUrl} to explore more games.\n\nUnsubscribe: ${emailTemplates.unsubscribeUrl}`
  };
};

// New releases newsletter template
export const createNewReleasesNewsletter = (data) => {
  const {
    newGames = [],
    subscriberName = 'Gamer'
  } = data;

  const content = `
    <h2>🚀 New Game Releases</h2>
    <p>Hello ${subscriberName}!</p>
    <p>Exciting new games have just been added to GameTribe:</p>
    
    ${newGames.map(game => `
      <div class="game-card">
        <div class="game-title">${game.title}</div>
        <div class="game-description">${game.description}</div>
        <div class="game-meta">
          Category: ${game.category} | Platform: ${game.platform} | Release Date: ${game.releaseDate}
        </div>
        <a href="${emailTemplates.websiteUrl}/games/${game.id}" class="button">Download Now</a>
      </div>
    `).join('')}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${emailTemplates.websiteUrl}/games" class="button">Browse All Games</a>
    </div>
  `;

  return {
    subject: '🚀 New Games Available on GameTribe!',
    html: createEmailWrapper(content, 'New Game Releases'),
    text: `New Game Releases\n\nHello ${subscriberName}!\n\nNew games are now available on GameTribe.\n\nVisit ${emailTemplates.websiteUrl}/games to download them.\n\nUnsubscribe: ${emailTemplates.unsubscribeUrl}`
  };
};

// Welcome newsletter template
export const createWelcomeNewsletter = (data) => {
  const {
    subscriberName = 'Gamer',
    subscriberEmail
  } = data;

  const content = `
    <h2>🎉 Welcome to GameTribe!</h2>
    <p>Hello ${subscriberName}!</p>
    <p>Welcome to the GameTribe community! We're excited to have you join us.</p>
    
    <h3>What you can expect:</h3>
    <ul>
      <li>🎮 Weekly updates on new games and releases</li>
      <li>🏆 Community challenges and tournaments</li>
      <li>📰 Gaming news and industry updates</li>
      <li>🎯 Exclusive content and early access</li>
    </ul>
    
    <h3>Get Started:</h3>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${emailTemplates.websiteUrl}/games" class="button">Explore Games</a>
      <a href="${emailTemplates.websiteUrl}/news" class="button">Read News</a>
    </div>
    
    <p>If you have any questions, feel free to reach out to our support team.</p>
  `;

  return {
    subject: '🎉 Welcome to GameTribe - Your Gaming Community!',
    html: createEmailWrapper(content, 'Welcome to GameTribe'),
    text: `Welcome to GameTribe!\n\nHello ${subscriberName}!\n\nWelcome to the GameTribe community! We're excited to have you join us.\n\nVisit ${emailTemplates.websiteUrl} to get started.\n\nUnsubscribe: ${emailTemplates.unsubscribeUrl}`
  };
};

// Community updates newsletter template
export const createCommunityNewsletter = (data) => {
  const {
    communityEvents = [],
    userAchievements = [],
    contestUpdates = [],
    subscriberName = 'Gamer'
  } = data;

  const content = `
    <h2>👥 GameTribe Community Updates</h2>
    <p>Hello ${subscriberName}!</p>
    <p>Here's what's happening in our gaming community:</p>
    
    ${communityEvents.length > 0 ? `
      <h3>🎪 Upcoming Events</h3>
      ${communityEvents.map(event => `
        <div class="news-item">
          <div class="news-title">${event.title}</div>
          <div class="news-excerpt">${event.description} - ${event.date}</div>
        </div>
      `).join('')}
    ` : ''}
    
    ${contestUpdates.length > 0 ? `
      <h3>🏆 Contest Updates</h3>
      ${contestUpdates.map(contest => `
        <div class="news-item">
          <div class="news-title">${contest.title}</div>
          <div class="news-excerpt">${contest.description} - Deadline: ${contest.deadline}</div>
        </div>
      `).join('')}
    ` : ''}
    
    ${userAchievements.length > 0 ? `
      <h3>🎯 Community Achievements</h3>
      ${userAchievements.map(achievement => `
        <div class="news-item">
          <div class="news-title">${achievement.title}</div>
          <div class="news-excerpt">${achievement.description}</div>
        </div>
      `).join('')}
    ` : ''}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${emailTemplates.websiteUrl}/community" class="button">Join the Community</a>
    </div>
  `;

  return {
    subject: '👥 GameTribe Community: Events, Contests & Achievements',
    html: createEmailWrapper(content, 'Community Updates'),
    text: `Community Updates\n\nHello ${subscriberName}!\n\nCheck out the latest community events and updates.\n\nVisit ${emailTemplates.websiteUrl}/community to join in.\n\nUnsubscribe: ${emailTemplates.unsubscribeUrl}`
  };
}; 