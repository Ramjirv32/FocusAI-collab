import axios from 'axios';
import { getFocusAnalysis } from './focusAnalysisService';

// Backend API base URL for your existing app tracking service
const BACKEND_API_URL = 'http://localhost:5001';
// Focus AI API URL
const AI_API_URL = 'http://localhost:5001';

// Helper to get auth headers
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Get user ID from local storage
const getUserId = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    return user._id || user.id; // Handle different user ID formats
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Fetch app and tab data from backend, then send to Focus AI for analysis
 * @param date Optional date string in YYYY-MM-DD format
 */
export const syncActivityDataWithFocusAI = async (date?: string) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User ID not found');
    }
    
    const headers = getAuthHeader();
    const formattedDate = date || new Date().toISOString().split('T')[0];
    
    console.log(`📊 Syncing activity data for user ${userId} on ${formattedDate}`);
    
    // 1. Fetch app usage data from your backend
    const appResponse = await axios.get(`${BACKEND_API_URL}/app-usage`, { 
      headers, 
      params: { date: formattedDate }
    });
    const appData = appResponse.data;
    
    // 2. Fetch tab usage data from your backend
    const tabResponse = await axios.get(`${BACKEND_API_URL}/tabs`, { 
      headers,
      params: { date: formattedDate } 
    });
    const tabData = tabResponse.data;
    
    // 3. Format data for Focus AI API
    const focusAiData = {
      userId,
      date: formattedDate,
      appUsage: appData.appUsage || appData, // Handle different response structures
      tabUsage: tabData,
      currentSession: appData.currentSession || []
    };
    
    // 4. Send data to Focus AI API for processing
    const syncResponse = await axios.post(
      `${AI_API_URL}/sync-user-data/${userId}`,
      focusAiData,
      { headers }
    );
    
    console.log('✅ Focus AI sync completed:', syncResponse.data);
    
    // 5. Get updated analysis after sync
    const analysis = await getFocusAnalysis(formattedDate);
    
    // 6. Store focus results in your backend
    await storeFocusResults(userId, formattedDate, analysis);
    
    return analysis;
    
  } catch (error: any) {
    console.error('❌ Error syncing activity data with Focus AI:', error);
    
    // If Focus AI API isn't available, try to get cached analysis directly
    if (error.message?.includes('connect') || error.code === 'ECONNREFUSED') {
      console.log('⚠️ Focus AI API not available, retrieving cached analysis...');
      try {
        return await getFocusAnalysis();
      } catch (e) {
        console.error('Failed to get cached analysis:', e);
      }
    }
    
    throw error;
  }
};

/**
 * Store focus analysis results in your backend
 */
const storeFocusResults = async (userId: string, date: string, analysis: any) => {
  try {
    const headers = getAuthHeader();
    
    // Format data for your backend storage
    const focusData = {
      userId,
      date,
      productivityScore: analysis.summary.productivity_score || 0,
      focusAreas: analysis.focus_areas || [],
      distractionAreas: analysis.distraction_areas || [],
      totalFocusTimeSeconds: (analysis.summary.focused_duration_minutes || 0) * 60,
      totalDistractionTimeSeconds: (analysis.summary.distracted_duration_minutes || 0) * 60
    };
    
    // Store in your backend
    const storeResponse = await axios.post(
      `${BACKEND_API_URL}/focus-results`, 
      focusData,
      { headers }
    );
    
    console.log('✅ Focus results stored in backend:', storeResponse.data);
    return storeResponse.data;
    
  } catch (error) {
    console.error('❌ Error storing focus results:', error);
    throw error;
  }
};

export default {
  syncActivityDataWithFocusAI,
  storeFocusResults
};