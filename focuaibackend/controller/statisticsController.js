const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');
const User = require('../models/User');
const FocusSession = require('../models/FocusSession');
const moment = require('moment');

/**
 * Get comprehensive user statistics for dashboard
 * Supports timeframe filtering (daily, weekly, monthly)
 */
exports.getUserStats = async (req, res) => {
  try {
    const { userId, email } = req.user;
    const { timeFrame = 'weekly' } = req.query;

    // Define date range based on timeFrame
    const now = new Date();
    let startDate;
    switch (timeFrame) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    }

    // Get previous period for comparison
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(startDate);
    switch (timeFrame) {
      case 'daily':
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        break;
      case 'weekly':
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        break;
      case 'monthly':
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        break;
    }

    // Get all app usage data
    const appUsages = await AppUsage.find({
      userId,
      createdAt: { $gte: startDate, $lte: now }
    }).sort({ createdAt: 1 });

    // Get all tab usage data
    const tabUsages = await TabUsage.find({
      userId,
      createdAt: { $gte: startDate, $lte: now }
    }).sort({ createdAt: 1 });

    // Get focus sessions
    const focusSessions = await FocusSession.find({
      userId,
      startTime: { $gte: startDate, $lte: now }
    }).sort({ startTime: 1 });

    // Get previous period data for comparison
    const previousAppUsages = await AppUsage.find({
      userId,
      createdAt: { $gte: previousStartDate, $lte: previousEndDate }
    });
    const previousTabUsages = await TabUsage.find({
      userId,
      createdAt: { $gte: previousStartDate, $lte: previousEndDate }
    });

    // 1. Unique apps and websites
    const uniqueApps = new Set(appUsages.map(app => app.appName)).size;
    const uniqueWebsites = new Set(tabUsages.map(tab => tab.domain)).size;

    // 2. Total time spent (convert from seconds to minutes)
    const totalAppTime = appUsages.reduce((sum, app) => sum + (app.duration || 0), 0) / 60;
    const totalWebTime = tabUsages.reduce((sum, tab) => sum + (tab.duration || 0), 0) / 60;
    const totalActiveTime = totalAppTime + totalWebTime;

    // 3. Previous period comparison
    const previousAppTime = previousAppUsages.reduce((sum, app) => sum + (app.duration || 0), 0) / 60;
    const previousWebTime = previousTabUsages.reduce((sum, tab) => sum + (tab.duration || 0), 0) / 60;
    const previousActiveTime = previousAppTime + previousWebTime;

    // 4. Focus vs distraction time
    const focusTime = totalAppTime * 0.7 + totalWebTime * 0.3;
    const distractionTime = totalAppTime * 0.3 + totalWebTime * 0.7;
    const focusScore = Math.round((focusTime / (focusTime + distractionTime)) * 100) || 0;

    // 5. Previous period focus score
    const previousFocusTime = previousAppTime * 0.7 + previousWebTime * 0.3;
    const previousDistractionTime = previousAppTime * 0.3 + previousWebTime * 0.7;
    const previousFocusScore = Math.round((previousFocusTime / (previousFocusTime + previousDistractionTime)) * 100) || 0;

    // 6. Top apps and websites
    const topApps = aggregateUsage(appUsages, 'appName');
    const topWebsites = aggregateUsage(tabUsages, 'domain');

    // 7. Category breakdown
    const productiveApps = ['vscode', 'code', 'intellij', 'xcode', 'terminal', 'slack', 'zoom', 'teams', 'outlook', 'excel'];
    const productiveWebsites = ['github.com', 'stackoverflow.com', 'docs.google.com', 'notion.so', 'atlassian.net', 'linkedin.com'];
    const distractingApps = ['discord', 'telegram', 'whatsapp', 'messages', 'photos', 'games'];
    const distractingWebsites = ['youtube.com', 'facebook.com', 'twitter.com', 'instagram.com', 'reddit.com', 'tiktok.com', 'netflix.com'];

    let productiveTime = 0;
    let distractingTimeCat = 0;
    let neutralTime = 0;

    appUsages.forEach(app => {
      const appName = app.appName.toLowerCase();
      if (productiveApps.some(pApp => appName.includes(pApp))) {
        productiveTime += app.duration / 60;
      } else if (distractingApps.some(dApp => appName.includes(dApp))) {
        distractingTimeCat += app.duration / 60;
      } else {
        neutralTime += app.duration / 60;
      }
    });

    tabUsages.forEach(tab => {
      const domain = (tab.domain || '').toLowerCase();
      if (productiveWebsites.some(pWeb => domain.includes(pWeb))) {
        productiveTime += tab.duration / 60;
      } else if (distractingWebsites.some(dWeb => domain.includes(dWeb))) {
        distractingTimeCat += tab.duration / 60;
      } else {
        neutralTime += tab.duration / 60;
      }
    });

    const categoryBreakdown = [
      { category: 'productive', totalTime: Math.round(productiveTime) },
      { category: 'distraction', totalTime: Math.round(distractingTimeCat) },
      { category: 'neutral', totalTime: Math.round(neutralTime) }
    ].filter(category => category.totalTime > 0);

    // 8. Daily breakdown for timeline
    const dailyBreakdown = createDailyBreakdown(appUsages, tabUsages, startDate, now, timeFrame);

    // 9. Session statistics
    const averageSessionLength = focusSessions.length > 0 
      ? Math.round(focusSessions.reduce((sum, session) => {
          const duration = session.endTime 
            ? (new Date(session.endTime) - new Date(session.startTime)) / (1000 * 60) 
            : 0;
          return sum + duration;
        }, 0) / focusSessions.length)
      : 0;

    const longestFocusSession = focusSessions.length > 0
      ? Math.round(Math.max(...focusSessions.map(session => {
          return session.endTime 
            ? (new Date(session.endTime) - new Date(session.startTime)) / (1000 * 60)
            : 0;
        })))
      : 0;

    // 10. Most productive hour
    const hourlyBreakdown = createHourlyBreakdown(appUsages, tabUsages);
    const mostProductiveHourData = hourlyBreakdown
      .sort((a, b) => (b.focusTime || 0) - (a.focusTime || 0))
      .shift();
    const mostProductiveHour = mostProductiveHourData 
      ? `${mostProductiveHourData.hour}:00` 
      : 'N/A';

    const mostDistractedHourData = hourlyBreakdown
      .sort((a, b) => (b.distractionTime || 0) - (a.distractionTime || 0))
      .shift();
    const mostDistractedHour = mostDistractedHourData
      ? `${mostDistractedHourData.hour}:00`
      : 'N/A';

    res.json({
      timeFrame,
      uniqueApps,
      uniqueWebsites,
      totalActiveTime: Math.round(totalActiveTime),
      previousActiveTime: Math.round(previousActiveTime),
      focusTime: Math.round(focusTime),
      distractionTime: Math.round(distractionTime),
      focusScore,
      previousFocusScore,
      topApps,
      topWebsites,
      categoryBreakdown,
      dailyBreakdown,
      hourlyBreakdown,
      mostProductiveHour,
      mostDistractedHour,
      averageSessionLength,
      longestFocusSession,
      totalSessions: focusSessions.length,
      currentStreak: calculateStreak(appUsages, tabUsages)
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ 
      message: 'Failed to fetch statistics', 
      error: error.message 
    });
  }
};

// Helper function to aggregate usage by a field
function aggregateUsage(usageData, fieldName) {
  const aggregated = {};
  usageData.forEach(item => {
    const key = item[fieldName] || 'Unknown';
    if (!aggregated[key]) {
      aggregated[key] = { totalTime: 0, visitCount: 0 };
    }
    aggregated[key].totalTime += item.duration / 60;
    aggregated[key].visitCount += 1;
  });
  return Object.entries(aggregated)
    .map(([name, stats]) => ({
      _id: name,
      totalTime: Math.round(stats.totalTime),
      visitCount: stats.visitCount
    }))
    .sort((a, b) => b.totalTime - a.totalTime);
}

// Helper function to create daily breakdown for timeline
function createDailyBreakdown(appUsages, tabUsages, startDate, endDate, timeFrame) {
  const dailyMap = new Map();
  const dateFormat = 'YYYY-MM-DD';
  let currentDate = moment(startDate);
  const lastDate = moment(endDate);

  if (timeFrame === 'daily') {
    const today = moment().format('ddd');
    dailyMap.set(today, { date: today, focusTime: 0, distractionTime: 0, totalTime: 0, focusScore: 0 });
  } else {
    while (currentDate <= lastDate) {
      const dateKey = currentDate.format(timeFrame === 'weekly' ? 'ddd' : dateFormat);
      dailyMap.set(dateKey, { date: dateKey, focusTime: 0, distractionTime: 0, totalTime: 0, focusScore: 0 });
      currentDate.add(1, 'days');
    }
  }

  appUsages.forEach(app => {
    const dateKey = moment(app.createdAt).format(timeFrame === 'weekly' ? 'ddd' : dateFormat);
    if (dailyMap.has(dateKey)) {
      const dayData = dailyMap.get(dateKey);
      const durationMinutes = app.duration / 60;
      dayData.totalTime += durationMinutes;
      dayData.focusTime += durationMinutes * 0.7;
      dayData.distractionTime += durationMinutes * 0.3;
    }
  });

  tabUsages.forEach(tab => {
    const dateKey = moment(tab.createdAt).format(timeFrame === 'weekly' ? 'ddd' : dateFormat);
    if (dailyMap.has(dateKey)) {
      const dayData = dailyMap.get(dateKey);
      const durationMinutes = tab.duration / 60;
      dayData.totalTime += durationMinutes;
      dayData.focusTime += durationMinutes * 0.3;
      dayData.distractionTime += durationMinutes * 0.7;
    }
  });

  const result = Array.from(dailyMap.values()).map(day => {
    day.focusScore = Math.round(day.totalTime > 0 ? (day.focusTime / day.totalTime) * 100 : 0);
    day.focusTime = Math.round(day.focusTime);
    day.distractionTime = Math.round(day.distractionTime);
    day.totalTime = Math.round(day.totalTime);
    return day;
  });

  if (timeFrame === 'weekly') {
    const dayOrder = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };
    return result.sort((a, b) => dayOrder[a.date] - dayOrder[b.date]);
  } else {
    return result.sort((a, b) => moment(a.date) - moment(b.date));
  }
}

// Helper function to create hourly breakdown
function createHourlyBreakdown(appUsages, tabUsages) {
  const hours = Array.from(Array(24).keys()).map(hour => ({
    hour,
    totalTime: 0,
    focusTime: 0,
    distractionTime: 0
  }));

  appUsages.forEach(app => {
    const hour = new Date(app.createdAt).getHours();
    const durationMinutes = app.duration / 60;
    hours[hour].totalTime += durationMinutes;
    hours[hour].focusTime += durationMinutes * 0.7;
    hours[hour].distractionTime += durationMinutes * 0.3;
  });

  tabUsages.forEach(tab => {
    const hour = new Date(tab.createdAt).getHours();
    const durationMinutes = tab.duration / 60;
    hours[hour].totalTime += durationMinutes;
    hours[hour].focusTime += durationMinutes * 0.3;
    hours[hour].distractionTime += durationMinutes * 0.7;
  });

  return hours.map(hourData => ({
    hour: hourData.hour,
    totalTime: Math.round(hourData.totalTime),
    focusTime: Math.round(hourData.focusTime),
    distractionTime: Math.round(hourData.distractionTime)
  }));
}

// Helper function to calculate current streak
function calculateStreak(appUsages, tabUsages) {
  if (!appUsages.length && !tabUsages.length) return 0;
  const allActivities = [
    ...appUsages.map(app => app.createdAt),
    ...tabUsages.map(tab => tab.createdAt)
  ];
  const uniqueDates = new Set(
    allActivities.map(date => moment(date).format('YYYY-MM-DD'))
  );
  const sortedDates = Array.from(uniqueDates)
    .sort((a, b) => moment(b) - moment(a));
  if (sortedDates.length === 0) return 0;
  const today = moment().format('YYYY-MM-DD');
  if (sortedDates[0] !== today) return 0;
  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = moment(sortedDates[i-1]);
    const prevDate = moment(sortedDates[i]);
    if (currentDate.diff(prevDate, 'days') === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Get focus vs distraction balance
 * Useful for simplified focus analytics
 */
exports.getFocusBalance = async (req, res) => {
  try {
    const { userId, email } = req.user;
    const { timeFrame = 'weekly' } = req.query;
    
    // Define date range based on timeFrame
    const now = new Date();
    let startDate;
    
    switch (timeFrame) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7); // Default to weekly
    }
    
    // Get app and tab usage
    const [appUsages, tabUsages] = await Promise.all([
      AppUsage.find({
        userId,
        createdAt: { $gte: startDate, $lte: now }
      }),
      TabUsage.find({
        userId,
        createdAt: { $gte: startDate, $lte: now }
      })
    ]);
    
    // Categorize based on predefined productive/distracting apps and sites
    const productiveApps = ['vscode', 'code', 'intellij', 'xcode', 'terminal', 'slack', 'zoom', 'teams', 'outlook', 'excel'];
    const productiveWebsites = ['github.com', 'stackoverflow.com', 'docs.google.com', 'notion.so', 'atlassian.net', 'linkedin.com'];
    
    const distractingApps = ['discord', 'telegram', 'whatsapp', 'messages', 'photos', 'games'];
    const distractingWebsites = ['youtube.com', 'facebook.com', 'twitter.com', 'instagram.com', 'reddit.com', 'tiktok.com', 'netflix.com'];
    
    let totalFocusTime = 0;
    let totalDistractionTime = 0;
    
    // Calculate total focus and distraction time for apps
    appUsages.forEach(app => {
      const appName = app.appName.toLowerCase();
      const duration = app.duration / 60; // Convert to minutes
      
      if (productiveApps.some(pApp => appName.includes(pApp))) {
        totalFocusTime += duration;
      } else if (distractingApps.some(dApp => appName.includes(dApp))) {
        totalDistractionTime += duration;
      }
    });
    
    // Calculate total focus and distraction time for tabs
    tabUsages.forEach(tab => {
      const domain = (tab.domain || '').toLowerCase();
      const duration = tab.duration / 60; // Convert to minutes
      
      if (productiveWebsites.some(pWeb => domain.includes(pWeb))) {
        totalFocusTime += duration;
      } else if (distractingWebsites.some(dWeb => domain.includes(dWeb))) {
        totalDistractionTime += duration;
      }
    });
    
    // Calculate focus vs distraction ratio
    const totalTime = totalFocusTime + totalDistractionTime;
    const focusVsDistractionRatio = totalTime > 0 
      ? Math.round((totalFocusTime / totalTime) * 100) 
      : 0;
    
    res.json({
      timeFrame,
      totalFocusTime: Math.round(totalFocusTime),
      totalDistractionTime: Math.round(totalDistractionTime),
      focusVsDistractionRatio
    });
  } catch (error) {
    console.error('Error fetching focus balance:', error);
    res.status(500).json({ 
      message: 'Failed to fetch focus balance', 
      error: error.message 
    });
  }
};