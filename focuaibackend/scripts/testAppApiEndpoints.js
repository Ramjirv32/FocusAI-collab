const axios = require('axios');

// Function to test API endpoints
async function testApiEndpoints() {
  try {
    // Replace with a valid JWT token from your application
    const token = 'YOUR_JWT_TOKEN_HERE';
    
    console.log('Testing API endpoints for application analytics...');
    
    // Test the app-analytics endpoint
    console.log('\nTesting /api/app-analytics endpoint:');
    const analyticsResponse = await axios.get('http://localhost:5001/api/app-analytics?timeframe=weekly', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', analyticsResponse.status);
    console.log('Response data structure:', Object.keys(analyticsResponse.data));
    console.log('Has app usage data:', analyticsResponse.data.appUsage && analyticsResponse.data.appUsage.length > 0);
    
    // Test the app-vs-web endpoint
    console.log('\nTesting /api/app-vs-web endpoint:');
    const appVsWebResponse = await axios.get('http://localhost:5001/api/app-vs-web?timeframe=weekly', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', appVsWebResponse.status);
    console.log('Response data structure:', Object.keys(appVsWebResponse.data));
    console.log('App percentage:', appVsWebResponse.data.appPercentage);
    console.log('Web percentage:', appVsWebResponse.data.webPercentage);
    
    // Test the app-trends endpoint
    console.log('\nTesting /api/app-trends endpoint:');
    const trendsResponse = await axios.get('http://localhost:5001/api/app-trends?period=30days', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', trendsResponse.status);
    console.log('Response data structure:', Object.keys(trendsResponse.data));
    console.log('Has trends data:', trendsResponse.data.trends && trendsResponse.data.trends.length > 0);
    
    console.log('\nAll API tests completed successfully.');
  } catch (error) {
    console.error('API test failed:', error.message);
    if (error.response) {
      console.error('Error details:', {
        status: error.response.status,
        data: error.response.data
      });
    }
  }
}

// Execute the tests
testApiEndpoints();
