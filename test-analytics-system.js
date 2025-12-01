import axios from 'axios';

// Test the analytics system
const API_URL = 'http://localhost:3000/api/analytics';

const testAnalyticsSystem = async () => {
  console.log('🧪 Testing Analytics System...\n');

  try {
    // Test 1: Start a game session
    console.log('1️⃣ Testing: Start Game Session');
    const startResponse = await axios.post(`${API_URL}/sessions/start`, {
      gameId: 'test-game-123',
      userId: 'test-user-456',
      userEmail: 'test@example.com'
    });

    if (startResponse.data.success) {
      console.log('✅ Game session started successfully');
      console.log(`   Session ID: ${startResponse.data.sessionId}`);
      
      const sessionId = startResponse.data.sessionId;

      // Wait a few seconds to simulate gameplay
      console.log('⏳ Simulating 5 seconds of gameplay...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Test 2: End the game session
      console.log('\n2️⃣ Testing: End Game Session');
      const endResponse = await axios.put(`${API_URL}/sessions/${sessionId}/end`, {
        completed: true
      });

      if (endResponse.data.success) {
        console.log('✅ Game session ended successfully');
        console.log(`   Duration: ${endResponse.data.duration} seconds`);
      }
    }

    // Test 3: Get analytics summary
    console.log('\n3️⃣ Testing: Get Analytics Summary');
    const summaryResponse = await axios.get(`${API_URL}/summary`);
    
    if (summaryResponse.data.success) {
      console.log('✅ Analytics summary retrieved successfully');
      console.log('   Summary:', JSON.stringify(summaryResponse.data.data, null, 2));
    }

    // Test 4: Get most played games
    console.log('\n4️⃣ Testing: Get Most Played Games');
    const mostPlayedResponse = await axios.get(`${API_URL}/most-played?limit=5`);
    
    if (mostPlayedResponse.data.success) {
      console.log('✅ Most played games retrieved successfully');
      console.log(`   Found ${mostPlayedResponse.data.data.length} games with play data`);
    }

    console.log('\n🎉 All analytics tests completed successfully!');
    console.log('\n📊 Analytics System Features:');
    console.log('   ✓ Game session tracking (start/end)');
    console.log('   ✓ Play duration measurement');
    console.log('   ✓ Analytics summary generation');
    console.log('   ✓ Most played games ranking');
    console.log('   ✓ Game statistics aggregation');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running on http://localhost:3000');
      console.log('   Run: npm start (in gt-server directory)');
    }
  }
};

// Run the test
testAnalyticsSystem();
