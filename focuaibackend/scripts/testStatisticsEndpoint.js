const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function testStatisticsEndpoint() {
  try {
    const token = await promptForToken();
    
    console.log('Testing statistics endpoint...');
    const response = await axios.get('http://localhost:5001/api/statistics', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        timeFrame: 'weekly'
      }
    });
    
    console.log('Statistics response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    rl.close();
  } catch (error) {
    console.error('Error testing statistics endpoint:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
    rl.close();
  }
}

function promptForToken() {
  return new Promise((resolve) => {
    rl.question('Enter your authentication token: ', (token) => {
      resolve(token);
    });
  });
}

testStatisticsEndpoint();