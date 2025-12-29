import axios from 'axios';


const API_URL = 'http://localhost:5001/api';

export const chatService = {
  
  async sendMessage(message, historyId, userData = null, signal = null) {
    try {
      console.log('🤖 Sending chat message:', message);
      console.log('📊 Including user data:', userData);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        `${API_URL}/chat`,
        {
          message,
          historyId,
          userData 
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 40000, 
          signal: signal 
        }
      );

      console.log('📨 Chat response received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Chat service error:', error);

      
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          response: "The request took too long to process. The server might be busy. Please try a shorter message or try again later.",
          error: "Request timeout",
          hasProductivityData: false
        };
      }

      if (error.response) {
        
        console.log('Server error details:', error.response.data);

        
        if (error.response.data && error.response.data.response) {
          return {
            success: false,
            response: error.response.data.response,
            error: error.response.data.error || "Server error",
            hasProductivityData: false
          };
        }
      }

      
      return {
        success: false,
        response: "I'm having trouble connecting to the server right now. Please try again in a moment.",
        error: error.message || 'Unknown error',
        hasProductivityData: false
      };
    }
  },

  
  async getChatHistories() {
    try {
      console.log('🔍 Fetching chat histories');
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(
        `${API_URL}/chat/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('📚 Received chat histories:', response.data.histories);
      return response.data.histories || [];
    } catch (error) {
      console.error('❌ Error fetching chat histories:', error);
      return [];
    }
  },

  
  async getChatHistoryById(historyId) {
    try {
      console.log(`🔍 Fetching chat history: ${historyId}`);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(
        `${API_URL}/chat/history/${historyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('📜 Received chat history details:', response.data.history);
      return response.data.history;
    } catch (error) {
      console.error('❌ Error fetching chat history:', error);
      return {
        _id: null,
        title: 'Error loading chat',
        messages: []
      };
    }
  },

  
  async createChatHistory(title) {
    try {
      console.log('📝 Creating new chat history');
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        `${API_URL}/chat/history`,
        { title: title || 'New Conversation' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Created new chat history:', response.data);
      return response.data.history;
    } catch (error) {
      console.error('❌ Error creating chat history:', error);
      throw error;
    }
  },

  
  async deleteChatHistory(historyId) {
    try {
      console.log(`🗑️ Deleting chat history: ${historyId}`);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      await axios.delete(
        `${API_URL}/chat/history/${historyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Chat history deleted');
      return true;
    } catch (error) {
      console.error('❌ Error deleting chat history:', error);
      throw error;
    }
  },

  
  async getUserProductivityData() {
    try {
      console.log('🔍 Fetching user productivity data');
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      
      const [focusResponse, statsResponse] = await Promise.all([
        axios.get(`${API_URL}/focus/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/statistics/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      
      const userData = {
        focusScore: focusResponse.data.focusScore || 0,
        productiveTime: focusResponse.data.productiveTime || 0,
        distractions: focusResponse.data.distractions || [],
        topApps: statsResponse.data.topApps || [],
        streak: statsResponse.data.streak || 0,
        totalAppUsage: statsResponse.data.totalAppUsage || 0
      };

      console.log('📊 User productivity data:', userData);
      return userData;
    } catch (error) {
      console.error('❌ Error fetching user productivity data:', error);
      return null;
    }
  }
};