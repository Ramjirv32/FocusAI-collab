const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');

/**
 * Get application usage statistics
 * Supports filtering by timeframe (daily, weekly, monthly)
 */
exports.getAppUsageStats = async (req, res) => {
  try {
    const { userId, email } = req.user;
    const { timeFrame = 'daily', timeframe } = req.query;
    
    // Support both parameter formats (camelCase and lowercase)
    const selectedTimeFrame = timeFrame || timeframe || 'daily';
    
    console.log(`Fetching app usage stats for ${email} with timeFrame: ${selectedTimeFrame}`);
    
    // Calculate date range based on timeFrame
    const endDate = new Date();
    let startDate = new Date();
    
    if (selectedTimeFrame === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (selectedTimeFrame === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (selectedTimeFrame === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    const startDateStr = startDate.toISOString().slice(0, 10);
    const endDateStr = endDate.toISOString().slice(0, 10);
    
    console.log(`Date range: ${startDateStr} to ${endDateStr}`);
    
    // Find all app usage for the date range
    const appUsages = await AppUsage.find({
      userId,
      email,
      date: { $gte: startDateStr, $lte: endDateStr }
    });
    
    console.log(`Found ${appUsages.length} app usage records`);
    
    // Group app usage by app name and calculate total duration
    const appUsageByName = appUsages.reduce((acc, item) => {
      const appName = item.appName || 'Unknown';
      
      if (!acc[appName]) {
        acc[appName] = {
          name: appName,
          totalDuration: 0,
          sessions: 0,
          lastUsed: null
        };
      }
      
      acc[appName].totalDuration += item.duration || 0;
      acc[appName].sessions += 1;
      
      // Track the most recent usage
      const itemDate = item.lastUpdated || item.date;
      if (!acc[appName].lastUsed || new Date(itemDate) > new Date(acc[appName].lastUsed)) {
        acc[appName].lastUsed = itemDate;
      }
      
      return acc;
    }, {});
    
    // Convert to array and sort by duration
    const appUsageList = Object.values(appUsageByName).sort((a, b) => b.totalDuration - a.totalDuration);
    
    // Calculate application usage stats
    const totalAppTime = appUsageList.reduce((sum, app) => sum + app.totalDuration, 0);
    const mostUsedApp = appUsageList.length > 0 ? appUsageList[0].name : 'None';
    const totalApps = appUsageList.length;
    
    // Find most productive vs. distraction apps
    // This is a simplistic categorization - would be better with a machine learning model
    const productiveApps = ['code', 'vscode', 'visual studio', 'intellij', 'pycharm', 'excel', 'word', 'powerpoint', 'outlook'];
    const distractionApps = ['youtube', 'netflix', 'facebook', 'twitter', 'instagram', 'games'];
    
    // Categorize apps
    const categorizedApps = appUsageList.map(app => {
      let category = 'neutral';
      const appNameLower = app.name.toLowerCase();
      
      if (productiveApps.some(prodApp => appNameLower.includes(prodApp))) {
        category = 'productive';
      } else if (distractionApps.some(distApp => appNameLower.includes(distApp))) {
        category = 'distraction';
      }
      
      return {
        ...app,
        category
      };
    });
    
    const productiveTime = categorizedApps
      .filter(app => app.category === 'productive')
      .reduce((sum, app) => sum + app.totalDuration, 0);
      
    const distractionTime = categorizedApps
      .filter(app => app.category === 'distraction')
      .reduce((sum, app) => sum + app.totalDuration, 0);
    
    // Get top productive and distraction apps
    const topProductiveApps = categorizedApps
      .filter(app => app.category === 'productive')
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, 5);
      
    const topDistractionApps = categorizedApps
      .filter(app => app.category === 'distraction')
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, 5);
    
    // Prepare comparison with tab usage
    const tabUsages = await TabUsage.find({
      userId,
      email,
      timestamp: { $gte: startDate, $lte: endDate }
    });
    
    const tabUsageByDomain = tabUsages.reduce((acc, tab) => {
      const domain = tab.domain || 'unknown';
      
      if (!acc[domain]) {
        acc[domain] = {
          domain,
          totalDuration: 0,
          visits: 0
        };
      }
      
      acc[domain].totalDuration += tab.duration || 0;
      acc[domain].visits += 1;
      
      return acc;
    }, {});
    
    const totalTabTime = Object.values(tabUsageByDomain).reduce((sum, domain) => sum + domain.totalDuration, 0);
    const appVsWebPercent = {
      applications: totalAppTime > 0 ? Math.round((totalAppTime / (totalAppTime + totalTabTime)) * 100) : 0,
      web: totalTabTime > 0 ? Math.round((totalTabTime / (totalAppTime + totalTabTime)) * 100) : 0
    };
    
    // Log data for debugging
    console.log(`App usage request for ${email}: Found ${appUsages.length} records, ${appUsageList.length} unique apps`);
    
    // Return the aggregated data
    res.json({
      success: true,
      timeFrame: selectedTimeFrame,
      dateRange: { start: startDateStr, end: endDateStr },
      totalTime: totalAppTime,
      totalApps,
      mostUsedApp,
      appUsage: appUsageList,
      categorizedApps,
      productiveTime,
      distractionTime,
      productivityRatio: totalAppTime > 0 ? Math.round((productiveTime / totalAppTime) * 100) : 0,
      topProductiveApps,
      topDistractionApps,
      appVsWebComparison: appVsWebPercent
    });
    
  } catch (error) {
    console.error('Error fetching app usage stats:', error);
    res.status(500).json({ error: 'Failed to fetch application usage statistics', details: error.message });
  }
};

/**
 * Get comparison between app usage and web browsing
 */
exports.getAppVsWebUsage = async (req, res) => {
  try {
    const { userId, email } = req.user;
    const { timeFrame = 'daily', timeframe } = req.query;
    
    // Support both parameter formats (camelCase and lowercase)
    const selectedTimeFrame = timeFrame || timeframe || 'daily';
    
    console.log(`Fetching app vs web comparison for ${email} with timeFrame: ${selectedTimeFrame}`);
    
    // Calculate date range based on timeFrame
    const endDate = new Date();
    let startDate = new Date();
    
    if (selectedTimeFrame === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (selectedTimeFrame === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (selectedTimeFrame === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    const startDateStr = startDate.toISOString().slice(0, 10);
    
    // Find all app and tab usage for the date range
    const [appUsages, tabUsages] = await Promise.all([
      AppUsage.find({
        userId,
        email,
        date: { $gte: startDateStr }
      }),
      TabUsage.find({
        userId,
        email,
        timestamp: { $gte: startDate }
      })
    ]);
    
    // Calculate total time spent in apps vs web
    const totalAppTime = appUsages.reduce((sum, app) => sum + (app.duration || 0), 0);
    const totalTabTime = tabUsages.reduce((sum, tab) => sum + (tab.duration || 0), 0);
    const totalTime = totalAppTime + totalTabTime;
    
    // Calculate daily distribution
    const dailyDistribution = {};
    
    // Process app usage by day
    appUsages.forEach(app => {
      const date = app.date;
      if (!dailyDistribution[date]) {
        dailyDistribution[date] = { apps: 0, web: 0, total: 0 };
      }
      dailyDistribution[date].apps += app.duration || 0;
      dailyDistribution[date].total += app.duration || 0;
    });
    
    // Process tab usage by day
    tabUsages.forEach(tab => {
      const date = new Date(tab.timestamp).toISOString().slice(0, 10);
      if (!dailyDistribution[date]) {
        dailyDistribution[date] = { apps: 0, web: 0, total: 0 };
      }
      dailyDistribution[date].web += tab.duration || 0;
      dailyDistribution[date].total += tab.duration || 0;
    });
    
    // Format the daily distribution for chart display
    const formattedDailyData = Object.entries(dailyDistribution).map(([date, data]) => ({
      date,
      appTime: Math.round(data.apps / 60), // Convert seconds to minutes
      webTime: Math.round(data.web / 60), // Convert seconds to minutes
      total: Math.round(data.total / 60) // Convert seconds to minutes
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json({
      timeFrame: selectedTimeFrame,
      appTime: Math.round(totalAppTime / 60), // Convert seconds to minutes
      webTime: Math.round(totalTabTime / 60), // Convert seconds to minutes
      totalTime: Math.round(totalTime / 60), // Convert seconds to minutes
      appPercentage: totalTime > 0 ? Math.round((totalAppTime / totalTime) * 100) : 0,
      webPercentage: totalTime > 0 ? Math.round((totalTabTime / totalTime) * 100) : 0,
      dailyDistribution: formattedDailyData
    });
    
  } catch (error) {
    console.error('Error fetching app vs web comparison:', error);
    res.status(500).json({ error: 'Failed to fetch app vs web comparison', details: error.message });
  }
};

/**
 * Get app usage trends over time
 */
exports.getAppUsageTrends = async (req, res) => {
  try {
    const { userId, email } = req.user;
    const { timeFrame = 'weekly', timeframe, appName } = req.query;
    
    // Support both parameter formats (camelCase and lowercase)
    const selectedTimeFrame = timeFrame || timeframe || 'weekly';
    
    console.log(`Fetching app usage trends for ${email} with timeFrame: ${selectedTimeFrame}`);
    
    // Calculate date range based on timeFrame
    const endDate = new Date();
    let startDate = new Date();
    let groupByFormat;
    
    if (selectedTimeFrame === 'daily') {
      startDate.setHours(0, 0, 0, 0);
      groupByFormat = '%Y-%m-%d %H:00'; // Group by hour
    } else if (selectedTimeFrame === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
      groupByFormat = '%Y-%m-%d'; // Group by day
    } else if (selectedTimeFrame === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
      groupByFormat = '%Y-%m-%d'; // Group by day
    } else if (selectedTimeFrame === 'yearly') {
      startDate.setFullYear(startDate.getFullYear() - 1);
      groupByFormat = '%Y-%m'; // Group by month
    }
    
    // Build match criteria
    const matchCriteria = {
      userId,
      email,
      date: { $gte: startDate.toISOString().slice(0, 10) }
    };
    
    if (appName) {
      matchCriteria.appName = appName;
    }
    
    // Use aggregation to group by time period
    const appUsageTrends = await AppUsage.aggregate([
      {
        $match: matchCriteria
      },
      {
        $group: {
          _id: {
            appName: '$appName',
            date: '$date'
          },
          totalDuration: { $sum: '$duration' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1, 'totalDuration': -1 }
      },
      {
        $group: {
          _id: '$_id.date',
          apps: {
            $push: {
              name: '$_id.appName',
              duration: '$totalDuration',
              count: '$count'
            }
          },
          totalDuration: { $sum: '$totalDuration' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);
    
    // Process the trend data
    const formattedTrends = appUsageTrends.map(day => {
      const date = day._id;
      
      // Get top apps for each day
      const topApps = day.apps
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5)
        .map(app => ({
          name: app.name || 'Unknown',
          duration: Math.round(app.duration / 60), // Convert to minutes
          percentage: Math.round((app.duration / day.totalDuration) * 100)
        }));
      
      return {
        date,
        totalDuration: Math.round(day.totalDuration / 60), // Convert to minutes
        topApps
      };
    });
    
    res.json({
      timeFrame: selectedTimeFrame,
      trends: formattedTrends
    });
    
  } catch (error) {
    console.error('Error fetching app usage trends:', error);
    res.status(500).json({ error: 'Failed to fetch app usage trends', details: error.message });
  }
};
