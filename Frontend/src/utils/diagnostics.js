import axios from 'axios';

/**
 * Test connection to the AI server
 */
export const checkAiServerConnection = async () => {
  // Try both potential AI server ports and endpoints
  const servers = [
    { url: 'http://localhost:8000/', description: 'AI Server' },
    { url: 'http://localhost:8000/health', description: 'AI Server health' },
    { url: 'http://localhost:5000/', description: 'Model Server' },
    { url: 'http://localhost:5000/health', description: 'Model Server health' }
  ];
  
  for (const server of servers) {
    try {
      const response = await axios.get(server.url);
      console.log(`✅ ${server.description} is online:`, response.data);
      return {
        success: true,
        message: `${server.description} is online: ${response.data.message || 'Connected'}`,
        status: response.status,
        serverInfo: server
      };
    } catch (error) {
      console.error(`❌ ${server.description} connection error:`, error.message);
      // Continue to the next server in the loop
    }
  }
  
  // If we get here, none of the servers responded
  return {
    success: false,
    message: 'Cannot connect to any AI server. Make sure the AI server is running on port 5000 or 8000.',
    error: new Error('No AI servers responding')
  };
};

/**
 * Test connection to the backend server
 */
export const checkBackendConnection = async () => {
  // Try both the health endpoint and root endpoint
  const endpoints = [
    { url: 'http://localhost:5001/', description: 'Backend Server root' },
    { url: 'http://localhost:5001/health', description: 'Backend Server health' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint.url);
      console.log(`✅ ${endpoint.description} is online:`, response.data);
      return {
        success: true,
        message: response.data.message || response.data.status || 'Backend server is online',
        status: response.status
      };
    } catch (error) {
      console.error(`❌ ${endpoint.description} connection error:`, error.message);
      // Continue to the next endpoint
    }
  }
  
  // If we get here, neither endpoint responded
  return {
    success: false,
    message: 'Cannot connect to backend server. Make sure the server is running on port 5001.',
    error: new Error('Backend server not responding')
  };
};

/**
 * Run all diagnostic tests
 */
export const runDiagnostics = async () => {
  console.log('🔍 Running FocusAI diagnostic tests...');
  
  const results = {
    aiServer: await checkAiServerConnection(),
    backendServer: await checkBackendConnection(),
    timestamp: new Date().toISOString()
  };
  
  console.log('📊 Diagnostic results:', results);
  return results;
};