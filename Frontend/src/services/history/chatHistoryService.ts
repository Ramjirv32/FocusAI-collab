import { ChatMessage } from '@/types/chatTypes';

interface ChatHistory {
  userId: string;
  messages: ChatMessage[];
  timestamp: string;
  sessionId: string;
}


const storeChatHistory = (userId: string, messages: ChatMessage[]): void => {
  try {
    
    const sessionId = `session-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    
    const history: ChatHistory = {
      userId,
      messages,
      timestamp,
      sessionId
    };
    
    
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
    
    
    existingHistories.push(history);
    
    
    if (existingHistories.length > 50) {
      existingHistories = existingHistories.slice(-50);
    }
    
    
    localStorage.setItem(`chat_history_${userId}`, JSON.stringify(existingHistories));
    
    
    localStorage.setItem(`current_chat_session_${userId}`, sessionId);
    
    console.log('Chat history stored successfully for user:', userId);
  } catch (error) {
    console.error('Error storing chat history:', error);
  }
};


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


const getChatHistorySession = (userId: string, sessionId: string): ChatHistory | null => {
  try {
    const histories = getAllChatHistories(userId);
    return histories.find(h => h.sessionId === sessionId) || null;
  } catch (error) {
    console.error('Error retrieving chat history session:', error);
    return null;
  }
};


const getMostRecentChatHistory = (userId: string): ChatHistory | null => {
  try {
    const histories = getAllChatHistories(userId);
    if (histories.length === 0) return null;
    
    
    histories.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return histories[0];
  } catch (error) {
    console.error('Error retrieving most recent chat history:', error);
    return null;
  }
};


const updateCurrentChatSession = (userId: string, messages: ChatMessage[]): void => {
  try {
    const sessionId = localStorage.getItem(`current_chat_session_${userId}`);
    
    if (sessionId) {
      
      const historiesString = localStorage.getItem(`chat_history_${userId}`);
      if (!historiesString) {
        
        storeChatHistory(userId, messages);
        return;
      }
      
      const histories: ChatHistory[] = JSON.parse(historiesString);
      const sessionIndex = histories.findIndex(h => h.sessionId === sessionId);
      
      if (sessionIndex >= 0) {
        
        histories[sessionIndex] = {
          ...histories[sessionIndex],
          messages,
          timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(`chat_history_${userId}`, JSON.stringify(histories));
      } else {
        
        storeChatHistory(userId, messages);
      }
    } else {
      
      storeChatHistory(userId, messages);
    }
  } catch (error) {
    console.error('Error updating chat session:', error);
  }
};


const deleteChatHistorySession = (userId: string, sessionId: string): boolean => {
  try {
    const historiesString = localStorage.getItem(`chat_history_${userId}`);
    if (!historiesString) return false;
    
    let histories: ChatHistory[] = JSON.parse(historiesString);
    const initialLength = histories.length;
    
    
    histories = histories.filter(h => h.sessionId !== sessionId);
    
    if (histories.length < initialLength) {
      
      localStorage.setItem(`chat_history_${userId}`, JSON.stringify(histories));
      
      
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


const clearAllChatHistory = (userId: string): void => {
  localStorage.removeItem(`chat_history_${userId}`);
  localStorage.removeItem(`current_chat_session_${userId}`);
};


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
