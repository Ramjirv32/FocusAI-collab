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

// Import middleware
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Add this near the top with other global variables
const activeUsers = new Map(); // userId -> {timestamp, email}

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
    
    // Check if user has any app usage data
    const appUsageCount = await AppUsage.countDocuments({ userId, email });
    
    // If no data exists, create some sample data
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
    
    // Create sample tab data if none exists
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
  } catch (error) {
    console.error('Error ensuring initial data:', error);
  }
};



// Update the login endpoint to make sample data optional
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
    
    // Only create sample data if this is the user's first login and they have no data
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
    
    // Delete data created before actual tracking started
    // This assumes sample data was created at account creation and real tracking started later
    const deletedAppUsage = await AppUsage.deleteMany({ 
      userId: req.user._id,
      email: req.user.email,
      appName: { $in: ['Chrome', 'VS Code', 'Terminal', 'Slack'] },
      duration: { $in: [1200, 1800, 600, 300] }
    });
    
    const deletedTabUsage = await TabUsage.deleteMany({ 
      userId: req.user._id,
      email: req.user.email,
      url: { $in: ['https://github.com', 'https://stackoverflow.com', 'https://developer.mozilla.org'] },
      duration: { $in: [900, 600, 450] }
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Sample data cleared successfully',
      deletedCounts: {
        appUsage: deletedAppUsage.deletedCount,
        tabUsage: deletedTabUsage.deletedCount
      }
    });
  } catch (error) {
    console.error('Error clearing sample data:', error);
    res.status(500).json({ error: 'Failed to clear sample data' });
  }
});

// Get current user
app.get('/api/user', auth, async (req, res) => {
  res.json({ user: { id: req.user._id, email: req.user.email, name: req.user.name,token : req.token } });
});

// ========== TAB TRACKING FUNCTIONALITY ==========


// Update the log-tab endpoint to work with or without auth
app.post('/log-tab', async (req, res) => {
  try {
    const data = req.body;
    console.log('Received Tab Data:', data);
    
    // Try to authenticate with token first
    let userId = null;
    let userEmail = null;
    
    // Check for auth header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        userId = decoded.userId;
        userEmail = decoded.email;
        console.log(`Authenticated tab data for user ${userEmail}`);
      } catch (err) {
        console.log('Invalid token in tab data request');
      }
    }
    
    // Fallback to data in request body if no valid token
    if (!userId && data.userId) {
      userId = data.userId;
      userEmail = data.email;
    }
    
    // If still no user ID, use session data or a default user for demo purposes
    if (!userId || !userEmail) {
      // This is just for demo - in production you'd want proper authentication
      const activeUser = await User.findOne();
      if (activeUser) {
        userId = activeUser._id;
        userEmail = activeUser.email;
        console.log(`Using default user for tab data: ${userEmail}`);
      } else {
        return res.status(400).json({ error: 'No users available and no authentication provided' });
      }
    }
    
    // Extract domain from URL
    let domain = 'unknown';
    try {
      if (data.url && data.url.startsWith('http')) {
        const urlObj = new URL(data.url);
        domain = urlObj.hostname.replace('www.', '');
      } else if (data.title) {
        // Try to extract domain-like info from title
        const titleParts = data.title.split(' - ');
        if (titleParts.length > 1) {
          domain = titleParts[titleParts.length - 1].toLowerCase().trim();
        } else {
          domain = data.title.toLowerCase().trim();
        }
      }
    } catch (e) {
      console.log('Error extracting domain, using title instead');
      domain = data.title || 'unknown';
    }
    
    console.log(`Extracted domain: ${domain} from ${data.url || data.title}`);
    
    // Find existing tab usage or create new one (by URL and user)
    let tabUsage = await TabUsage.findOne({
      userId: userId,
      url: data.url
    });
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (tabUsage) {
      // Update existing tab
      tabUsage.duration += parseFloat(data.duration) || 0;
      tabUsage.title = data.title || tabUsage.title;
      tabUsage.domain = domain;
      tabUsage.email = userEmail; // Ensure email is set
      tabUsage.lastUpdated = now;
      await tabUsage.save();
      console.log(`Updated tab record for ${domain}: total duration ${tabUsage.duration}s`);
    } else {
      // Create new tab entry
      const newTab = new TabUsage({
        userId: userId,
        email: userEmail,
        url: data.url,
        title: data.title,
        domain: domain,
        duration: parseFloat(data.duration) || 0,
        date: todayStr,
        timestamp: now,
        lastUpdated: now
      });
      await newTab.save();
      console.log(`Created new tab record for ${domain}: ${data.duration}s`);
    }
    
    res.status(200).json({ success: true, message: "Tab data recorded" });
  } catch (error) {
    console.error('Error processing tab data:', error);
    res.status(500).json({ error: 'Server error processing tab data' });
  }
});

// Update the tabs endpoint to filter by email as well
app.get('/tabs', auth, async (req, res) => {
  try {
    console.log(`User requesting tabs data: ${req.user.email}`);
    
    // Get time frame from query params
    const timeFrame = req.query.timeFrame || 'daily';
    
    // Calculate date range based on time frame
    const endDate = new Date();
    let startDate = new Date();
    
    if (timeFrame === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeFrame === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeFrame === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    // Find tabs for this user within the date range
    const tabs = await TabUsage.find({
      email: req.user.email,
      $or: [
        // Match by userId string comparison
        { userId: req.user._id.toString() },
        // Match by userId ObjectId
        { userId: req.user._id }
      ],
      lastUpdated: { $gte: startDate, $lte: endDate }
    });
    
    console.log(`Found ${tabs.length} tabs for user ${req.user.email}`);
    res.json(tabs);
  } catch (error) {
    console.error('Error fetching tabs:', error);
    res.status(500).json({ error: 'Failed to fetch tabs' });
  }
});

// ========== APP TRACKING FUNCTIONALITY ==========
const currentSessionData = [];
let lastWindow = null;
let startTime = Date.now();

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
  // In a real implementation, you'd store user ID with each session entry
  res.json(currentSessionData);
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
    
    // Return the data even if one part failed
    res.json({
      tabs: tabs || [],
      appUsage: appUsageFormatted || {},
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

// Update the raw-usage endpoint to filter by email
app.get('/raw-usage', auth, async (req, res) => {
  try {
    console.log('User requesting raw usage data:', req.user.email);
    const today = new Date().toISOString().slice(0, 10);
    
    // Get today's app usage
    const appUsage = await AppUsage.find({
      userId: req.user._id,
      email: req.user.email,
      date: today
    });
    
    console.log(`Found ${appUsage.length} app usage records for user ${req.user.email}`);
    
    // Format app usage
    const appUsageFormatted = appUsage.reduce((acc, item) => {
      acc[item.appName] = item.duration;
      return acc;
    }, {});
    
    // Get tab usage data
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
    
    res.json({
      appUsage: appUsageFormatted,
      tabUsage: tabUsage,
      userEmail: req.user.email // Include the user email for the frontend
    });
  } catch (error) {
    console.error('Error fetching raw usage data:', error);
    res.status(500).json({ error: 'Failed to fetch usage data' });
  }
});

// Update the reset-data endpoint to filter by email
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
    
    // Clear current session data for this user
    // In a real app, you'd maintain session data in the database
    const beforeLength = currentSessionData.length;
    const newSessionData = currentSessionData.filter(
      session => session.userId !== req.user._id.toString()
    );
    currentSessionData.length = 0;
    currentSessionData.push(...newSessionData);
    
    console.log(`Reset completed for user ${req.user.email}:
      - Deleted ${deletedAppUsage.deletedCount} app usage records
      - Deleted ${deletedTabUsage.deletedCount} tab usage records
      - Removed ${beforeLength - currentSessionData.length} session entries`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Data reset successful',
      deletedCounts: {
        appUsage: deletedAppUsage.deletedCount,
        tabUsage: deletedTabUsage.deletedCount,
        sessions: beforeLength - currentSessionData.length
      }
    });
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ error: 'Failed to reset data' });
  }
});

// Add this new endpoint for user heartbeats
app.post('/api/heartbeat', auth, (req, res) => {
  activeUsers.set(req.user._id.toString(), {
    timestamp: Date.now(),
    email: req.user.email
  });
  res.status(200).json({ success: true });
});

// Update the window tracking interval to track both app usage and browser tabs
setInterval(async () => {
  try {
    const windowInfo = await getActiveWindowTitle();
    
    if (windowInfo && JSON.stringify(windowInfo) !== JSON.stringify(lastWindow)) {
      if (lastWindow) {
        const duration = Math.round((Date.now() - startTime) / 1000);
        const today = new Date().toISOString().slice(0, 10);
        
        const appName = lastWindow.app;
        
        // Find the most recently active user
        let activeUserId = null;
        let activeUserEmail = null;
        let mostRecentTime = 0;
        
        for (const [userId, data] of activeUsers.entries()) {
          if (data.timestamp > mostRecentTime && Date.now() - data.timestamp < 5 * 60 * 1000) { // Active in last 5 minutes
            mostRecentTime = data.timestamp;
            activeUserId = userId;
            activeUserEmail = data.email;
          }
        }
        
        if (activeUserId && activeUserEmail) {
          // Update app usage in database
          try {
            // Find existing app usage record or create new one
            let appUsage = await AppUsage.findOne({
              userId: activeUserId,
              email: activeUserEmail,
              date: today,
              appName
            });
            
            if (appUsage) {
              // Update existing record
              appUsage.duration += duration;
              appUsage.lastUpdated = new Date();
              await appUsage.save();
            } else {
              // Create new record
              appUsage = new AppUsage({
                userId: activeUserId,
                email: activeUserEmail,
                date: today,
                appName,
                duration,
                lastUpdated: new Date()
              });
              await appUsage.save();
            }
            
            // DETECT AND TRACK BROWSER TABS
            // Check if this is a browser app
            const browsers = ['Google-chrome', 'firefox_firefox', 'Firefox', 'Safari', 'Edge', 'Opera'];
            if (browsers.includes(appName) && lastWindow.title) {
              // Extract the tab name from the title (usually format is "Website - Browser")
              let tabName = lastWindow.title;
              
              // Remove browser name from the end if present
              browsers.forEach(browser => {
                if (tabName.endsWith(` - ${browser}`)) {
                  tabName = tabName.replace(` - ${browser}`, '');
                }
                if (tabName.endsWith(` – ${browser}`)) {
                  tabName = tabName.replace(` – ${browser}`, '');
                }
              });
              
              // Check for common browser title patterns and extract the website name
              const titleParts = tabName.split(' - ');
              if (titleParts.length > 1) {
                // Usually the website name is the first or last part
                tabName = titleParts[0].trim();
              }
              
              // Find existing tab record or create a new one
              let tabUsage = await TabUsage.findOne({
                userId: activeUserId,
                email: activeUserEmail,
                date: today,
                title: tabName
              });
              
              if (tabUsage) {
                // Update existing tab record
                tabUsage.duration += duration;
                tabUsage.lastUpdated = new Date();
                await tabUsage.save();
                console.log(`Updated tab record: ${tabName} for ${activeUserEmail}, total: ${tabUsage.duration}s`);
              } else {
                // Create new tab record with simplified data
                tabUsage = new TabUsage({
                  userId: activeUserId,
                  email: activeUserEmail,
                  date: today,
                  title: tabName,
                  domain: tabName.toLowerCase(), // Just use the tab name as the domain for simplicity
                  duration: duration,
                  lastUpdated: new Date()
                });
                await tabUsage.save();
                console.log(`Created new tab record: ${tabName} for ${activeUserEmail}, duration: ${duration}s`);
              }
            }
          } catch (dbError) {
            console.error('Database error when tracking usage:', dbError);
          }
          
          // Add to current session data (in memory)
          currentSessionData.push({
            userId: activeUserId.toString(),
            email: activeUserEmail,
            app: appName,
            title: lastWindow.title,
            url: lastWindow.url,
            duration: duration,
            timestamp: Date.now()
          });
          
          if (currentSessionData.length > 100) {
            currentSessionData.shift();
          }
          
          console.log(`Tracked: ${appName} (${lastWindow.title}) for ${duration} seconds for user ${activeUserEmail}`);
        } else {
          console.log(`Skipping tracking: No active user found in the last 5 minutes`);
        }
      }
      
      lastWindow = windowInfo;
      startTime = Date.now();
    }
  } catch (error) {
    console.error('Error in window tracking:', error);
  }
}, 1000);

try {
  app.listen(5001, () => console.log(`Server running on http://localhost:${PORT}`));
} catch (error) {
  console.error('Failed to start server:', error);
}
