import axios from 'axios';


const AI_API_BASE_URL = 'http://localhost:8000';


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


const createEmptyAnalysisData = (userId: string, date: string) => {
  return {
    user_id: userId,
    analysis_date: date,
    total_activities: 0,
    total_duration: 0,
    focus_areas: [],
    distraction_areas: [],
    detailed_activities: [],
    summary: {
      productivity_score: 0,
      focused_duration_minutes: 0,
      distracted_duration_minutes: 0,
      total_duration_minutes: 0,
      most_focused_app: 'None',
      most_distracting_app: 'None',
      focus_percentage: 0
    }
  };
};


const createEmptyQuickStats = (userId: string, date: string) => {
  return {
    user_id: userId,
    date: date,
    quick_stats: {
      productivity_score: 0,
      focus_time_minutes: 0,
      distraction_time_minutes: 0,
      total_time_minutes: 0
    },
    focus_areas_count: 0,
    distraction_areas_count: 0
  };
};


export const getFocusAnalysis = async (date: string | null = null) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User ID not found');
    }
    
    const headers = getAuthHeader();
    const formattedDate = date || new Date().toISOString().split('T')[0];
    const params = { date: formattedDate };
    
    try {
      const response = await axios.get(
        `${AI_API_BASE_URL}/user/${userId}/focus-analysis`, 
        { headers, params }
      );
      return response.data;
    } catch (apiError: any) {
      console.warn(`API Error (${apiError.response?.status}): ${apiError.message}`);
      
      
      if (apiError.response?.status === 404 || 
          (apiError.response?.status === 500 && 
           apiError.response?.data?.detail?.includes('No usage data found'))) {
        console.info('No focus data found, returning empty structure');
        return createEmptyAnalysisData(userId, formattedDate);
      }
      
      
      throw apiError;
    }
  } catch (error) {
    console.error('Error fetching focus analysis:', error);
    throw error;
  }
};


export const getQuickStats = async (date: string | null = null) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User ID not found');
    }
    
    const headers = getAuthHeader();
    const formattedDate = date || new Date().toISOString().split('T')[0];
    const params = { date: formattedDate };
    
    try {
      const response = await axios.get(
        `${AI_API_BASE_URL}/user/${userId}/quick-stats`,
        { headers, params }
      );
      return response.data;
    } catch (apiError: any) {
      console.warn(`API Error (${apiError.response?.status}): ${apiError.message}`);
      
      
      if (apiError.response?.status === 404 || 
          (apiError.response?.status === 500 && 
           apiError.response?.data?.detail?.includes('No usage data found'))) {
        console.info('No quick stats found, returning empty structure');
        return createEmptyQuickStats(userId, formattedDate);
      }
      
      
      throw apiError;
    }
  } catch (error) {
    console.error('Error fetching quick stats:', error);
    throw error;
  }
};

export default {
  getFocusAnalysis,
  getQuickStats
};