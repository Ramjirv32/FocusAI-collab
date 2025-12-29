import axios from 'axios';


const AI_API_URL = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:8000'; 
const MODEL_API_URL = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:8000'; 
const BACKEND_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'; 


const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};


const logDebug = (message, data) => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] 🔍 ${message}`, data || '');
};


const logError = (message, error) => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.error(`[${timestamp}] ❌ ${message}`, error);
};


const getUserId = () => {
  try {
    
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && (user._id || user.id)) {
        return user._id || user.id;
      }
    }

    
    const token = localStorage.getItem('token');
    if (token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);
      if (payload && (payload.userId || payload.sub)) {
        return payload.userId || payload.sub;
      }
    }

    
    
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


let activeModelServerUrl = AI_API_URL; 


export const testAiServerConnection = async () => {
  try {
    
    if (activeModelServerUrl) {
      try {
        const response = await axios.get(`${activeModelServerUrl}/`);
        return {
          status: response.status === 200,
          message: response.data.message || 'Connected',
          timestamp: new Date().toISOString()
        };
      } catch (cachedError) {
        
        activeModelServerUrl = null;
        logDebug('Cached server no longer responding, trying alternatives');
      }
    }

    
    try {
      const response = await axios.get(`${AI_API_URL}/`);
      activeModelServerUrl = AI_API_URL;
      return {
        status: response.status === 200,
        message: response.data.message || 'Connected',
        timestamp: new Date().toISOString()
      };
    } catch (firstError) {
      
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


export const syncFocusData = async (date = null) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User ID not found. Please log in again.');
    }

    logDebug(`Starting focus data sync for user ${userId}`);

    
    const connectionTest = await testAiServerConnection();
    if (!connectionTest.status) {
      throw new Error(`Cannot connect to AI server: ${connectionTest.message}`);
    }

    const headers = getAuthHeader();
    const formattedDate = date || new Date().toISOString().split('T')[0];

    
    logDebug('Fetching app usage data from backend...');
    const appResponse = await axios.get(`${BACKEND_API_URL}/focus-data`, {
      headers,
      params: { date: formattedDate }
    });

    
    logDebug('Fetching tab data from backend...');
    const tabResponse = await axios.get(`${BACKEND_API_URL}/tabs`, {
      headers,
      params: { date: formattedDate }
    });

    
    const combinedData = {
      userId: userId,
      date: formattedDate,
      appUsage: appResponse.data?.appUsage || [],
      tabUsage: tabResponse.data || [],
      currentSession: appResponse.data?.currentSession || []
    };

    logDebug(`Sending ${combinedData.appUsage.length} app records and ${combinedData.tabUsage.length} tab records for AI analysis`);

    
    const serverUrl = activeModelServerUrl || MODEL_API_URL;
    const response = await axios.post(
      `${serverUrl}/sync-user-data/${userId}`,
      combinedData,
      { headers }
    );

    logDebug('Focus data sync successful:', response.data);

    
    const statsResponse = await getQuickStats(formattedDate);

    return statsResponse;
  } catch (error) {
    logError('Error syncing focus data:', error);
    throw error;
  }
};


export const getQuickStats = async (date = null) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User ID not found. Please log in again.');
    }

    const headers = getAuthHeader();
    const formattedDate = date || new Date().toISOString().split('T')[0];

    logDebug(`Fetching quick stats for user ${userId} on ${formattedDate}`);

    
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
      `${serverUrl}/user/${userId}/productivity-analysis`,
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


export const getConsolidatedFocusData = async (date = null) => {
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('User ID not found. Please log in again.');
    }

    logDebug(`Fetching consolidated focus data for user ${userId}`);

    const formattedDate = date || new Date().toISOString().split('T')[0];

    
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