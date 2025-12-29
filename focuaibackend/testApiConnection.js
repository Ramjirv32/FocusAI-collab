const axios = require('axios');



const AI_API_BASE_URL = 'http://localhost:8000';
const TEST_USER_ID = '6885b9202e0e815cf52a94a7';

const runTests = async () => {
  console.log('🧪 Testing API connections to Focus AI backend...');
  console.log(`🔗 API URL: ${AI_API_BASE_URL}`);
  console.log(`👤 Test User ID: ${TEST_USER_ID}`);
  console.log('-----------------------------------');
  
  try {
    
    console.log('1️⃣ Testing basic API connection...');
    try {
      const rootResponse = await axios.get(AI_API_BASE_URL + '/');
      console.log('✅ Basic connection successful!');
    } catch (error) {
      console.log('❌ Basic connection failed:', error.message);
      console.log('❗ Make sure the FastAPI server is running on port 8000');
      return;
    }
    
    
    console.log('\n2️⃣ Testing data seeding...');
    const today = new Date().toISOString().split('T')[0];
    try {
      const seedResponse = await axios.post(`${AI_API_BASE_URL}/seed-test-data/${TEST_USER_ID}?date=${today}`);
      console.log('✅ Data seeding successful!', seedResponse.data);
    } catch (error) {
      console.log('❌ Data seeding failed:', error.message);
      if (error.response) {
        console.log('Response:', error.response.data);
      }
    }
    
    
    console.log('\n3️⃣ Testing focus analysis endpoint...');
    try {
      const analysisResponse = await axios.get(`${AI_API_BASE_URL}/user/${TEST_USER_ID}/focus-analysis?date=${today}`);
      console.log('✅ Focus analysis successful!');
      console.log('📊 Total activities:', analysisResponse.data.total_activities);
      console.log('⏱️ Total duration:', analysisResponse.data.total_duration);
      console.log('📈 Productivity score:', analysisResponse.data.summary.productivity_score);
    } catch (error) {
      console.log('❌ Focus analysis failed:', error.message);
      if (error.response) {
        console.log('Response:', error.response.data);
      }
    }
    
    
    console.log('\n4️⃣ Testing quick stats endpoint...');
    try {
      const statsResponse = await axios.get(`${AI_API_BASE_URL}/user/${TEST_USER_ID}/quick-stats?date=${today}`);
      console.log('✅ Quick stats successful!');
      console.log('📊 Stats:', statsResponse.data.quick_stats);
    } catch (error) {
      console.log('❌ Quick stats failed:', error.message);
      if (error.response) {
        console.log('Response:', error.response.data);
      }
    }
    
    console.log('\n✨ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with an unexpected error:', error.message);
  }
};

runTests();