import axios from 'axios';

const BACKEND_API_URL = 'http://localhost:5001'; // Your Node.js backend

/**
 * Get authentication headers with the JWT token
 */
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const chatService = {
  // Send message to AI assistant
  sendMessage: async (message) => {
    try {
      console.log('🤖 Sending chat message:', message);
      
      const response = await axios.post(`${BACKEND_API_URL}/api/chat/message`, {
        message
      }, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        timeout: 15000 // 15 second timeout for AI processing
      });

      if (response.data && response.data.success) {
        console.log('✅ Chat response received:', {
          hasData: response.data.hasProductivityData,
          focusScore: response.data.focusScore,
          productiveHours: response.data.productiveHours
        });
        
        return {
          success: true,
          response: response.data.response,
          hasProductivityData: response.data.hasProductivityData,
          focusScore: response.data.focusScore,
          productiveHours: response.data.productiveHours,
          uniqueApps: response.data.uniqueApps,
          streak: response.data.streak,
          debugInfo: response.data.debugInfo
        };
      }

      throw new Error('Invalid response format');

    } catch (error) {
      console.error('❌ Chat service error:', error);
      
      // Fallback response
      return {
        success: true,
        response: "I'm having trouble accessing your productivity data right now. Please make sure you're logged in and have some tracked activity data. Try asking me again in a moment! 😊",
        hasProductivityData: false,
        focusScore: 0,
        productiveHours: 0,
        uniqueApps: 0,
        streak: 0
      };
    }
  }
};