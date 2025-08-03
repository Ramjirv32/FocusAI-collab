import axios from 'axios';

// Configure API endpoints
const AI_API_URL = 'http://localhost:8000'; // Python AI server
const MODEL_API_URL = 'http://localhost:5000'; // Model AI Train server
const BACKEND_API_URL = 'http://localhost:5001'; // Your app backend

/**
 * Get authentication headers with the JWT token
 */
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Debug log with timestamp
 */
const logDebug = (message, data) => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] 🔍 ${message}`, data || '');
};

/**
 * Error log with timestamp
 */
const logError = (message, error) => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.error(`[${timestamp}] ❌ ${message}`, error);
};

/**
 * Get user ID from local storage or JWT
 */
const getUserId = () => {
  try {
    // First try from user object in localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && (user._id || user.id)) {
        return user._id || user.id;
      }
    }
    
    // If not found, try from JWT token
    const token = localStorage.getItem('token');
    if (token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      if (payload && (payload.userId || payload.sub)) {
        return payload.userId || payload.sub;
      }
    }
    
    // Hard-coded test user ID if all else fails - only for development
    // Remove in production!
    if (process.env.NODE_ENV === 'development') {
      return '6885b9202e0e815cf52a94a7';
    }
    
    logError('User ID not found in localStorage or token');
    return null;
  } catch (error) {
    logError('Error extracting user ID:', error);
    return null;
  }
};

// Keep track of which server is working
let activeModelServerUrl = null;

/**
 * Test connection to the Focus AI backend
 */
export const testAiServerConnection = async () => {
  try {
    // If we've already found a working server, try that first
    if (activeModelServerUrl) {
      try {
        const response = await axios.get(`${activeModelServerUrl}/`);
        return {
          status: response.status === 200,
          message: response.data.message || 'Connected',
          timestamp: new Date().toISOString()
        };
      } catch (cachedError) {
        // If cached server fails, reset and try others
        activeModelServerUrl = null;
        logDebug('Cached server no longer responding, trying alternatives');
      }
    }
    
    // Try the main AI_API_URL first
    try {
      const response = await axios.get(`${AI_API_URL}/`);
      activeModelServerUrl = AI_API_URL;
      return {
        status: response.status === 200,
        message: response.data.message || 'Connected',
        timestamp: new Date().toISOString()
      };
    } catch (firstError) {
      // Try the MODEL_API_URL as fallback
      try {
        logDebug('Main AI server failed, trying model server');
        const modelResponse = await axios.get(`${MODEL_API_URL}/`);
        activeModelServerUrl = MODEL_API_URL;
        return {
          status: modelResponse.status === 200,
          message: modelResponse.data.message || 'Connected via model server',
          timestamp: new Date().toISOString()
        };
      } catch (secondError) {
        // Finally try the health endpoints
        try {
          const healthResponse = await axios.get(`${AI_API_URL}/health`);
          activeModelServerUrl = AI_API_URL;
          return {
            status: healthResponse.status === 200,
            message: healthResponse.data.message || 'Connected via health endpoint',
            timestamp: new Date().toISOString()
          };
        } catch (thirdError) {
          throw new Error('All connection attempts failed');
        }
      }
    }
  } catch (error) {
    logError('AI server connection test failed:', error);
    return {
      status: false,
      message: error.message || 'Connection failed',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Fetch app usage data from the backend
 */
export const fetchAppUsageData = async (date = null) => {
  try {
    const headers = getAuthHeader();
    const userId = getUserId();
    const formattedDate = date || new Date().toISOString().split('T')[0];
    
    logDebug(`Fetching app usage data for user ${userId} on ${formattedDate}`);
    
    const response = await axios.get(`${BACKEND_API_URL}/focus-data`, { 
      headers,
      params: { date: formattedDate }
    });
    
    logDebug(`Found ${response.data?.appUsage?.length || 0} app usage records`);
    return response.data;
  } catch (error) {
    logError('Error fetching app usage data:', error);
    throw error;
  }
};

/**
 * Sync focus data with the AI server
 */
export const syncFocusData = async (date = null) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User ID not found. Please log in again.');
    }
    
    logDebug(`Starting focus data sync for user ${userId}`);
    
    // First test the connection
    const connectionTest = await testAiServerConnection();
    if (!connectionTest.status) {
      throw new Error(`Cannot connect to AI server: ${connectionTest.message}`);
    }
    
    const headers = getAuthHeader();
    const formattedDate = date || new Date().toISOString().split('T')[0];
    
    // 1. Get the app usage data from backend
    logDebug('Fetching app usage data from backend...');
    const appResponse = await axios.get(`${BACKEND_API_URL}/focus-data`, { 
      headers,
      params: { date: formattedDate }
    });
    
    // 2. Get the tab data from backend
    logDebug('Fetching tab data from backend...');
    const tabResponse = await axios.get(`${BACKEND_API_URL}/tabs`, { 
      headers,
      params: { date: formattedDate }
    });
    
    // 3. Prepare data for the AI model
    const combinedData = {
      userId: userId,
      date: formattedDate,
      appUsage: appResponse.data?.appUsage || [],
      tabUsage: tabResponse.data || [],
      currentSession: appResponse.data?.currentSession || []
    };
    
    logDebug(`Sending ${combinedData.appUsage.length} app records and ${combinedData.tabUsage.length} tab records for AI analysis`);
    
    // 4. Send to AI server for processing
    const serverUrl = activeModelServerUrl || MODEL_API_URL;
    const response = await axios.post(
      `${serverUrl}/sync-user-data/${userId}`,
      combinedData,
      { headers }
    );
    
    logDebug('Focus data sync successful:', response.data);
    
    // 5. Get the updated quick stats
    const statsResponse = await getQuickStats(formattedDate);
    
    return statsResponse;
  } catch (error) {
    logError('Error syncing focus data:', error);
    throw error;
  }
};

/**
 * Get quick productivity stats
 */
export const getQuickStats = async (date = null) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User ID not found. Please log in again.');
    }
    
    const headers = getAuthHeader();
    const formattedDate = date || new Date().toISOString().split('T')[0];
    
    logDebug(`Fetching quick stats for user ${userId} on ${formattedDate}`);
    
    // Make the API call
    const serverUrl = activeModelServerUrl || MODEL_API_URL;
    const response = await axios.get(
      `${serverUrl}/user/${userId}/quick-stats`,
      { 
        headers,
        params: { date: formattedDate }
      }
    );
    
    logDebug('Quick stats fetched successfully:', response.data);
    
    return {
      ...response.data,
      date: formattedDate,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    logError('Error getting quick stats:', error);
    
    // Return a default object so UI doesn't crash
    return {
      user_id: getUserId(),
      date: date || new Date().toISOString().split('T')[0],
      quick_stats: {
        productivity_score: 0,
        focus_time_minutes: 0,
        distraction_time_minutes: 0,
        total_time_minutes: 0
      },
      lastUpdated: new Date().toISOString()
    };
  }
};

/**
 * Get detailed focus analysis data
 */
export const getFocusAnalysis = async (date = null) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User ID not found. Please log in again.');
    }
    
    const headers = getAuthHeader();
    const formattedDate = date || new Date().toISOString().split('T')[0];
    
    logDebug(`Fetching detailed focus analysis for user ${userId} on ${formattedDate}`);
    
    const serverUrl = activeModelServerUrl || MODEL_API_URL;
    const response = await axios.get(
      `${serverUrl}/user/${userId}/focus-analysis`,
      { 
        headers,
        params: { date: formattedDate }
      }
    );
    
    logDebug('Focus analysis fetched successfully:', response.data);
    
    return {
      ...response.data,
      date: formattedDate,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    logError('Error getting focus analysis:', error);
    
    // Return a default object so UI doesn't crash
    return {
      user_id: getUserId(),
      date: date || new Date().toISOString().split('T')[0],
      focus_sessions: [],
      distraction_apps: [],
      productive_apps: [],
      distraction_categories: {},
      lastUpdated: new Date().toISOString()
    };
  }
};

/**
 * Get consolidated focus data from both backend and AI systems
 * This includes app usage, tab usage, and AI analysis in one call
 */
export const getConsolidatedFocusData = async (date = null) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User ID not found. Please log in again.');
    }
    
    logDebug(`Fetching consolidated focus data for user ${userId}`);
    
    const formattedDate = date || new Date().toISOString().split('T')[0];
    
    // Run these requests in parallel for better performance
    const [appData, tabData, quickStats, focusAnalysis] = await Promise.all([
      fetchAppUsageData(formattedDate),
      axios.get(`${BACKEND_API_URL}/tabs`, { 
        headers: getAuthHeader(),
        params: { date: formattedDate }
      }).then(res => res.data).catch(err => {
        logError('Error fetching tab data:', err);
        return [];
      }),
      getQuickStats(formattedDate),
      getFocusAnalysis(formattedDate)
    ]);
    
    // Check if we need to sync data with AI server
    // This happens if we have app/tab data but no analysis results
    const needsSync = (
      (appData?.appUsage?.length > 0 || tabData?.length > 0) && 
      (!quickStats?.quick_stats?.productivity_score || quickStats.quick_stats.productivity_score === 0)
    );
    
    let syncedData = null;
    if (needsSync) {
      logDebug('Data needs syncing with AI server, triggering sync...');
      syncedData = await syncFocusData(formattedDate);
    }
    
    const consolidatedData = {
      userId,
      date: formattedDate,
      appUsage: appData?.appUsage || [],
      tabUsage: tabData || [],
      quickStats: syncedData || quickStats,
      focusAnalysis: focusAnalysis,
      lastUpdated: new Date().toISOString()
    };
    
    logDebug('Consolidated focus data ready', {
      appRecords: consolidatedData.appUsage.length,
      tabRecords: consolidatedData.tabUsage.length,
      hasQuickStats: !!consolidatedData.quickStats,
      hasFocusAnalysis: !!consolidatedData.focusAnalysis
    });
    
    return consolidatedData;
  } catch (error) {
    logError('Error getting consolidated focus data:', error);
    throw error;
  }
};