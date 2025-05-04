import axios from 'axios';
import { TabLog, GroupedTabData, TimeFrame, TabSummary } from '@/types';

// Base API URL
const API_URL = 'http://localhost:5000';

// Helper to get the auth token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Fetch all tab logs
export const fetchTabLogs = async (): Promise<TabLog[]> => {
  try {
    const response = await axios.get(`${API_URL}/tabs`, {
      headers: getAuthHeader()
    });
    console.log('Tab logs response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching tab logs:', error);
    throw error;
  }
};

// Group logs by domain
export const groupByDomain = (logs: TabLog[]): Record<string, GroupedTabData> => {
  const grouped: Record<string, GroupedTabData> = {};
  
  logs.forEach(log => {
    try {
      let domain = 'unknown';
      
      if (log.url) {
        const url = new URL(log.url);
        domain = url.hostname;
      } else if (log.domain) {
        domain = log.domain;
      }
      
      if (!grouped[domain]) {
        grouped[domain] = {
          domain,
          totalTime: 0,
          visits: 0,
          avgSessionDuration: 0
        };
      }
      
      grouped[domain].totalTime += log.duration || 0;
      grouped[domain].visits += 1;
    } catch (e) {
      console.error('Error processing log:', e, log);
    }
  });
  
  // Calculate average session duration
  Object.keys(grouped).forEach(domain => {
    if (grouped[domain].visits > 0) {
      grouped[domain].avgSessionDuration = Math.round(
        grouped[domain].totalTime / grouped[domain].visits
      );
    }
  });
  
  return grouped;
};

// Filter logs by timeframe
export const filterByTimeFrame = (logs: TabLog[], timeframe: TimeFrame): TabLog[] => {
  const now = new Date();
  let startTime: Date;
  
  switch (timeframe) {
    case 'daily':
      startTime = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'weekly':
      const day = now.getDay();
      startTime = new Date(now.setDate(now.getDate() - day));
      startTime.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      startTime = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      startTime = new Date(0); // Beginning of time
  }
  
  return logs.filter(log => new Date(log.timestamp) >= startTime);
};

// Generate summary statistics
export const generateSummary = (logs: TabLog[]): TabSummary => {
  if (!logs.length) {
    return {
      totalTime: 0,
      mostVisitedTab: 'None',
      mostTimeSpentTab: 'None',
      averageSessionDuration: 0,
      totalTabs: 0
    };
  }
  
  const domains = groupByDomain(logs);
  const domainArray = Object.values(domains);
  
  // Find most visited
  const mostVisitedDomain = domainArray.reduce(
    (max, domain) => (domain.visits > max.visits ? domain : max),
    domainArray[0]
  );
  
  // Find most time spent
  const mostTimeSpentDomain = domainArray.reduce(
    (max, domain) => (domain.totalTime > max.totalTime ? domain : max),
    domainArray[0]
  );
  
  // Calculate total time
  const totalTime = domainArray.reduce((sum, domain) => sum + domain.totalTime, 0);
  
  // Calculate average session
  const totalSessions = domainArray.reduce((sum, domain) => sum + domain.visits, 0);
  const averageSessionDuration = totalSessions > 0 ? totalTime / totalSessions : 0;
  
  return {
    totalTime,
    mostVisitedTab: mostVisitedDomain.domain,
    mostTimeSpentTab: mostTimeSpentDomain.domain,
    averageSessionDuration,
    totalTabs: logs.length
  };
};

// Log tab activity
export const logTabActivity = async (tabData: Partial<TabLog>): Promise<void> => {
  try {
    await axios.post(`${API_URL}/log-tab`, tabData, {
      headers: getAuthHeader()
    });
  } catch (error) {
    console.error('Error logging tab activity:', error);
    throw error;
  }
};
