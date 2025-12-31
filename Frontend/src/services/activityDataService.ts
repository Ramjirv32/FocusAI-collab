import axios from 'axios';
import { getFocusAnalysis } from './focusAnalysisService';
const BACKEND_API_URL = 'http://localhost:5001';
const AI_API_URL = 'http://localhost:5001';
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const getUserId = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user._id || user.id;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};
export const syncActivityDataWithFocusAI = async (date?: string) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User ID not found');
    }
    const headers = getAuthHeader();
    const formattedDate = date || new Date().toISOString().split('T')[0];
    console.log(`📊 Syncing activity data for user ${userId} on ${formattedDate}`);
    const appResponse = await axios.get(`${BACKEND_API_URL}/app-usage`, {
      headers,
      params: { date: formattedDate }
    });
    const appData = appResponse.data;
    const tabResponse = await axios.get(`${BACKEND_API_URL}/tabs`, {
      headers,
      params: { date: formattedDate }
    });
    const tabData = tabResponse.data;
    const focusAiData = {
      userId,
      date: formattedDate,
      appUsage: appData.appUsage || appData,
      tabUsage: tabData,
      currentSession: appData.currentSession || []
    };
    const syncResponse = await axios.post(
      `${AI_API_URL}/sync-user-data/${userId}`,
      focusAiData,
      { headers }
    );
    console.log('✅ Focus AI sync completed:', syncResponse.data);
    const analysis = await getFocusAnalysis(formattedDate);
    await storeFocusResults(userId, formattedDate, analysis);
    return analysis;
  } catch (error: any) {
    console.error('❌ Error syncing activity data with Focus AI:', error);
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
const storeFocusResults = async (userId: string, date: string, analysis: any) => {
  try {
    const headers = getAuthHeader();
    const focusData = {
      userId,
      date,
      productivityScore: analysis.summary.productivity_score || 0,
      focusAreas: analysis.focus_areas || [],
      distractionAreas: analysis.distraction_areas || [],
      totalFocusTimeSeconds: (analysis.summary.focused_duration_minutes || 0) * 60,
      totalDistractionTimeSeconds: (analysis.summary.distracted_duration_minutes || 0) * 60
    };
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
