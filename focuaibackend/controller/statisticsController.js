const moment = require('moment');
const User = require('../models/User');
const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');
const FocusResult = require('../models/FocusResult');
const ProductivitySummary = require('../models/ProductivitySummary');


const isProductiveContent = (name) => {
  const productiveApps = ['code', 'vscode', 'excel', 'word', 'powerpoint', 'slack', 'zoom', 'teams'];
  const productiveWebsites = ['github.com', 'stackoverflow.com', 'docs', 'jira', 'confluence', 'trello'];
  
  name = name.toLowerCase();
  return productiveApps.some(app => name.includes(app)) || 
         productiveWebsites.some(site => name.includes(site));
};


exports.getStatistics = async (req, res) => {
  try {
    const userId = req.user._id;
    const userEmail = req.user.email;
    const timeFrame = req.query.timeFrame || 'weekly'; 
    
    
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
    
    
    const appUsage = await AppUsage.find({
      userId,
      email: userEmail,
      date: { $gte: startDateStr, $lte: endDateStr }
    });
    
    
    const tabUsage = await TabUsage.find({
      userId,
      email: userEmail,
      date: { $gte: startDateStr, $lte: endDateStr }
    });
    
    
    const summaries = await ProductivitySummary.find({
      userId,
      email: userEmail,
      date: { $gte: startDateStr, $lte: endDateStr }
    }).sort({ date: 1 });
    
    
    const uniqueApps = [...new Set(appUsage.map(app => app.appName))].length;
    const uniqueWebsites = [...new Set(tabUsage.map(tab => tab.domain || 'unknown'))].length;
    
    
    const totalActiveTime = Math.round((appUsage.reduce((sum, app) => sum + app.duration, 0) / 60));
    
    
    const focusTime = summaries.length > 0 ? 
      Math.round(summaries.reduce((sum, s) => sum + (s.totalProductiveTime || 0), 0) / 60) : 
      Math.round(appUsage.filter(app => isProductiveContent(app.appName)).reduce((sum, app) => sum + app.duration, 0) / 60);
    
    const distractionTime = summaries.length > 0 ? 
      Math.round(summaries.reduce((sum, s) => sum + (s.totalNonProductiveTime || 0), 0) / 60) : 
      Math.round(appUsage.filter(app => !isProductiveContent(app.appName)).reduce((sum, app) => sum + app.duration, 0) / 60);
    
    
    const focusScore = Math.round((focusTime / (totalActiveTime || 1)) * 100);
    
    
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
    
    
    const prevSummaries = await ProductivitySummary.find({
      userId,
      email: userEmail,
      date: { $gte: prevStartDateStr, $lt: startDateStr }
    });
    
    
    const prevFocusTime = prevSummaries.length > 0 ? 
      prevSummaries.reduce((sum, s) => sum + (s.totalProductiveTime || 0), 0) / 60 : 0;
    const prevTotalActiveTime = prevSummaries.length > 0 ? 
      prevSummaries.reduce((sum, s) => sum + (s.overallTotalUsage || 0), 0) / 60 : 0;
    const previousFocusScore = prevTotalActiveTime > 0 ? 
      Math.round((prevFocusTime / prevTotalActiveTime) * 100) : 0;
    
    
    const appStats = {};
    appUsage.forEach(app => {
      if (!appStats[app.appName]) {
        appStats[app.appName] = { totalTime: 0, visitCount: 0 };
      }
      appStats[app.appName].totalTime += app.duration;
      appStats[app.appName].visitCount++;
    });
    
    
    const topApps = Object.entries(appStats)
      .map(([appName, data]) => ({ 
        _id: appName, 
        totalTime: Math.round(data.totalTime / 60), 
        visitCount: data.visitCount
      }))
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 10);
    
    
    const websiteStats = {};
    tabUsage.forEach(tab => {
      const domain = tab.domain || tab.title || 'unknown';
      if (!websiteStats[domain]) {
        websiteStats[domain] = { totalTime: 0, visitCount: 0 };
      }
      websiteStats[domain].totalTime += tab.duration;
      websiteStats[domain].visitCount++;
    });
    
    
    const topWebsites = Object.entries(websiteStats)
      .map(([domain, data]) => ({ 
        _id: domain, 
        totalTime: Math.round(data.totalTime / 60), 
        visitCount: data.visitCount
      }))
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 10);
    
    
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
    
    
    const dailyBreakdown = [];
    const dailyMap = new Map();
    
    
    if (timeFrame === 'daily') {
      
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        dailyMap.set(hour, { 
          date: `${hour}:00`,
          focusTime: 0, 
          distractionTime: 0,
          focusScore: 0 
        });
      }
      
      
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
      
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.forEach(day => {
        dailyMap.set(day, { date: day, focusTime: 0, distractionTime: 0, focusScore: 0 });
      });
      
      
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
      
      const dateSet = new Set();
      summaries.forEach(summary => dateSet.add(summary.date));
      
      const sortedDates = Array.from(dateSet).sort();
      sortedDates.forEach(date => {
        const display = timeFrame === 'monthly' ? 
          date.split('-')[2] : 
          date.split('-').slice(1).join('/'); 
        
        dailyMap.set(date, { date: display, focusTime: 0, distractionTime: 0, focusScore: 0 });
      });
      
      
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
    
    
    dailyMap.forEach(value => {
      dailyBreakdown.push(value);
    });
    
    
    let mostProductiveHour = '9:00 AM'; 
    let maxProductivity = 0;
    
    if (summaries.length > 0) {
      
      
      mostProductiveHour = summaries[0].mostProductiveHour || '9:00 AM';
    }
    
    
    const averageSessionLength = Math.round(totalActiveTime / (uniqueApps + uniqueWebsites || 1));
    
    
    const totalSessions = appUsage.length + tabUsage.length;
    
    
    const longestFocusSession = Math.round(Math.max(
      ...appUsage.filter(app => isProductiveContent(app.appName)).map(app => app.duration),
      0
    ) / 60);
    
    
    let currentStreak = 0;
    if (summaries.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      let checkDate = today;
      
      for (let i = 0; i < 30; i++) { 
        const summary = summaries.find(s => s.date === checkDate);
        if (summary && summary.focusScore >= 30) {
          currentStreak++;
          
          const prevDate = new Date(checkDate);
          prevDate.setDate(prevDate.getDate() - 1);
          checkDate = prevDate.toISOString().slice(0, 10);
        } else {
          break;
        }
      }
    }
    
    
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


exports.healthCheck = (req, res) => {
  res.json({ status: 'ok' });
};