const axios = require('axios');



const API_BASE_URL = 'http://localhost:5001';
const TEST_TOKEN = ''; 

const runTests = async () => {
  console.log('🧪 Testing Gamification API endpoints...');
  console.log(`🔗 API URL: ${API_BASE_URL}`);
  console.log('-----------------------------------');
  
  
  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  try {
    
    console.log('1️⃣ Testing server health...');
    try {
      const rootResponse = await axios.get(API_BASE_URL + '/');
      console.log('✅ Server is running!');
    } catch (error) {
      console.log('❌ Server connection failed:', error.message);
      console.log('❗ Make sure the Express server is running on port 5001');
      return;
    }
    
    
    if (!TEST_TOKEN) {
      console.log('\n⚠️ No authentication token provided. Skipping authenticated endpoints.');
      console.log('To test authenticated endpoints:');
      console.log('1. Register or login to get a JWT token');
      console.log('2. Insert the token in the TEST_TOKEN variable');
      console.log('\n✨ Test completed!');
      return;
    }

    
    console.log('\n2️⃣ Testing gamification stats endpoint...');
    try {
      const statsResponse = await axios.get(`${API_BASE_URL}/api/gamification/stats`, { headers });
      console.log('✅ Gamification stats successful!');
      console.log('📊 Stats:', statsResponse.data);
    } catch (error) {
      console.log('❌ Gamification stats failed:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response:', error.response.data);
      }
    }
    
    
    console.log('\n3️⃣ Testing achievements endpoint...');
    try {
      const achievementsResponse = await axios.get(`${API_BASE_URL}/api/gamification/achievements`, { headers });
      console.log('✅ Achievements endpoint successful!');
      console.log('🏆 Achievements count:', achievementsResponse.data.achievements?.length || 0);
    } catch (error) {
      console.log('❌ Achievements endpoint failed:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response:', error.response.data);
      }
    }
    
    
    console.log('\n4️⃣ Testing challenges endpoint...');
    try {
      const challengesResponse = await axios.get(`${API_BASE_URL}/api/gamification/challenges`, { headers });
      console.log('✅ Challenges endpoint successful!');
      console.log('🎯 Challenges count:', challengesResponse.data.challenges?.length || 0);
    } catch (error) {
      console.log('❌ Challenges endpoint failed:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response:', error.response.data);
      }
    }
    
    
    console.log('\n5️⃣ Testing leaderboard endpoint...');
    try {
      const leaderboardResponse = await axios.get(`${API_BASE_URL}/api/gamification/leaderboard`, { headers });
      console.log('✅ Leaderboard endpoint successful!');
      console.log('🏅 Leaderboard entries:', leaderboardResponse.data.leaderboard?.length || 0);
    } catch (error) {
      console.log('❌ Leaderboard endpoint failed:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response:', error.response.data);
      }
    }
    
    
    console.log('\n6️⃣ Testing sync-productivity endpoint...');
    try {
      const syncResponse = await axios.post(`${API_BASE_URL}/api/gamification/sync-productivity`, {}, { headers });
      console.log('✅ Sync productivity endpoint successful!');
      console.log('💰 Points earned:', syncResponse.data.pointsEarned);
      console.log('🆕 New badges:', syncResponse.data.newBadges?.length || 0);
    } catch (error) {
      console.log('❌ Sync productivity endpoint failed:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response:', error.response.data);
      }
    }
    
    console.log('\n✨ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with an unexpected error:', error.message);
  }
};

runTests();
