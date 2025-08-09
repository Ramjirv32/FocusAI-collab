const moment = require('moment');
const User = require('../models/User');
const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');
const FocusResult = require('../models/FocusResult');

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
    const userId = req.user ? req.user.id : null;
    const timeFrame = req.query.timeFrame || 'weekly'; // default to weekly
    
    // For now, just return mock data
    const statistics = {
      uniqueApps: 12,
      uniqueWebsites: 23,
      totalActiveTime: 480, // 8 hours in minutes
      focusTime: 320, // 5hr 20min
      distractionTime: 160, // 2hr 40min
      focusScore: 67,
      previousFocusScore: 62,
      previousActiveTime: 450,
      mostProductiveHour: '10:00 AM',
      averageSessionLength: 45,
      totalSessions: 18,
      longestFocusSession: 90,
      currentStreak: 5,
      topApps: [
        { _id: 'VS Code', totalTime: 180, visitCount: 12 },
        { _id: 'Chrome', totalTime: 120, visitCount: 15 },
        { _id: 'Terminal', totalTime: 60, visitCount: 8 },
        { _id: 'Slack', totalTime: 45, visitCount: 9 },
        { _id: 'Spotify', totalTime: 30, visitCount: 3 },
      ],
      topWebsites: [
        { _id: 'github.com', totalTime: 60, visitCount: 10 },
        { _id: 'stackoverflow.com', totalTime: 45, visitCount: 8 },
        { _id: 'google.com', totalTime: 30, visitCount: 12 },
        { _id: 'developer.mozilla.org', totalTime: 25, visitCount: 6 },
        { _id: 'youtube.com', totalTime: 20, visitCount: 5 },
      ],
      categoryBreakdown: [
        { category: 'productive', totalTime: 320 },
        { category: 'distraction', totalTime: 160 },
      ],
      dailyBreakdown: [
        { date: 'Mon', focusTime: 120, distractionTime: 45, focusScore: 73 },
        { date: 'Tue', focusTime: 145, distractionTime: 30, focusScore: 83 },
        { date: 'Wed', focusTime: 100, distractionTime: 60, focusScore: 62 },
        { date: 'Thu', focusTime: 180, distractionTime: 40, focusScore: 82 },
        { date: 'Fri', focusTime: 160, distractionTime: 35, focusScore: 82 },
        { date: 'Sat', focusTime: 60, distractionTime: 90, focusScore: 40 },
        { date: 'Sun', focusTime: 90, distractionTime: 50, focusScore: 64 },
      ]
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