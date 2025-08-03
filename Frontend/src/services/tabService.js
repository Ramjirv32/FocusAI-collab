// Create this file if it doesn't exist

/**
 * Filter tab logs based on timeframe
 */
export const filterByTimeFrame = (tabLogs, timeFrame) => {
  if (!tabLogs || tabLogs.length === 0) return [];
  
  const now = new Date();
  const startDate = new Date();
  
  switch (timeFrame) {
    case 'daily':
      startDate.setHours(0, 0, 0, 0); // Start of today
      break;
    case 'weekly':
      startDate.setDate(now.getDate() - 7); // 7 days ago
      break;
    case 'monthly':
      startDate.setMonth(now.getMonth() - 1); // 1 month ago
      break;
    default:
      startDate.setHours(0, 0, 0, 0); // Default to daily
  }
  
  return tabLogs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= startDate && logDate <= now;
  });
};

/**
 * Group logs by domain
 */
export const groupByDomain = (logs) => {
  const domains = {};
  
  logs.forEach(log => {
    const domainName = extractDomain(log.url) || 'unknown';
    
    if (!domains[domainName]) {
      domains[domainName] = {
        domain: domainName,
        visits: 0,
        totalTime: 0,
        tabs: []
      };
    }
    
    domains[domainName].visits++;
    domains[domainName].totalTime += log.duration || 0;
    
    // Add tab if not already in the list
    const tabExists = domains[domainName].tabs.some(tab => tab.url === log.url);
    if (!tabExists) {
      domains[domainName].tabs.push({
        url: log.url,
        title: log.title,
        visits: 1,
        time: log.duration || 0
      });
    } else {
      // Update existing tab
      const tabIndex = domains[domainName].tabs.findIndex(tab => tab.url === log.url);
      domains[domainName].tabs[tabIndex].visits++;
      domains[domainName].tabs[tabIndex].time += log.duration || 0;
    }
  });
  
  return domains;
};

/**
 * Extract domain from URL
 */
const extractDomain = (url) => {
  if (!url) return 'unknown';
  
  try {
    const domain = new URL(url);
    return domain.hostname;
  } catch (e) {
    return 'unknown';
  }
};

/**
 * Generate summary statistics
 */
export const generateSummary = (logs) => {
  if (!logs || logs.length === 0) {
    return {
      totalTime: 0,
      mostVisitedTab: 'None',
      mostTimeSpentTab: 'None',
      averageSessionDuration: 0,
      totalTabs: 0
    };
  }
  
  // Calculate total time
  const totalTime = logs.reduce((acc, log) => acc + (log.duration || 0), 0);
  
  // Create tab frequency map
  const tabFrequency = {};
  const tabTimes = {};
  
  logs.forEach(log => {
    if (!log.url) return;
    
    if (!tabFrequency[log.url]) {
      tabFrequency[log.url] = 0;
      tabTimes[log.url] = {
        title: log.title || 'Unknown',
        time: 0
      };
    }
    
    tabFrequency[log.url]++;
    tabTimes[log.url].time += log.duration || 0;
  });
  
  // Get most visited tab
  let mostVisitedUrl = '';
  let mostVisits = 0;
  Object.entries(tabFrequency).forEach(([url, count]) => {
    if (count > mostVisits) {
      mostVisits = count;
      mostVisitedUrl = url;
    }
  });
  
  // Get tab where most time was spent
  let mostTimeUrl = '';
  let mostTime = 0;
  Object.entries(tabTimes).forEach(([url, data]) => {
    if (data.time > mostTime) {
      mostTime = data.time;
      mostTimeUrl = url;
    }
  });
  
  // Calculate average session duration
  const averageSessionDuration = totalTime / logs.length;
  
  // Count unique tabs
  const uniqueTabs = new Set(logs.map(log => log.url)).size;
  
  return {
    totalTime,
    mostVisitedTab: tabTimes[mostVisitedUrl]?.title || 'None',
    mostTimeSpentTab: tabTimes[mostTimeUrl]?.title || 'None',
    averageSessionDuration,
    totalTabs: uniqueTabs
  };
};

/**
 * Fetch tab logs from backend
 */
export const fetchTabLogs = async () => {
  try {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    const response = await fetch('http://localhost:5001/tabs', { headers });
    if (!response.ok) throw new Error('Failed to fetch tab logs');
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching tab logs:', error);
    throw error;
  }
};