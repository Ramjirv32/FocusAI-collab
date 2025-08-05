import { ChatMessage } from '@/types/chatTypes';

interface ChatHistory {
  userId: string;
  messages: ChatMessage[];
  timestamp: string;
  sessionId: string;
}

// Store the user's chat history
const storeChatHistory = (userId: string, messages: ChatMessage[]): void => {
  try {
    // Create a unique session ID based on timestamp
    const sessionId = `session-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    // Create the history object
    const history: ChatHistory = {
      userId,
      messages,
      timestamp,
      sessionId
    };
    
    // Get existing histories for this user
    const existingHistoriesString = localStorage.getItem(`chat_history_${userId}`);
    let existingHistories: ChatHistory[] = [];
    
    if (existingHistoriesString) {
      try {
        existingHistories = JSON.parse(existingHistoriesString);
      } catch (e) {
        console.error('Error parsing existing chat histories:', e);
        existingHistories = [];
      }
    }
    
    // Add this history to the list
    existingHistories.push(history);
    
    // Limit history to last 50 sessions to prevent localStorage from getting too large
    if (existingHistories.length > 50) {
      existingHistories = existingHistories.slice(-50);
    }
    
    // Store back in localStorage
    localStorage.setItem(`chat_history_${userId}`, JSON.stringify(existingHistories));
    
    // Also save the current session ID for quick access
    localStorage.setItem(`current_chat_session_${userId}`, sessionId);
    
    console.log('Chat history stored successfully for user:', userId);
  } catch (error) {
    console.error('Error storing chat history:', error);
  }
};

// Get all chat histories for a user
const getAllChatHistories = (userId: string): ChatHistory[] => {
  try {
    const historiesString = localStorage.getItem(`chat_history_${userId}`);
    if (!historiesString) return [];
    
    return JSON.parse(historiesString);
  } catch (error) {
    console.error('Error retrieving chat histories:', error);
    return [];
  }
};

// Get a specific chat history session
const getChatHistorySession = (userId: string, sessionId: string): ChatHistory | null => {
  try {
    const histories = getAllChatHistories(userId);
    return histories.find(h => h.sessionId === sessionId) || null;
  } catch (error) {
    console.error('Error retrieving chat history session:', error);
    return null;
  }
};

// Get the most recent chat history
const getMostRecentChatHistory = (userId: string): ChatHistory | null => {
  try {
    const histories = getAllChatHistories(userId);
    if (histories.length === 0) return null;
    
    // Sort by timestamp descending
    histories.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return histories[0];
  } catch (error) {
    console.error('Error retrieving most recent chat history:', error);
    return null;
  }
};

// Update the current chat session
const updateCurrentChatSession = (userId: string, messages: ChatMessage[]): void => {
  try {
    const sessionId = localStorage.getItem(`current_chat_session_${userId}`);
    
    if (sessionId) {
      // Get all histories
      const historiesString = localStorage.getItem(`chat_history_${userId}`);
      if (!historiesString) {
        // If no histories exist, create a new one
        storeChatHistory(userId, messages);
        return;
      }
      
      const histories: ChatHistory[] = JSON.parse(historiesString);
      const sessionIndex = histories.findIndex(h => h.sessionId === sessionId);
      
      if (sessionIndex >= 0) {
        // Update the existing session
        histories[sessionIndex] = {
          ...histories[sessionIndex],
          messages,
          timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(`chat_history_${userId}`, JSON.stringify(histories));
      } else {
        // Session not found, create a new one
        storeChatHistory(userId, messages);
      }
    } else {
      // No current session, create a new one
      storeChatHistory(userId, messages);
    }
  } catch (error) {
    console.error('Error updating chat session:', error);
  }
};

// Delete a specific chat history session
const deleteChatHistorySession = (userId: string, sessionId: string): boolean => {
  try {
    const historiesString = localStorage.getItem(`chat_history_${userId}`);
    if (!historiesString) return false;
    
    let histories: ChatHistory[] = JSON.parse(historiesString);
    const initialLength = histories.length;
    
    // Filter out the session to delete
    histories = histories.filter(h => h.sessionId !== sessionId);
    
    if (histories.length < initialLength) {
      // Session was found and removed
      localStorage.setItem(`chat_history_${userId}`, JSON.stringify(histories));
      
      // If we deleted the current session, clear the current session reference
      const currentSessionId = localStorage.getItem(`current_chat_session_${userId}`);
      if (currentSessionId === sessionId) {
        localStorage.removeItem(`current_chat_session_${userId}`);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting chat history session:', error);
    return false;
  }
};

// Clear all chat history for a user
const clearAllChatHistory = (userId: string): void => {
  localStorage.removeItem(`chat_history_${userId}`);
  localStorage.removeItem(`current_chat_session_${userId}`);
};

// Format the timestamp for display
const formatHistoryTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

export {
  storeChatHistory,
  getAllChatHistories,
  getChatHistorySession,
  getMostRecentChatHistory,
  updateCurrentChatSession,
  deleteChatHistorySession,
  clearAllChatHistory,
  formatHistoryTimestamp
};

export type { ChatHistory };
