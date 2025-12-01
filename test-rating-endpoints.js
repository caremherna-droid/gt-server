// Simple test script to verify rating endpoints
// Run with: node test-rating-endpoints.js

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testGameId = 'test-game-123';
const testUserId = 'test-user-456';

async function testEndpoints() {
  console.log('🧪 Testing Rating Endpoints...\n');

  try {
    // Test 1: Get ratings for a game (should work without auth)
    console.log('1. Testing GET /ratings/game/:gameId');
    const ratingsResponse = await fetch(`${BASE_URL}/ratings/game/${testGameId}`);
    const ratingsData = await ratingsResponse.json();
    console.log('Response:', ratingsData);
    console.log('Status:', ratingsResponse.status, '\n');

    // Test 2: Get rating stats for a game (should work without auth)
    console.log('2. Testing GET /ratings/game/:gameId/stats');
    const statsResponse = await fetch(`${BASE_URL}/ratings/game/${testGameId}/stats`);
    const statsData = await statsResponse.json();
    console.log('Response:', statsData);
    console.log('Status:', statsResponse.status, '\n');

    // Test 3: Try to submit rating without auth (should fail)
    console.log('3. Testing POST /ratings (without auth - should fail)');
    const submitResponse = await fetch(`${BASE_URL}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gameId: testGameId,
        rating: 4.5
      })
    });
    const submitData = await submitResponse.json();
    console.log('Response:', submitData);
    console.log('Status:', submitResponse.status, '\n');

    console.log('✅ Basic endpoint tests completed!');
    console.log('📝 Note: Authentication-required endpoints will need valid Firebase tokens to test fully.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if server is running
testEndpoints();
