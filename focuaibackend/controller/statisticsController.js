const moment = require('moment');
const User = require('../models/User');
const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');
const FocusResult = require('../models/FocusResult');
const ProductivitySummary = require('../models/ProductivitySummary');

// Helper function to determine if an app or website is productive
const isProductiveContent = (name) => {
  const productiveApps = ['code', 'vscode', 'excel', 'word', 'powerpoint', 'slack', 'zoom', 'teams'];
  const productiveWebsites = ['github.com', 'stackoverflow.com', 'docs', 'jira', 'confluence', 'trello'];
  
  name = name.toLowerCase();
  return productiveApps.some(app => name.includes(app)) || 
         productiveWebsites.some(site => name.includes(site));
};

// Get statistics for a specific time period
exports.getStatistics = async (req, res) => {
  try {
    const userId = req.user._id;
    const userEmail = req.user.email;
    const timeFrame = req.query.timeFrame || 'weekly'; // default to weekly
    
    // Calculate date range based on timeFrame
    const endDate = new Date();
    let startDate = new Date();
    
    if (timeFrame === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeFrame === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeFrame === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (timeFrame === 'yearly') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }
    
    const startDateStr = startDate.toISOString().slice(0, 10);
    const endDateStr = endDate.toISOString().slice(0, 10);
    
    console.log(`Fetching statistics for ${userEmail} from ${startDateStr} to ${endDateStr}`);
    
    // Get app usage data
    const appUsage = await AppUsage.find({
      userId,
      email: userEmail,
      date: { $gte: startDateStr, $lte: endDateStr }
    });
    
    // Get tab usage data
    const tabUsage = await TabUsage.find({
      userId,
      email: userEmail,
      date: { $gte: startDateStr, $lte: endDateStr }
    });
    
    // Get productivity summaries
    const summaries = await ProductivitySummary.find({
      userId,
      email: userEmail,
      date: { $gte: startDateStr, $lte: endDateStr }
    }).sort({ date: 1 });
    
    // Calculate statistics
    const uniqueApps = [...new Set(appUsage.map(app => app.appName))].length;
    const uniqueWebsites = [...new Set(tabUsage.map(tab => tab.domain || 'unknown'))].length;
    
    // Calculate total active time (in minutes)
    const totalActiveTime = Math.round((appUsage.reduce((sum, app) => sum + app.duration, 0) / 60));
    
    // Calculate focus time and distraction time
    const focusTime = summaries.length > 0 ? 
      Math.round(summaries.reduce((sum, s) => sum + (s.totalProductiveTime || 0), 0) / 60) : 
      Math.round(appUsage.filter(app => isProductiveContent(app.appName)).reduce((sum, app) => sum + app.duration, 0) / 60);
    
    const distractionTime = summaries.length > 0 ? 
      Math.round(summaries.reduce((sum, s) => sum + (s.totalNonProductiveTime || 0), 0) / 60) : 
      Math.round(appUsage.filter(app => !isProductiveContent(app.appName)).reduce((sum, app) => sum + app.duration, 0) / 60);
    
    // Calculate focus score
    const focusScore = Math.round((focusTime / (totalActiveTime || 1)) * 100);
    
    // Get previous period data for comparison
    const prevStartDate = new Date(startDate);
    if (timeFrame === 'daily') {
      prevStartDate.setDate(prevStartDate.getDate() - 1);
    } else if (timeFrame === 'weekly') {
      prevStartDate.setDate(prevStartDate.getDate() - 7);
    } else if (timeFrame === 'monthly') {
      prevStartDate.setMonth(prevStartDate.getMonth() - 1);
    } else if (timeFrame === 'yearly') {
      prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
    }
    
    const prevStartDateStr = prevStartDate.toISOString().slice(0, 10);
    
    // Get previous period summaries
    const prevSummaries = await ProductivitySummary.find({
      userId,
      email: userEmail,
      date: { $gte: prevStartDateStr, $lt: startDateStr }
    });
    
    // Calculate previous focus score
    const prevFocusTime = prevSummaries.length > 0 ? 
      prevSummaries.reduce((sum, s) => sum + (s.totalProductiveTime || 0), 0) / 60 : 0;
    const prevTotalActiveTime = prevSummaries.length > 0 ? 
      prevSummaries.reduce((sum, s) => sum + (s.overallTotalUsage || 0), 0) / 60 : 0;
    const previousFocusScore = prevTotalActiveTime > 0 ? 
      Math.round((prevFocusTime / prevTotalActiveTime) * 100) : 0;
    
    // Aggregate app usage
    const appStats = {};
    appUsage.forEach(app => {
      if (!appStats[app.appName]) {
        appStats[app.appName] = { totalTime: 0, visitCount: 0 };
      }
      appStats[app.appName].totalTime += app.duration;
      appStats[app.appName].visitCount++;
    });
    
    // Format top apps
    const topApps = Object.entries(appStats)
      .map(([appName, data]) => ({ 
        _id: appName, 
        totalTime: Math.round(data.totalTime / 60), // convert to minutes
        visitCount: data.visitCount
      }))
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 10);
    
    // Aggregate website usage
    const websiteStats = {};
    tabUsage.forEach(tab => {
      const domain = tab.domain || tab.title || 'unknown';
      if (!websiteStats[domain]) {
        websiteStats[domain] = { totalTime: 0, visitCount: 0 };
      }
      websiteStats[domain].totalTime += tab.duration;
      websiteStats[domain].visitCount++;
    });
    
    // Format top websites
    const topWebsites = Object.entries(websiteStats)
      .map(([domain, data]) => ({ 
        _id: domain, 
        totalTime: Math.round(data.totalTime / 60), // convert to minutes
        visitCount: data.visitCount
      }))
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 10);
    
    // Group data by categories
    const categoryBreakdown = [
      { 
        category: 'productive', 
        totalTime: focusTime
      },
      { 
        category: 'distraction', 
        totalTime: distractionTime
      }
    ];
    
    // Create daily breakdown
    const dailyBreakdown = [];
    const dailyMap = new Map();
    
    // Initialize days based on timeFrame
    if (timeFrame === 'daily') {
      // For daily, use hours
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        dailyMap.set(hour, { 
          date: `${hour}:00`,
          focusTime: 0, 
          distractionTime: 0,
          focusScore: 0 
        });
      }
      
      // Group by hour
      summaries.forEach(summary => {
        if (summary.productiveContent && summary.nonProductiveContent) {
          const date = new Date(summary.date);
          for (let i = 0; i < 24; i++) {
            const hour = i.toString().padStart(2, '0');
            const entry = dailyMap.get(hour) || { 
              date: `${hour}:00`,
              focusTime: 0, 
              distractionTime: 0,
              focusScore: 0
            };
            
            // Add any data for this hour (approximation)
            if (summary.focusScore) {
              entry.focusTime += (summary.totalProductiveTime || 0) / 24 / 60;
              entry.distractionTime += (summary.totalNonProductiveTime || 0) / 24 / 60;
              entry.focusScore = Math.round(entry.focusTime / (entry.focusTime + entry.distractionTime || 1) * 100);
              dailyMap.set(hour, entry);
            }
          }
        }
      });
    } else if (timeFrame === 'weekly') {
      // For weekly, use days of week
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.forEach(day => {
        dailyMap.set(day, { date: day, focusTime: 0, distractionTime: 0, focusScore: 0 });
      });
      
      // Group by day of week
      summaries.forEach(summary => {
        if (summary.productiveContent && summary.nonProductiveContent) {
          const date = new Date(summary.date);
          const day = days[date.getDay()];
          const entry = dailyMap.get(day) || { date: day, focusTime: 0, distractionTime: 0, focusScore: 0 };
          
          entry.focusTime += (summary.totalProductiveTime || 0) / 60;
          entry.distractionTime += (summary.totalNonProductiveTime || 0) / 60;
          entry.focusScore = Math.round(entry.focusTime / (entry.focusTime + entry.distractionTime || 1) * 100);
          dailyMap.set(day, entry);
        }
      });
    } else {
      // For monthly/yearly, use dates
      const dateSet = new Set();
      summaries.forEach(summary => dateSet.add(summary.date));
      
      const sortedDates = Array.from(dateSet).sort();
      sortedDates.forEach(date => {
        const display = timeFrame === 'monthly' ? 
          date.split('-')[2] : // Day of month for monthly view
          date.split('-').slice(1).join('/'); // MM/DD for yearly view
        
        dailyMap.set(date, { date: display, focusTime: 0, distractionTime: 0, focusScore: 0 });
      });
      
      // Add data to each date
      summaries.forEach(summary => {
        if (summary.productiveContent && summary.nonProductiveContent) {
          const entry = dailyMap.get(summary.date) || { 
            date: summary.date.split('-')[2], 
            focusTime: 0, 
            distractionTime: 0,
            focusScore: 0
          };
          
          entry.focusTime += (summary.totalProductiveTime || 0) / 60;
          entry.distractionTime += (summary.totalNonProductiveTime || 0) / 60;
          entry.focusScore = Math.round(entry.focusTime / (entry.focusTime + entry.distractionTime || 1) * 100);
          dailyMap.set(summary.date, entry);
        }
      });
    }
    
    // Convert map to array
    dailyMap.forEach(value => {
      dailyBreakdown.push(value);
    });
    
    // Calculate most productive hour
    let mostProductiveHour = '9:00 AM'; // Default
    let maxProductivity = 0;
    
    if (summaries.length > 0) {
      // This would require more detailed time tracking data
      // For now, use a default or calculate from summary if available
      mostProductiveHour = summaries[0].mostProductiveHour || '9:00 AM';
    }
    
    // Calculate average session length (in minutes)
    const averageSessionLength = Math.round(totalActiveTime / (uniqueApps + uniqueWebsites || 1));
    
    // Calculate total sessions
    const totalSessions = appUsage.length + tabUsage.length;
    
    // Calculate longest focus session (in minutes)
    const longestFocusSession = Math.round(Math.max(
      ...appUsage.filter(app => isProductiveContent(app.appName)).map(app => app.duration),
      0
    ) / 60);
    
    // Calculate streak
    let currentStreak = 0;
    if (summaries.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      let checkDate = today;
      
      for (let i = 0; i < 30; i++) { // Check up to 30 days back
        const summary = summaries.find(s => s.date === checkDate);
        if (summary && summary.focusScore >= 30) {
          currentStreak++;
          // Move to previous day
          const prevDate = new Date(checkDate);
          prevDate.setDate(prevDate.getDate() - 1);
          checkDate = prevDate.toISOString().slice(0, 10);
        } else {
          break;
        }
      }
    }
    
    // Assemble the statistics object
    const statistics = {
      uniqueApps,
      uniqueWebsites,
      totalActiveTime,
      focusTime,
      distractionTime,
      focusScore,
      previousFocusScore,
      previousActiveTime: Math.round(prevTotalActiveTime),
      mostProductiveHour,
      averageSessionLength,
      totalSessions,
      longestFocusSession,
      currentStreak,
      topApps,
      topWebsites,
      categoryBreakdown,
      dailyBreakdown,
      period: {
        start: startDateStr,
        end: endDateStr
      }
    };
    
    res.json(statistics);
    
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching statistics', 
      error: error.message 
    });
  }
};

// Add a health check endpoint
exports.healthCheck = (req, res) => {
  res.json({ status: 'ok' });
};