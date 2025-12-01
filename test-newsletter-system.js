// Test script for the newsletter email system
// Run with: node test-newsletter-system.js

import fetch from 'node-fetch';

// Simple function-based test

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testEmail = 'test@example.com';
const testGames = [
  {
    title: 'Adventure Quest',
    description: 'An epic adventure game with stunning graphics',
    category: 'Adventure',
    platform: 'PC',
    releaseDate: '2024-01-15'
  },
  {
    title: 'Puzzle Master',
    description: 'Brain-teasing puzzles for all ages',
    category: 'Puzzle',
    platform: 'Mobile',
    releaseDate: '2024-01-16'
  }
];

async function testNewsletterSystem() {
  console.log('🧪 Testing Newsletter Email System...\n');

  try {
    // Test 1: Check email service status
    console.log('1. Testing Email Service Status');
    const emailStatusResponse = await fetch(`${BASE_URL}/newsletter/email/status`);
    const emailStatus = await emailStatusResponse.json();
    console.log('Email Service Status:', emailStatus);
    console.log('Status:', emailStatusResponse.status, '\n');

    // Test 2: Check scheduler status
    console.log('2. Testing Scheduler Status');
    const schedulerStatusResponse = await fetch(`${BASE_URL}/newsletter/scheduler/status`);
    const schedulerStatus = await schedulerStatusResponse.json();
    console.log('Scheduler Status:', schedulerStatus);
    console.log('Status:', schedulerStatusResponse.status, '\n');

    // Test 3: Send test email
    console.log('3. Testing Email Sending');
    const testEmailResponse = await fetch(`${BASE_URL}/newsletter/email/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: testEmail })
    });
    const testEmailResult = await testEmailResponse.json();
    console.log('Test Email Result:', testEmailResult);
    console.log('Status:', testEmailResponse.status, '\n');

    // Test 4: Send new releases newsletter
    console.log('4. Testing New Releases Newsletter');
    const newReleasesResponse = await fetch(`${BASE_URL}/newsletter/send/new-releases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ games: testGames })
    });
    const newReleasesResult = await newReleasesResponse.json();
    console.log('New Releases Newsletter Result:', newReleasesResult);
    console.log('Status:', newReleasesResponse.status, '\n');

    // Test 5: Get newsletter stats
    console.log('5. Testing Newsletter Statistics');
    const statsResponse = await fetch(`${BASE_URL}/newsletter/stats`);
    const stats = await statsResponse.json();
    console.log('Newsletter Stats:', stats);
    console.log('Status:', statsResponse.status, '\n');

    // Test 6: Subscribe to newsletter
    console.log('6. Testing Newsletter Subscription');
    const subscribeResponse = await fetch(`${BASE_URL}/newsletter/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: testEmail })
    });
    const subscribeResult = await subscribeResponse.json();
    console.log('Subscribe Result:', subscribeResult);
    console.log('Status:', subscribeResponse.status, '\n');

    // Test 7: Check subscription status
    console.log('7. Testing Subscription Status');
    const statusResponse = await fetch(`${BASE_URL}/newsletter/status?email=${testEmail}`);
    const statusResult = await statusResponse.json();
    console.log('Subscription Status:', statusResult);
    console.log('Status:', statusResponse.status, '\n');

    // Test 8: Unsubscribe from newsletter
    console.log('8. Testing Newsletter Unsubscription');
    const unsubscribeResponse = await fetch(`${BASE_URL}/newsletter/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: testEmail })
    });
    const unsubscribeResult = await unsubscribeResponse.json();
    console.log('Unsubscribe Result:', unsubscribeResult);
    console.log('Status:', unsubscribeResponse.status, '\n');

    console.log('✅ Newsletter system tests completed!');
    console.log('📧 Check your email inbox for test emails');
    console.log('📊 Review the results above for any issues');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Make sure the server is running on http://localhost:3000');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testNewsletterSystem();
}

export default testNewsletterSystem; 