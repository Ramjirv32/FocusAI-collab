const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');
const ProductivitySummary = require('../models/ProductivitySummary');

const usageController = {
  // Get raw usage data
  async getRawUsage(req, res) {
    try {
      console.log('User requesting raw usage data:', req.user.email);
      const { date, timeFrame } = req.query;
      
      // Default to today if no date provided
      const today = date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      
      // Calculate date range based on time frame
      let startDate = today;
      
      if (timeFrame === 'weekly') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().slice(0, 10);
      } else if (timeFrame === 'monthly') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString().slice(0, 10);
      }
      
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(today);
      endDateObj.setHours(23, 59, 59, 999);
      
      console.log(`Fetching data from ${startDate} to ${today} for user ${req.user.email}`);
      
      // Find app usage within the date range
      const apps = await AppUsage.find({
        userId: req.user._id,
        email: req.user.email,
        timestamp: { $gte: startDateObj, $lt: endDateObj }
      });
      
      console.log(`Found ${apps.length} app records for user ${req.user.email}`);
      
      // Group app usage by app name
      const appUsageFormatted = apps.reduce((acc, app) => {
        acc[app.appName] = (acc[app.appName] || 0) + app.duration;
        return acc;
      }, {});
      
      // Find tab usage within the date range
      const tabs = await TabUsage.find({
        userId: req.user._id,
        email: req.user.email,
        timestamp: { $gte: startDateObj, $lt: endDateObj }
      });
      
      console.log(`Found ${tabs.length} tab records for user ${req.user.email}`);
      
      // Group tab usage by domain
      const tabUsage = tabs.reduce((acc, tab) => {
        const domain = tab.domain || 'unknown';
        acc[domain] = (acc[domain] || 0) + tab.duration;
        return acc;
      }, {});
      
      res.json({
        appUsage: appUsageFormatted,
        tabUsage: tabUsage,
        userEmail: req.user.email
      });
    } catch (error) {
      console.error('Error fetching raw usage data:', error);
      res.status(500).json({ error: 'Failed to fetch usage data', details: error.message });
    }
  },

  // Get app usage data
  async getAppUsage(req, res) {
    try {
      console.log(`User requesting app usage data: ${req.user.email}`);
      
      const { date, timeFrame } = req.query;
      
      // Default to today if no date provided
      const endDate = date ? new Date(date) : new Date();
      let startDate = new Date(endDate);
      
      if (timeFrame === 'daily') {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (timeFrame === 'weekly') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeFrame === 'monthly') {
        startDate.setMonth(startDate.getMonth() - 1);
      }
      
      // Find apps for this user within the date range
      const apps = await AppUsage.find({
        email: req.user.email,
        $or: [
          { userId: req.user._id.toString() },
          { userId: req.user._id }
        ],
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ duration: -1 });
      
      console.log(`Found ${apps.length} apps for user ${req.user.email}`);
      res.json(apps);
    } catch (error) {
      console.error('Error fetching apps:', error);
      res.status(500).json({ error: 'Failed to fetch apps', details: error.message });
    }
  },

  // Get tab usage data
  async getTabUsage(req, res) {
    try {
      console.log(`User requesting tabs data: ${req.user.email}`);
      
      const { date, timeFrame } = req.query;
      
      // Default to today if no date provided
      const endDate = date ? new Date(date) : new Date();
      let startDate = new Date(endDate);
      
      if (timeFrame === 'daily') {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (timeFrame === 'weekly') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeFrame === 'monthly') {
        startDate.setMonth(startDate.getMonth() - 1);
      }
      
      // Find tabs for this user within the date range
      const tabs = await TabUsage.find({
        email: req.user.email,
        $or: [
          { userId: req.user._id.toString() },
          { userId: req.user._id }
        ],
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ duration: -1 });
      
      console.log(`Found ${tabs.length} tabs for user ${req.user.email}`);
      res.json(tabs);
    } catch (error) {
      console.error('Error fetching tabs:', error);
      res.status(500).json({ error: 'Failed to fetch tabs', details: error.message });
    }
  },

  // Log tab usage (from extension)
  async logTab(req, res) {
    try {
      const { url, title, duration, domain } = req.body;
      
      if (!url || !title || duration === undefined) {
        return res.status(400).json({ error: 'Missing required fields: url, title, duration' });
      }

      let userId = null;
      let email = null;

      // Try to get user info if authenticated
      if (req.user) {
        userId = req.user._id;
        email = req.user.email;
      }

      const tabUsage = new TabUsage({
        userId,
        email,
        url,
        title,
        domain: domain || new URL(url).hostname,
        duration,
        timestamp: new Date(),
        date: new Date().toISOString().slice(0, 10)
      });

      await tabUsage.save();
      res.json({ success: true, message: 'Tab usage logged' });
    } catch (error) {
      console.error('Error logging tab:', error);
      res.status(500).json({ error: 'Failed to log tab usage', details: error.message });
    }
  },

  // Get user statistics
  async getUserStats(req, res) {
    try {
      const { timeFrame = 'weekly' } = req.query;
      
      // Calculate date range
      let startDate = new Date();
      switch (timeFrame) {
        case 'daily':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      // Get productivity summary
      const summary = await ProductivitySummary.findOne({
        userId: req.user._id,
        email: req.user.email,
        date: { $gte: startDate.toISOString().slice(0, 10) }
      }).sort({ date: -1 });

      // Get basic usage stats
      const [appUsage, tabUsage] = await Promise.all([
        AppUsage.find({
          userId: req.user._id,
          email: req.user.email,
          timestamp: { $gte: startDate }
        }),
        TabUsage.find({
          userId: req.user._id,
          email: req.user.email,
          timestamp: { $gte: startDate }
        })
      ]);

      const totalAppTime = appUsage.reduce((sum, app) => sum + (app.duration || 0), 0);
      const totalTabTime = tabUsage.reduce((sum, tab) => sum + (tab.duration || 0), 0);
      const totalActiveTime = totalAppTime + totalTabTime;

      // Calculate productivity metrics
      const productiveApps = appUsage.filter(app => classifyApp(app.appName) === 'productive');
      const productiveTime = productiveApps.reduce((sum, app) => sum + (app.duration || 0), 0);
      
      const distractiveApps = appUsage.filter(app => classifyApp(app.appName) === 'distracting');
      const distractionTime = distractiveApps.reduce((sum, app) => sum + (app.duration || 0), 0);

      const focusScore = totalActiveTime > 0 ? Math.round((productiveTime / totalActiveTime) * 100) : 0;

      const stats = {
        totalActiveTime: Math.round(totalActiveTime / 60), // in minutes
        productiveHours: Math.round(productiveTime / 3600 * 10) / 10, // in hours, 1 decimal
        distractionHours: Math.round(distractionTime / 3600 * 10) / 10,
        focusScore,
        uniqueApps: new Set(appUsage.map(app => app.appName)).size,
        uniqueSites: new Set(tabUsage.map(tab => tab.domain)).size,
        sessionsCompleted: appUsage.length,
        topApps: getTopItems(appUsage, 'appName'),
        topSites: getTopItems(tabUsage, 'domain'),
        streak: summary?.streak || 0,
        level: summary?.level || 1,
        totalPoints: summary?.totalPoints || 0
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
  },

  // Sync user data
  async syncData(req, res) {
    try {
      console.log(`User syncing data: ${req.user.email}`);
      
      // You could implement actual data synchronization logic here
      // For now, let's just return success since we're using real-time tracking
      res.json({
        success: true,
        message: 'Data sync initiated',
        lastSyncTime: new Date()
      });
      
    } catch (error) {
      console.error('Error syncing data:', error);
      res.status(500).json({ error: 'Failed to sync data', details: error.message });
    }
  }
};

// Helper functions
function classifyApp(appName) {
  const productiveApps = ['VS Code', 'Visual Studio', 'IntelliJ', 'Eclipse', 'Sublime Text', 'Terminal', 'Command Prompt', 'PowerShell'];
  const distractiveApps = ['Facebook', 'Instagram', 'TikTok', 'Reddit', 'YouTube', 'Netflix', 'Games'];
  
  if (productiveApps.some(app => appName.toLowerCase().includes(app.toLowerCase()))) {
    return 'productive';
  } else if (distractiveApps.some(app => appName.toLowerCase().includes(app.toLowerCase()))) {
    return 'distracting';
  }
  return 'neutral';
}

function getTopItems(items, field) {
  const grouped = items.reduce((acc, item) => {
    const key = item[field] || 'unknown';
    acc[key] = (acc[key] || 0) + (item.duration || 0);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, duration]) => ({ name, duration: Math.round(duration / 60) })); // Convert to minutes
}

module.exports = usageController;
