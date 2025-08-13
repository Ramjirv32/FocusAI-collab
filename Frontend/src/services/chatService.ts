import axios from 'axios';

// Define types for better type safety
interface ProductivityData {
  focusScore: number;
  productiveTime: number;
  distractions: Array<{name: string, duration: number}>;
  topApps: Array<{name: string, duration: number}>;
  streak: number;
  totalAppUsage: number;
}

interface ChatResponse {
  success: boolean;
  response: string;
  historyId?: string;
  hasProductivityData: boolean;
  focusScore?: number;
  productiveHours?: number;
  uniqueApps?: number;
  streak?: number;
  error?: string;
}

// Use a hardcoded API_URL to avoid process.env issues
const API_URL = 'http://localhost:5001/api';

export const chatService = {
  // Send a message to the AI assistant
  async sendMessage(message: string, historyId?: string, userData?: ProductivityData | null): Promise<ChatResponse> {
    try {
      console.log('🤖 Sending chat message:', message);
      console.log('📊 Including user data:', userData);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post<ChatResponse>(
        `${API_URL}/chat`, 
        { 
          message, 
          historyId,
          userData // Include the user data in the request
        },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000 // Increase timeout to 20 seconds for AI processing
        }
      );

      console.log('📨 Chat response received:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Chat service error:', error);
      
      // Check for specific error types and provide appropriate responses
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          response: "The request took too long to process. The server might be busy. Please try a shorter message or try again later.",
          error: "Request timeout",
          hasProductivityData: false
        };
      }
      
      if (error.response) {
        // The server responded with an error status code
        console.log('Server error details:', error.response.data);
        
        // If the server sent back a specific error message, use it
        if (error.response.data && error.response.data.response) {
          return {
            success: false,
            response: error.response.data.response,
            error: error.response.data.error || "Server error",
            hasProductivityData: false
          };
        }
      }
      
      // Default error response
      return {
        success: false,
        response: "I'm having trouble connecting to the server right now. Please try again in a moment.",
        error: error.message || 'Unknown error',
        hasProductivityData: false
      };
    }
  },

  // Get chat history list
  async getChatHistories() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${API_URL}/chat/history`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return response.data.histories || [];
    } catch (error) {
      console.error('Error fetching chat histories:', error);
      return [];
    }
  },

  // Get specific chat history
  async getChatHistoryById(historyId: string) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${API_URL}/chat/history/${historyId}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return response.data.history;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return {
        _id: null,
        title: 'Error loading chat',
        messages: []
      };
    }
  },

  // Create a new chat history
  async createChatHistory(title?: string) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(`${API_URL}/chat/history`, 
        { title }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return response.data.history;
    } catch (error) {
      console.error('Error creating chat history:', error);
      throw error;
    }
  },

  // Delete a chat history
  async deleteChatHistory(historyId: string) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      await axios.delete(`${API_URL}/chat/history/${historyId}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return true;
    } catch (error) {
      console.error('Error deleting chat history:', error);
      throw error;
    }
  },
  
  // Fetch user productivity data
  async getUserProductivityData(): Promise<ProductivityData | null> {
    try {
      console.log('🔍 Fetching user productivity data');
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get data from multiple endpoints to compile a complete picture
      const [focusResponse, statsResponse] = await Promise.all([
        axios.get(`${API_URL}/focus/summary`, { 
          headers: { Authorization: `Bearer ${token}` } 
        }),
        axios.get(`${API_URL}/statistics/overview`, { 
          headers: { Authorization: `Bearer ${token}` } 
        })
      ]);

      // Combine data from different sources
      const userData: ProductivityData = {
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