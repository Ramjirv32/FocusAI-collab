const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const activeWindow = require('active-win');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import models
const User = require('./models/User');
const AppUsage = require('./models/AppUsage');
const TabUsage = require('./models/TabUsage');
const BrowserTabUsage = require('./models/BrowserTabUsage');

// Import middleware
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Track current active tokens and their users
const activeUsers = new Map();
let lastWindow = null;
let startTime = Date.now();
const currentSessionData = [];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ramji:vikas2311@cluster0.ln4g5.mongodb.net/focuai?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// More detailed error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Middleware setup
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Track active users middleware
app.use(async (req, res, next) => {
  // Check for auth header
  const authHeader = req.header('Authorization');
  
  if (authHeader) {
    // Extract token
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.replace('Bearer ', '') 
      : authHeader;
    
    try {
      // Verify token without throwing if invalid
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      if (decoded && decoded.userId && decoded.email) {
        // Keep token in active users map
        activeUsers.set(token, { 
          userId: decoded.userId, 
          email: decoded.email,
          lastActive: Date.now()
        });
      }
    } catch (e) {
      // Invalid token, don't add to active users
      // But still continue with request
    }
  }
  
  next();
});

// Clean up expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, userData] of activeUsers.entries()) {
    // Remove tokens inactive for more than 24 hours
    if (now - userData.lastActive > 24 * 60 * 60 * 1000) {
      activeUsers.delete(token);
    }
  }
}, 60 * 60 * 1000);

// Add a simple health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'Server is running' });
});

// ========== AUTH ENDPOINTS ==========

// Update the JWT token creation to include email
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id,
      email: user.email 
    }, 
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Update register to use the new token generator
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }
    
    // Create new user
    const user = new User({ email, password, name });
    await user.save();
    
    // Generate JWT token with email included
    const token = generateToken(user);
    
    res.status(201).json({ 
      user: { id: user._id, email: user.email, name: user.name },
      token 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

const ensureUserHasInitialData = async (userId, email) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    const appUsageCount = await AppUsage.countDocuments({ userId, email });
    
    if (appUsageCount === 0) {
      console.log(`Creating initial app usage data for user ${email} (${userId})`);
      
      const sampleApps = [
        { appName: 'Chrome', duration: 1200 },
        { appName: 'VS Code', duration: 1800 },
        { appName: 'Terminal', duration: 600 },
        { appName: 'Slack', duration: 300 }
      ];
      
      for (const app of sampleApps) {
        await new AppUsage({
          userId,
          email,
          date: today,
          appName: app.appName,
          duration: app.duration,
          lastUpdated: new Date()
        }).save();
      }
    }

    const tabCount = await TabUsage.countDocuments({ userId, email });
    if (tabCount === 0) {
      console.log(`Creating initial tab data for user ${email} (${userId})`);
      
      const sampleTabs = [
        { url: 'https://github.com', title: 'GitHub', duration: 900 },
        { url: 'https://stackoverflow.com', title: 'Stack Overflow', duration: 600 },
        { url: 'https://developer.mozilla.org', title: 'MDN Web Docs', duration: 450 }
      ];
      
      for (const tab of sampleTabs) {
        const tabUsage = new TabUsage({
          userId,
          email,
          url: tab.url,
          title: tab.title,
          duration: tab.duration,
          timestamp: new Date()
        });
        await tabUsage.save();
      }
    }
    
    // Also add sample browser tab data
    const browserTabCount = await BrowserTabUsage.countDocuments({ userId, email });
    if (browserTabCount === 0) {
      console.log(`Creating initial browser tab data for user ${email} (${userId})`);
      
      const sampleBrowserTabs = [
        { 
          browser: 'Chrome', 
          url: 'https://youtube.com/watch?v=dQw4w9WgXcQ', 
          title: 'YouTube - Never Gonna Give You Up', 
          duration: 750, 
          domain: 'youtube.com',
          favicon: 'https://www.google.com/s2/favicons?domain=youtube.com'
        },
        { 
          browser: 'Chrome', 
          url: 'https://github.com/trending', 
          title: 'Trending repositories on GitHub', 
          duration: 900, 
          domain: 'github.com',
          favicon: 'https://www.google.com/s2/favicons?domain=github.com' 
        },
        { 
          browser: 'Firefox', 
          url: 'https://mail.google.com', 
          title: 'Gmail - Inbox', 
          duration: 600, 
          domain: 'gmail.com',
          favicon: 'https://www.google.com/s2/favicons?domain=gmail.com'
        },
        {
          browser: 'Chrome',
          url: 'https://stackoverflow.com/questions/tagged/javascript',
          title: 'Newest javascript questions - Stack Overflow',
          duration: 450,
          domain: 'stackoverflow.com',
          favicon: 'https://www.google.com/s2/favicons?domain=stackoverflow.com'
        },
        {
          browser: 'Chrome',
          url: 'https://www.reddit.com/r/programming/',
          title: 'r/programming - Reddit',
          duration: 300,
          domain: 'reddit.com',
          favicon: 'https://www.google.com/s2/favicons?domain=reddit.com'
        }
      ];
      
      // Make sure to save all tabs
      for (const tab of sampleBrowserTabs) {
        const browserTabUsage = new BrowserTabUsage({
          userId,
          email,
          browser: tab.browser,
          url: tab.url,
          title: tab.title,
          domain: tab.domain,
          favicon: tab.favicon,
          duration: tab.duration,
          date: today,
          timestamp: new Date(),
          lastActive: new Date()
        });
        await browserTabUsage.save();
        console.log(`  - Created sample browser tab: ${tab.title} (${tab.domain})`);
      }
    }
  } catch (error) {
    console.error('Error ensuring initial data:', error);
  }
};


app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT token with email included
    const token = generateToken(user);
    
    
    activeUsers.set(token, { 
      userId: user._id, 
      email: user.email 
    });
    
   
    const shouldCreateSample = req.body.includeSampleData === true;
    const appCount = await AppUsage.countDocuments({ userId: user._id });
    const tabCount = await TabUsage.countDocuments({ userId: user._id });
    
    if (shouldCreateSample && appCount === 0 && tabCount === 0) {
      await ensureUserHasInitialData(user._id, user.email);
    }
    
    res.json({ 
      user: { id: user._id, email: user.email, name: user.name },
      token,
      hasSampleData: shouldCreateSample && (appCount === 0 && tabCount === 0)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Add a new endpoint to clear only sample data
app.post('/api/clear-sample-data', auth, async (req, res) => {
  try {
    console.log(`Clearing sample data for user ${req.user.email}`);
    
    // Find the current date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Delete sample app data
    const deletedAppUsage = await AppUsage.deleteMany({ 
      userId: req.user._id,
      email: req.user.email,
      appName: { $in: ['Chrome', 'VS Code', 'Terminal', 'Slack'] },
      duration: { $in: [1200, 1800, 600, 300] }
    });
    
    // Delete sample tab data
    const deletedTabUsage = await TabUsage.deleteMany({ 
      userId: req.user._id,
      email: req.user.email,
      url: { $in: ['https://github.com', 'https://stackoverflow.com', 'https://developer.mozilla.org'] },
      duration: { $in: [900, 600, 450] }
    });
    
    // Delete sample browser tab data
    const deletedBrowserTabUsage = await BrowserTabUsage.deleteMany({
      userId: req.user._id,
      email: req.user.email,
      domain: { $in: ['youtube.com', 'github.com', 'gmail.com'] },
      duration: { $in: [750, 900, 600] }
    });
    
    res.status(200).json({
      success: true, 
      message: 'Sample data cleared successfully',
      deletedCounts: {
        appUsage: deletedAppUsage.deletedCount,
        tabUsage: deletedTabUsage.deletedCount,
        browserTabUsage: deletedBrowserTabUsage.deletedCount
      }
    });
  } catch (error) {
    console.error('Error clearing sample data:', error);
    res.status(500).json({ error: 'Failed to clear sample data' });
  }
});

// Get current user
app.get('/api/user', auth, (req, res) => {
  res.json({ user: { id: req.user._id, email: req.user.email, name: req.user.name } });
});

// ========== TAB TRACKING FUNCTIONALITY ==========

// Update the log-tab endpoint to include email
app.post('/log-tab', auth, async (req, res) => {
  try {
    const data = req.body;
    console.log(`Tab data received from ${req.user.email}:`, data);
    
    // Security check: Make sure the tab data's email matches authenticated user
    if (data.email && data.email !== req.user.email) {
      return res.status(403).json({
        error: 'Email mismatch. Cannot log tab for a different user.'
      });
    }
    
    // Ensure the data is associated with the logged-in user
    const tabData = {
      ...data,
      userId: req.user._id,
      email: req.user.email
    };
    
    // Find existing tab or create new one
    let tabUsage = await TabUsage.findOne({
      userId: req.user._id,
      email: req.user.email,
      url: data.url
    });
    
    if (tabUsage) {
      // Update existing tab
      tabUsage.duration += (data.duration || 0);
      tabUsage.title = data.title || tabUsage.title;
      tabUsage.isActive = data.isActive || false;
      tabUsage.timestamp = new Date();
      await tabUsage.save();
    } else {
      // Create new tab entry
      tabUsage = new TabUsage(tabData);
      await tabUsage.save();
    }
    
    // Also track as browser tab if browser info is provided
    if (data.browser) {
      let browserTabUsage = await BrowserTabUsage.findOne({
        userId: req.user._id,
        email: req.user.email,
        browser: data.browser,
        url: data.url
      });
      
      const today = new Date().toISOString().slice(0, 10);
      
      if (browserTabUsage) {
        browserTabUsage.duration += (data.duration || 0);
        browserTabUsage.title = data.title || browserTabUsage.title;
        browserTabUsage.lastActive = new Date();
        await browserTabUsage.save();
      } else {
        browserTabUsage = new BrowserTabUsage({
          userId: req.user._id,
          email: req.user.email,
          browser: data.browser,
          url: data.url,
          title: data.title,
          date: today,
          duration: data.duration || 0,
          timestamp: new Date(),
          lastActive: new Date()
        });
        await browserTabUsage.save();
      }
    }
    
    res.status(200).json({ success: true, message: "Tab data recorded" });
  } catch (error) {
    console.error(`Error processing tab data for ${req.user.email}:`, error);
    res.status(500).json({ error: 'Error processing request' });
  }
});

// Update the tabs endpoint to filter by email as well
app.get('/tabs', auth, async (req, res) => {
  try {
    const { timeFrame } = req.query;
    let query = {
      userId: req.user._id,
      email: req.user.email
    };
    
    // Apply time filtering if specified
    if (timeFrame) {
      const now = new Date();
      let startDate = new Date();
      
      if (timeFrame === 'daily') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeFrame === 'weekly') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeFrame === 'monthly') {
        startDate.setMonth(startDate.getMonth() - 1);
      }
      
      query.timestamp = { $gte: startDate };
    }
    
    const tabs = await TabUsage.find(query).sort({ timestamp: -1 });
    console.log(`Found ${tabs.length} tabs for user ${req.user.email}`);
    res.json(tabs);
  } catch (error) {
    console.error('Error sending tabs:', error);
    res.status(500).send("Error processing request");
  }
});

// ========== APP TRACKING FUNCTIONALITY ==========

async function getActiveWindowTitle() {
  try {
    const result = await activeWindow();
    return result ? {
      title: result.title,
      app: result.owner.name,
      url: result.url || null
    } : null;
  } catch (error) {
    console.error('Error getting active window:', error);
    return null;
  }
}

// Update usage endpoint to filter by email
app.get('/usage', auth, async (req, res) => {
  try {
    const { timeFrame } = req.query;
    const today = new Date().toISOString().slice(0, 10);
    
    // Default to today's data
    let startDate = today;
    
    if (timeFrame === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().slice(0, 10);
    } else if (timeFrame === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString().slice(0, 10);
    }
    
    // Find app usage for the specified time range
    const appUsage = await AppUsage.find({
      userId: req.user._id,
      email: req.user.email,
      date: { $gte: startDate }
    });
    
    console.log(`Found ${appUsage.length} app usage records for user ${req.user.email}`);
    
    // Group by date
    const groupedByDate = appUsage.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = {};
      }
      acc[item.date][item.appName] = item.duration;
      return acc;
    }, {});
    
    res.json(groupedByDate);
  } catch (error) {
    console.error('Error fetching app usage:', error);
    res.status(500).send("Error processing request");
  }
});

app.get('/current-session', auth, (req, res) => {
  // Filter session data for current user
  res.json(currentSessionData.filter(s => s.userId === req.user._id.toString()));
});

// Update the focus-data endpoint to filter by email
app.get('/focus-data', auth, async (req, res) => {
  try {
    console.log('User requesting focus data:', req.user.email);
    const today = new Date().toISOString().slice(0, 10);
    
    // Get today's tabs with error handling
    let tabs = [];
    try {
      tabs = await TabUsage.find({
        userId: req.user._id,
        email: req.user.email,
        timestamp: { 
          $gte: new Date(today) 
        }
      }).sort({ timestamp: -1 });
      
      console.log(`Found ${tabs.length} tabs for today for user ${req.user.email}`);
    } catch (tabError) {
      console.error('Error fetching tabs:', tabError);
    }
    
    // Get today's app usage with error handling
    let appUsageFormatted = {};
    try {
      const appUsage = await AppUsage.find({
        userId: req.user._id,
        email: req.user.email,
        date: today
      });
      
      console.log(`Found ${appUsage.length} app usage records for today for user ${req.user.email}`);
      
      // Transform app usage to the expected format
      appUsageFormatted = appUsage.reduce((acc, item) => {
        acc[item.appName] = item.duration;
        return acc;
      }, {});
    } catch (appError) {
      console.error('Error fetching app usage:', appError);
    }
    
    // Get browser tab data
    let browserTabs = [];
    try {
      browserTabs = await BrowserTabUsage.find({
        userId: req.user._id,
        email: req.user.email,
        date: today
      }).sort({ duration: -1 });
      
      console.log(`Found ${browserTabs.length} browser tabs for today for user ${req.user.email}`);
    } catch (browserError) {
      console.error('Error fetching browser tabs:', browserError);
    }
    
    // Return the data even if one part failed
    res.json({
      tabs: tabs || [],
      appUsage: appUsageFormatted || {},
      browserTabs: browserTabs || [],
      currentSession: currentSessionData.filter(session => 
        session.userId === req.user._id.toString() && 
        session.timestamp >= new Date(today).getTime()
      ) || []
    });
  } catch (error) {
    console.error('Error fetching focus data:', error);
    res.status(500).json({ error: 'Failed to fetch focus data: ' + error.message });
  }
});


app.get('/raw-usage', auth, async (req, res) => {
  try {
    console.log(`User requesting raw usage data: ${req.user.email} (${req.user._id})`);
    const today = new Date().toISOString().slice(0, 10);
 
    const appUsage = await AppUsage.find({
      userId: req.user._id,
      email: req.user.email,
      date: today
    });
    
    console.log(`Found ${appUsage.length} app usage records for user ${req.user.email}`);
    
   
    const appUsageFormatted = appUsage.reduce((acc, item) => {
      acc[item.appName] = item.duration;
      return acc;
    }, {});
    
    // Get tab usage data - Filter by both userId AND email for extra security
    const tabs = await TabUsage.find({
      userId: req.user._id,
      email: req.user.email,
      timestamp: { $gte: new Date(today) }
    });
    
    console.log(`Found ${tabs.length} tab records for user ${req.user.email}`);
    
    // Group tab usage by domain
    const tabUsage = tabs.reduce((acc, tab) => {
      const domain = tab.domain || 'unknown';
      acc[domain] = (acc[domain] || 0) + tab.duration;
      return acc;
    }, {});
    
    // Get browser tab usage data
    const browserTabs = await BrowserTabUsage.find({
      userId: req.user._id,
      email: req.user.email,
      date: today
    });
    
    // Group browser tabs by domain
    const browserTabsByDomain = browserTabs.reduce((acc, tab) => {
      const domain = tab.domain || 'unknown';
      if (!acc[domain]) {
        acc[domain] = {
          domain,
          totalDuration: 0,
          browser: tab.browser,
          visits: 0
        };
      }
      acc[domain].totalDuration += tab.duration;
      acc[domain].visits++;
      return acc;
    }, {});
    
    res.json({
      appUsage: appUsageFormatted,
      tabUsage: tabUsage,
      browserTabs: Object.values(browserTabsByDomain),
      userEmail: req.user.email
    });
  } catch (error) {
    console.error('Error fetching raw usage data:', error);
    res.status(500).json({ error: 'Failed to fetch usage data' });
  }
});

// Add a new endpoint to get browser tab usage
app.get('/browser-tabs', auth, async (req, res) => {
  try {
    console.log(`User requesting browser tab data: ${req.user.email}`);
    const today = new Date().toISOString().slice(0, 10);
    
    // Default to today's data
    let startDate = today;
    let endDate = today;
    
    const { timeFrame } = req.query;
    
    if (timeFrame === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().slice(0, 10);
    } else if (timeFrame === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString().slice(0, 10);
    }
    
    // Get browser tab data
    const tabs = await BrowserTabUsage.find({
      userId: req.user._id,
      email: req.user.email,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ duration: -1 });
    
    console.log(`Found ${tabs.length} browser tab records for user ${req.user.email}`);
    
    // Group by domain for easier visualization
    const byDomain = tabs.reduce((acc, tab) => {
      const domain = tab.domain || 'unknown';
      
      if (!acc[domain]) {
        acc[domain] = {
          domain,
          totalDuration: 0,
          visits: 0,
          favicon: `https://www.google.com/s2/favicons?domain=${domain}`,
          pages: []
        };
      }
      
      acc[domain].totalDuration += tab.duration;
      acc[domain].visits++;
      
      // Store individual page data
      acc[domain].pages.push({
        url: tab.url,
        title: tab.title,
        duration: tab.duration,
        lastActive: tab.lastActive
      });
      
      return acc;
    }, {});
    
    res.json({
      domains: Object.values(byDomain).sort((a, b) => b.totalDuration - a.totalDuration),
      rawData: tabs
    });
  } catch (error) {
    console.error('Error fetching browser tab data:', error);
    res.status(500).json({ error: 'Failed to fetch browser tab data' });
  }
});

// Update the reset-data endpoint to strictly filter by both userId AND email
app.post('/reset-data', auth, async (req, res) => {
  try {
    console.log(`Resetting data for user ${req.user.email} (${req.user._id})`);
    
    // Remove app usage for the user
    const deletedAppUsage = await AppUsage.deleteMany({ 
      userId: req.user._id,
      email: req.user.email
    });
    
    // Remove tab usage for the user
    const deletedTabUsage = await TabUsage.deleteMany({ 
      userId: req.user._id,
      email: req.user.email 
    });
    
    // Remove browser tab usage for the user
    const deletedBrowserTabUsage = await BrowserTabUsage.deleteMany({
      userId: req.user._id,
      email: req.user.email
    });
    
    console.log(`Reset completed for user ${req.user.email}:
      - Deleted ${deletedAppUsage.deletedCount} app usage records
      - Deleted ${deletedTabUsage.deletedCount} tab usage records
      - Deleted ${deletedBrowserTabUsage.deletedCount} browser tab records`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Data reset successful',
      deletedCounts: {
        appUsage: deletedAppUsage.deletedCount,
        tabUsage: deletedTabUsage.deletedCount,
        browserTabUsage: deletedBrowserTabUsage.deletedCount
      }
    });
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ error: 'Failed to reset data' });
  }
});

// Add a debugging endpoint to check user data
app.get('/api/debug/user-data', auth, async (req, res) => {
  try {
    // Get counts for this user
    const appCount = await AppUsage.countDocuments({
      userId: req.user._id,
      email: req.user.email
    });
    
    const tabCount = await TabUsage.countDocuments({
      userId: req.user._id,
      email: req.user.email
    });
    
    const browserTabCount = await BrowserTabUsage.countDocuments({
      userId: req.user._id,
      email: req.user.email
    });
    
    // Get a sample of each kind of data
    const appSample = await AppUsage.find({
      userId: req.user._id,
      email: req.user.email
    }).limit(5).sort({ lastUpdated: -1 });
    
    const tabSample = await TabUsage.find({
      userId: req.user._id,
      email: req.user.email
    }).limit(5).sort({ timestamp: -1 });
    
    const browserTabSample = await BrowserTabUsage.find({
      userId: req.user._id,
      email: req.user.email
    }).limit(5).sort({ lastActive: -1 });
    
    // Return diagnostic information
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email
      },
      counts: {
        appUsage: appCount,
        tabUsage: tabCount,
        browserTabUsage: browserTabCount
      },
      samples: {
        appUsage: appSample,
        tabUsage: tabSample,
        browserTabUsage: browserTabSample
      },
      tokenIsValid: true
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: 'Error retrieving debug data' });
  }
});

// Add this endpoint to check browser tab data specifically:

app.get('/api/debug/browser-tabs', auth, async (req, res) => {
  try {
    // Count all browser tabs for this user
    const count = await BrowserTabUsage.countDocuments({
      userId: req.user._id,
      email: req.user.email
    });
    
    // Get latest browser tab data
    const latest = await BrowserTabUsage.find({
      userId: req.user._id,
      email: req.user.email
    })
    .sort({ lastActive: -1 })
    .limit(10);
    
    // Group by domain
    const byDomain = {};
    for (const tab of latest) {
      const domain = tab.domain || 'unknown';
      if (!byDomain[domain]) {
        byDomain[domain] = [];
      }
      byDomain[domain].push({
        url: tab.url,
        title: tab.title,
        browser: tab.browser,
        duration: tab.duration,
        lastActive: tab.lastActive
      });
    }
    
    res.json({
      count,
      latest,
      byDomain
    });
  } catch (error) {
    console.error('Debug browser tabs error:', error);
    res.status(500).json({ error: 'Error fetching browser tab debug data' });
  }
});

// Add this endpoint after other browser tab endpoints

// Manual tab tracking API for more reliable tracking from browser extensions
app.post('/api/track-browser-tab', auth, async (req, res) => {
  try {
    const { browser, url, title, duration } = req.body;
    
    if (!browser || !url) {
      return res.status(400).json({ error: 'Browser and URL are required' });
    }
    
    const today = new Date().toISOString().slice(0, 10);
    
    // Look for existing tab entry
    let browserTabUsage = await BrowserTabUsage.findOne({
      userId: req.user._id,
      email: req.user.email,
      date: today,
      browser,
      url
    });
    
    if (browserTabUsage) {
      // Update existing entry
      browserTabUsage.duration += (duration || 10); // Default to 10 seconds if not provided
      browserTabUsage.title = title || browserTabUsage.title;
      browserTabUsage.lastActive = new Date();
      await browserTabUsage.save();
      console.log(`Updated manual browser tab for ${req.user.email}: ${url}`);
    } else {
      // Create new entry
      browserTabUsage = new BrowserTabUsage({
        userId: req.user._id,
        email: req.user.email,
        browser,
        url,
        title,
        duration: duration || 10, // Default to 10 seconds if not provided
        date: today,
        timestamp: new Date(),
        lastActive: new Date()
      });
      await browserTabUsage.save();
      console.log(`Created manual browser tab for ${req.user.email}: ${url}`);
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Browser tab tracked successfully' 
    });
  } catch (error) {
    console.error('Error tracking browser tab:', error);
    res.status(500).json({ error: 'Failed to track browser tab' });
  }
});

// Update logout endpoint to remove token from active users
app.post('/api/logout', auth, (req, res) => {
  try {
    // Remove the token from active users
    const token = req.token;
    if (token && activeUsers.has(token)) {
      activeUsers.delete(token);
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error during logout' });
  }
});

// Improved browser tab detection function
async function getActiveBrowserTab(windowInfo) {
  if (!windowInfo) return null;
  
  // More comprehensive list of browsers
  const browsers = [
    'Chrome', 
    'Google Chrome', 
    'Firefox', 
    'Mozilla Firefox',
    'Safari', 
    'Edge', 
    'Microsoft Edge', 
    'Brave', 
    'Opera', 
    'Vivaldi'
  ];
  
  const isBrowser = browsers.some(browser => 
    windowInfo.app && windowInfo.app.includes(browser)
  );
  
  if (!isBrowser) return null;
  
  // Get the browser name
  const browser = browsers.find(browser => 
    windowInfo.app && windowInfo.app.includes(browser)
  ) || windowInfo.app;
  
  // Extract possible URL from title
  let url = null;
  let title = windowInfo.title || '';
  
  // Common URL patterns in browser window titles
  const urlPattern = /(https?:\/\/[^\s]+)/i;
  const match = title.match(urlPattern);
  
  if (match) {
    url = match[1];
  } else {
    // Look for common domain patterns
    const domainPattern = /([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/;
    const domainMatch = title.match(domainPattern);
    
    if (domainMatch) {
      url = 'https://' + domainMatch[1];
    } else {
      // If we can't extract a URL, create a placeholder with the title
      // This allows us to still track the browser activity even without a URL
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      url = `browser-page://${sanitizedTitle}`;
    }
  }
  
  console.log(`Browser detected: ${browser}, URL: ${url}, Title: ${title}`);
  
  return {
    browser,
    url: url || 'unknown',
    title: title
  };
}

// Update the window tracking interval with improved browser tab handling
setInterval(async () => {
  try {
    const windowInfo = await getActiveWindowTitle();
    
    if (windowInfo && JSON.stringify(windowInfo) !== JSON.stringify(lastWindow)) {
      if (lastWindow) {
        const duration = Math.round((Date.now() - startTime) / 1000);
        if (duration <= 0) return; // Skip if duration is invalid
        
        const today = new Date().toISOString().slice(0, 10);
        const appName = lastWindow.app;
        
        // Always check for browser tab info with improved detection
        const browserInfo = await getActiveBrowserTab(lastWindow);
        
        // Update current session data for UI
        currentSessionData.unshift({
          app: appName,
          title: lastWindow.title,
          duration,
          timestamp: Date.now(),
          url: browserInfo ? browserInfo.url : null
        });
        
        // Keep session data manageable
        if (currentSessionData.length > 50) {
          currentSessionData.pop();
        }
        
        // For each active user, record their app/tab usage
        for (const [token, userData] of activeUsers.entries()) {
          const { userId, email } = userData;
          
          // Skip users with invalid data
          if (!userId || !email) continue;
          
          try {
            // Always track generic app usage
            let appUsage = await AppUsage.findOne({
              userId,
              email,
              date: today,
              appName
            });
            
            if (appUsage) {
              appUsage.duration += duration;
              appUsage.lastUpdated = new Date();
              await appUsage.save();
            } else {
              appUsage = new AppUsage({
                userId,
                email,
                date: today,
                appName,
                duration,
                lastUpdated: new Date()
              });
              await appUsage.save();
            }
            
            // If this is a browser window, track it separately
            if (browserInfo) {
              // Handle the possibility that URL might be empty or invalid
              if (!browserInfo.url || browserInfo.url === 'unknown') {
                console.log(`Skipping browser tab tracking for ${email}: Invalid URL`);
                continue;
              }
              
              let browserTabUsage = await BrowserTabUsage.findOne({
                userId,
                email,
                date: today,
                browser: browserInfo.browser,
                url: browserInfo.url
              });
              
              if (browserTabUsage) {
                // Update existing browser tab entry
                browserTabUsage.duration += duration;
                browserTabUsage.title = browserInfo.title;
                browserTabUsage.lastActive = new Date();
                await browserTabUsage.save();
                console.log(`Updated browser tab for ${email}: ${browserInfo.url} (${duration}s)`);
              } else {
                // Create new browser tab entry
                browserTabUsage = new BrowserTabUsage({
                  userId,
                  email,
                  date: today,
                  browser: browserInfo.browser,
                  url: browserInfo.url,
                  title: browserInfo.title,
                  duration,
                  timestamp: new Date(),
                  lastActive: new Date()
                });
                await browserTabUsage.save();
                console.log(`Created new browser tab for ${email}: ${browserInfo.url} (${browserTabUsage._id})`);
              }
            }
          } catch (userError) {
            console.error(`Error tracking for user ${email}:`, userError);
          }
        }
      }
      
      lastWindow = windowInfo;
      startTime = Date.now();
    }
  } catch (error) {
    console.error('Error in window tracking:', error);
  }
}, 1000);

// Start the server with better error handling
try {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Print available routes
    console.log('Available routes:');
    app._router.stack.forEach(r => {
      if (r.route && r.route.path) {
        console.log(`${Object.keys(r.route.methods).join(', ').toUpperCase()}\t${r.route.path}`);
      }
    });
  });
} catch (error) {
  console.error('Failed to start server:', error);
}