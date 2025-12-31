import axios from 'axios';
const API_URL = 'http://localhost:5001';
export const chatService = {
  sendMessage: async (message, historyId = null, userData = null) => {
    try {
      console.log('🤖 Sending chat message:', message);
      console.log('📊 Including user data:', userData);
      const response = await axios.post(`${API_URL}/api/chat/message`, {
        message,
        historyId,
        userData
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('📨 Chat response received:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
      return {
        success: false,
        error: error.message,
        response: "I'm having trouble connecting to my AI capabilities right now. Please try again in a moment."
      };
    }
  },
  getUserProductivityData: async () => {
    try {
      console.log('📊 Fetching user productivity data for chat');
      try {
        const response = await axios.get(`${API_URL}/api/statistics/overview`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.data && response.data.focusScore) {
          console.log('✅ Got productivity overview data');
          return response.data;
        }
      } catch (overviewError) {
        console.log('⚠️ Could not get overview stats, trying alternative endpoint');
      }
      const response = await axios.get(`${API_URL}/ch`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`✅ Got ${response.data.length} productivity summaries`);
        const sortedSummaries = [...response.data].sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const latestSummary = sortedSummaries[0];
        return {
          ...latestSummary,
          allSummaries: sortedSummaries,
          historicalDataPoints: sortedSummaries.length
        };
      }
      console.log('⚠️ No productivity data found');
      return null;
    } catch (error) {
      console.error('❌ Error fetching user productivity data:', error);
      return null;
    }
  },
  getChatHistories: async () => {
    try {
      console.log('🔍 Fetching chat histories');
      const response = await axios.get(`${API_URL}/api/chat/histories`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('📚 Received chat histories:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching chat histories:', error);
      throw error;
    }
  },
  getChatHistoryById: async (historyId) => {
    try {
      console.log(`🔍 Fetching chat history: ${historyId}`);
      const response = await axios.get(`${API_URL}/api/chat/history/${historyId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('📜 Received chat history:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching chat history:', error);
      throw error;
    }
  },
  createChatHistory: async () => {
    try {
      const response = await axios.post(`${API_URL}/api/chat/history`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error creating chat history:', error);
      throw error;
    }
  },
  deleteChatHistory: async (historyId) => {
    try {
      const response = await axios.delete(`${API_URL}/api/chat/history/${historyId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting chat history:', error);
      throw error;
    }
  }
};
